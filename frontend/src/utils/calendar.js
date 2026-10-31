// "Add to calendar" helpers. An event may have an end time; without one every
// calendar entry gets a fixed default length.
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

// 20270115T093000Z -- the UTC basic format both iCalendar and Google
// Calendar links expect.
function toCalendarDate(date) {
  return new Date(date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// RFC 5545 text escaping: backslash first, then the characters that would
// otherwise end or split a field, and newlines.
function escapeIcsText(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Lines over 75 characters must be folded: break and continue the next
// line with a single space (RFC 5545 section 3.1).
function foldLine(line) {
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

// The organiser's end time when it is a real moment after the start, else the
// default length.
function eventEnd(event, start) {
  const end = event.endDate ? new Date(event.endDate) : null;
  return end && end.getTime() > start.getTime() ? end : new Date(start.getTime() + DEFAULT_DURATION_MS);
}

function eventLines(event, now) {
  const start = new Date(event.date);
  const end = eventEnd(event, start);
  return [
    "BEGIN:VEVENT",
    `UID:${event._id}@pcps-connect`,
    `DTSTAMP:${toCalendarDate(now)}`,
    `DTSTART:${toCalendarDate(start)}`,
    `DTEND:${toCalendarDate(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    ...ALARM_LINES,
    "END:VEVENT",
  ];
}

// One calendar file holding any number of events (e.g. everything a student
// is registered for), so it can be imported in a single step.
export function buildIcsCalendar(events, now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PCPS Connect//Events//EN",
    "CALSCALE:GREGORIAN",
    ...events.flatMap((event) => eventLines(event, now)),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export function buildIcs(event, now = new Date()) {
  return buildIcsCalendar([event], now);
}

export function googleCalendarUrl(event) {
  const start = new Date(event.date);
  const end = eventEnd(event, start);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toCalendarDate(start)}/${toCalendarDate(end)}`,
    location: event.location || "",
    details: event.description || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function saveIcs(content, filename) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadIcs(event) {
  const name = event.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "event";
  saveIcs(buildIcs(event), `${name}.ics`);
}

// Every given event in one .ics file (the dashboard's "Add all to calendar").
export function downloadIcsAll(events, filename = "pcps-events.ics") {
  saveIcs(buildIcsCalendar(events), filename);
}
