const User = require("../models/User");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const ClubMembership = require("../models/ClubMembership");
const WaitlistEntry = require("../models/WaitlistEntry");
const { promoteFromWaitlist } = require("../utils/waitlist");
const AuditLog = require("../models/AuditLog");
const { recordAudit } = require("../utils/audit");
const { safeError } = require("../utils/errorMessage");
const { parseCapacity, capacityConflict } = require("../utils/eventCapacity");
const { notifyEventRescheduled, notifyEventCancelled, notifyEventAnnouncement } = require("../utils/notifyRegistrants");
const sendEmail = require("../utils/sendEmail");
const renderEmail = require("../utils/emailTemplate");
const { escapeHtml } = require("../utils/escapeHtml");

// Best-effort, same pattern as every other email in this app -- a failed
// send is logged and swallowed, never allowed to turn a successful approval
// decision into a 500.
async function notifyApprovalDecision(user, approvalStatus) {
  try {
    const isApproved = approvalStatus === "approved";
    await sendEmail({
      to: user.email,
      subject: isApproved ? "Your PCPS Connect account is approved" : "Update on your PCPS Connect registration",
      html: renderEmail({
        heading: isApproved ? "You're approved!" : "Registration update",
        bodyHtml: isApproved
          ? `
            <p style="margin: 0 0 12px;">Hi ${escapeHtml(user.name)},</p>
            <p style="margin: 0;">Your PCPS Connect account has been approved. You can log in now and start exploring clubs and events.</p>
          `
          : `
            <p style="margin: 0 0 12px;">Hi ${escapeHtml(user.name)},</p>
            <p style="margin: 0;">Your PCPS Connect registration wasn't approved. If you think this is a mistake, please contact PCPS administration.</p>
          `,
        ctaText: isApproved ? "Log in" : undefined,
        ctaUrl: isApproved ? `${process.env.CLIENT_ORIGIN}/login` : undefined,
      }),
    });
  } catch (emailErr) {
    console.error("Failed to send approval decision email:", emailErr.message);
  }
}

// GET /api/admin/users
async function getAllUsers(req, res) {
  try {
    const users = await User.find();
    res.status(200).json({ users });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch users") });
  }
}

// GET /api/admin/users/:id
async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch user") });
  }
}

// GET /api/admin/users/:id/events
async function getUserEvents(req, res) {
  try {
    const events = await Event.find({ createdBy: req.params.id });
    res.status(200).json({ events });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch user's events") });
  }
}

// PUT /api/admin/users/:id  (password field is ignored even if sent)
//
// Two safety nets here that the frontend already enforces via disabled
// buttons, but the UI alone isn't a security boundary -- a direct API call
// bypasses it entirely, so both checks are repeated here:
//   1. An admin can't change their OWN role or approval status through this
//      route -- stops an admin from accidentally (or via a crafted request)
//      demoting or un-approving themselves out of the admin panel.
//   2. The last remaining admin account can't be demoted to "user" -- without
//      this, demoting it would leave the entire app with zero admins and no
//      way to promote anyone back short of editing the database directly.
async function updateUser(req, res) {
  try {
    const { password, ...safeUpdates } = req.body;
    const targetId = req.params.id;

    if (targetId === req.user._id.toString() && ("role" in safeUpdates || "approvalStatus" in safeUpdates)) {
      return res.status(400).json({ message: "You can't change your own role or approval status" });
    }

    if ("role" in safeUpdates && safeUpdates.role !== "admin") {
      const target = await User.findById(targetId);
      if (target?.role === "admin") {
        const adminCount = await User.countDocuments({ role: "admin" });
        if (adminCount <= 1) {
          return res.status(400).json({ message: "Can't demote the last remaining admin" });
        }
      }
    }

    // Captured before the update so the email below only fires on an actual
    // transition (e.g. pending -> approved), not every time a request
    // happens to include approvalStatus set to what it already was.
    let oldApprovalStatus = null;
    if ("approvalStatus" in safeUpdates) {
      const target = await User.findById(targetId);
      oldApprovalStatus = target?.approvalStatus ?? null;
    }

    const user = await User.findByIdAndUpdate(targetId, safeUpdates, {
      new: true,
      runValidators: true,
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    const newApprovalStatus = safeUpdates.approvalStatus;
    if (
      oldApprovalStatus !== null &&
      newApprovalStatus !== oldApprovalStatus &&
      (newApprovalStatus === "approved" || newApprovalStatus === "rejected")
    ) {
      await notifyApprovalDecision(user, newApprovalStatus);
    }
    if ("role" in safeUpdates) {
      await recordAudit(req.user, "user.role_changed", `Set ${user.name} (${user.email}) to ${user.role}`);
    }
    if (oldApprovalStatus !== null && newApprovalStatus !== oldApprovalStatus && ["approved", "rejected"].includes(newApprovalStatus)) {
      await recordAudit(req.user, `user.${newApprovalStatus}`, `${newApprovalStatus === "approved" ? "Approved" : "Rejected"} ${user.name} (${user.email})`);
    }
    res.status(200).json({ message: "User updated", user });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to update user") });
  }
}

// DELETE /api/admin/users/:id  -- cascade-deletes their events/registrations
async function deleteUser(req, res) {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "You can't delete your own account" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({ message: "Can't delete the last remaining admin" });
      }
    }

    // Events this user created go with them -- but other students are
    // registered for those events. Tell them it's cancelled (this has to
    // happen before their Registrations are deleted, it looks them up) and
    // delete those registrations too, otherwise they're left pointing at
    // events that no longer exist.
    const ownedEvents = await Event.find({ createdBy: user._id });
    for (const ownedEvent of ownedEvents) {
      await notifyEventCancelled(ownedEvent);
    }
    if (ownedEvents.length > 0) {
      const ownedIds = ownedEvents.map((e) => e._id);
      await Registration.deleteMany({ event: { $in: ownedIds } });
      await WaitlistEntry.deleteMany({ event: { $in: ownedIds } });
    }
    await Event.deleteMany({ createdBy: user._id });
    await Registration.deleteMany({ user: user._id });
    await WaitlistEntry.deleteMany({ user: user._id });
    await ClubMembership.deleteMany({ user: user._id });
    await user.deleteOne();
    await recordAudit(req.user, "user.deleted", `Deleted account ${user.name} (${user.email})`);

    res.status(200).json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to delete user") });
  }
}

