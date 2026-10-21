// Helpers for the Events page filters, which live in the URL so a filtered
// list can be shared ("/events?when=past&category=Technology&open=1").

export const WHEN_VALUES = ["upcoming", "past", "mine"];

// Same default the event card uses when an event has no capacity set.
export function hasOpenSpots(event) {
  const capacity = event.capacity ?? 100;
  return capacity - (event.registeredCount ?? 0) > 0;
}

// Reads the filters out of URLSearchParams, falling back to safe defaults for
// anything missing or hand-edited. "mine" needs a logged-in student.
export function readEventFilters(params, { isAuthenticated = false } = {}) {
  const when = params.get("when");
  return {
    when: WHEN_VALUES.includes(when) && (when !== "mine" || isAuthenticated) ? when : "upcoming",
    category: params.get("category") || "All",
    query: params.get("q") || "",
    openOnly: params.get("open") === "1",
    club: params.get("club") || "",
    view: params.get("view") === "calendar" ? "calendar" : "list",
  };
}

// Returns new URLSearchParams with `patch` applied; default values are dropped
// so the plain /events URL stays clean.
export function withEventFilters(params, patch) {
  const next = new URLSearchParams(params);
  const defaults = { when: "upcoming", category: "All", q: "", open: "", view: "list" };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null || value === false || value === defaults[key]) next.delete(key);
    else next.set(key, value === true ? "1" : String(value));
  }
  return next;
}
