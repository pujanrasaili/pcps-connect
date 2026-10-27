// Builds a single-event iCalendar (RFC 5545) string, used to attach an
// "add to calendar" invite to registration emails. Events only store a start
// time, so every entry gets a fixed two-hour length (same as the website's
// calendar buttons).
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

const stamp = (date) => new Date(date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function escapeText(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Lines over 75 characters are folded onto continuation lines starting with a space.
function fold(line) {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(" " + line.slice(i, i + 74));
  return parts.join("\r\n");
}

// Reminders the calendar app shows on its own: a day before and an hour before.
const ALARM_LINES = [
  ["-P1D", "Tomorrow"],
  ["-PT1H", "Starting in 1 hour"],
].flatMap(([trigger, text]) => ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${text}`, `TRIGGER:${trigger}`, "END:VALARM"]);

// The lines of one VEVENT. `url` (optional) links back to the event's page.
function eventLines(event, now, url) {
  const start = new Date(event.date);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MS);
  return [
    "BEGIN:VEVENT",
    `UID:${event._id}@pcps-connect`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `LOCATION:${escapeText(event.location)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    ...(url ? [`URL:${url}`] : []),
    ...ALARM_LINES,
    "END:VEVENT",
  ];
}

function buildIcs(event, now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PCPS Connect//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...eventLines(event, now),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

// A whole calendar of events, for people who subscribe to it in Google
// Calendar, Apple Calendar or Outlook (the app re-fetches it now and then, so
// new and changed events appear by themselves). `urlFor(event)` is optional.
function buildIcsCalendar(events, { name = "PCPS Connect events", now = new Date(), urlFor } = {}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PCPS Connect//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...events.flatMap((e) => eventLines(e, now, urlFor ? urlFor(e) : undefined)),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

module.exports = { buildIcs, buildIcsCalendar };
