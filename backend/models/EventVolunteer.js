const mongoose = require("mongoose");

// One student helping at one event, in one of the event's volunteer roles
// (the roles live on the event itself: Event.volunteerRoles). A student can
// help in one role per event, which the unique index enforces even if two taps
// arrive at the same moment.
const eventVolunteerSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: mongoose.Schema.Types.ObjectId, required: true },
    // Set by an organiser once the student has actually helped (needed for the certificate).
    attended: { type: Boolean, default: false },
    // Set once the day-before reminder has been handled (sent, skipped or failed).
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);
eventVolunteerSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("EventVolunteer", eventVolunteerSchema);
