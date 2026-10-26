// Shared by every place an event's date/time gets put into an email
// (registration confirmation, reschedule/cancellation notices, reminders)
// so the format stays consistent instead of drifting between copies.
//
// The server runs in UTC, so without an explicit zone a 10:00 event in Nepal
// would read "4:15 AM" in the email. Times are written in the college's zone
// (Nepal by default; set EVENT_TIMEZONE to change it) and the zone is named so
// nobody has to guess.
const DEFAULT_ZONE = "Asia/Kathmandu";

function eventZone() {
  const zone = process.env.EVENT_TIMEZONE || DEFAULT_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone;
  } catch {
    return DEFAULT_ZONE; // a mistyped setting shouldn't break every email
  }
}

function formatEventDate(date) {
  const zone = eventZone();
  const text = new Date(date).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: zone,
  });
  return zone === DEFAULT_ZONE ? `${text} (Nepal time)` : text;
}

module.exports = { formatEventDate };
