const { notifyNewLeaders } = require("../utils/notifyNewLeaders");
const { removeUserAndData } = require("../utils/deleteAccountData");
const User = require("../models/User");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const ClubMembership = require("../models/ClubMembership");
const Club = require("../models/Club");
const { notifyClubAnnouncement } = require("../utils/notifyClubMembers");
const { canManageEvent, canManageClub, isAdmin, ledClubs } = require("../utils/clubAccess");
const WaitlistEntry = require("../models/WaitlistEntry");
const { promoteFromWaitlist } = require("../utils/waitlist");
const AuditLog = require("../models/AuditLog");
const { recordAudit } = require("../utils/audit");
const { verifyCheckInCode } = require("../utils/checkInCode");
const { safeError } = require("../utils/errorMessage");
const { parseCapacity, capacityConflict } = require("../utils/eventCapacity");
const { notifyEventRescheduled, notifyEventCancelled, notifyEventAnnouncement } = require("../utils/notifyRegistrants");
const sendEmail = require("../utils/sendEmail");
const renderEmail = require("../utils/emailTemplate");
const { escapeHtml } = require("../utils/escapeHtml");

const FORBIDDEN = { message: "Access denied: insufficient permissions" };
const { buildAttendanceReport } = require("../utils/attendanceReport");

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

// PUT /api/admin/users/bulk-approve  { userIds: [...] }
// Approves many pending accounts at once (start-of-semester sign-up rush).
// Only accounts that are still "pending" are touched, so ids that were already
// approved/rejected (or don't exist) are skipped rather than overwritten.
async function bulkApproveUsers(req, res) {
  try {
    const { userIds } = req.body;
    if (
      !Array.isArray(userIds) ||
      userIds.length === 0 ||
      userIds.length > 200 ||
      userIds.some((id) => typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id))
    ) {
      return res.status(400).json({ message: "userIds must be a list of 1 to 200 user ids" });
    }
    const ids = [...new Set(userIds)];

    const pending = await User.find({ _id: { $in: ids }, approvalStatus: "pending" }).select("name email");
    if (pending.length === 0) {
      return res.status(200).json({ message: "No pending accounts to approve", approved: 0 });
    }

    await User.updateMany({ _id: { $in: pending.map((u) => u._id) }, approvalStatus: "pending" }, { approvalStatus: "approved" });
    await Promise.allSettled(pending.map((u) => notifyApprovalDecision(u, "approved")));
    await recordAudit(req.user, "user.approved_bulk", `Approved ${pending.length} account${pending.length === 1 ? "" : "s"} at once`);

    res.status(200).json({ message: `Approved ${pending.length} account${pending.length === 1 ? "" : "s"}`, approved: pending.length });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to approve accounts") });
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

    await removeUserAndData(user);
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
    if (!(await canManageEvent(req.user, event))) return res.status(403).json(FORBIDDEN);

    const [registrations, waitlist] = await Promise.all([
      Registration.find({ event: req.params.id })
        .populate("user", "name email studentId")
        .sort({ createdAt: 1 }),
      // Oldest first -- the order students will be promoted in. Shows organisers
      // how much unmet demand a full event has.
      WaitlistEntry.find({ event: req.params.id })
        .populate("user", "name email studentId")
        .sort({ createdAt: 1 }),
    ]);

    res.status(200).json({ registrations, waitlist });
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

    const registration = await Registration.findById(req.params.id);
    if (!registration) return res.status(404).json({ message: "Registration not found" });

    const event = await Event.findById(registration.event);
    if (!event || !(await canManageEvent(req.user, event))) return res.status(403).json(FORBIDDEN);

    registration.attended = attended;
    await registration.save();
    await registration.populate("user", "name email studentId");
    res.status(200).json({ message: "Attendance updated", registration });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to update attendance") });
  }
}

// POST /api/admin/check-in  { code }
// Marks the registration behind a scanned QR code as attended. Safe to scan
// twice: the second time reports alreadyCheckedIn instead of failing.
async function checkInByCode(req, res) {
  try {
    const registrationId = verifyCheckInCode(req.body.code);
    if (!registrationId) {
      return res.status(400).json({ message: "That check-in code isn't valid" });
    }

    const registration = await Registration.findById(registrationId)
      .populate("user", "name studentId")
      .populate("event", "title date club");
    if (!registration || !registration.event) {
      return res.status(404).json({ message: "Registration not found -- it may have been cancelled" });
    }
    if (!(await canManageEvent(req.user, registration.event))) {
      return res.status(403).json({ message: "This student is registered for an event you don't manage" });
    }

    const alreadyCheckedIn = registration.attended;
    if (!alreadyCheckedIn) {
      registration.attended = true;
      await registration.save();
    }

    res.status(200).json({
      alreadyCheckedIn,
      student: { name: registration.user?.name || "Unknown student", studentId: registration.user?.studentId || "" },
      event: { title: registration.event.title, date: registration.event.date },
    });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Check-in failed") });
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
    if (!(await canManageEvent(req.user, event))) return res.status(403).json(FORBIDDEN);

    const sent = await notifyEventAnnouncement(event, text);
    await recordAudit(req.user, "event.announcement", `Sent a message to ${sent} registrant(s) of "${event.title}"`);

    res.status(200).json({ message: `Message sent to ${sent} student(s)`, sent });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to send message") });
  }
}

