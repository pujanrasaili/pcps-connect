const mongoose = require("mongoose");

// One browser/phone a student chose to get alerts on (see utils/webPush.js).
// The endpoint is the address of that device's push service and is unique.
const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    endpoint: { type: String, required: true, unique: true, maxlength: 1000 },
    keys: {
      p256dh: { type: String, required: true, maxlength: 200 },
      auth: { type: String, required: true, maxlength: 100 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PushSubscription", pushSubscriptionSchema);
