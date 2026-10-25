// Offline check-in tickets.
//
// At the door the campus wifi or a student's mobile data can be bad, and the
// check-in QR normally has to be fetched from the server. So while a student
// is online the app quietly saves, on THEIR phone only, the check-in code of
// each upcoming confirmed registration; the "My tickets" page can then show
// the QR with no internet at all.
//
// A check-in code is just a signed registration id (see backend
// utils/checkInCode.js): it is the same ticket the student already shows,
// nothing more. Tickets are removed when the student logs out, when the
// registration is cancelled, and some hours after the event.
//
// Everything here is plain functions with the storage passed in, so it can be
// tested without a browser.
export const TICKETS_KEY = "pcps_tickets_v1";
// An event in progress, or one that ran late, still needs its ticket.
const KEEP_AFTER_EVENT_MS = 12 * 60 * 60 * 1000;

export function browserStorage() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

function isTicket(t) {
  return t && typeof t.id === "string" && typeof t.code === "string" && typeof t.title === "string" && typeof t.date === "string";
}

export function readTickets(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(TICKETS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(isTicket) : [];
  } catch {
    return [];
  }
}

export function writeTickets(storage, tickets) {
  try {
    storage?.setItem(TICKETS_KEY, JSON.stringify(tickets));
  } catch {
    // Storage full or blocked (private mode): tickets just won't work offline.
  }
}

export function clearTickets(storage) {
  try {
    storage?.removeItem(TICKETS_KEY);
  } catch {
    // Nothing to do.
  }
}

// Tickets worth showing now, soonest first.
export function visibleTickets(tickets, now = Date.now()) {
  return tickets
    .filter((t) => new Date(t.date).getTime() + KEEP_AFTER_EVENT_MS >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Which registrations should have a saved ticket: upcoming (or just started),
// confirmed (a pending request has no valid ticket yet), event still present.
export function ticketWorthy(registrations, now = Date.now()) {
  return registrations.filter(
    (r) => r?.event?._id && r.status !== "pending" && new Date(r.event.date).getTime() + KEEP_AFTER_EVENT_MS >= now
  );
}

// Decides what to do after a successful fetch of the student's registrations.
//  keep -- tickets we already hold a code for, refreshed with the event's
//          current title/date/location (an organiser may have changed them)
//  need -- registrations that still need their code fetched
// Anything stored but not in `registrations` (cancelled, deleted) is dropped
// simply by not being listed in `keep`.
export function planTicketSync(registrations, stored, now = Date.now()) {
  const byId = new Map(stored.map((t) => [t.id, t]));
  const keep = [];
  const need = [];
  for (const r of ticketWorthy(registrations, now)) {
    const existing = byId.get(r._id);
    if (existing) keep.push(toTicket(r, existing.code));
    else need.push(r);
  }
  return { keep, need };
}

export function toTicket(registration, code) {
  const event = registration.event;
  return {
    id: registration._id,
    code,
    title: event.title || "Event",
    date: event.date,
    location: event.location || "",
  };
}

export function ticketUrl(origin, code) {
  return `${origin}/admin/check-in?code=${encodeURIComponent(code)}`;
}
