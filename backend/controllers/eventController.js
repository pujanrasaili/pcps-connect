const Event = require("../models/Event");
const Registration = require("../models/Registration");
const WaitlistEntry = require("../models/WaitlistEntry");
const Club = require("../models/Club");
const { recordAudit } = require("../utils/audit");
const { ratingSummary } = require("../utils/ratingSummary");
const { notifyNewClubEvent } = require("../utils/notifyClubMembers");
const { promoteFromWaitlist } = require("../utils/waitlist");
const { uploadBufferToCloudinary } = require("../middleware/upload");
const { safeError } = require("../utils/errorMessage");
const { parseCapacity, capacityConflict } = require("../utils/eventCapacity");
const { notifyEventRescheduled, notifyEventCancelled } = require("../utils/notifyRegistrants");
const { parseFlag } = require("../utils/eventFlags");
const { isAdmin, leadsClub, canManageEvent } = require("../utils/clubAccess");
const { hideOrganiserEmail } = require("../utils/organiserPrivacy");

// Attaches a live "registeredCount" to each event, computed from actual
// Registration documents rather than a stored counter -- a stored counter
// can drift out of sync if a registration is cancelled directly in the
// database or a bug double-counts; counting the real rows can't drift.
async function withRegisteredCount(events) {
  const isArray = Array.isArray(events);
  const list = isArray ? events : [events];

  const counts = await Registration.aggregate([
    { $match: { event: { $in: list.map((e) => e._id) } } },
    {
      $group: {
        _id: "$event",
        count: { $sum: 1 },
        // Join requests still waiting for an organiser (approval events only).
        pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        // $sum ignores the null rating of students who haven't rated.
        ratingSum: { $sum: "$rating" },
        ratingCount: { $sum: { $cond: [{ $gt: ["$rating", null] }, 1, 0] } },
      },
    },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c]));

  const result = list.map((e) => {
    const obj = e.toObject ? e.toObject() : e;
    const stats = countMap.get(e._id.toString());
    return {
      ...obj,
      registeredCount: stats?.count || 0,
      pendingCount: stats?.pendingCount || 0,
      ...ratingSummary(stats?.ratingSum, stats?.ratingCount),
    };
  });

  return isArray ? result : result[0];
}

// Turns the optional `club` field from the request into either null (no club,
// including an empty string from a cleared form field) or the Club document.
// Returns { error } instead if the id is malformed or the club doesn't exist.
async function resolveClub(value) {
  if (value === undefined || value === null || value === "" || value === "null") return { club: null };
  if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) return { error: "Invalid club" };
  const club = await Club.findById(value);
  if (!club) return { error: "Club not found" };
  return { club };
}

