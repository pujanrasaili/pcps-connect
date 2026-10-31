// Optional end time for an event, so calendars and event pages can show how
// long it lasts ("10:00 AM - 12:00 PM") instead of guessing.
//
//  - empty                     -> { value: null }  (no end time)
//  - not a date                -> { error }
//  - at or before the start    -> { error }
//  - more than a week long     -> { error }
//  - otherwise                 -> { value: Date }
// The start is passed in because an edit may not resend it.

const MAX_LENGTH_MS = 7 * 24 * 60 * 60 * 1000;

function parseEndDate(raw, start) {
  if (raw === undefined || raw === null || raw === "" || raw === "null") return { value: null };
  if (typeof raw === "object" && !(raw instanceof Date)) return { error: "Enter a valid end time" };
  const end = new Date(raw);
  if (Number.isNaN(end.getTime())) return { error: "Enter a valid end time" };
  const startMs = new Date(start).getTime();
  if (!Number.isNaN(startMs)) {
    if (end.getTime() <= startMs) return { error: "The end time must be after the start" };
    if (end.getTime() - startMs > MAX_LENGTH_MS) return { error: "An event can't last more than 7 days" };
  }
  return { value: end };
}

// When an event is moved to a new start, keep its length: the end moves by the
// same amount. Returns null when there is no end time to move.
function shiftedEnd(oldStart, oldEnd, newStart) {
  if (!oldEnd) return null;
  const delta = new Date(newStart).getTime() - new Date(oldStart).getTime();
  if (Number.isNaN(delta)) return new Date(oldEnd);
  return new Date(new Date(oldEnd).getTime() + delta);
}

module.exports = { parseEndDate, shiftedEnd, MAX_LENGTH_MS };
