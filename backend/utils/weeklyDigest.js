const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");
const { formatEventDate } = require("./formatEventDate");
const { settingsLink } = require("./unsubscribe");
const { pickLanguage } = require("./emailText");
const { text, settingsWord } = require("./reminderEmailText");

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_EVENTS = 6; // keep the email short; the rest is "and N more"

// The next 7 days, from now.
function digestWindow(now = new Date()) {
  return { start: now, end: new Date(now.getTime() + WEEK_MS) };
}

const isFull = (event) => (event.capacity ?? 100) - (event.registeredCount ?? 0) <= 0;

// Works out who should get a digest and what goes in it.
//   events:        upcoming events in the window, each with its club ({ _id, name })
//   memberships:   [{ user: { _id, name, email, clubUpdates }, club: <club id> }]
//   registrations: [{ user: <id>, event: <id> }] -- events a student already signed up for
//   followers:     [{ user: { _id, name, email, clubUpdates, language }, interests: ["workshop"] }]
//                  -- students who follow topics (optional). They also get upcoming events
//                  in those categories ("General" is never a topic), even from no club.
// A student gets the soonest events from clubs they joined, skipping events they
// are already registered for and events that are full (they can't act on
// those). Students who turned club updates off, have no email, or have nothing
// to hear about are left out, so nobody receives an empty digest.
function buildDigests({ events, memberships, registrations, followers = [] }) {
  const byClub = new Map();
  for (const event of events) {
    if (isFull(event)) continue;
    // Members of any hosting club hear about it, once.
    const hosts = new Set([event.club, ...(event.coHosts || [])].map((c) => String(c?._id || c || "")).filter(Boolean));
    for (const clubId of hosts) {
      if (!byClub.has(clubId)) byClub.set(clubId, []);
      byClub.get(clubId).push(event);
    }
  }

  const registered = new Set(registrations.map((r) => `${r.user}:${r.event}`));
  const perUser = new Map();

  for (const m of memberships) {
    const user = m.user;
    if (!user?.email || user.clubUpdates === false) continue;
    const clubEvents = byClub.get(String(m.club)) || [];
    for (const event of clubEvents) {
      if (registered.has(`${user._id}:${event._id}`)) continue;
      if (perUser.get(String(user._id))?.events.some((e) => String(e._id) === String(event._id))) continue;
      const entry = perUser.get(String(user._id)) || { user, events: [] };
      entry.events.push(event);
      perUser.set(String(user._id), entry);
    }
  }

  for (const f of followers) {
    const user = f.user;
    if (!user?.email || user.clubUpdates === false) continue;
    const topics = new Set(f.interests || []);
    for (const event of events) {
      const topic = String(event.category || "").trim().toLowerCase();
      if (!topic || topic === "general" || !topics.has(topic) || isFull(event)) continue;
      if (registered.has(`${user._id}:${event._id}`)) continue;
      const entry = perUser.get(String(user._id)) || { user, events: [] };
      if (entry.events.some((e) => String(e._id) === String(event._id))) continue; // already there via a club
      entry.events.push(event);
      entry.forYou = true;
      perUser.set(String(user._id), entry);
    }
  }

  return [...perUser.values()].map(({ user, events: list, forYou }) => {
    const sorted = [...list].sort((a, b) => new Date(a.date) - new Date(b.date));
    return { user, events: sorted.slice(0, MAX_EVENTS), more: Math.max(0, sorted.length - MAX_EVENTS), forYou: !!forYou };
  });
}

function renderDigest({ user, events, more, forYou }, origin) {
  const lang = pickLanguage(user.language);
  // Wording that also mentions followed topics, only when one of them is in this digest.
  const k = (key) => (forYou ? `${key}ForYou` : key);
  const items = events
    .map(
      (e) => `
        <tr><td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
          <a href="${origin}/events/${encodeURIComponent(e._id)}" style="color: #4F46E5; font-weight: 600; text-decoration: none;">${escapeHtml(e.title)}</a>
          <div style="font-size: 13px; color: #475569;">${e.club?.name ? `${escapeHtml(e.club.name)} &middot; ` : ""}${formatEventDate(e.date, lang)} &middot; ${escapeHtml(e.location)}</div>
        </td></tr>`
    )
    .join("");
  const count = events.length + more;

  return {
    subject: text(lang, k(count === 1 ? "digestSubjectOne" : "digestSubjectMany"), { count }),
    html: renderEmail({
      heading: text(lang, k("digestHeading")),
      language: lang,
      bodyHtml: `
        <p style="margin: 0 0 12px;">${text(lang, "hi", { name: escapeHtml(user.name) })}</p>
        <p style="margin: 0 0 8px;">${text(lang, k("digestIntro"))}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${items}</table>
        ${more ? `<p style="margin: 12px 0 0;">${text(lang, "digestMore", { more })}</p>` : ""}
        <p style="margin: 16px 0 0; font-size: 13px; color: #64748b;">${text(lang, k("digestFooter"), { settings: settingsLink(origin, settingsWord(lang)) })}</p>
      `,
      ctaText: text(lang, "digestCta"),
      ctaUrl: `${origin}/events`,
    }),
  };
}

module.exports = { digestWindow, buildDigests, renderDigest, MAX_EVENTS };
