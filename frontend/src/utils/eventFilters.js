// Helpers for the Events page filters, which live in the URL so a filtered
// list can be shared ("/events?when=past&category=Technology&open=1").

import { isRegistrationClosed } from "./registrationDeadline.js";

export const WHEN_VALUES = ["upcoming", "week", "past", "mine", "saved"];

// "This week": not started yet and starting before midnight seven days from
// today, in the viewer's own time zone (so today counts as the first day).
export function isThisWeek(dateStr, now = new Date()) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime()) || date < now) return false;
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  return date < end;
}

// Same default the event card uses when an event has no capacity set.
// An event whose registration deadline has passed is not open to new sign-ups
// even if seats remain.
export function hasOpenSpots(event) {
  const capacity = event.capacity ?? 100;
  return capacity - (event.registeredCount ?? 0) > 0 && !isRegistrationClosed(event);
}

// An event is free when its price is blank or says so ("Free", "0", "Rs. 0",
// "No charge"...). Anything else ("Rs. 200") is paid.
export function isFreeEvent(event) {
  const price = String(event?.price ?? "").trim().toLowerCase();
  if (!price) return true;
  return /^(free|no charge|nil|(rs\.?|npr)?\s*0+(\.0+)?)$/.test(price);
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
    freeOnly: params.get("free") === "1",
    club: params.get("club") || "",
    view: params.get("view") === "calendar" ? "calendar" : "list",
  };
}

// Returns new URLSearchParams with `patch` applied; default values are dropped
// so the plain /events URL stays clean.
export function withEventFilters(params, patch) {
  const next = new URLSearchParams(params);
  const defaults = { when: "upcoming", category: "All", q: "", open: "", free: "", view: "list" };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null || value === false || value === defaults[key]) next.delete(key);
    else next.set(key, value === true ? "1" : String(value));
  }
  return next;
}
