const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");
const { pickLanguage } = require("./emailText");
const { text } = require("./reminderEmailText");

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_AGE_DAYS = 5; // a request younger than this is not "overdue" yet

// Works out who to nudge about students who asked to join a club that
// approves its members and have waited too long.
//   requests: [{ club: <club id>, createdAt }]
//   clubs:    [{ _id, name, leaders: [{ _id, name, email }] }]
//   admins:   [{ _id, name, email }] -- told about a club that has no leaders
// Returns one entry per person: { user, link, items: [{ club, count, days }] },
// where `days` is how long the oldest request has waited. People without an
// email are skipped, and a person who leads several clubs gets one email.
function buildReminders({ requests, clubs, admins = [], now = new Date(), minAgeDays = MIN_AGE_DAYS }) {
  const overdue = new Map(); // club id -> { count, oldest }
  for (const r of requests) {
    const age = (now.getTime() - new Date(r.createdAt).getTime()) / DAY_MS;
    if (!(age >= minAgeDays)) continue;
    const key = String(r.club);
    const entry = overdue.get(key) || { count: 0, oldest: 0 };
    entry.count += 1;
    entry.oldest = Math.max(entry.oldest, age);
    overdue.set(key, entry);
  }

  const perPerson = new Map();
  for (const club of clubs) {
    const entry = overdue.get(String(club._id));
    if (!entry) continue;
    const leaders = (club.leaders || []).filter((u) => u?.email);
    const recipients = leaders.length ? leaders : admins.filter((u) => u?.email);
    const isLeaderMail = leaders.length > 0;
    for (const user of recipients) {
      const person = perPerson.get(String(user._id)) || { user, link: isLeaderMail ? "/admin/my-clubs" : "/admin/clubs", items: [] };
      person.items.push({ club: club.name, count: entry.count, days: Math.floor(entry.oldest) });
      perPerson.set(String(user._id), person);
    }
  }
  return [...perPerson.values()];
}

function renderReminder({ user, link, items }, origin) {
  const lang = pickLanguage(user.language);
  const total = items.reduce((sum, i) => sum + i.count, 0);
  const rows = items
    .map(
      (i) => `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${text(lang, "nudgeRow", { club: escapeHtml(i.club), count: i.count, days: i.days })}</td></tr>`
    )
    .join("");
  return {
    subject: text(lang, total === 1 ? "nudgeSubjectOne" : "nudgeSubjectMany", { count: total }),
    html: renderEmail({
      heading: text(lang, "nudgeHeading"),
      language: lang,
      bodyHtml: `<p style="margin: 0 0 12px;">${text(lang, "hi", { name: escapeHtml(user.name) })}</p><p style="margin: 0 0 12px;">${text(lang, "nudgeIntro")}</p><table style="width: 100%; border-collapse: collapse; margin: 0 0 12px;">${rows}</table><p style="margin: 0;"><a href="${origin}${link}" style="color: #4F46E5; font-weight: 600;">${text(lang, "nudgeLink")}</a></p>`,
    }),
  };
}

module.exports = { buildReminders, renderReminder, MIN_AGE_DAYS };
