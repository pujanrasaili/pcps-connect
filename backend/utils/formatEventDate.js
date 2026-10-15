// Shared by every place an event's date/time gets put into an email
// (registration confirmation, reschedule/cancellation notices, reminders)
// so the format stays consistent instead of drifting between copies.
function formatEventDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

module.exports = { formatEventDate };
