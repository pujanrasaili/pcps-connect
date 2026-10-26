const Event = require("../models/Event");
const { registrationClosed } = require("../utils/registrationDeadline");
const Registration = require("../models/Registration");
const WaitlistEntry = require("../models/WaitlistEntry");
const { safeError } = require("../utils/errorMessage");

// GET /api/waitlist/:eventId  (requires login)
// Whether the current student is queued for this event, and where.
async function getWaitlistStatus(req, res) {
  try {
    const entry = await WaitlistEntry.findOne({ user: req.user._id, event: req.params.eventId });
    if (!entry) return res.status(200).json({ onWaitlist: false });

    const ahead = await WaitlistEntry.countDocuments({
      event: req.params.eventId,
      createdAt: { $lt: entry.createdAt },
    });
    res.status(200).json({ onWaitlist: true, position: ahead + 1 });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to load waitlist status") });
  }
}

// GET /api/waitlist/my  (requires login)
// Every upcoming event the current student is queued for, with their place in
// line, soonest event first -- for the Dashboard's "On the waitlist" card.
// Events that already happened (or were deleted) are left out.
async function getMyWaitlist(req, res) {
  try {
    const entries = await WaitlistEntry.find({ user: req.user._id }).populate("event", "title date location");
    const upcoming = entries.filter((e) => e.event && new Date(e.event.date) >= new Date());

    const waitlist = await Promise.all(
      upcoming.map(async (entry) => ({
        event: { _id: entry.event._id, title: entry.event.title, date: entry.event.date, location: entry.event.location },
        position: (await WaitlistEntry.countDocuments({ event: entry.event._id, createdAt: { $lt: entry.createdAt } })) + 1,
      }))
    );
    waitlist.sort((a, b) => new Date(a.event.date) - new Date(b.event.date));
    res.status(200).json({ waitlist });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to load your waitlist") });
  }
}

// POST /api/waitlist/:eventId  (requires login)
async function joinWaitlist(req, res) {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (new Date(event.date) < new Date()) {
      return res.status(400).json({ message: "This event has already taken place" });
    }
    if (registrationClosed(event)) {
      return res.status(400).json({ message: "Registration has closed for this event" });
    }

    if (await Registration.findOne({ user: req.user._id, event: event._id })) {
      return res.status(400).json({ message: "You are already registered for this event" });
    }

    const registered = await Registration.countDocuments({ event: event._id });
    if (registered < event.capacity) {
      return res.status(400).json({ message: "This event still has spots -- register for it directly" });
    }

    try {
      await WaitlistEntry.create({ user: req.user._id, event: event._id });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ message: "You're already on the waitlist for this event" });
      }
      throw err;
    }

    const ahead = await WaitlistEntry.countDocuments({ event: event._id });
    res.status(201).json({ message: "Added to the waitlist", position: ahead });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to join waitlist") });
  }
}

// DELETE /api/waitlist/:eventId  (requires login)
async function leaveWaitlist(req, res) {
  try {
    await WaitlistEntry.deleteOne({ user: req.user._id, event: req.params.eventId });
    res.status(200).json({ message: "Removed from the waitlist" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to leave waitlist") });
  }
}

module.exports = { getWaitlistStatus, getMyWaitlist, joinWaitlist, leaveWaitlist };
