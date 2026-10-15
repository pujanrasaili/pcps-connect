const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "confirmed" },
    attended: { type: Boolean, default: false },
    // Set by scripts/sendEventReminders.js once a "your event is tomorrow"
    // reminder has gone out for this registration, so a daily cron run
    // doesn't re-email the same student every day between registering and
    // the event actually happening.
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// A student can only register for the same event once.
registrationSchema.index({ user: 1, event: 1 }, { unique: true });

module.exports = mongoose.model("Registration", registrationSchema);
