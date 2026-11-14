const Event = require("../models/Event");
const EventVolunteer = require("../models/EventVolunteer");
const { canManageEvent } = require("../utils/clubAccess");
const { cleanRoles } = require("../utils/volunteerInput");
const { recordAudit } = require("../utils/audit");
const { createVolunteerCertificateCode } = require("../utils/certificateCode");
const { pushNotifications } = require("../utils/inApp");
const { safeError } = require("../utils/errorMessage");

const isPast = (event) => new Date(event.date) < new Date();

// The roles with how many places are taken. Only organisers also get the names.
async function describe(event, viewer, withNames) {
  const rows = await EventVolunteer.find({ event: event._id }).populate("user", "name email").lean();
  const mine = viewer ? rows.find((r) => String(r.user?._id) === String(viewer._id)) : null;
  return {
    roles: (event.volunteerRoles || []).map((role) => {
      const taken = rows.filter((r) => String(r.role) === String(role._id));
      const item = { _id: role._id, name: role.name, slots: role.slots, filled: taken.length };
      if (withNames) {
        item.volunteers = taken.map((r) => ({ userId: String(r.user?._id || ""), name: r.user?.name || "", email: r.user?.email || "", attended: !!r.attended }));
      }
      return item;
    }),
    mine: mine ? String(mine.role) : null,
    mineAttended: !!(mine && mine.attended),
    past: isPast(event),
  };
}

// GET /api/events/:id/volunteers  (public; organisers also see who signed up)
async function getVolunteers(req, res) {
  try {
    const event = await Event.findById(req.params.id).select("title date club coHosts createdBy volunteerRoles");
    if (!event) return res.status(404).json({ message: "Event not found" });
    const staff = !!req.user && (await canManageEvent(req.user, event));
    res.status(200).json(await describe(event, req.user, staff));
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch volunteer roles") });
  }
}

// PUT /api/events/:id/volunteers/:userId/attended  { attended: boolean }  (organisers)
// Marks that a volunteer really helped; only then can they download the certificate.
async function setHelperAttended(req, res) {
  try {
    const event = await Event.findById(req.params.id).select("title date club coHosts createdBy");
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!(await canManageEvent(req.user, event))) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    if (typeof req.body?.attended !== "boolean") return res.status(400).json({ message: "attended must be true or false" });
    if (new Date(event.date) > new Date()) return res.status(400).json({ message: "The event hasn't started yet" });
    const row = await EventVolunteer.findOneAndUpdate(
      { event: event._id, user: req.params.userId },
      { attended: req.body.attended },
      { new: true }
    );
    if (!row) return res.status(404).json({ message: "That student isn't signed up to help at this event" });
    res.status(200).json({ message: req.body.attended ? "Marked as helped" : "Marked as not helped", attended: row.attended });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to update") });
  }
}

// GET /api/events/:id/volunteers/certificate  (requires login; your own, once marked as helped)
async function getMyCertificate(req, res) {
  try {
    const row = await EventVolunteer.findOne({ event: req.params.id, user: req.user._id })
      .populate("user", "name studentId program")
      .populate({ path: "event", select: "title date location club volunteerRoles", populate: { path: "club", select: "name" } });
    if (!row || !row.event) return res.status(404).json({ message: "You didn't sign up to help at this event" });
    if (!row.attended) return res.status(400).json({ message: "Certificates are only available for events where you helped" });
    const role = (row.event.volunteerRoles || []).find((r) => String(r._id) === String(row.role));
    res.status(200).json({
      certificate: {
        studentName: row.user.name,
        studentId: row.user.studentId || "",
        program: row.user.program || "",
        eventTitle: row.event.title,
        eventDate: row.event.date,
        eventLocation: row.event.location,
        clubName: row.event.club?.name || "",
        role: role ? role.name : "",
        code: createVolunteerCertificateCode(row._id),
      },
    });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to load certificate") });
  }
}

// GET /api/events/volunteering/mine  (requires login)
// The upcoming events the student signed up to help at, soonest first.
async function getMyVolunteering(req, res) {
  try {
    const rows = await EventVolunteer.find({ user: req.user._id }).populate("event", "title date location volunteerRoles");
    const items = rows
      .filter((r) => r.event && new Date(r.event.date) >= new Date())
      .map((r) => ({
        event: { _id: r.event._id, title: r.event.title, date: r.event.date, location: r.event.location },
        role: (r.event.volunteerRoles || []).find((x) => String(x._id) === String(r.role))?.name || "",
      }))
      .sort((a, b) => new Date(a.event.date) - new Date(b.event.date));
    res.status(200).json({ volunteering: items });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to load your volunteer roles") });
  }
}

