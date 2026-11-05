import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { translate, format, normalizeLang } from "../src/i18n/translate.js";
import { ne } from "../src/i18n/ne.js";

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const FILES = [
  "components/Navbar.jsx", "components/Footer.jsx", "components/HeroSection.jsx", "components/EventCard.jsx",
  "components/ClubCard.jsx", "components/LanguageToggle.jsx", "pages/Home.jsx", "pages/Login.jsx", "pages/Events.jsx", "pages/Clubs.jsx", "components/FilterButtons.jsx", "pages/Register.jsx", "pages/Contact.jsx", "pages/ForgotPassword.jsx", "pages/ResetPassword.jsx", "pages/Dashboard.jsx", "components/LoadFailedBanner.jsx", "components/Sidebar.jsx", "pages/EventDetails.jsx", "pages/Settings.jsx", "pages/Profile.jsx", "components/MilestonesCard.jsx", "components/StarRating.jsx", "components/CheckInQrModal.jsx", "components/PasswordInput.jsx", "components/SkipLink.jsx", "components/SearchBar.jsx", "components/Pagination.jsx", "components/RegistrationForm.jsx", "components/RegistrationDone.jsx", "components/WaitlistCard.jsx", "pages/NotFound.jsx", "layouts/AdminLayout.jsx", "pages/admin/AdminOverview.jsx", "components/SiteNoticeCard.jsx", "components/InsightsCard.jsx", "components/WeekSummaryCard.jsx", "components/AttendanceReportCard.jsx", "components/EmailStatusCard.jsx", "pages/admin/AdminMessages.jsx", "pages/admin/AdminActivity.jsx", "pages/admin/AdminCheckIn.jsx", "pages/admin/LeaderClubs.jsx", "components/WalkInForm.jsx", "components/ClubMessageModal.jsx", "pages/Certificate.jsx", "pages/VerifyCertificate.jsx", "components/SearchDialog.jsx", "components/NotificationBell.jsx", "pages/OfflineTickets.jsx", "components/OfflineTicketsBanner.jsx", "components/InstallAppCard.jsx", "components/EventPhotos.jsx", "components/EventQuestions.jsx", "components/ConfirmDialog.jsx", "components/Modal.jsx", "components/DashboardCharts.jsx",
];

test("English stays English, Nepali is looked up, and unknown text falls back to English", () => {
  assert.equal(translate(ne, "en", "Events"), "Events");
  assert.equal(translate(ne, "ne", "Events"), "कार्यक्रमहरू");
  assert.equal(translate(ne, "ne", "Some brand new sentence"), "Some brand new sentence");
  assert.equal(translate(ne, "ne", "constructor"), "constructor"); // no prototype leaks
  assert.equal(translate(ne, "ne", undefined), undefined);
});

test("placeholders are filled, and left alone when no value is given", () => {
  assert.equal(format("{n} spots left", { n: 3 }), "3 spots left");
  assert.equal(format(translate(ne, "ne", "{n} spots left"), { n: 3 }), "3 सिट बाँकी");
  assert.equal(format("Hello {name}"), "Hello {name}");
});

test("only known languages are accepted", () => {
  assert.equal(normalizeLang("ne"), "ne");
  assert.equal(normalizeLang("en"), "en");
  assert.equal(normalizeLang("fr"), "en");
  assert.equal(normalizeLang(null), "en");
});

