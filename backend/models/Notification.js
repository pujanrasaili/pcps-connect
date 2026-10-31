const mongoose = require("mongoose");

// One short in-app message for one student ("You got a seat: Hack Night"),
// shown under the bell in the top bar. These repeat what an email already says,
// for students who don't check their inbox, so they expire on their own.
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true, trim: true, maxlength: 40 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    // A path inside the site ("/events/<id>"), never an outside address.
    link: { type: String, default: "", maxlength: 200 },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ user: 1, createdAt: -1 });
// Old messages clean themselves up after 60 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 60 });

module.exports = mongoose.model("Notification", notificationSchema);
