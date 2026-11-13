const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    // Optional: when the event ends (calendars and the event page show the length).
    endDate: { type: Date, default: null },
    location: { type: String, required: true },
    image: { type: String, default: null },
    // Online meeting link (Zoom, Meet...). Hidden from every ordinary query; only
    // controllers/eventJoinLinkController.js hands it out, to registered students
    // and the event's organisers.
    joinLink: { type: String, default: "", select: false, maxlength: 300 },
    // Photos from the event itself, added by its organisers (at most 8; see
    // controllers/eventPhotosController.js).
    photos: { type: [String], default: [] },
    capacity: { type: Number, default: 100, min: 1 },
    // Optional helper roles students can sign up for (see
    // controllers/eventVolunteerController.js). At most 5, set by the organisers.
    volunteerRoles: {
      type: [{ name: { type: String, required: true, trim: true, maxlength: 40 }, slots: { type: Number, required: true, min: 1, max: 50 } }],
      default: [],
    },
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
  // Optional: up to two more clubs running the event together with `club`. Only an
  // admin sets these. Their leaders can manage the event too (utils/clubAccess.js).
  coHosts: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Club" }], default: [], index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

// Every public events page sorts by date, and this is unindexed data growing
// without bound (unlike most other collections here, which top out at a
// few hundred rows).
eventSchema.index({ date: 1 });

module.exports = mongoose.model("Event", eventSchema);