test("every string wrapped in t(\"...\") on the translated pages has a Nepali version", () => {
  const missing = [];
  for (const file of FILES) {
    for (const m of read(file).matchAll(/\bt\("((?:[^"\\]|\\.)*)"/g)) {
      const key = m[1].replace(/\\'/g, "'");
      if (!(key in ne)) missing.push(`${file}: ${key}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("labels that reach t() through variables are translated too", () => {
  const dynamic = [
    "Home", "Clubs", "Events", "Contact", "Dashboard", "Admin", "Manage",
    "Login", "Register", "Forgot Password", "Profile", "Settings", "Help & FAQ", "Terms of Use", "Privacy Policy",
    "Active Clubs", "Members", "Events Hosted", "Registered Students", "Event Registrations",
    "Upcoming", "This week", "Past", "Registered", "Saved", "List", "Calendar",
    "Joined", "Request sent", "Request to join", "Join Club", "Tap to leave this club",
    "Waiting for the club's leaders. Tap to withdraw", "Free", "Default order", "Most members", "Name (A-Z)",
    "Full name is required.", "Enter a valid email address.", "Registration is limited to PCPS email addresses (@patancollege.edu.np).",
    "Student ID is required.", "Password must be at least 8 characters.", "Passwords do not match.", "You must accept the terms to continue.",
    "Name is required.", "Enter a valid email.", "Please write a message.",
    "your registrations", "your event history", "Today", "Tomorrow", "{n} event", "{n} events", "Delete", "Deleting...", "Cancel",
    "First event", "Attend your first event", "Regular", "Attend 5 events", "Campus star", "Attend 10 events",
    "Club member", "Connector", "Join 3 clubs", "Critic", "Rate an event you attended", "{n} star", "{n} stars", "Search...", "User approved", "User rejected", "Bulk approval", "Email marked verified", "Role changed", "User deleted", "Self-deleted account", "Contact message deleted", "Club created", "Club edited", "Club deleted", "Join request approved", "Join request declined", "Club leaders changed", "Club message sent", "Club news posted", "Club news deleted", "Event created", "Event photo added", "Event photo removed", "Event edited", "Event deleted", "Event message sent", "Walk-in added", "Event question answered", "Event question deleted", "Site announcement published", "Site announcement removed", "All", "People", "Events", "Clubs", "{n} registration", "{n} registrations", "{n} member", "{n} members", "Up {pct}% from {prev} the week before", "Down {pct}% from {prev} the week before", "{n} event coming up", "{n} events coming up", "Last {n} past event", "Last {n} past events", "Email isn't set up", "Emails are sent through Gmail", "Overview", "Check-in", "Users", "Messages", "Activity", "My events", "My clubs", "Manage Clubs", "Add, edit, or remove clubs", "Manage Events", "Add, edit, or remove events", "Manage Users", "View students, manage roles", "{n} student is waiting for approval", "{n} students are waiting for approval", "{n} request to join an event is waiting for a decision", "{n} requests to join events are waiting for a decision", "{n} student is waiting to join clubs that approve their members", "{n} students are waiting to join clubs that approve their members", "just now", "{n} min ago", "{n} h ago", "{n} d ago",
    "Event reminders", "Get an email before events you registered for.", "Club updates",
    "Get an email when a club you've joined announces a new event, plus a short weekly summary of what your clubs have planned.",
    "Join a club", "Clubs you join send you their events.", "Pick a favourite club", "Tap the heart on a club to bookmark it.",
    "Register for an event", "Your QR code and reminders appear here.",
  ];
  assert.deepEqual(dynamic.filter((k) => !(k in ne)), []);
});

test("each translation keeps the same {placeholders} as its English text", () => {
  const ph = (text) => (text.match(/\{\w+\}/g) || []).sort().join(",");
  for (const [en, nepali] of Object.entries(ne)) {
    assert.equal(ph(nepali), ph(en), `placeholders differ for "${en}"`);
  }
});

test("the app is wrapped in the language provider and has a visible switch", () => {
  assert.match(read("App.jsx"), /<LanguageProvider>/);
  assert.match(read("components/Navbar.jsx"), /<LanguageToggle \/>/);
});

test("Nepali text gets its own typography rules (no capitals or wide spacing, more line room)", () => {
  const css = read("index.css");
  assert.match(css, /html\[lang="ne"\] \.uppercase \{ text-transform: none; \}/);
  assert.match(css, /html\[lang="ne"\] \[class\*="tracking-"\] \{ letter-spacing: normal; \}/);
  assert.match(css, /html\[lang="ne"\] :is\(h1, h2, h3\) \{ line-height: 1\.35; \}/);
});

test("the language switch's accessible name is its visible text", () => {
  const src = read("components/LanguageToggle.jsx");
  assert.doesNotMatch(src, /aria-label/);
  assert.match(src, /title=\{/);
});
