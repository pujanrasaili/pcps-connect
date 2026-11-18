const mongoose = require("mongoose");

// A student queued for a full event. Kept in its own collection (rather than
// as a new Registration status) so every existing "how many people are
// registered" count stays exactly as it was -- a waitlisted student never
// takes a seat until they're promoted into a real Registration.
const waitlistEntrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    // Answers to the event's sign-up questions (question text copied in, so it
    // still reads right if the organisers reword it). Organisers only.
    answers: { type: [{ _id: false, question: { type: String, maxlength: 100 }, answer: { type: String, maxlength: 200 } }], default: [] },
  },
  { timestamps: true }
);

// One place in line per student per event.
waitlistEntrySchema.index({ user: 1, event: 1 }, { unique: true });
// Promotion always takes the oldest entry for an event.
waitlistEntrySchema.index({ event: 1, createdAt: 1 });

module.exports = mongoose.model("WaitlistEntry", waitlistEntrySchema);
