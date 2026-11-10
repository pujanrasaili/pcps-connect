// Builds docs/API.md -- a table of every API endpoint, who may call it, and a
// one-line description -- by reading the route files (the descriptions are the
// table below). Run `npm run docs:api` after changing a route; a
// test fails if the committed file is out of date, so it can't drift.
//
// Plain text parsing on purpose: the route files are written in one regular
// style (router.get("/path", middleware, handler)) and this needs no
// dependencies.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const LEVELS = ["Public", "Logged in", "Staff", "Admin"];
const MIDDLEWARE_LEVEL = { protect: "Logged in", staffOnly: "Staff", adminOnly: "Admin" };
const ACCESS_LABEL = {
  Public: "Anyone",
  "Logged in": "Logged-in student",
  Staff: "Admin or club leader",
  Admin: "Admin only",
};

const stronger = (a, b) => (LEVELS.indexOf(b) > LEVELS.indexOf(a) ? b : a);

// { "/api/auth": "routes/authRoutes.js", ... } from index.js
function readMounts(indexSource) {
  const requires = {};
  for (const m of indexSource.matchAll(/const (\w+) = require\("\.\/(routes\/[\w]+)"\)/g)) requires[m[1]] = `${m[2]}.js`;
  const mounts = [];
  for (const m of indexSource.matchAll(/app\.use\("(\/api\/[\w-]+)", (\w+)\)/g)) {
    if (requires[m[2]]) mounts.push({ prefix: m[1], file: requires[m[2]] });
  }
  return mounts;
}

function readRoutes(source) {
  const routes = [];
  let level = "Public";
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    const use = line.match(/^router\.use\((\w+)\);/);
    if (use && MIDDLEWARE_LEVEL[use[1]]) {
      level = stronger(level, MIDDLEWARE_LEVEL[use[1]]);
      continue;
    }
    const route = line.match(/^router\.(get|post|put|patch|delete)\("([^"]*)",\s*(.+)\);$/);
    if (!route) continue;
    const args = route[3].split(",").map((a) => a.trim());
    const handler = args[args.length - 1].replace(/\(.*$/, "");
    let access = level;
    let note = "";
    for (const arg of args.slice(0, -1)) {
      if (MIDDLEWARE_LEVEL[arg]) access = stronger(access, MIDDLEWARE_LEVEL[arg]);
      else if (arg === "optionalAuth") note = "logged-in users see more";
      else if (/Limiter$/.test(arg)) note = note || "rate limited";
      else if (/^upload\./.test(arg)) note = note ? `${note}; image upload` : "image upload";
    }
    routes.push({ method: route[1].toUpperCase(), subpath: route[2] === "/" ? "" : route[2], access, note, handler });
  }
  return routes;
}

