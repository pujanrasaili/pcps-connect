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

export function isUpcoming(dateStr) {
  return new Date(dateStr) >= new Date(new Date().toDateString());
}
