import { isPastEvent } from "./formatDate.js";

// How well `text` matches `needle`: 3 = starts with it, 2 = a word in it starts
// with it, 1 = contains it somewhere, 0 = no match.
function fieldScore(text, needle) {
  const t = String(text || "").toLowerCase();
  if (!t) return 0;
  if (t.startsWith(needle)) return 3;
  if (t.includes(` ${needle}`)) return 2;
  return t.includes(needle) ? 1 : 0;
}

// Best score across fields, with the main field (name/title) counting double
// so a name match always outranks a mention in a description.
function bestScore(main, others, needle) {
  const mainScore = fieldScore(main, needle) * 2;
  const otherScore = Math.max(0, ...others.map((f) => fieldScore(f, needle)));
  return Math.max(mainScore, otherScore);
}

// Powers the site-wide search box. Returns the best few clubs and events for
// what was typed; upcoming events come before past ones, then soonest first.
export function searchSite(events, clubs, query, limit = 5) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return { clubs: [], events: [] };

  const matchedClubs = clubs
    .map((club) => ({ club, score: bestScore(club.name, [club.category, club.description], needle) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || (a.club.name || "").localeCompare(b.club.name || ""))
    .slice(0, limit)
    .map((r) => r.club);

  const matchedEvents = events
    .map((event) => ({
      event,
      score: bestScore(event.title, [event.club?.name, event.location, event.category], needle),
      past: isPastEvent(event.date),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => Number(a.past) - Number(b.past) || b.score - a.score || new Date(a.event.date) - new Date(b.event.date))
    .slice(0, limit)
    .map((r) => r.event);

  return { clubs: matchedClubs, events: matchedEvents };
}
