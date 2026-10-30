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
const EventQuestion = require("../models/EventQuestion");
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
const { fillMonthly, rankClubs } = require("../utils/insights");
const { weekWindows, trend } = require("../utils/weekSummary");
const { pickAdminUserFields, adminUserFieldsProblem } = require("../utils/adminUserFields");
const { validateEventFields, cleanCategory } = require("../utils/eventInput");
const { parseFlag } = require("../utils/eventFlags");
const { sendRegistrationConfirmation, sendRequestDeclined } = require("../utils/registrationEmails");

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

// PUT /api/admin/users/:id  (only role, approval status and plain profile fields are accepted -- see utils/adminUserFields.js)
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
    const safeUpdates = pickAdminUserFields(req.body);
    const fieldsProblem = adminUserFieldsProblem(safeUpdates);
    if (fieldsProblem) return res.status(400).json({ message: fieldsProblem });
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

// PUT /api/admin/users/:id/verify-email
// Marks a student's email address as verified by hand, for when the verification
// email never reached them (mail trouble, a mistyped inbox). Deliberately its
// own admin-only action, not part of the general user update, and recorded in
// the activity log -- it skips the proof that the student owns the address.
// It does not approve the account; that is still a separate decision.
async function markEmailVerified(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.emailVerified) {
      return res.status(200).json({ message: "This email is already verified", user: publicUserSummary(user) });
    }
    user.emailVerified = true;
    await user.save();
    await recordAudit(req.user, "user.email_verified", `Marked ${user.name} (${user.email}) as email-verified by hand`);
    res.status(200).json({ message: `${user.name}'s email is now marked as verified`, user: publicUserSummary(user) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to verify email") });
  }
}

function publicUserSummary(user) {
  return { _id: user._id, name: user.name, email: user.email, emailVerified: user.emailVerified, approvalStatus: user.approvalStatus };
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
    const inputError = validateEventFields(req.body);
    if (inputError) return res.status(400).json({ message: inputError });
    const oldDate = existing.date;
    const oldLocation = existing.location;

    // Whitelisted rather than passing req.body straight through: otherwise a
    // request could overwrite createdBy (reassigning ownership), and the
    // capacity value skipped the validation the creator-facing route does.
    const updates = {};
    for (const field of ["title", "description", "date", "location", "category", "price", "image"]) {
      if (req.body[field] !== undefined) updates[field] = field === "category" ? cleanCategory(req.body[field]) : req.body[field];
    }
    const requiresApproval = parseFlag(req.body.requiresApproval);
    if (requiresApproval !== undefined) updates.requiresApproval = requiresApproval;
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
    await recordAudit(req.user, "event.updated", `Edited event "${event.title}"`);
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
    await EventQuestion.deleteMany({ event: event._id });
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
    if (registration.status === "pending") {
      return res.status(400).json({ message: "Approve this request before marking attendance" });
    }

    registration.attended = attended;
    await registration.save();
    await registration.populate("user", "name email studentId");
    res.status(200).json({ message: "Attendance updated", registration });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to update attendance") });
  }
}