// POST /api/admin/clubs/:id/announce  { message }
// Emails everyone who joined the club (except those who opted out of club
// updates). Logged in the activity log like the event announcement.
async function announceToClubMembers(req, res) {
  try {
    const { message } = req.body;
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }
    const text = message.trim();
    if (text.length > 1000) {
      return res.status(400).json({ message: "Message must be 1000 characters or fewer" });
    }

    const club = await Club.findById(req.params.id);
    if (!club) return res.status(404).json({ message: "Club not found" });
    if (!(await canManageClub(req.user, club._id))) return res.status(403).json(FORBIDDEN);

    const sent = await notifyClubAnnouncement(club, text);
    await recordAudit(req.user, "club.announcement", `Sent a message to ${sent} member(s) of "${club.name}"`);

    res.status(200).json({ message: `Message sent to ${sent} member(s)`, sent });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to send message") });
  }
}

// GET /api/admin/clubs/:id/leaders -- the students who run this club's events
async function getClubLeaders(req, res) {
  try {
    const club = await Club.findById(req.params.id).select("name +leaders").populate("leaders", "name email studentId");
    if (!club) return res.status(404).json({ message: "Club not found" });
    res.status(200).json({ leaders: club.leaders });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch club leaders") });
  }
}

// PUT /api/admin/clubs/:id/leaders  { userIds: [...] }
// Replaces the club's leader list. Leaders must be approved student accounts;
// they can then manage only this club's events (utils/clubAccess.js).
async function setClubLeaders(req, res) {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length > 10 || userIds.some((id) => typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id))) {
      return res.status(400).json({ message: "userIds must be a list of up to 10 user ids" });
    }
    const unique = [...new Set(userIds)];

    const club = await Club.findById(req.params.id).select("name +leaders");
    if (!club) return res.status(404).json({ message: "Club not found" });

    const users = await User.find({ _id: { $in: unique }, approvalStatus: "approved" }).select("name email studentId");
    if (users.length !== unique.length) {
      return res.status(400).json({ message: "Every leader must be an approved student account" });
    }

    const before = new Set((club.leaders || []).map(String));
    club.leaders = users.map((u) => u._id);
    await club.save();
    // Only people who weren't already leaders hear about it. Best-effort.
    const added = users.filter((u) => !before.has(String(u._id)));
    if (added.length) Promise.resolve(notifyNewLeaders(added, club)).catch(() => {});
    await recordAudit(
      req.user,
      "club.leaders",
      `Set the leaders of "${club.name}" to ${users.length ? users.map((u) => u.name).join(", ") : "nobody"}`
    );

    res.status(200).json({ message: "Club leaders updated", leaders: users });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to update club leaders") });
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

// GET /api/admin/attendance-report
// Turnout and ratings for the 8 most recent past events, so organisers can
// see which events actually brought people in without opening each one.
async function getAttendanceReport(req, res) {
  try {
    // Admins see every event; a club leader only sees their own clubs'.
    const filter = { date: { $lt: new Date() } };
    if (!isAdmin(req.user)) {
      const led = await ledClubs(req.user);
      if (led.length === 0) return res.status(403).json({ message: FORBIDDEN });
      filter.club = { $in: led.map((c) => c._id) };
    }

    const events = await Event.find(filter)
      .sort({ date: -1 })
      .limit(8)
      .select("title date");

    const stats = await Registration.aggregate([
      { $match: { event: { $in: events.map((e) => e._id) } } },
      {
        $group: {
          _id: "$event",
          registered: { $sum: 1 },
          attended: { $sum: { $cond: ["$attended", 1, 0] } },
          ratingSum: { $sum: { $ifNull: ["$rating", 0] } },
          ratingCount: { $sum: { $cond: [{ $gt: ["$rating", 0] }, 1, 0] } },
        },
      },
    ]);

    res.status(200).json(buildAttendanceReport(events, stats));
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to build attendance report") });
  }
}

module.exports = {
  bulkApproveUsers,
  getAttendanceReport,
  checkInByCode,
  announceToRegistrants,
  announceToClubMembers,
  getClubLeaders,
  setClubLeaders,
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
