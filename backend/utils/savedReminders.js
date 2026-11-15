// A nudge for students who saved an event for later but have not joined it:
// when it is about to start (it is called for each event in the daily reminder
// window by scripts/sendEventReminders.js), they get a bell message. Bell only,
// no email, so it stays light. Skipped when registration has closed, when the
// student turned event reminders off, and when they already registered. A
// student is nudged once per event (the bell record itself is the memory).
const User = require("../models/User");
const Registration = require("../models/Registration");
const Notification = require("../models/Notification");
const { pushNotifications } = require("./inApp");
const { formatEventDate } = require("./formatEventDate");
const { registrationClosed } = require("./registrationDeadline");

async function remindSavers(event, now = new Date()) {
  if (registrationClosed(event, now)) return 0;
  const link = `/events/${event._id}`;
  const savers = await User.find({ savedEvents: String(event._id), eventReminders: { $ne: false } }).select("_id");
  const ids = (savers || []).map((u) => String(u._id));
  if (ids.length === 0) return 0;
  const joined = await Registration.find({ event: event._id, user: { $in: ids }, status: { $ne: "cancelled" } }).select("user");
  const told = await Notification.find({ type: "saved_reminder", link, user: { $in: ids } }).select("user");
  const skip = new Set([...(joined || []), ...(told || [])].map((r) => String(r.user)));
  const targets = ids.filter((id) => !skip.has(id));
  return pushNotifications(targets, {
    type: "saved_reminder",
    title: `You saved ${event.title}: it is on ${formatEventDate(event.date)}`,
    link,
  });
}

module.exports = { remindSavers };
