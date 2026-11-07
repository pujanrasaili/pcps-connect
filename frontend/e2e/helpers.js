import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

const DAY = 864e5;
const club = (i, name) => ({ _id: `c${i}`.padEnd(24, "0"), name, category: "Technology", description: `A club for ${name}`, memberCount: 12 + i, leaders: [] });
export const clubs = [club(1, "Coding Club"), club(2, "Robotics Society")];
const ev = (i, title, offset) => ({
  _id: `e${i}`.padEnd(24, "0"), title, description: "An event used by the browser tests.", date: new Date(Date.now() + offset * DAY).toISOString(),
  location: "Main Hall", capacity: 50, registeredCount: 20, category: "Workshop", price: "Free", club: clubs[i % 2], averageRating: 0, ratingCount: 0,
});
const events = [ev(1, "Hack Night with a really long event title that must wrap on phones", 5), ev(2, "Robot Demo", 9), ev(3, "Photo Walk", -10)];
export const student = { id: "u1", _id: "u1", name: "Asha", email: "asha@patancollege.edu.np", role: "user", approvalStatus: "approved", emailVerified: true };
export const news = [{ _id: "p1", body: "Hack night moved to Friday! Bring a laptop.", club: { _id: clubs[0]._id, name: "Coding Club" }, createdAt: new Date().toISOString() }];

export const admin = { id: "a1", _id: "a1", name: "Admin User", email: "admin@patancollege.edu.np", role: "admin", approvalStatus: "approved", emailVerified: true };
const users = [1, 2, 3].map((i) => ({ _id: `u${i}`.padEnd(24, "0"), name: `Student Number ${i} with Long Name`, email: `student${i}.longaddress@example.edu.np`, role: i === 1 ? "admin" : "user", approvalStatus: i === 3 ? "pending" : "approved", studentId: `PCPS-${i}`, createdAt: new Date().toISOString() }));
const entries = ["event.created", "club.updated", "event.deleted", "user.role_changed"].map((action, i) => ({ _id: `a${i}`, action, actorName: "Admin User", summary: `${action} "Something quite long to check wrapping on narrow screens"`, createdAt: new Date(Date.now() - i * 3600e3).toISOString() }));
const insights = { registrationsByMonth: [{ label: "Aug", count: 4 }, { label: "Sep", count: 9 }, { label: "Oct", count: 14 }], topClubs: [{ name: "Coding Club", members: 14 }, { name: "Robotics Society", members: 9 }], attendance: { attended: 15, registered: 20, rate: 75 } };
const report = { events: [{ _id: events[2]._id, title: "Photo Walk", date: events[2].date, registered: 20, attended: 15, noShows: 5, attendanceRate: 75, averageRating: 4.2, ratingCount: 6 }], totals: { registered: 20, attended: 15, attendanceRate: 75, averageRating: 4.2, ratingCount: 6 } };

// What the mocked API answers (anything unlisted gets an empty object).
function answer(path, role, lang) {
  if (path.endsWith("/auth/me")) return role ? { status: 200, body: { user: { ...(role === "admin" ? admin : student), language: lang } } } : { status: 401, body: { message: "Not logged in" } };
  if (path.endsWith("/club-memberships/news")) return { body: { posts: news } };
  if (path.endsWith("/clubs")) return { body: { clubs } };
  if (path.endsWith("/events")) return { body: { events } };
  if (path.includes("club-memberships")) return { body: { memberships: [] } };
  if (path.includes("registrations/my")) return { body: { registrations: [] } };
  if (path.includes("/notifications")) return { body: { notifications: [], unreadCount: 0 } };
  if (path.includes("/notice")) return { body: { notice: null } };
  if (path.includes("/admin/users")) return { body: { users } };
  if (path.includes("/admin/audit")) return { body: { entries } };
  if (path.includes("attendance-report")) return { body: report };
  if (path.includes("insights")) return { body: insights };
  if (path.includes("/admin/messages") || path.includes("/contact/messages")) return { body: { messages: [] } };
  if (path.endsWith("/stats")) return { body: { totalStudents: 10, totalClubs: 2, totalEvents: 3, totalRegistrations: 40 } };
  return { body: {} };
}

export async function setUp(page, { lang, role = null }) {
  await page.route(/googleapis|gstatic|youtube|google\.com/, (route) => route.fulfill({ status: 200, contentType: "text/html", body: "" }));
  await page.route("**/api/**", (route) => {
    const { status = 200, body } = answer(new URL(route.request().url()).pathname, role, lang);
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  // Only the first visit starts in `lang`; a reload keeps whatever the page switched to.
  await page.addInitScript((l) => { if (!localStorage.getItem("pcps_lang")) localStorage.setItem("pcps_lang", l); }, lang);
  const problems = [];
  page.on("pageerror", (err) => problems.push(`page error: ${err.message}`));
  page.on("console", (msg) => {
    // A logged-out visitor's "who am I?" check is answered 401 on purpose; the browser logs that.
    if (msg.type() === "error" && !msg.text().includes("status of 401")) problems.push(`console error: ${msg.text()}`);
  });
  return problems;
}

export async function axeViolations(page) {
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "best-practice"] });
    return result.violations.map((v) => `${v.id}: ${v.nodes[0].target.join(" ")}`);
  });
}

