// Wording for the admin "Last 7 days" card. `t` is { current, previous, change }
// from GET /admin/week; change is null when last week was zero.
export function changeLabel(t) {
  if (!t) return "";
  if (t.change == null) return t.current > 0 ? "None the week before" : "None in either week";
  if (t.change === 0) return "Same as the week before";
  return `${t.change > 0 ? "Up" : "Down"} ${Math.abs(t.change)}% from ${t.previous} the week before`;
}
