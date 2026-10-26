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
  getHealth: "Uptime check: 200 when the database is connected, 503 otherwise.",
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
  createEvent: "Create an event (admins, or a leader for their own club), with an optional image.",
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
  getAttendanceReport: "Turnout and ratings for recent past events.",
  checkInByCode: "Check a student in by scanning or typing their registration code.",
  getInsights: "Registrations per month, most popular clubs and overall turnout.",
  getAllUsers: "All accounts.",
  getUserById: "One account.",
  getUserEvents: "The events that one account has created.",
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
  getClubMembers: "List who joined a club (name, email, student ID, join date), newest first; admins and that club's leaders only.",
  addWalkIn: "Add a student who turned up without registering (by exact email or student ID) as registered and attended; admins and that event's club leaders only.",
  getQuestions: "The public questions and answers on an event (newest first, up to 50). Only first names are shown.",
  askQuestion: "Ask a public question on an upcoming event (max 3 unanswered per student); the organiser is emailed.",
  answerQuestion: "Answer a question on an event (admins and that event's club leaders only); the asker is emailed the first time.",
  deleteQuestion: "Delete a question: its asker, or an admin / the event's club leader.",
  getClubPosts: "A club's latest news posts (newest first, up to 20).",
  createClubPost: "Post a short news update on a club (admins and that club's leaders only).",
  deleteClubPost: "Delete one news post (admins and that club's leaders only).",
  getMyMemberships: "The clubs you have joined.",
  joinClub: "Join a club.",
  leaveClub: "Leave a club.",
  submitContactForm: "Send a message to the PCPS Connect team by email.",
  getPublicStats: "Totals shown on the home page (students, clubs, events, registrations).",
  getNotice: "The current site-wide announcement, if any.",
  getMyLedClubs: "The clubs you are a leader of.",
  getWaitlistStatus: "Whether you are on an event's waitlist, and where.",
  getMyWaitlist: "The upcoming events you are waitlisted for, with your place in line.",
  joinWaitlist: "Join the waitlist of a full event.",
  leaveWaitlist: "Leave an event's waitlist.",
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
