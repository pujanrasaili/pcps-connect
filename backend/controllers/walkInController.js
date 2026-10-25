const Event = require("../models/Event");
const Registration = require("../models/Registration");
const User = require("../models/User");
const WaitlistEntry = require("../models/WaitlistEntry");
const { canManageEvent } = require("../utils/clubAccess");
const { walkInQuery } = require("../utils/walkInLookup");
const { recordAudit } = require("../utils/audit");
const { safeError } = require("../utils/errorMessage");

// POST /api/admin/events/:id/walk-in  { identifier }   (admin, or a leader of the event's club)
// For a student who turned up without registering: finds them by exact email
// or student ID and records them as registered AND attended in one step. The
// event's capacity still applies (it is usually the room's limit). Only the
// name and student ID come back, so this can't be used to look people up.
async function addWalkIn(req, res) {
  try {
    const event = await Event.findById(req.params.id).select("title capacity club createdBy");
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!(await canManageEvent(req.user, event))) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }

    const { query, error } = walkInQuery(req.body);
    if (error) return res.status(400).json({ message: error });

    const student = await User.findOne(query).select("name studentId");
    if (!student) {
      return res.status(404).json({ message: "No approved student found with that email or student ID" });
    }

    let registration = await Registration.findOne({ user: student._id, event: event._id });
    let created = false;
    if (!registration) {
      const registered = await Registration.countDocuments({ event: event._id });
      if (registered >= event.capacity) {
        return res.status(400).json({ message: "This event is full, so no more people can be added" });
      }
      try {
        registration = await Registration.create({ user: student._id, event: event._id, status: "confirmed", attended: true });
        created = true;
      } catch (err) {
        if (err.code !== 11000) throw err;
        registration = await Registration.findOne({ user: student._id, event: event._id }); // raced with their own sign-up
      }
    }

    const alreadyCheckedIn = !created && registration.attended && registration.status !== "pending";
    if (!created && !alreadyCheckedIn) {
      registration.status = "confirmed"; // an organiser accepting them at the door settles a pending request
      registration.attended = true;
      await registration.save();
    }

    // They are here, so they no longer need a waiting-list place.
    await WaitlistEntry.deleteMany({ user: student._id, event: event._id });

    if (!alreadyCheckedIn) {
      await recordAudit(req.user, "event.walkIn", `Added ${student.name} as a walk-in at "${event.title}"`);
    }
    res.status(created ? 201 : 200).json({
      alreadyCheckedIn,
      created,
      student: { name: student.name, studentId: student.studentId || "" },
    });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to add the walk-in") });
  }
}

module.exports = { addWalkIn };
