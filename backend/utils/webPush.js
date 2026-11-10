const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");

// Browser/phone alerts for bell messages. Switched off (and harmless) until
// VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are set; see .env.example.
let configured = null;
function isConfigured() {
  if (configured === null) {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
    configured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
    if (configured) {
      webpush.setVapidDetails(VAPID_SUBJECT || "mailto:admin@patancollege.edu.np", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    }
  }
  return configured;
}

const publicKey = () => (isConfigured() ? process.env.VAPID_PUBLIC_KEY : null);

// Sends a short alert to every device the given users turned alerts on for.
// Best-effort like the bell itself: never throws, and a device whose
// subscription has expired (404/410) is forgotten. Returns how many were sent.
async function sendPush(userIds, { title, link = "" }) {
  try {
    if (!isConfigured()) return 0;
    const ids = [...new Set((userIds || []).filter(Boolean).map(String))];
    if (ids.length === 0 || !title) return 0;
    const subs = await PushSubscription.find({ user: { $in: ids } });
    const payload = JSON.stringify({ title: String(title).slice(0, 200), url: typeof link === "string" && link.startsWith("/") && !link.startsWith("//") ? link : "/" });
    let sent = 0;
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, payload, { TTL: 86400 });
          sent += 1;
        } catch (err) {
          if (err && (err.statusCode === 404 || err.statusCode === 410)) await PushSubscription.deleteOne({ _id: sub._id });
          else console.error("Push alert failed:", err && err.message);
        }
      })
    );
    return sent;
  } catch (err) {
    console.error("Failed to send push alerts:", err.message);
    return 0;
  }
}

module.exports = { sendPush, publicKey, isConfigured, _reset: () => { configured = null; } };
