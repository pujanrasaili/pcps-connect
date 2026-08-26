const User = require("../models/User");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const ClubMembership = require("../models/ClubMembership");

// GET /api/admin/users
async function getAllUsers(req, res) {
  const users = await User.find();
  res.status(200).json({ users });
}

// GET /api/admin/users/:id
async function getUserById(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.status(200).json({ user });
}

// GET /api/admin/users/:id/events
async function getUserEvents(req, res) {
  const events = await Event.find({ createdBy: req.params.id });
  res.status(200).json({ events });
}

// PUT /api/admin/users/:id  (password field is ignored even if sent)
async function updateUser(req, res) {
  const { password, ...safeUpdates } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, safeUpdates, {
    new: true,
    runValidators: true,
  });
  if (!user) return res.status(404).json({ message: "User not found" });
  res.status(200).json({ message: "User updated", user });
}

// DELETE /api/admin/users/:id  -- cascade-deletes their events/registrations
async function deleteUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  await Event.deleteMany({ createdBy: user._id });
  await Registration.deleteMany({ user: user._id });
  await ClubMembership.deleteMany({ user: user._id });
  await user.deleteOne();

  res.status(200).json({ message: "User deleted" });
}

// GET /api/admin/events
async function getAllEventsAdmin(req, res) {
  const events = await Event.find().populate("createdBy", "name email");
  res.status(200).json({ events });
}

// GET /api/admin/events/:id
async function getEventByIdAdmin(req, res) {
  const event = await Event.findById(req.params.id).populate("createdBy", "name email");
  if (!event) return res.status(404).json({ message: "Event not found" });
  res.status(200).json({ event });
}

// PUT /api/admin/events/:id  (no ownership check, admin overrides)
async function updateEventAdmin(req, res) {
  const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!event) return res.status(404).json({ message: "Event not found" });
  res.status(200).json({ message: "Event updated", event });
}

// DELETE /api/admin/events/:id
async function deleteEventAdmin(req, res) {
  const event = await Event.findByIdAndDelete(req.params.id);
  if (!event) return res.status(404).json({ message: "Event not found" });
  await Registration.deleteMany({ event: event._id });
  res.status(200).json({ message: "Event deleted" });
}

// GET /api/admin/events/:id/registrations
// Lists everyone registered for an event, so an admin can see who showed up
// and mark attendance.
async function getEventRegistrations(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ message: "Event not found" });

  const registrations = await Registration.find({ event: req.params.id })
    .populate("user", "name email studentId")
    .sort({ createdAt: 1 });

  res.status(200).json({ registrations });
}

// PUT /api/admin/registrations/:id  -- mark a single registration attended/not
async function updateRegistrationAttendance(req, res) {
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
