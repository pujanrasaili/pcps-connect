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

class Client {
  constructor() { this.cookie = ""; }
  async req(method, url, body) {
    const res = await fetch(BASE + url, {
      method,
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", Cookie: this.cookie },
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
