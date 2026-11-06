// Shared by every place an event's date/time gets put into an email
// (registration confirmation, reschedule/cancellation notices, reminders)
// so the format stays consistent instead of drifting between copies.
//
// The server runs in UTC, so without an explicit zone a 10:00 event in Nepal
// would read "4:15 AM" in the email. Times are written in the college's zone
// (Nepal by default; set EVENT_TIMEZONE to change it) and the zone is named so
// nobody has to guess.
const DEFAULT_ZONE = "Asia/Kathmandu";

// Weekday and month names for Nepali emails (digits stay as they are).
const NE_NAMES = {
  Sun: "आइत", Mon: "सोम", Tue: "मङ्गल", Wed: "बुध", Thu: "बिहि", Fri: "शुक्र", Sat: "शनि",
  Jan: "जन", Feb: "फेब्रु", Mar: "मार्च", Apr: "अप्रिल", May: "मे", Jun: "जुन",
  Jul: "जुलाई", Aug: "अग", Sep: "सेप्ट", Oct: "अक्टो", Nov: "नोभे", Dec: "डिसे",
};

function eventZone() {
  const zone = process.env.EVENT_TIMEZONE || DEFAULT_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone;
  } catch {
    return DEFAULT_ZONE; // a mistyped setting shouldn't break every email
  }
}

function formatEventDate(date, language) {
  const zone = eventZone();
  const options = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: zone,
  };
  const when = new Date(date);
  let text = when.toLocaleString("en-US", options);
  if (language === "ne") {
    text = new Intl.DateTimeFormat("en-US", options)
      .formatToParts(when)
      .map((part) => (part.type === "weekday" || part.type === "month" ? NE_NAMES[part.value] || part.value : part.value))
      .join("");
  }
  if (zone !== DEFAULT_ZONE) return text;
  return language === "ne" ? `${text} (नेपाल समय)` : `${text} (Nepal time)`;
}

module.exports = { formatEventDate };