// GET /api/events  (public)
async function getEvents(req, res) {
  try {
    // Only the organiser's name: cards never need their email, and this list is public.
    const events = await Event.find().populate("createdBy", "name").populate("club", "name").sort({ date: 1 });
    res.status(200).json({ events: await withRegisteredCount(events) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch events") });
  }
}

// GET /api/events/:id  (public)
async function getEventById(req, res) {
  try {
    const event = await Event.findById(req.params.id).populate("createdBy", "name email").populate("club", "name");
    if (!event) return res.status(404).json({ message: "Event not found" });
    // The organiser's email is shown to logged-in students only.
    res.status(200).json({ event: hideOrganiserEmail(await withRegisteredCount(event), req.user) });
  } catch (err) {
    res.status(404).json({ message: "Event not found" });
  }
}

// POST /api/events/create  (requires login + admin, or a club leader for their own club; multipart/form-data)
async function createEvent(req, res) {
  try {
    const { title, description, date, location, capacity, category, price } = req.body;
    if (!title || !description || !date || !location) {
      return res.status(400).json({ message: "title, description, date, and location are required" });
    }

    let parsedCapacity = 100;
    if (capacity !== undefined && capacity !== null && capacity !== "") {
      parsedCapacity = parseCapacity(capacity);
      if (parsedCapacity === null) {
        return res.status(400).json({ message: "Capacity must be a whole number of 1 or more" });
      }
    }

    const { club, error: clubError } = await resolveClub(req.body.club);
    if (clubError) return res.status(400).json({ message: clubError });

    // Club leaders may only create events for a club they lead.
    if (!isAdmin(req.user) && !(club && (await leadsClub(req.user, club._id)))) {
      return res.status(403).json({ message: "You can only create events for a club you lead" });
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
      capacity: parsedCapacity,
      category: category || "General",
      price: price || "Free",
      requiresApproval: parseFlag(req.body.requiresApproval) === true,
      image,
      club: club ? club._id : null,
      createdBy: req.user._id,
    });

    if (club) await notifyNewClubEvent(event, club);
    await recordAudit(req.user, "event.created", `Created event "${event.title}"`);

    res.status(201).json({ message: "Event created", event: await withRegisteredCount(event) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to create event") });
  }
}

// PUT /api/events/:id  (requires login + admin, or a leader of the event's club)
async function updateEvent(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!(await canManageEvent(req.user, event))) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }

    // Captured before any field is changed below, so registrants can be told
    // what the date/location used to be if either one changes.
    const oldDate = event.date;
    const oldLocation = event.location;

    if (req.body.capacity !== undefined) {
      const parsedCapacity = parseCapacity(req.body.capacity);
      if (parsedCapacity === null) {
        return res.status(400).json({ message: "Capacity must be a whole number of 1 or more" });
      }
      const conflict = await capacityConflict(event._id, parsedCapacity);
      if (conflict) return res.status(400).json({ message: conflict });
      event.capacity = parsedCapacity;
    }

    if (req.body.club !== undefined) {
      const { club, error: clubError } = await resolveClub(req.body.club);
      if (clubError) return res.status(400).json({ message: clubError });
      // A leader can move an event between clubs they lead, but not hand it
      // to someone else's club or detach it from any club.
      if (!isAdmin(req.user) && !(club && (await leadsClub(req.user, club._id)))) {
        return res.status(403).json({ message: "You can only assign events to a club you lead" });
      }
      event.club = club ? club._id : null;
    }

    const allowedFields = ["title", "description", "date", "location", "category", "price"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) event[field] = req.body[field];
    }
    const requiresApproval = parseFlag(req.body.requiresApproval);
    if (requiresApproval !== undefined) event.requiresApproval = requiresApproval;
    if (req.file) {
      const uploaded = await uploadBufferToCloudinary(req.file.buffer, "pcps-connect/events");
      event.image = uploaded.secure_url;
    }

    await event.save();
    await recordAudit(req.user, "event.updated", `Edited event "${event.title}"`);
    await notifyEventRescheduled(event, { oldDate, oldLocation });
    // Raising capacity opens seats for anyone queued.
    try {
      await promoteFromWaitlist(event);
    } catch (promoteErr) {
      console.error("Failed to promote from waitlist:", promoteErr.message);
    }
    res.status(200).json({ message: "Event updated", event: await withRegisteredCount(event) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to update event") });
  }
}

// DELETE /api/events/:id  (requires login + admin, or a leader of the event's club)
async function deleteEvent(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!(await canManageEvent(req.user, event))) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }

    // Must run before the registrations are deleted below -- it looks them
    // up itself to find out who to notify.
    await notifyEventCancelled(event);

    await event.deleteOne();
    // Clean up any registrations for this event so they don't become
    // dangling references pointing at a deleted event.
    await Registration.deleteMany({ event: event._id });
    await WaitlistEntry.deleteMany({ event: event._id });
    await recordAudit(req.user, "event.deleted", `Deleted event "${event.title}"`);

    res.status(200).json({ message: "Event deleted" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to delete event") });
  }
}

module.exports = { getEvents, getEventById, createEvent, updateEvent, deleteEvent };