// One plain sentence per handler. Every route must have one: the test suite
// fails for a route missing here, so new endpoints get documented.
const DESCRIPTIONS = {
  getCalendarFeed: "Public calendar feed (.ics) of upcoming events, optionally ?club=<id>, for subscribing in Google, Apple or Outlook Calendar.",
  getHealth: "Uptime check: 200 when the database is connected, 503 otherwise; also names the email method set up (brevo, gmail-smtp or not-configured).",
  register: "Create a student account (PCPS email addresses only); sends a verification email.",
  login: "Log in; sets the session cookie.",
  logout: "Log out; clears the session cookie.",
  getMe: "The logged-in user's own account.",
  updateProfile: "Edit your own profile (name, student ID, program, semester, phone, email preferences).",
  toggleFavoriteClub: "Set or clear your one favourite club.",
  changePassword: "Change your own password (needs the current one).",
  exportMyData: "Download everything the site stores about you, as JSON.",
  deleteAccount: "Delete your own account and everything attached to it (needs your password).",
  forgotPassword: "Email a password-reset link; the reply is the same whether or not the address exists.",
  resetPassword: "Set a new password using a reset-link token.",
  verifyEmail: "Confirm an email address using a verification-link token.",
  resendVerification: "Send the verification email again.",
  getEvents: "List all events, with how many are registered.",
  getEventById: "One event; the organiser's email is shown only to logged-in users.",
  createEvent: "Create an event (admins, or a leader for their own club), with an optional image. Send repeat (weekly or biweekly) and repeatCount (2 to 12) to create a series of separate events. An optional endDate (after the start, at most 7 days long) sets when it ends.",
  updateEvent: "Edit an event; registered students are emailed if the date or place changes.",
  deleteEvent: "Delete an event; registered students are emailed the cancellation.",
  registerForEvent: "Register for an event (or request to join, if the event needs approval).",
  getMyRegistrations: "Your own registrations.",
  getCheckInCode: "The signed code shown as a QR at the door (your own registration only).",
  getCertificate: "Your attendance certificate (only if you were marked as attended).",
  submitFeedback: "Rate an event 1-5 with an optional comment (only if you attended).",
  cancelRegistration: "Cancel your own registration; the next person on the waitlist is promoted.",
  getEventRegistrations: "Everyone registered for an event, plus its waitlist.",
  announceToRegistrants: "Email everyone registered for an event.",
  announceToClubMembers: "Email everyone who joined a club (members who opted out are skipped).",
  updateRegistrationAttendance: "Mark a registration as attended or not.",
  decideRegistration: "Approve or decline a join request for an approval-only event.",
  getAttendanceReport: "Turnout and ratings for recent past events (add ?all=1 for every past event, up to 500).",
  checkInByCode: "Check a student in by scanning or typing their registration code.",
  getInsights: "Registrations per month, most popular clubs and overall turnout.",
  getWeekSummary: "New students and registrations in the last 7 days versus the week before, plus events in the next 7 days.",
  getAllUsers: "All accounts.",
  getUserById: "One account.",
  getUserEvents: "The events that one account has created.",
  markEmailVerified: "Mark a student's email as verified by hand (for when the verification email never arrived); recorded in the activity log. Does not approve the account.",
  bulkApproveUsers: "Approve a chosen batch (up to 200) of pending accounts at once.",
  updateUser: "Change an account's role or approval status.",
  deleteUser: "Delete an account and what is attached to it.",
  getAllEventsAdmin: "All events, for the admin panel.",
  getEventByIdAdmin: "One event, for the admin panel.",
  updateEventAdmin: "Edit any event; registered students are emailed if the date or place changes.",
  deleteEventAdmin: "Delete any event; registered students are emailed the cancellation.",
  getClubLeaders: "The students named as leaders of a club.",
  setClubLeaders: "Set a club's leaders (up to 10); new leaders are emailed.",
  getAuditLog: "The activity log of admin actions (kept for a year).",
  setNotice: "Publish or clear the site-wide announcement banner.",
  getClubs: "List all clubs, with member counts.",
  getClubById: "One club, with its member count.",
  createClub: "Create a club.",
  updateClub: "Edit a club.",
  deleteClub: "Delete a club along with its memberships and event links.",
  getMyJoinRequests: "The clubs you have asked to join and are still waiting on (clubs that approve their members).",
  getContactMessages: "Messages sent through the Contact form (newest first, up to 200) and how many are not handled yet; admins only.",
  setMessageHandled: "Mark a contact message as handled or not handled; admins only.",
  deleteContactMessage: "Delete a contact message; admins only.",
  getRequestCounts: "How many students are waiting to join each club you manage (clubs that approve their members), for the badges in the club lists.",
  getClubJoinRequests: "List the students waiting to join a club that approves its members, oldest first; admins and that club's leaders only.",
  decideClubJoinRequest: "Approve or decline a student's request to join a club; approving makes them a member and both outcomes notify them (a decline can carry a short note of up to 300 characters for the email); admins and that club's leaders only.",
  getClubMembers: "List who joined a club (name, email, student ID, join date), newest first; admins and that club's leaders only.",
  addWalkIn: "Add a student who turned up without registering (by exact email or student ID) as registered and attended; admins and that event's club leaders only.",
  setHelperAttended: "Mark that a volunteer really helped at an event (admins and the event's club leaders; only once the event has started).",
  getMyCertificate: "Your volunteering certificate for an event, once an organiser has marked that you helped.",
  getMyVolunteering: "The upcoming events you signed up to help at, with your role, soonest first.",
  getVolunteers: "The helper roles at an event, how many places are taken and whether you hold one; organisers also see who signed up.",
  signUp: "Sign up to help in one role at an upcoming event (one role per event; a full role is refused).",
  cancelSignUp: "Cancel your own volunteer sign-up for an event.",
  setRoles: "Set the volunteer roles of an event (up to 5, with a name and places each); admins and the event's club leaders only. A role left out is removed with its sign-ups.",
  getQuestions: "The public questions and answers on an event (newest first, up to 50). Only first names are shown.",
  addEventPhoto: "Add one photo (max 5 MB, jpg/png/webp/gif) to an event's gallery, up to 8; admins and the event's club leaders only.",
  removeEventPhoto: "Remove a photo from an event's gallery and from image storage (pass its address as ?url=); admins and the event's club leaders only.",
  askQuestion: "Ask a public question on an upcoming event (max 3 unanswered per student); the organiser is emailed.",
  answerQuestion: "Answer a question on an event (admins and that event's club leaders only); the asker is emailed the first time.",
  deleteQuestion: "Delete a question: its asker, or an admin / the event's club leader.",
  getClubPosts: "A club's latest news posts (newest first, up to 20).",
  createClubPost: "Post a short news update on a club (admins and that club's leaders only).",
  updateClubPost: "Fix the text of one news post (admins and that club's leaders only).",
  setClubPostPinned: "Pin a news post to the top of the club page, or unpin it (admins and that club's leaders only; one pinned post per club).",
  getClubIdeas: "Ideas members suggested to a club: the club's leaders and admins see all of them, anyone else sees only their own.",
  createClubIdea: "Suggest an idea to a club (members only; up to 3 waiting per member, 300 characters). The club's leaders get a bell notification.",
  deleteClubIdea: "Remove one idea (its author, the club's leaders or an admin).",
  deleteClubPost: "Delete one news post (admins and that club's leaders only).",
  getMyClubNews: "The latest news posts (up to 5, last 30 days) from the clubs you have joined.",
  getMyMemberships: "The clubs you have joined.",
  joinClub: "Join a club; for clubs that approve their members this sends a request instead (answer 202).",
  leaveClub: "Leave a club, or withdraw a request that is still waiting.",
  submitContactForm: "Send a message to the PCPS Connect team by email.",
  getPublicStats: "Totals shown on the home page (students, clubs, events, registrations).",
  getNotice: "The current site-wide announcement, if any.",
  getMyLedClubs: "The clubs you are a leader of.",
  getWaitlistStatus: "Whether you are on an event's waitlist, and where.",
  getMyWaitlist: "The upcoming events you are waitlisted for, with your place in line.",
  joinWaitlist: "Join the waitlist of a full event.",
  leaveWaitlist: "Leave an event's waitlist.",
  getMyNotifications: "Your latest in-app notifications (newest first) and how many are unread.",
  markAllRead: "Mark all of your notifications as read.",
  verifyCertificate: "Check that a certificate code is genuine (public, no login).",
};

