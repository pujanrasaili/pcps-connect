const Notification = require("../models/Notification");

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

module.exports = { pushNotifications };
