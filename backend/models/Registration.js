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
    // Post-event feedback, only settable by the student once an admin has
    // marked them as having attended (see submitFeedback).
    rating: { type: Number, min: 1, max: 5, default: null },
    feedback: { type: String, maxlength: 500, default: "" },
  },
  { timestamps: true }
);

// A student can only register for the same event once.
registrationSchema.index({ user: 1, event: 1 }, { unique: true });
// Seat counts and attendee lists look up by event alone; the index above starts with user.
registrationSchema.index({ event: 1 });

module.exports = mongoose.model("Registration", registrationSchema);