// GET /api/admin/events
async function getAllEventsAdmin(req, res) {
  try {
    const events = await Event.find().populate("createdBy", "name email");
    res.status(200).json({ events });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch events") });
  }
}

// GET /api/admin/events/:id
async function getEventByIdAdmin(req, res) {
  try {
    const event = await Event.findById(req.params.id).populate("createdBy", "name email");
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.status(200).json({ event });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch event") });
  }
}

// PUT /api/admin/events/:id  (no ownership check, admin overrides)
async function updateEventAdmin(req, res) {
  try {
    // Fetched separately (rather than findByIdAndUpdate in one step) so
    // there's an old date/location to compare the saved result against, to
    // know whether registrants need telling.
    const existing = await Event.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Event not found" });
    const oldDate = existing.date;
    const oldLocation = existing.location;

    // Whitelisted rather than passing req.body straight through: otherwise a
    // request could overwrite createdBy (reassigning ownership), and the
    // capacity value skipped the validation the creator-facing route does.
    const updates = {};
    for (const field of ["title", "description", "date", "location", "category", "price", "image"]) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (req.body.capacity !== undefined) {
      const parsedCapacity = parseCapacity(req.body.capacity);
      if (parsedCapacity === null) {
        return res.status(400).json({ message: "Capacity must be a whole number of 1 or more" });
      }
      const conflict = await capacityConflict(existing._id, parsedCapacity);
      if (conflict) return res.status(400).json({ message: conflict });
      updates.capacity = parsedCapacity;
    }

    const event = await Event.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    await notifyEventRescheduled(event, { oldDate, oldLocation });
    // Raising capacity opens seats for anyone queued.
    try {
      await promoteFromWaitlist(event);
    } catch (promoteErr) {
      console.error("Failed to promote from waitlist:", promoteErr.message);
    }
    res.status(200).json({ message: "Event updated", event });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to update event") });
  }
}

// DELETE /api/admin/events/:id
async function deleteEventAdmin(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Must run before the registrations are deleted below -- it looks them
    // up itself to find out who to notify.
    await notifyEventCancelled(event);

    await event.deleteOne();
    await Registration.deleteMany({ event: event._id });
    await WaitlistEntry.deleteMany({ event: event._id });
    await recordAudit(req.user, "event.deleted", `Deleted event "${event.title}"`);
    res.status(200).json({ message: "Event deleted" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to delete event") });
  }
}

// GET /api/admin/events/:id/registrations
// Lists everyone registered for an event, so an admin can see who showed up
// and mark attendance.
async function getEventRegistrations(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const registrations = await Registration.find({ event: req.params.id })
      .populate("user", "name email studentId")
      .sort({ createdAt: 1 });

    res.status(200).json({ registrations });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch registrations") });
  }
}

// PUT /api/admin/registrations/:id  -- mark a single registration attended/not
async function updateRegistrationAttendance(req, res) {
  try {
    const { attended } = req.body;
    if (typeof attended !== "boolean") {
      return res.status(400).json({ message: "attended must be true or false" });
    }

    const registration = await Registration.findByIdAndUpdate(
      req.params.id,
      { attended },
      { new: true }
    ).populate("user", "name email studentId");

    if (!registration) return res.status(404).json({ message: "Registration not found" });
    res.status(200).json({ message: "Attendance updated", registration });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to update attendance") });
  }
}

// POST /api/admin/events/:id/announce  { message }
// Emails everyone registered for the event. Recorded in the activity log
// because it's the one admin action that sends mail to many students at once.
async function announceToRegistrants(req, res) {
  try {
    const { message } = req.body;
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }
    const text = message.trim();
    if (text.length > 1000) {
      return res.status(400).json({ message: "Message must be 1000 characters or fewer" });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const sent = await notifyEventAnnouncement(event, text);
    await recordAudit(req.user, "event.announcement", `Sent a message to ${sent} registrant(s) of "${event.title}"`);

    res.status(200).json({ message: `Message sent to ${sent} student(s)`, sent });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to send message") });
  }
}

// GET /api/admin/audit  -- most recent admin actions, newest first
async function getAuditLog(req, res) {
  try {
    const entries = await AuditLog.find().sort({ createdAt: -1 }).limit(200);
    res.status(200).json({ entries });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch activity log") });
  }
}

module.exports = {
  announceToRegistrants,
  getAuditLog,
  getAllUsers,
  getUserById,
  getUserEvents,
  updateUser,
  deleteUser,
  getAllEventsAdmin,
  getEventByIdAdmin,
  updateEventAdmin,
  deleteEventAdmin,
  getEventRegistrations,
  updateRegistrationAttendance,
};
