// Does this event overlap one the student is already signed up for?
// An event with no end time is treated as lasting one hour, so only events
// that start at about the same time are flagged, not ones a few hours apart.
const DEFAULT_LENGTH_MS = 60 * 60 * 1000;

function window(event) {
  const start = new Date(event?.date).getTime();
  if (Number.isNaN(start)) return null;
  const end = event?.endDate ? new Date(event.endDate).getTime() : NaN;
  return { start, end: Number.isNaN(end) || end <= start ? start + DEFAULT_LENGTH_MS : end };
}

// Returns the other event (the earliest one) that overlaps `event`, or null.
// Cancelled sign-ups and events that already started do not count; a request
// still waiting for approval does, because a seat is held for it.
export function findClash(event, registrations, now = new Date()) {
  const mine = window(event);
  if (!mine || !Array.isArray(registrations)) return null;
  const clashes = [];
  for (const reg of registrations) {
    const other = reg?.event;
    if (!other || String(other._id) === String(event._id)) continue;
    if (reg.status !== "confirmed" && reg.status !== "pending") continue;
    const theirs = window(other);
    if (!theirs || theirs.start <= now.getTime()) continue;
    if (mine.start < theirs.end && theirs.start < mine.end) clashes.push({ other, start: theirs.start });
  }
  clashes.sort((a, b) => a.start - b.start);
  return clashes.length ? clashes[0].other : null;
}
