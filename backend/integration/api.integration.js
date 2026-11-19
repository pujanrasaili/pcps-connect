// End-to-end checks against a REAL MongoDB and the real server, started the
// way production starts it. The unit tests mock the database; these catch what
// mocks can't (a model that was never registered, a query MongoDB rejects, a
// permission that only fails with real data).
//
// Run with:  MONGO_URI=mongodb://127.0.0.1:27017/pcps_test npm run test:integration
// (CI starts a MongoDB service for it.) Without MONGO_URI the tests are skipped.
// Use a throwaway database: the test creates its own users, clubs and events.

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

const MONGO_URI = process.env.MONGO_URI;
const skip = MONGO_URI ? false : "set MONGO_URI to a throwaway MongoDB to run the integration tests";
const PORT = 5600 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}/api`;
const PASSWORD = "Passw0rd!xx";
const stamp = Date.now();

let server;
let mongoose;

// Each client pretends to be a different phone/laptop (the server trusts one
// proxy hop), so the sign-up limit per network doesn't trip as tests add users.
let nextIp = 10;
class Client {
  constructor() { this.cookie = ""; this.ip = `10.1.${Math.floor(nextIp / 250)}.${(nextIp += 1) % 250 + 1}`; }
  async req(method, url, body) {
    const res = await fetch(BASE + url, {
      method,
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", "X-Forwarded-For": this.ip, Cookie: this.cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.getSetCookie?.() || [];
    if (set.length) this.cookie = set.map((c) => c.split(";")[0]).join("; ");
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, json };
  }
}

const day = (n) => new Date(Date.now() + n * 864e5).toISOString();

// Registers through the real API, then makes the account verified, approved
// and (optionally) an admin directly in the database, as an admin would.
async function makeUser(tag, role = "user") {
  const client = new Client();
  const email = `${tag}${stamp}@patancollege.edu.np`;
  const reg = await client.req("POST", "/auth/register", { name: `User ${tag}`, email, password: PASSWORD, studentId: `${tag}${stamp}`, program: "BIT", semester: "3", phone: "9800000000" });
  assert.equal(reg.status, 201, JSON.stringify(reg.json));
  await mongoose.connection.collection("users").updateOne({ email }, { $set: { role, emailVerified: true, approvalStatus: "approved" } });
  const login = await client.req("POST", "/auth/login", { email, password: PASSWORD });
  assert.equal(login.status, 200, JSON.stringify(login.json));
  client.email = email;
  client.studentId = `${tag}${stamp}`;
  client.id = String((await mongoose.connection.collection("users").findOne({ email }))._id);
  return client;
}

before(async () => {
  if (skip) return;
  mongoose = require("mongoose");
  await mongoose.connect(MONGO_URI);
  server = spawn(process.execPath, ["index.js"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, MONGO_URI, PORT: String(PORT), JWT_SECRET: "integration-test-secret-integration-test", CLIENT_ORIGIN: "http://localhost:5173", NODE_ENV: "development", EMAIL_USER: "", EMAIL_APP_PASSWORD: "", BREVO_API_KEY: "" },
    stdio: "ignore",
  });
  for (let i = 0; i < 60; i += 1) {
    try { if ((await fetch(`${BASE}/health`)).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("server did not start");
});

after(async () => {
  if (server) server.kill();
  if (mongoose) await mongoose.disconnect();
});

test("registration, verification gate and login", { skip }, async () => {
  const client = new Client();
  const email = `gate${stamp}@patancollege.edu.np`;
  const reg = await client.req("POST", "/auth/register", { name: "Gate", email, password: PASSWORD, studentId: `G${stamp}`, program: "BIT", semester: "3", phone: "9800000000", role: "admin", emailVerified: true });
  assert.equal(reg.status, 201);
  assert.equal(reg.json.emailSent, false); // no mail server is configured in the test
  const stored = await mongoose.connection.collection("users").findOne({ email });
  assert.equal(stored.role, "user", "the role must never come from the request body");
  assert.equal(stored.emailVerified, false);
  assert.equal((await client.req("POST", "/auth/login", { email, password: PASSWORD })).status, 403);
  assert.equal((await new Client().req("POST", "/auth/register", { name: "Out", email: `o${stamp}@gmail.com`, password: PASSWORD, studentId: "O1", program: "BIT", semester: "3", phone: "9800000000" })).status, 400);
  assert.equal((await new Client().req("POST", "/auth/login", { email: { $ne: null }, password: { $ne: null } })).status, 400);
});

test("event, registration, check-in, walk-in and reports", { skip }, async () => {
  const admin = await makeUser("adm", "admin");
  const s1 = await makeUser("s1");
  const s2 = await makeUser("s2");
  const s3 = await makeUser("s3");

  let r = await admin.req("POST", "/clubs", { name: `Club ${stamp}`, description: "A club used by the integration tests.", category: "Technology" });
  assert.equal(r.status, 201);
  const clubId = (r.json.club || r.json)._id;

  r = await admin.req("POST", "/events/create", { title: "Cap Event", description: "Capacity two event for the integration test.", date: day(5), location: "Hall", capacity: 2, category: "Workshop", price: "Free", club: clubId, registrationDeadline: day(4) });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const event = r.json.event || r.json;

  assert.ok([200, 201].includes((await s1.req("POST", "/registrations/register", { eventId: event._id })).status));
  assert.ok([200, 201].includes((await s2.req("POST", "/registrations/register", { eventId: event._id })).status));
  assert.equal((await s1.req("POST", "/registrations/register", { eventId: event._id })).status, 400, "double registration");
  r = await s3.req("POST", "/registrations/register", { eventId: event._id });
  assert.equal(r.status, 400);
  assert.match(r.json.message, /full/i);

  // waitlist, then promotion when someone cancels
  assert.ok((await s3.req("POST", `/waitlist/${event._id}`)).status < 300);
  const mine = (await s1.req("GET", "/registrations/my")).json.registrations;
  assert.equal(mine.length, 1);
  assert.equal((await s1.req("DELETE", `/registrations/${mine[0]._id}`)).status, 200);
  const promoted = (await s3.req("GET", "/registrations/my")).json.registrations;
  assert.equal(promoted.length, 1, "the waitlisted student is promoted");

  // QR check-in
  const reg2 = (await s2.req("GET", "/registrations/my")).json.registrations[0];
  const code = (await s2.req("GET", `/registrations/${reg2._id}/check-in-code`)).json.code;
  assert.ok(code);
  r = await admin.req("POST", "/admin/check-in", { code });
  assert.equal(r.status, 200);
  assert.equal((await admin.req("POST", "/admin/check-in", { code })).json.alreadyCheckedIn, true);
  assert.equal((await admin.req("POST", "/admin/check-in", { code: "garbage" })).status, 400);

  // registration deadline
  assert.equal((await admin.req("PUT", `/events/${event._id}`, { registrationDeadline: new Date(Date.now() - 1000).toISOString() })).status, 200);
  const s4 = await makeUser("s4");
  r = await s4.req("POST", "/registrations/register", { eventId: event._id });
  assert.equal(r.status, 400);
  assert.match(r.json.message, /closed/i);

  // walk-in on a roomy event
  r = await admin.req("POST", "/events/create", { title: "Open Event", description: "A roomy event for walk-in tests.", date: day(6), location: "Hall", capacity: 50, category: "Workshop", price: "Free", club: clubId });
  const open = r.json.event || r.json;
  r = await admin.req("POST", `/admin/events/${open._id}/walk-in`, { identifier: s4.email });
  assert.equal(r.status, 201);
  assert.equal(r.json.created, true);
  assert.equal((await admin.req("POST", `/admin/events/${open._id}/walk-in`, { identifier: s4.studentId })).json.alreadyCheckedIn, true);
  assert.equal((await admin.req("POST", `/admin/events/${open._id}/walk-in`, { identifier: "nobody@patancollege.edu.np" })).status, 404);

  // admin summaries
  r = await admin.req("GET", "/admin/week");
  assert.equal(r.status, 200);
  assert.ok(r.json.newStudents.current >= 4);
  assert.ok(r.json.upcomingEvents >= 2);
  assert.equal((await admin.req("GET", "/admin/insights")).status, 200);
  assert.equal((await admin.req("GET", "/admin/attendance-report")).status, 200);
  assert.equal((await admin.req("GET", `/admin/events/${event._id}/registrations`)).status, 200);
  assert.ok((await (await fetch(`${BASE}/events/calendar.ics`)).text()).includes("Cap Event"));
});

test("simultaneous registrations never overbook an event", { skip }, async () => {
  const admin = await makeUser("race", "admin");
  const students = [];
  for (let i = 0; i < 6; i += 1) students.push(await makeUser(`rc${i}`));
  const r = await admin.req("POST", "/events/create", { title: "Race Event", description: "Capacity two race condition test.", date: day(5), location: "Hall", capacity: 2, category: "Workshop", price: "Free" });
  const event = r.json.event || r.json;
  const results = await Promise.all(students.map((s) => s.req("POST", "/registrations/register", { eventId: event._id })));
  const accepted = results.filter((x) => x.status < 300).length;
  const stored = await mongoose.connection.collection("registrations").countDocuments({ event: new mongoose.Types.ObjectId(event._id), status: { $ne: "cancelled" } });
  assert.ok(stored <= 2, `overbooked: ${stored} registrations for 2 seats`); // the hard rule
  assert.equal(stored, accepted, "everyone told 'registered' really is registered");
  assert.ok(stored >= 1, "colliding requests retry, so the seats don't all stay empty");
});

test("club leaders can only manage their own club", { skip }, async () => {
  const admin = await makeUser("lad", "admin");
  const leader = await makeUser("lead");
  const student = await makeUser("lstu");
  const clubA = ((await admin.req("POST", "/clubs", { name: `Club A ${stamp}`, description: "Club A for leader tests here.", category: "Technology" })).json);
  const clubB = ((await admin.req("POST", "/clubs", { name: `Club B ${stamp}`, description: "Club B for leader tests here.", category: "Technology" })).json);
  const idA = (clubA.club || clubA)._id;
  const idB = (clubB.club || clubB)._id;
  assert.equal((await admin.req("PUT", `/admin/clubs/${idA}/leaders`, { userIds: [leader.id] })).status, 200);
  const evB = (await admin.req("POST", "/events/create", { title: "Event B", description: "An event of club B for tests.", date: day(4), location: "R", capacity: 5, category: "W", price: "Free", club: idB })).json;
  const eventB = (evB.event || evB)._id;
  const evA = (await admin.req("POST", "/events/create", { title: "Event A", description: "An event of club A for tests.", date: day(4), location: "R", capacity: 5, category: "W", price: "Free", club: idA })).json;
  const eventA = (evA.event || evA)._id;
  await student.req("POST", "/registrations/register", { eventId: eventB });

  assert.equal((await leader.req("PUT", `/events/${eventA}`, { location: "New room" })).status, 200);
  for (const [method, url, body] of [
    ["PUT", `/events/${eventB}`, { location: "Hacked" }],
    ["DELETE", `/events/${eventB}`],
    ["GET", `/admin/events/${eventB}/registrations`],
    ["POST", `/admin/events/${eventB}/announce`, { message: "hello" }],
    ["GET", `/admin/clubs/${idB}/members`],
    ["POST", `/clubs/${idB}/posts`, { body: "hello" }],
    ["POST", "/events/create", { title: "Other", description: "Event for the wrong club here.", date: day(5), location: "R", capacity: 5, category: "W", price: "Free", club: idB }],
  ]) {
    assert.equal((await leader.req(method, url, body)).status, 403, `${method} ${url}`);
  }
  assert.equal((await leader.req("GET", "/admin/users")).status, 403);
  assert.equal((await student.req("GET", "/admin/week")).status, 403);
});

test("the scheduled email jobs run against real data", { skip }, async () => {
  const admin = await makeUser("job", "admin");
  const student = await makeUser("jobs");
  const r = await admin.req("POST", "/events/create", { title: "Tomorrow Event", description: "An event starting within a day.", date: new Date(Date.now() + 20 * 36e5).toISOString(), location: "Hall", capacity: 10, category: "Workshop", price: "Free" });
  const event = r.json.event || r.json;
  await student.req("POST", "/registrations/register", { eventId: event._id });
  const env = { ...process.env, MONGO_URI, EMAIL_USER: "", EMAIL_APP_PASSWORD: "", BREVO_API_KEY: "" };
  const run = (script, args = []) =>
    new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join(__dirname, "..", "scripts", script), ...args], { env, cwd: path.join(__dirname, "..") });
      let out = "";
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (out += d));
      child.on("close", (code) => resolve({ code, out }));
    });
  // Sending itself fails here (no mail server); what matters is that the job
  // gets as far as trying instead of crashing on an unregistered model.
  const reminders = await run("sendEventReminders.js");
  assert.doesNotMatch(reminders.out, /Schema hasn't been registered/);
  assert.match(reminders.out, /Found \d+ event/);
  const digest = await run("sendWeeklyDigest.js", ["--dry"]);
  assert.doesNotMatch(digest.out, /Schema hasn't been registered/);
  assert.equal(digest.code, 0, digest.out);
});

test("the notification bell tells the right people, and only them", { skip }, async () => {
  const admin = await makeUser("bda", "admin");
  const asha = await makeUser("bds");
  const other = await makeUser("bdo");

  let r = await admin.req("POST", "/clubs", { name: `Bell Club ${stamp}`, description: "A club used by the bell integration test.", category: "Technology" });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const clubId = (r.json.club || r.json)._id;
  r = await admin.req("POST", "/events/create", { title: "Bell Event", description: "Approval event for the bell integration test.", date: day(6), location: "Lab 1", capacity: 5, category: "Workshop", price: "Free", club: clubId, requiresApproval: true });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const event = r.json.event || r.json;

  const bell = async (who) => (await who.req("GET", "/notifications")).json;
  const types = (list) => list.notifications.map((n) => n.type);

  // Nobody is told anything before something happens to them.
  assert.equal((await bell(asha)).unreadCount, 0);

  // A join request tells the admins -- not the student, not other students.
  assert.equal((await asha.req("POST", "/registrations/register", { eventId: event._id })).status, 201);
  const adminBell = await bell(admin);
  assert.ok(types(adminBell).includes("join_request"), "the admin hears about the request");
  assert.deepEqual(types(await bell(asha)), []);
  assert.deepEqual(types(await bell(other)), []);

  // Approving tells that student, and only them.
  const regId = (await asha.req("GET", "/registrations/my")).json.registrations[0]._id;
  assert.equal((await admin.req("PUT", `/admin/registrations/${regId}/decision`, { decision: "approve" })).status, 200);
  let ashaBell = await bell(asha);
  assert.deepEqual(types(ashaBell), ["join_approved"]);
  assert.equal(ashaBell.unreadCount, 1);
  assert.match(ashaBell.notifications[0].link, /^\/events\//);
  assert.deepEqual(types(await bell(other)), []);

  // Changing the event's place tells people who registered.
  assert.equal((await admin.req("PUT", `/events/${event._id}`, { location: "Lab 2" })).status, 200);
  assert.ok(types(await bell(asha)).includes("event_changed"));
  assert.deepEqual(types(await bell(other)), []);

  // Marking read only clears your own.
  assert.equal((await asha.req("PUT", "/notifications/read-all")).status, 200);
  assert.equal((await bell(asha)).unreadCount, 0);
  assert.ok((await bell(admin)).unreadCount > 0, "someone else's messages stay unread");

  // Logged-out visitors get nothing.
  assert.equal((await new Client().req("GET", "/notifications")).status, 401);
});

test("clubs that approve their members: request, review, approve", { skip }, async () => {
  const admin = await makeUser("cra", "admin");
  const leader = await makeUser("crl");
  const asha = await makeUser("crs");
  const ram = await makeUser("crr");

  let r = await admin.req("POST", "/clubs", { name: `Gated ${stamp}`, description: "A club that approves its members.", category: "Technology", requiresApproval: true });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const club = r.json.club || r.json;
  assert.equal(club.requiresApproval, true);
  assert.equal((await admin.req("PUT", `/admin/clubs/${club._id}/leaders`, { userIds: [leader.id] })).status, 200);

  // A request is not a membership.
  r = await asha.req("POST", "/club-memberships/join", { clubId: club._id });
  assert.equal(r.status, 202, JSON.stringify(r.json));
  assert.equal(r.json.pending, true);
  assert.equal((await asha.req("POST", "/club-memberships/join", { clubId: club._id })).status, 400, "asking twice");
  assert.equal((await asha.req("GET", "/club-memberships/my")).json.memberships.length, 0);
  assert.equal((await asha.req("GET", "/club-memberships/requests/my")).json.requests.length, 1);
  assert.equal((await ram.req("GET", "/club-memberships/requests/my")).json.requests.length, 0, "other students don't see it");
  const publicClub = (await new Client().req("GET", "/clubs")).json.clubs.find((c) => c._id === club._id);
  assert.equal(publicClub.memberCount, 0, "a waiting request is not counted as a member");

  // The leader and admin are told; only staff of this club can read or decide.
  assert.ok((await leader.req("GET", "/notifications")).json.notifications.some((n) => n.type === "club_join_request"));
  assert.ok((await admin.req("GET", "/notifications")).json.notifications.some((n) => n.type === "club_join_request"));
  assert.equal((await ram.req("GET", `/admin/clubs/${club._id}/requests`)).status, 403);
  r = await leader.req("GET", `/admin/clubs/${club._id}/requests`);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.requests.length, 1);
  assert.equal(r.json.requests[0].email, asha.email);
  const requestId = r.json.requests[0]._id;
  // The club lists get a "N waiting" badge from the counts: staff of the club only.
  assert.equal((await leader.req("GET", "/admin/club-request-counts")).json.counts[club._id], 1);
  assert.equal((await admin.req("GET", "/admin/club-request-counts")).json.counts[club._id], 1);
  assert.equal((await ram.req("GET", "/admin/club-request-counts")).status, 403);
  assert.equal((await ram.req("PUT", `/admin/clubs/${club._id}/requests/${requestId}/decision`, { decision: "approve" })).status, 403);
  assert.equal((await leader.req("PUT", `/admin/clubs/${club._id}/requests/${requestId}/decision`, { decision: "maybe" })).status, 400);

  // Approving makes a real member and tells the student; a second try finds nothing.
  assert.equal((await leader.req("PUT", `/admin/clubs/${club._id}/requests/${requestId}/decision`, { decision: "approve" })).status, 200);
  assert.equal((await leader.req("PUT", `/admin/clubs/${club._id}/requests/${requestId}/decision`, { decision: "approve" })).status, 404);
  assert.equal((await asha.req("GET", "/club-memberships/my")).json.memberships.length, 1);
  assert.equal((await asha.req("GET", "/club-memberships/requests/my")).json.requests.length, 0);
  assert.ok((await asha.req("GET", "/notifications")).json.notifications.some((n) => n.type === "club_join_approved"));
  assert.equal((await leader.req("GET", "/admin/club-request-counts")).json.counts[club._id], undefined, "nobody left waiting");
  const audit = (await admin.req("GET", "/admin/audit")).json.entries;
  assert.ok(audit.some((e) => e.action === "club.join_approved" && e.summary.includes(`Gated ${stamp}`)), "the decision is in the activity log");

  // Declining and withdrawing never create a membership.
  assert.equal((await ram.req("POST", "/club-memberships/join", { clubId: club._id })).status, 202);
  const ramRequest = (await admin.req("GET", `/admin/clubs/${club._id}/requests`)).json.requests[0]._id;
  assert.equal((await admin.req("PUT", `/admin/clubs/${club._id}/requests/${ramRequest}/decision`, { decision: "reject" })).status, 200);
  assert.equal((await ram.req("GET", "/club-memberships/my")).json.memberships.length, 0);
  assert.ok((await ram.req("GET", "/notifications")).json.notifications.some((n) => n.type === "club_join_declined"));
  assert.equal((await ram.req("POST", "/club-memberships/join", { clubId: club._id })).status, 202);
  assert.equal((await ram.req("DELETE", `/club-memberships/${club._id}`)).json.message, "Request withdrawn");
  assert.equal((await ram.req("GET", "/club-memberships/requests/my")).json.requests.length, 0);

  // Deleting the club clears its requests.
  assert.equal((await ram.req("POST", "/club-memberships/join", { clubId: club._id })).status, 202);
  assert.equal((await admin.req("DELETE", `/clubs/${club._id}`)).status, 200);
  assert.equal(await mongoose.connection.collection("clubjoinrequests").countDocuments({ club: new mongoose.Types.ObjectId(club._id) }), 0);
});

test("a club that stops approving lets the waiting students in", { skip }, async () => {
  const admin = await makeUser("coa", "admin");
  const asha = await makeUser("cos");
  let r = await admin.req("POST", "/clubs", { name: `Opening ${stamp}`, description: "A club that opens up later.", category: "Arts", requiresApproval: true });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const club = r.json.club || r.json;
  assert.equal((await asha.req("POST", "/club-memberships/join", { clubId: club._id })).status, 202);
  assert.equal((await asha.req("GET", "/club-memberships/my")).json.memberships.length, 0);

  r = await admin.req("PUT", `/clubs/${club._id}`, { requiresApproval: false });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal((await asha.req("GET", "/club-memberships/my")).json.memberships.length, 1, "let in");
  assert.equal((await asha.req("GET", "/club-memberships/requests/my")).json.requests.length, 0);
  assert.ok((await asha.req("GET", "/notifications")).json.notifications.some((n) => n.type === "club_join_approved"));
});

test("club news: post, bell, Dashboard feed, edit and pin", { skip }, async () => {
  const admin = await makeUser("cna", "admin");
  const member = await makeUser("cnm");
  const outsider = await makeUser("cno");

  let r = await admin.req("POST", "/clubs", { name: `News ${stamp}`, description: "A club used by the club news integration test.", category: "Arts" });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const clubId = (r.json.club || r.json)._id;
  assert.equal((await member.req("POST", "/club-memberships/join", { clubId })).status, 201);

  const bellTypes = async (who) => (await who.req("GET", "/notifications")).json.notifications.map((n) => n.type);

  // Only people who run the club can post; the post reaches members' bells and nobody else's.
  assert.equal((await member.req("POST", `/clubs/${clubId}/posts`, { body: "Not allowed" })).status, 403);
  r = await admin.req("POST", `/clubs/${clubId}/posts`, { body: "First update" });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const first = r.json.post._id;
  r = await admin.req("POST", `/clubs/${clubId}/posts`, { body: "Second update" });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const second = r.json.post._id;
  assert.equal((await bellTypes(member)).filter((t) => t === "club_news").length, 2);
  assert.ok(!(await bellTypes(outsider)).includes("club_news"));
  assert.ok(!(await bellTypes(admin)).includes("club_news"), "the author isn't told about their own post");

  // The Dashboard feed shows a member their club's posts, newest first, and an outsider nothing.
  const feed = (await member.req("GET", "/club-memberships/news")).json.posts;
  assert.deepEqual(feed.map((p) => p.body), ["Second update", "First update"]);
  assert.equal(feed[0].club.name, `News ${stamp}`);
  assert.deepEqual((await outsider.req("GET", "/club-memberships/news")).json.posts, []);

  // Editing fixes the text and marks it edited; members can't edit or pin.
  assert.equal((await member.req("PATCH", `/clubs/${clubId}/posts/${first}`, { body: "Hacked" })).status, 403);
  assert.equal((await member.req("PUT", `/clubs/${clubId}/posts/${first}/pin`, { pinned: true })).status, 403);
  r = await admin.req("PATCH", `/clubs/${clubId}/posts/${first}`, { body: "First update (fixed)" });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.ok(r.json.post.editedAt);

  // Pinning puts a post first; pinning another moves the pin.
  assert.equal((await admin.req("PUT", `/clubs/${clubId}/posts/${first}/pin`, { pinned: true })).status, 200);
  let posts = (await outsider.req("GET", `/clubs/${clubId}/posts`)).json.posts;
  assert.deepEqual(posts.map((p) => p.body), ["First update (fixed)", "Second update"]);
  assert.equal(posts[0].pinned, true);
  assert.equal((await admin.req("PUT", `/clubs/${clubId}/posts/${second}/pin`, { pinned: true })).status, 200);
  posts = (await outsider.req("GET", `/clubs/${clubId}/posts`)).json.posts;
  assert.deepEqual(posts.map((p) => [p.body, p.pinned]), [["Second update", true], ["First update (fixed)", false]]);

  // A post can only be changed through its own club.
  const other = (await admin.req("POST", "/clubs", { name: `Other ${stamp}`, description: "Another club for the news integration test.", category: "Arts" })).json;
  const otherId = (other.club || other)._id;
  assert.equal((await admin.req("PATCH", `/clubs/${otherId}/posts/${first}`, { body: "Wrong club" })).status, 404);
  assert.equal((await admin.req("PUT", `/clubs/${otherId}/posts/${first}/pin`, { pinned: true })).status, 404);

  // Deleting removes it from the page and the feed.
  assert.equal((await admin.req("DELETE", `/clubs/${clubId}/posts/${second}`)).status, 200);
  assert.deepEqual((await member.req("GET", "/club-memberships/news")).json.posts.map((p) => p.body), ["First update (fixed)"]);
});

test("club idea box: members suggest, leaders and admins read, and it is cleaned up", { skip }, async () => {
  const admin = await makeUser("cia", "admin");
  const leader = await makeUser("cil");
  const member = await makeUser("cim");
  const second = await makeUser("cis");
  const outsider = await makeUser("cio");

  let r = await admin.req("POST", "/clubs", { name: `Ideas ${stamp}`, description: "A club used by the idea box integration test.", category: "Arts" });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const clubId = (r.json.club || r.json)._id;
  assert.equal((await admin.req("PUT", `/admin/clubs/${clubId}/leaders`, { userIds: [leader.id] })).status, 200);
  assert.equal((await member.req("POST", "/club-memberships/join", { clubId })).status, 201);
  assert.equal((await second.req("POST", "/club-memberships/join", { clubId })).status, 201);

  const bellTypes = async (who) => (await who.req("GET", "/notifications")).json.notifications.map((n) => n.type);
  const url = `/clubs/${clubId}/ideas`;

  // Logged-out people get nothing; people who have not joined cannot suggest.
  assert.equal((await new Client().req("GET", url)).status, 401);
  assert.equal((await outsider.req("POST", url, { body: "Not a member" })).status, 403);

  // Bad text is refused, including an object slipped in where text belongs.
  assert.equal((await member.req("POST", url, { body: { $ne: 1 } })).status, 400);
  assert.equal((await member.req("POST", url, { body: "   " })).status, 400);
  assert.equal((await member.req("POST", url, { body: "x".repeat(301) })).status, 400);

  // A suggestion reaches the leader's bell, not the author's.
  r = await member.req("POST", url, { body: "A quiz night" });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const mine = r.json.idea._id;
  assert.ok((await bellTypes(leader)).includes("club_idea"));
  assert.ok(!(await bellTypes(member)).includes("club_idea"));

  // Three waiting ideas is the limit per member.
  assert.equal((await member.req("POST", url, { body: "A trip" })).status, 201);
  assert.equal((await member.req("POST", url, { body: "A workshop" })).status, 201);
  assert.equal((await member.req("POST", url, { body: "One too many" })).status, 400);

  // The author sees only their own; the leader and the admin see everything.
  r = await second.req("POST", url, { body: "A film night" });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const theirs = r.json.idea._id;
  let list = (await member.req("GET", url)).json;
  assert.equal(list.canReadAll, false);
  assert.equal(list.ideas.length, 3);
  assert.ok(list.ideas.every((i) => i.mine));
  list = (await leader.req("GET", url)).json;
  assert.equal(list.canReadAll, true);
  assert.equal(list.ideas.length, 4);
  assert.equal((await admin.req("GET", url)).json.ideas.length, 4);
  assert.deepEqual((await outsider.req("GET", url)).json.ideas, []);

  // Only the author, a leader or an admin can remove one, and only through its own club.
  assert.equal((await outsider.req("DELETE", `${url}/${mine}`)).status, 403);
  assert.equal((await second.req("DELETE", `${url}/${mine}`)).status, 403);
  const other = (await admin.req("POST", "/clubs", { name: `Ideas other ${stamp}`, description: "Another club for the idea box integration test.", category: "Arts" })).json;
  assert.equal((await admin.req("DELETE", `/clubs/${(other.club || other)._id}/ideas/${mine}`)).status, 404);
  assert.equal((await member.req("DELETE", `${url}/${mine}`)).status, 200);
  assert.equal((await leader.req("DELETE", `${url}/${theirs}`)).status, 200);
  assert.equal((await member.req("GET", url)).json.ideas.length, 2);

  // Deleting an account takes its ideas along; deleting the club takes the rest.
  const ideas = mongoose.connection.collection("clubideas");
  const clubObjectId = new mongoose.Types.ObjectId(clubId);
  assert.equal((await member.req("DELETE", "/auth/account", { password: PASSWORD })).status, 200);
  assert.equal(await ideas.countDocuments({ club: clubObjectId }), 0);
  r = await second.req("POST", url, { body: "Another film night" });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.equal(await ideas.countDocuments({ club: clubObjectId }), 1);
  assert.equal((await admin.req("DELETE", `/clubs/${clubId}`)).status, 200);
  assert.equal(await ideas.countDocuments({ club: clubObjectId }), 0);
});

test("club polls: leaders ask, members vote once, votes stay private and are cleaned up", { skip }, async () => {
  const admin = await makeUser("cpa", "admin");
  const leader = await makeUser("cpl");
  const member = await makeUser("cpm");
  const second = await makeUser("cps");
  const outsider = await makeUser("cpo");

  let r = await admin.req("POST", "/clubs", { name: `Polls ${stamp}`, description: "A club used by the polls integration test.", category: "Arts" });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const clubId = (r.json.club || r.json)._id;
  assert.equal((await admin.req("PUT", `/admin/clubs/${clubId}/leaders`, { userIds: [leader.id] })).status, 200);
  assert.equal((await member.req("POST", "/club-memberships/join", { clubId })).status, 201);
  assert.equal((await second.req("POST", "/club-memberships/join", { clubId })).status, 201);

  const url = `/clubs/${clubId}/polls`;
  const bellTypes = async (who) => (await who.req("GET", "/notifications")).json.notifications.map((n) => n.type);

  // Logged-out people and non-members get nothing; members cannot start one.
  assert.equal((await new Client().req("GET", url)).status, 401);
  assert.equal((await outsider.req("GET", url)).status, 403);
  assert.equal((await member.req("POST", url, { question: "Which day?", options: ["Fri", "Sat"] })).status, 403);

  // Bad input is refused, including objects slipped in where text belongs.
  assert.equal((await leader.req("POST", url, { question: "Which day?", options: ["Only one"] })).status, 400);
  assert.equal((await leader.req("POST", url, { question: { $ne: 1 }, options: ["Fri", "Sat"] })).status, 400);
  assert.equal((await leader.req("POST", url, { question: "Which day?", options: ["Fri", "Sat"], days: 99 })).status, 400);

  // A leader starts a poll; the members hear about it, the leader does not.
  r = await leader.req("POST", url, { question: "Which day?", options: ["Fri", "Sat"], days: 3 });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const pollId = r.json.poll._id;
  assert.ok((await bellTypes(member)).includes("club_poll"));
  assert.ok(!(await bellTypes(leader)).includes("club_poll"));

  // A poll closing within a day nudges the members who have not voted, once.
  await mongoose.connection.collection("clubpolls").updateOne({ _id: new mongoose.Types.ObjectId(pollId) }, { $set: { closesAt: new Date(Date.now() + 3600 * 1000) } });
  const { remindPollVoters } = require("../utils/pollReminders");
  assert.equal(await remindPollVoters(), 2);
  assert.ok((await bellTypes(second)).includes("club_poll_closing"));
  assert.ok(!(await bellTypes(leader)).includes("club_poll_closing"));
  assert.equal(await remindPollVoters(), 0);

  // Members vote once; voting again moves the vote; bad options are refused.
  const vote = (who, option, id = pollId) => who.req("POST", `${url}/${id}/vote`, { option });
  // Before voting, the poll waits on the member's Dashboard list.
  const waiting = async (who) => (await who.req("GET", "/club-memberships/polls")).json.polls.map((p) => p._id);
  assert.ok((await waiting(member)).includes(pollId));
  assert.deepEqual(await waiting(outsider), []);
  assert.equal((await vote(outsider, 0)).status, 403);
  assert.equal((await vote(member, 5)).status, 400);
  assert.equal((await vote(member, "0")).status, 400);
  assert.equal((await vote(member, 0)).status, 200);
  assert.equal((await vote(second, 0)).status, 200);
  let poll = (await member.req("GET", url)).json.polls[0];
  assert.deepEqual(poll.options.map((o) => o.count), [2, 0]);
  assert.equal(poll.myVote, 0);
  assert.equal((await vote(member, 1)).status, 200);
  poll = (await member.req("GET", url)).json.polls[0];
  assert.deepEqual(poll.options.map((o) => o.count), [1, 1]);
  assert.equal(poll.myVote, 1);
  assert.equal(poll.total, 2);
  // Nobody learns who voted for what.
  const raw = JSON.stringify((await leader.req("GET", url)).json);
  assert.ok(!raw.includes(member.id) && !raw.includes(second.id));
  assert.equal((await admin.req("GET", url)).status, 200);
  // Once voted, it leaves the waiting list; the leaders' stats count the votes.
  assert.ok(!(await waiting(member)).includes(pollId));
  assert.ok(!(await waiting(second)).includes(pollId));
  r = await leader.req("GET", `/leader/clubs/${clubId}/stats`);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.deepEqual(r.json.stats.latestPoll, { votes: 2, closed: false });
  assert.equal((await member.req("GET", `/leader/clubs/${clubId}/stats`)).status, 403);

  // Deleting an account takes its vote back and leaves the poll.
  assert.equal((await member.req("DELETE", "/auth/account", { password: PASSWORD })).status, 200);
  poll = (await second.req("GET", url)).json.polls[0];
  assert.deepEqual(poll.options.map((o) => o.count), [1, 0]);

  // Ending a poll early: members can't, leaders can; it can't be ended twice.
  assert.equal((await second.req("POST", `${url}/${pollId}/close`)).status, 403);
  r = await leader.req("POST", `${url}/${pollId}/close`);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.poll.closed, true);
  assert.equal((await leader.req("POST", `${url}/${pollId}/close`)).status, 400);
  assert.equal((await vote(second, 1)).status, 400);

  // A closed poll still shows its results but takes no more votes.
  const polls = mongoose.connection.collection("clubpolls");
  await polls.updateOne({ _id: new mongoose.Types.ObjectId(pollId) }, { $set: { closesAt: new Date(Date.now() - 1000) } });
  assert.equal((await vote(second, 1)).status, 400);
  assert.equal((await second.req("GET", url)).json.polls[0].closed, true);

  // Only a leader or an admin removes a poll, and only through its own club.
  assert.equal((await second.req("DELETE", `${url}/${pollId}`)).status, 403);
  const other = (await admin.req("POST", "/clubs", { name: `Polls other ${stamp}`, description: "Another club for the polls integration test.", category: "Arts" })).json;
  assert.equal((await admin.req("DELETE", `/clubs/${(other.club || other)._id}/polls/${pollId}`)).status, 404);
  assert.equal((await leader.req("DELETE", `${url}/${pollId}`)).status, 200);
  assert.deepEqual((await second.req("GET", url)).json.polls, []);

  // Deleting the club takes its polls along.
  r = await leader.req("POST", url, { question: "Another?", options: ["Yes", "No"] });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const clubObjectId = new mongoose.Types.ObjectId(clubId);
  assert.equal(await polls.countDocuments({ club: clubObjectId }), 1);
  assert.equal((await admin.req("DELETE", `/clubs/${clubId}`)).status, 200);
  assert.equal(await polls.countDocuments({ club: clubObjectId }), 0);
});

test("sign-up questions: required answers are enforced and kept through the waitlist", { skip }, async () => {
  const admin = await makeUser("sqa", "admin");
  const s1 = await makeUser("sq1");
  const s2 = await makeUser("sq2");
  const s3 = await makeUser("sq3");

  let r = await admin.req("POST", "/clubs", { name: `Questions ${stamp}`, description: "A club used by the sign-up questions test.", category: "Technology" });
  assert.equal(r.status, 201);
  const clubId = (r.json.club || r.json)._id;
  r = await admin.req("POST", "/events/create", { title: "Questions Event", description: "Capacity one event with sign-up questions.", date: day(5), location: "Hall", capacity: 1, category: "Workshop", price: "Free", club: clubId });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const event = r.json.event || r.json;

  // Only organisers set the questions, and the limits hold.
  assert.equal((await s1.req("PUT", `/events/${event._id}/signup-questions`, { questions: [{ text: "Size?", required: true }] })).status, 403);
  assert.equal((await admin.req("PUT", `/events/${event._id}/signup-questions`, { questions: [{ text: "a1" }, { text: "b2" }, { text: "c3" }, { text: "d4" }] })).status, 400);
  r = await admin.req("PUT", `/events/${event._id}/signup-questions`, { questions: [{ text: "T-shirt size?", required: true }, { text: "Notes?" }] });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.signupQuestions.length, 2);

  // A missing required answer is refused; a full one is kept.
  r = await s1.req("POST", "/registrations/register", { eventId: event._id, answers: ["", "hi"] });
  assert.equal(r.status, 400);
  assert.match(r.json.message, /T-shirt size/);
  r = await s1.req("POST", "/registrations/register", { eventId: event._id, answers: ["M", ""] });
  assert.ok([200, 201].includes(r.status), JSON.stringify(r.json));

  // The event is full: the waitlist asks the same questions and keeps the answers.
  assert.equal((await s2.req("POST", `/waitlist/${event._id}`, { answers: [""] })).status, 400);
  assert.ok((await s2.req("POST", `/waitlist/${event._id}`, { answers: ["XL"] })).status < 300);

  // Organisers see the answers; promotion carries them over.
  const mine = (await s1.req("GET", "/registrations/my")).json.registrations;
  assert.equal((await s1.req("DELETE", `/registrations/${mine[0]._id}`)).status, 200);
  r = await admin.req("GET", `/admin/events/${event._id}/registrations`);
  assert.equal(r.status, 200);
  const rows = r.json.registrations || r.json;
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].answers.map((a) => [a.question, a.answer]), [["T-shirt size?", "XL"]]);
  assert.equal((await s3.req("GET", "/registrations/my")).status, 200);
});

test("event sponsors: only organisers set them, links are checked, and the public event shows them", { skip }, async () => {
  const admin = await makeUser("spa", "admin");
  const s1 = await makeUser("sp1");
  let r = await admin.req("POST", "/clubs", { name: `Sponsors ${stamp}`, description: "A club used by the sponsors test.", category: "Technology" });
  assert.equal(r.status, 201);
  const clubId = (r.json.club || r.json)._id;
  r = await admin.req("POST", "/events/create", { title: "Sponsored Event", description: "An event with a few sponsors listed.", date: day(5), location: "Hall", capacity: 20, category: "Workshop", price: "Free", club: clubId });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const event = r.json.event || r.json;

  assert.equal((await s1.req("PUT", `/events/${event._id}/sponsors`, { sponsors: [{ name: "Acme" }] })).status, 403);
  assert.equal((await admin.req("PUT", `/events/${event._id}/sponsors`, { sponsors: [{ name: "Acme", url: "javascript:alert(1)" }] })).status, 400);
  r = await admin.req("PUT", `/events/${event._id}/sponsors`, { sponsors: [{ name: "Acme", url: "acme.com.np" }, { name: "Local Cafe" }] });
  assert.equal(r.status, 200, JSON.stringify(r.json));

  r = await new Client().req("GET", `/events/${event._id}`);
  assert.equal(r.status, 200);
  const shown = (r.json.event || r.json).sponsors;
  assert.deepEqual(shown.map((s) => [s.name, s.url]), [["Acme", "https://acme.com.np/"], ["Local Cafe", ""]]);
});

test("club alumni: a member steps down, is listed, and can be removed", { skip }, async () => {
  const admin = await makeUser("ala", "admin");
  const s1 = await makeUser("al1");
  const s2 = await makeUser("al2");
  let r = await admin.req("POST", "/clubs", { name: `Alumni ${stamp}`, description: "A club used by the alumni test.", category: "Technology" });
  assert.equal(r.status, 201);
  const clubId = (r.json.club || r.json)._id;

  // Only members can step down, and the year is checked.
  assert.equal((await s1.req("POST", `/club-memberships/${clubId}/alumni`, {})).status, 403);
  assert.ok((await s1.req("POST", "/club-memberships/join", { clubId })).status < 300);
  assert.equal((await s1.req("POST", `/club-memberships/${clubId}/alumni`, { year: 1850 })).status, 400);
  r = await s1.req("POST", `/club-memberships/${clubId}/alumni`, { year: new Date().getFullYear(), note: "Treasurer" });
  assert.equal(r.status, 200, JSON.stringify(r.json));

  // They left the club and are on the list, visible to other students.
  assert.equal((await s1.req("GET", "/club-memberships/my")).json.memberships.length, 0);
  r = await s2.req("GET", `/clubs/${clubId}/alumni`);
  assert.equal(r.status, 200);
  assert.equal(r.json.alumni.length, 1);
  assert.equal(r.json.alumni[0].note, "Treasurer");
  assert.equal(r.json.alumni[0].mine, false);
  const entryId = r.json.alumni[0]._id;
  r = await admin.req("GET", `/leader/clubs/${clubId}/stats`);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.stats.alumni, 1, "the leader stats count the alumni");

  // Another student cannot remove it; an admin can.
  assert.equal((await s2.req("DELETE", `/clubs/${clubId}/alumni/${entryId}`)).status, 403);
  assert.equal((await admin.req("DELETE", `/clubs/${clubId}/alumni/${entryId}`)).status, 200);
  assert.equal((await s2.req("GET", `/clubs/${clubId}/alumni`)).json.alumni.length, 0);
});

test("campus venues: only admins edit them, names stay unique, and everyone can read them", { skip }, async () => {
  const admin = await makeUser("vna", "admin");
  const s1 = await makeUser("vn1");
  const name = `Seminar Hall ${stamp}`;

  assert.equal((await s1.req("POST", "/admin/venues", { name })).status, 403);
  assert.equal((await admin.req("POST", "/admin/venues", { name: "" })).status, 400);
  let r = await admin.req("POST", "/admin/venues", { name, directions: "Block B, 2nd floor" });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const id = r.json.venue._id;
  assert.equal((await admin.req("POST", "/admin/venues", { name: name.toUpperCase() })).status, 400, "same name, other capitals");

  r = await new Client().req("GET", "/venues");
  assert.equal(r.status, 200);
  assert.ok(r.json.venues.some((v) => v.name === name && v.directions === "Block B, 2nd floor"));

  r = await admin.req("PUT", `/admin/venues/${id}`, { name, directions: "Block C" });
  assert.equal(r.status, 200);
  assert.equal(r.json.venue.directions, "Block C");
  assert.equal((await admin.req("DELETE", `/admin/venues/${id}`)).status, 200);
  assert.equal((await admin.req("DELETE", `/admin/venues/${id}`)).status, 404);
});
