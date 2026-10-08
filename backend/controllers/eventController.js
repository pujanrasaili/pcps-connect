const Event = require("../models/Event");
const Registration = require("../models/Registration");
const { uploadBufferToCloudinary } = require("../middleware/upload");
const { safeError } = require("../utils/errorMessage");

// Attaches a live "registeredCount" to each event, computed from actual
// Registration documents rather than a stored counter -- a stored counter
// can drift out of sync if a registration is cancelled directly in the
// database or a bug double-counts; counting the real rows can't drift.
async function withRegisteredCount(events) {
  const isArray = Array.isArray(events);
  const list = isArray ? events : [events];

  const counts = await Registration.aggregate([
    { $match: { event: { $in: list.map((e) => e._id) } } },
    { $group: { _id: "$event", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

  const result = list.map((e) => {
    const obj = e.toObject ? e.toObject() : e;
    return { ...obj, registeredCount: countMap.get(e._id.toString()) || 0 };
  });

  return isArray ? result : result[0];
}

// GET /api/events  (public)
async function getEvents(req, res) {
  try {
    const events = await Event.find().populate("createdBy", "name email").sort({ date: 1 });
    res.status(200).json({ events: await withRegisteredCount(events) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch events") });
  }
}

// GET /api/events/:id  (public)
async function getEventById(req, res) {
  try {
    const event = await Event.findById(req.params.id).populate("createdBy", "name email");
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.status(200).json({ event: await withRegisteredCount(event) });
  } catch (err) {
    res.status(404).json({ message: "Event not found" });
  }
}

// POST /api/events/create  (requires login, multipart/form-data)
async function createEvent(req, res) {
  try {
    const { title, description, date, location, capacity, category, price } = req.body;
    if (!title || !description || !date || !location) {
      return res.status(400).json({ message: "title, description, date, and location are required" });
    }

    let image = null;
    if (req.file) {
      const uploaded = await uploadBufferToCloudinary(req.file.buffer, "pcps-connect/events");
      image = uploaded.secure_url;
    }

    const event = await Event.create({
      title,
      description,
      date,
      location,
      capacity: capacity ? Number(capacity) : 100,
      category: category || "General",
      price: price || "Free",
      image,
      createdBy: req.user._id,
    });

    res.status(201).json({ message: "Event created", event: await withRegisteredCount(event) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to create event") });
  }
}

// PUT /api/events/:id  (requires login + must be creator, or admin)
async function updateEvent(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const isOwner = event.createdBy.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }

    const allowedFields = ["title", "description", "date", "location", "capacity", "category", "price"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) event[field] = req.body[field];
    }
    if (req.file) {
      const uploaded = await uploadBufferToCloudinary(req.file.buffer, "pcps-connect/events");
      event.image = uploaded.secure_url;
    }

    await event.save();
    res.status(200).json({ message: "Event updated", event: await withRegisteredCount(event) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to update event") });
  }
}

// DELETE /api/events/:id  (requires login + must be creator, or admin)
async function deleteEvent(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const isOwner = event.createdBy.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }

    await event.deleteOne();
    // Clean up any registrations for this event so they don't become
    // dangling references pointing at a deleted event.
    await Registration.deleteMany({ event: event._id });

    res.status(200).json({ message: "Event deleted" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to delete event") });
  }
}

module.exports = { getEvents, getEventById, createEvent, updateEvent, deleteEvent };
