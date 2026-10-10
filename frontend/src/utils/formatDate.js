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
