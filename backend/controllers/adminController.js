const User = require("../models/User");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const ClubMembership = require("../models/ClubMembership");
const { safeError } = require("../utils/errorMessage");

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

    const user = await User.findByIdAndUpdate(targetId, safeUpdates, {
      new: true,
      runValidators: true,
    });
    if (!user) return res.status(404).json({ message: "User not found" });
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

    await Event.deleteMany({ createdBy: user._id });
    await Registration.deleteMany({ user: user._id });
    await ClubMembership.deleteMany({ user: user._id });
    await user.deleteOne();

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
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.status(200).json({ message: "Event updated", event });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to update event") });
  }
}

// DELETE /api/admin/events/:id
async function deleteEventAdmin(req, res) {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    await Registration.deleteMany({ event: event._id });
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

module.exports = {
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