function describeHandler(handler) {
  return DESCRIPTIONS[handler] || "";
}

const cell = (text) => String(text).replace(/\|/g, "\\|");

function buildApiDoc(readFile) {
  const mounts = readMounts(readFile("index.js"));

  const out = [
    "# PCPS Connect API reference",
    "",
    "Generated from the route files by `npm run docs:api` (in `backend/`) -- do not edit by hand.",
    "Every state-changing request (POST/PUT/PATCH/DELETE) must send the header `X-Requested-With: XMLHttpRequest` (a CSRF defence); the frontend does this automatically.",
    "Logged-in access uses an httpOnly cookie set by `POST /api/auth/login`.",
    "",
    "Access levels: **Anyone**, **Logged-in student**, **Admin or club leader** (leaders only for their own clubs' events), **Admin only**.",
    "",
  ];

  let total = 0;
  for (const { prefix, file } of mounts) {
    const routes = readRoutes(readFile(file));
    out.push(`## ${prefix}`, "", "| Method | Path | Who | What it does |", "|---|---|---|---|");
    for (const r of routes) {
      const who = ACCESS_LABEL[r.access] + (r.note ? ` (${r.note})` : "");
      out.push(`| ${r.method} | \`${prefix}${r.subpath}\` | ${who} | ${cell(describeHandler(r.handler))} |`);
      total++;
    }
    out.push("");
  }
  out.splice(7, 0, `${total} endpoints.`);
  return out.join("\n");
}

const readBackendFile = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const DOC_PATH = path.join(ROOT, "..", "docs", "API.md");

if (require.main === module) {
  fs.mkdirSync(path.dirname(DOC_PATH), { recursive: true });
  fs.writeFileSync(DOC_PATH, buildApiDoc(readBackendFile));
  console.log("Wrote docs/API.md");
}

module.exports = { buildApiDoc, readRoutes, readMounts, describeHandler, readBackendFile, DOC_PATH, DESCRIPTIONS };
