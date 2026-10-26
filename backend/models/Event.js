const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    image: { type: String, default: null },
    capacity: { type: Number, default: 100, min: 1 },
    // Optional: after this time nobody new can register or join the waitlist
    // (see utils/registrationDeadline.js).
    registrationDeadline: { type: Date, default: null },
    category: { type: String, default: "General" },
    price: { type: String, default: "Free" },
    // When true, joining is a request: the registration starts "pending" and an
    // organiser approves or declines it (see adminController.decideRegistration).
    requiresApproval: { type: Boolean, default: false },
    // Optional: the club hosting this event. Members of that club get an email
  // when it's announced (see utils/notifyClubMembers.js).
  club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", default: null, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

// Every public events page sorts by date, and this is unindexed data growing
// without bound (unlike most other collections here, which top out at a
// few hundred rows).
eventSchema.index({ date: 1 });

module.exports = mongoose.model("Event", eventSchema);
