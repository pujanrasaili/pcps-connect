import { isPastEvent } from "./formatDate.js";
import { hostIds } from "./eventHosts.js";

// Other upcoming events worth showing under an event: the same club's first,
// then the same category's, soonest first. Never the event itself or past ones.
export function relatedEvents(events, current, limit = 3) {
  if (!current) return [];
  const mine = hostIds(current);
  const score = (e) => (hostIds(e).some((id) => mine.includes(id)) ? 2 : e.category && e.category === current.category ? 1 : 0);
  return events
    .filter((e) => e._id !== current._id && !isPastEvent(e.date) && score(e) > 0)
    .sort((a, b) => score(b) - score(a) || new Date(a.date) - new Date(b.date))
    .slice(0, limit);
}
