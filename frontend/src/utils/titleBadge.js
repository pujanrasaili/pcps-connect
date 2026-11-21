// "(2) Events | PCPS Connect" -- the number of unread bell messages in front of
// the page title, so a tab left in the background shows when something arrived.
const PREFIX = /^\(\d+\+?\) /;

export function applyBadge(title, unread) {
  const base = String(title || "").replace(PREFIX, "");
  const n = Number(unread) || 0;
  if (n <= 0) return base;
  return `(${n > 9 ? "9+" : n}) ${base}`;
}
