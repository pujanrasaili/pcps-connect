// An optional "registration closes at" time on an event. After it passes, nobody
// new can register or join the waitlist; people who already registered keep
// their place and can still cancel. Organisers can still add walk-ins.

// Turns what the form sent into { value, error }.
//  - blank / null            -> no deadline ({ value: null })
//  - a valid time before the event starts -> { value: Date }
// The event's own date is passed in because an edit may not resend it.
function parseDeadline(raw, eventDate) {
  if (raw === undefined || raw === null || raw === "" || raw === "null") return { value: null };
  if (typeof raw === "object" && !(raw instanceof Date)) return { error: "Enter a valid registration deadline" };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { error: "Enter a valid registration deadline" };
  const eventTime = new Date(eventDate).getTime();
  if (!Number.isNaN(eventTime) && d.getTime() > eventTime) {
    return { error: "The registration deadline can't be after the event starts" };
  }
  return { value: d };
}

function registrationClosed(event, now = new Date()) {
  if (!event || !event.registrationDeadline) return false;
  return now.getTime() > new Date(event.registrationDeadline).getTime();
}

module.exports = { parseDeadline, registrationClosed };
