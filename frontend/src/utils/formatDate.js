export function formatDate(dateStr, options = {}) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: options.weekday ?? "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDay(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { day: "2-digit" });
}

export function formatMonth(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
}

// Exact-time comparison (not just "is it still today") -- an event that
// started an hour ago is over even if it started today, so it shouldn't
// still read as "upcoming" or be open for registration.
export function isUpcoming(dateStr) {
  return new Date(dateStr) >= new Date();
}

export function isPastEvent(dateStr) {
  return !isUpcoming(dateStr);
}

// "Today", "Tomorrow", "In 3 days" for events within the next week, otherwise
// null (the caller just shows the date). Compares calendar days in local time,
// so an event at 9am tomorrow is "Tomorrow" even at 11pm tonight.
export function relativeDay(dateStr, now = new Date()) {
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((startOfDay(new Date(dateStr)) - startOfDay(now)) / 86400000);
  if (days < 0 || days > 7) return null;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

// "Tue, Dec 30, 2026, 10:00 AM" in the viewer's own time zone.
export function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// "10:00 AM" in the viewer's own time zone.
export function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// "Sat, Dec 5, 2026 · 10:00 AM": the compact date-and-time line for upcoming events.
export function formatDateAndTime(dateStr) {
  return `${formatDate(dateStr)} \u00b7 ${formatTime(dateStr)}`;
}

// The organiser's end time counts only when it is a real moment after the start.
function validEnd(startStr, endStr) {
  if (!endStr) return null;
  const end = new Date(endStr);
  return !Number.isNaN(end.getTime()) && end > new Date(startStr) ? end : null;
}

const sameLocalDay = (a, b) => a.toDateString() === b.toDateString();

// "10:00 AM" or, when the event has an end time, "10:00 AM \u2013 12:00 PM"
// (an end on a later day adds that day: "10:00 AM \u2013 Sun, Dec 6, 12:00 PM").
export function formatTimeRange(startStr, endStr) {
  const end = validEnd(startStr, endStr);
  if (!end) return formatTime(startStr);
  const start = new Date(startStr);
  if (sameLocalDay(start, end)) return `${formatTime(start)} \u2013 ${formatTime(end)}`;
  const day = end.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return `${formatTime(start)} \u2013 ${day}, ${formatTime(end)}`;
}

// "Sat, Dec 5, 2026, 10:00 AM \u2013 12:00 PM": the full date line for an event page.
export function formatDateTimeRange(startStr, endStr) {
  const end = validEnd(startStr, endStr);
  if (!end) return formatDateTime(startStr);
  const start = new Date(startStr);
  if (sameLocalDay(start, end)) return `${formatDateTime(start)} \u2013 ${formatTime(end)}`;
  return `${formatDateTime(start)} \u2013 ${formatDateTime(end)}`;
}
