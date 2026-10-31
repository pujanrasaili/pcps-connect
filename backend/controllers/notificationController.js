const Notification = require("../models/Notification");
const { safeError } = require("../utils/errorMessage");

const LIMIT = 30;

// GET /api/notifications  (logged in) -- your latest messages, newest first,
// and how many of them you haven't seen yet.
async function getMyNotifications(req, res) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(LIMIT).select("type title link read createdAt"),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);
    res.status(200).json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to load notifications") });
  }
}

// PUT /api/notifications/read-all  (logged in) -- marks all of your messages as seen.
async function markAllRead(req, res) {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
    res.status(200).json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to update notifications") });
  }
}

module.exports = { getMyNotifications, markAllRead };
