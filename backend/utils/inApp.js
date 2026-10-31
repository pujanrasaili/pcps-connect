const Notification = require("../models/Notification");
const User = require("../models/User");

// Adds the same short in-app message for each of the given users. Always
// best-effort: a problem here is logged and swallowed, because it must never
// turn a successful action (approving a request, promoting someone off the
// waitlist) into an error. Returns how many messages were stored.
async function pushNotifications(userIds, { type, title, link = "" }) {
  try {
    const ids = [...new Set((userIds || []).filter(Boolean).map(String))];
    if (ids.length === 0 || !type || !title) return 0;
    // Links are paths on this site only.
    const safeLink = typeof link === "string" && link.startsWith("/") && !link.startsWith("//") ? link : "";
    await Notification.insertMany(ids.map((user) => ({ user, type, title: String(title).slice(0, 200), link: safeLink })));
    return ids.length;
  } catch (err) {
    console.error("Failed to store in-app notification:", err.message);
    return 0;
  }
}

// Tells every admin. Also best-effort: it never throws, so the student's own
// action (verifying an email, requesting a seat) can't fail because of it.
async function notifyAdmins(message) {
  try {
    const admins = await User.find({ role: "admin" }).select("_id");
    return await pushNotifications(admins.map((a) => a._id), message);
  } catch (err) {
    console.error("Failed to notify admins:", err.message);
    return 0;
  }
}

module.exports = { pushNotifications, notifyAdmins };
