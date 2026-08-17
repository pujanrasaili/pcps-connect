const User = require("../models/User");
const Event = require("../models/Event");
const Registration = require("../models/Registration");

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
  res.status(200).json({ message: "Event deleted" });
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
};