// POST /api/events/:id/volunteers  { role }  (requires login)
async function signUp(req, res) {
  try {
    const event = await Event.findById(req.params.id).select("title date createdBy volunteerRoles");
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (isPast(event)) return res.status(400).json({ message: "This event has already taken place" });
    const role = (event.volunteerRoles || []).find((r) => String(r._id) === String(req.body?.role));
    if (!role) return res.status(404).json({ message: "That role doesn't exist" });

    if (await EventVolunteer.exists({ event: event._id, user: req.user._id })) {
      return res.status(400).json({ message: "You are already helping at this event. Cancel first to pick another role." });
    }
    if ((await EventVolunteer.countDocuments({ event: event._id, role: role._id })) >= role.slots) {
      return res.status(400).json({ message: "This role is full" });
    }
    try {
      await EventVolunteer.create({ event: event._id, user: req.user._id, role: role._id });
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(400).json({ message: "You are already helping at this event. Cancel first to pick another role." });
      }
      throw err;
    }
    // Two people tapping the last place together: whoever lands over the limit steps back out.
    if ((await EventVolunteer.countDocuments({ event: event._id, role: role._id })) > role.slots) {
      await EventVolunteer.deleteOne({ event: event._id, user: req.user._id });
      return res.status(400).json({ message: "This role is full" });
    }
    // The organiser hears when a role fills up (not for every sign-up, which would be noise).
    // Best effort: pushNotifications never throws.
    if (
      String(event.createdBy) !== String(req.user._id) &&
      (await EventVolunteer.countDocuments({ event: event._id, role: role._id })) === role.slots
    ) {
      await pushNotifications([event.createdBy], {
        type: "volunteer_role_full",
        title: `All places are taken for "${role.name}" at ${event.title}`,
        link: `/events/${event._id}`,
      });
    }
    res.status(201).json({ message: "You're signed up to help!" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to sign you up") });
  }
}

// DELETE /api/events/:id/volunteers  (requires login; cancels your own sign-up)
async function cancelSignUp(req, res) {
  try {
    const removed = await EventVolunteer.findOneAndDelete({ event: req.params.id, user: req.user._id });
    if (!removed) return res.status(404).json({ message: "You aren't signed up to help at this event" });
    res.status(200).json({ message: "You're no longer helping at this event." });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to cancel") });
  }
}

// PUT /api/events/:id/volunteer-roles  { roles: [{ _id?, name, slots }] }  (organisers)
// Replaces the list. A role left out is removed along with its sign-ups.
async function setRoles(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!(await canManageEvent(req.user, event))) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    const { value, error } = cleanRoles(req.body);
    if (error) return res.status(400).json({ message: error });

    const existing = new Set((event.volunteerRoles || []).map((r) => String(r._id)));
    // An _id that isn't one of this event's roles is treated as a new role.
    const next = value.map((r) => (r._id && existing.has(r._id) ? r : { name: r.name, slots: r.slots }));
    const keep = new Set(next.filter((r) => r._id).map((r) => r._id));
    const dropped = [...existing].filter((id) => !keep.has(id));

    event.volunteerRoles = next;
    await event.save();
    if (dropped.length) await EventVolunteer.deleteMany({ event: event._id, role: { $in: dropped } });
    // Shrinking a role below its sign-ups would leave it over-full; trim the latest sign-ups.
    for (const role of event.volunteerRoles) {
      const rows = await EventVolunteer.find({ event: event._id, role: role._id }).sort({ createdAt: 1 }).select("_id");
      if (rows.length > role.slots) {
        await EventVolunteer.deleteMany({ _id: { $in: rows.slice(role.slots).map((r) => r._id) } });
      }
    }
    await recordAudit(req.user, "event.volunteerRoles", `Set ${next.length} volunteer role(s) on "${event.title}"`);
    res.status(200).json({ message: "Volunteer roles saved", ...(await describe(event, null, true)) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to save the volunteer roles") });
  }
}

module.exports = { setHelperAttended, getMyCertificate, getMyVolunteering, getVolunteers, signUp, cancelSignUp, setRoles };
