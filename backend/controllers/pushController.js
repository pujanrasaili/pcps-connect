const PushSubscription = require("../models/PushSubscription");
const { publicKey, sendPush } = require("../utils/webPush");
const { safeError } = require("../utils/errorMessage");

// A student can have alerts on a handful of devices, not thousands.
const MAX_DEVICES = 10;

// GET /api/push/key  (logged in) -- the public key the browser needs to
// subscribe, or { enabled: false } when the server isn't set up for alerts.
function getKey(req, res) {
  const key = publicKey();
  res.status(200).json(key ? { enabled: true, key } : { enabled: false });
}

// POST /api/push/subscribe  { subscription: { endpoint, keys: { p256dh, auth } } }
async function subscribe(req, res) {
  try {
    if (!publicKey()) return res.status(503).json({ message: "Alerts aren't switched on for this site" });
    const s = req.body?.subscription;
    const endpoint = typeof s?.endpoint === "string" ? s.endpoint : "";
    const p256dh = s?.keys?.p256dh;
    const auth = s?.keys?.auth;
    if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || typeof p256dh !== "string" || typeof auth !== "string") {
      return res.status(400).json({ message: "That isn't a valid alert subscription" });
    }
    const mine = await PushSubscription.countDocuments({ user: req.user._id, endpoint: { $ne: endpoint } });
    if (mine >= MAX_DEVICES) return res.status(400).json({ message: "You already have alerts on 10 devices. Turn some off first." });
    // The same device may switch accounts: the newest login owns it.
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user: req.user._id, endpoint, keys: { p256dh, auth } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ message: "Alerts are on for this device." });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to turn on alerts") });
  }
}

// DELETE /api/push/subscribe  { endpoint }  -- turn alerts off for one device (your own only)
async function unsubscribe(req, res) {
  try {
    const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : "";
    if (!endpoint) return res.status(400).json({ message: "endpoint is required" });
    await PushSubscription.deleteOne({ user: req.user._id, endpoint });
    res.status(200).json({ message: "Alerts are off for this device." });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to turn off alerts") });
  }
}

// POST /api/push/test  -- send a test alert to the student's own devices, so
// they can see that alerts work.
async function sendTest(req, res) {
  try {
    if (!publicKey()) return res.status(503).json({ message: "Alerts aren't switched on for this site" });
    const sent = await sendPush([req.user._id], { title: "Test alert from PCPS Connect. Alerts are working!", link: "/settings" });
    if (!sent) return res.status(404).json({ message: "No device has alerts switched on yet" });
    res.status(200).json({ message: "Test alert sent. It should pop up in a moment." });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to send a test alert") });
  }
}

module.exports = { getKey, subscribe, unsubscribe, sendTest };
