const Registration = require("../models/Registration");
const Event = require("../models/Event");

// POST /api/registrations/register  (requires login)
async function registerForEvent(req, res) {
  try {
    const { eventId } = req.body;
    if (!eventId) return res.status(400).json({ message: "eventId is required" });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const existing = await Registration.findOne({ user: req.user._id, event: eventId });
    if (existing) {
      return res.status(400).json({ message: "You are already registered for this event" });
    }

    const registeredCount = await Registration.countDocuments({ event: eventId });
    if (registeredCount >= event.capacity) {
      return res.status(400).json({ message: "This event is full" });
    }

    const registration = await Registration.create({
      user: req.user._id,
      event: eventId,
      status: "confirmed",
    });

    res.status(201).json({ message: "Registered for event", registration });
  } catch (err) {
    res.status(500).json({ message: err.message || "Registration failed" });
  }
}

// GET /api/registrations/my  (requires login)
async function getMyRegistrations(req, res) {
  try {
    const registrations = await Registration.find({ user: req.user._id })
      .populate("event", "title date location image")
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ registrations });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch registrations" });
  }
}

// DELETE /api/registrations/:id  (requires login + must own the registration)
// Not in the original spec, but needed so students can unregister from an event.
async function cancelRegistration(req, res) {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) return res.status(404).json({ message: "Registration not found" });

    if (registration.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }

    await registration.deleteOne();
    res.status(200).json({ message: "Registration cancelled" });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to cancel registration" });
  }
}

module.exports = { registerForEvent, getMyRegistrations, cancelRegistration };