// PUT /api/admin/registrations/:id/decision  { decision: "approve" | "reject" }
// For events that require approval. Approving confirms the student (and sends
// the confirmation with its calendar invite); declining removes the request,
// frees the seat for the waitlist and tells the student. Only a request that is
// still pending can be decided, so a double click can't send two emails.
async function decideRegistration(req, res) {
  try {
    const { decision } = req.body;
    if (decision !== "approve" && decision !== "reject") {
      return res.status(400).json({ message: 'decision must be "approve" or "reject"' });
    }

    const registration = await Registration.findById(req.params.id).populate("user", "name email studentId");
    if (!registration) return res.status(404).json({ message: "Request not found -- the student may have withdrawn it" });

    const event = await Event.findById(registration.event);
    if (!event || !(await canManageEvent(req.user, event))) return res.status(403).json(FORBIDDEN);

    if (registration.status !== "pending") {
      return res.status(400).json({ message: "This request has already been decided" });
    }

    if (decision === "approve") {
      registration.status = "confirmed";
      await registration.save();
      if (registration.user?.email) await sendRegistrationConfirmation(registration.user, event);
      return res.status(200).json({ message: "Request approved", registration });
    }

    await registration.deleteOne();
    if (registration.user?.email) await sendRequestDeclined(registration.user, event);
    // The declined request's seat can go to whoever is next in line.
    try {
      await promoteFromWaitlist(event);
    } catch (promoteErr) {
      console.error("Failed to promote from waitlist:", promoteErr.message);
    }
    res.status(200).json({ message: "Request declined", registration: { _id: registration._id, status: "declined" } });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to decide on the request") });
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

    if (registration.status === "pending") {
      return res.status(400).json({ message: "This student's request hasn't been approved yet" });
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

    // The overview card shows the latest 8; "?all=1" returns every past event
    // (capped) so staff can download a full report for the college.
    const everything = req.query?.all === "1";
    const events = await Event.find(filter)
      .sort({ date: -1 })
      .limit(everything ? 500 : 8)
      .select("title date club")
      .populate("club", "name");

    const stats = await Registration.aggregate([
      { $match: { event: { $in: events.map((e) => e._id) }, status: { $ne: "pending" } } },
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

// GET /api/admin/week  (admin only)
// "Last 7 days" card: new students and new registrations against the week
// before, plus how many events are coming up in the next 7 days.
async function getWeekSummary(req, res) {
  try {
    const { thisStart, prevStart, now, nextWeekEnd } = weekWindows(new Date());
    const live = { status: { $nin: ["cancelled", "pending"] } };
    const [students, prevStudents, regs, prevRegs, upcoming] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: thisStart, $lte: now } }),
      User.countDocuments({ createdAt: { $gte: prevStart, $lt: thisStart } }),
      Registration.countDocuments({ ...live, createdAt: { $gte: thisStart, $lte: now } }),
      Registration.countDocuments({ ...live, createdAt: { $gte: prevStart, $lt: thisStart } }),
      Event.countDocuments({ date: { $gte: now, $lte: nextWeekEnd } }),
    ]);
    res.status(200).json({
      newStudents: trend(students, prevStudents),
      registrations: trend(regs, prevRegs),
      upcomingEvents: upcoming,
    });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to build the weekly summary") });
  }
}

// GET /api/admin/insights  (admin only)
// Three small trends for the overview: registrations per month (last 6),
// the most popular clubs by members, and overall turnout at past events.
async function getInsights(req, res) {
  try {
    const now = new Date();
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

    const [monthly, memberCounts, pastEvents] = await Promise.all([
      Registration.aggregate([
        { $match: { createdAt: { $gte: since }, status: { $nin: ["cancelled", "pending"] } } },
        { $group: { _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } }, count: { $sum: 1 } } },
      ]),
      ClubMembership.aggregate([{ $group: { _id: "$club", members: { $sum: 1 } } }, { $sort: { members: -1 } }, { $limit: 5 }]),
      Event.find({ date: { $lt: now } }).select("_id"),
    ]);

    const clubs = memberCounts.length ? await Club.find({ _id: { $in: memberCounts.map((c) => c._id) } }).select("name") : [];

    let attended = 0;
    let registered = 0;
    if (pastEvents.length) {
      const [totals] = await Registration.aggregate([
        { $match: { event: { $in: pastEvents.map((e) => e._id) }, status: { $nin: ["cancelled", "pending"] } } },
        { $group: { _id: null, registered: { $sum: 1 }, attended: { $sum: { $cond: ["$attended", 1, 0] } } } },
      ]);
      attended = totals?.attended || 0;
      registered = totals?.registered || 0;
    }

    res.status(200).json({
      registrationsByMonth: fillMonthly(monthly, now, 6),
      topClubs: rankClubs(memberCounts, clubs),
      attendance: { attended, registered, rate: registered ? Math.round((attended / registered) * 100) : null },
    });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to build insights") });
  }
}

module.exports = {
  markEmailVerified,
  decideRegistration,
  getInsights,
  getWeekSummary,
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
