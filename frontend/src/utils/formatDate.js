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
