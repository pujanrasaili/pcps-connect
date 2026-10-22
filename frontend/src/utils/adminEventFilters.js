import { isPastEvent } from "./formatDate.js";

export const ADMIN_EVENT_TABS = [
  ["all", "All"],
  ["upcoming", "Upcoming"],
  ["past", "Past"],
  ["pending", "Needs a decision"],
];

function inTab(event, tab) {
  if (tab === "upcoming") return !isPastEvent(event.date);
  if (tab === "past") return isPastEvent(event.date);
  if (tab === "pending") return (event.pendingCount ?? 0) > 0;
  return true;
}

// Events matching a tab and a title search (case-insensitive).
export function filterAdminEvents(events, { tab = "all", query = "" } = {}) {
  const needle = query.toLowerCase();
  return events.filter((e) => inTab(e, tab) && (e.title || "").toLowerCase().includes(needle));
}

// How many events each tab would show (ignoring the search), for the tab labels.
export function countAdminEvents(events) {
  const counts = {};
  for (const [tab] of ADMIN_EVENT_TABS) counts[tab] = events.filter((e) => inTab(e, tab)).length;
  return counts;
}
