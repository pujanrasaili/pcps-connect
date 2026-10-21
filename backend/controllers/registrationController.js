const Registration = require("../models/Registration");
const Event = require("../models/Event");
const { safeError } = require("../utils/errorMessage");
const { promoteFromWaitlist } = require("../utils/waitlist");
const { sendRegistrationConfirmation, sendRequestReceived } = require("../utils/registrationEmails");
const { createCheckInCode } = require("../utils/checkInCode");
const { createCertificateCode } = require("../utils/certificateCode");

// POST /api/registrations/register  (requires login)
async function registerForEvent(req, res) {
  try {
    const { eventId } = req.body;
    if (!eventId) return res.status(400).json({ message: "eventId is required" });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (new Date(event.date) < new Date()) {
      return res.status(400).json({ message: "Registration is closed -- this event has already taken place" });
    }

    const existing = await Registration.findOne({ user: req.user._id, event: eventId });
    if (existing) {
      return res.status(400).json({ message: "You are already registered for this event" });
    }

    const registeredCount = await Registration.countDocuments({ event: eventId });
    if (registeredCount >= event.capacity) {
      return res.status(400).json({ message: "This event is full" });
    }

    let registration;
    try {
      registration = await Registration.create({
        user: req.user._id,
        event: eventId,
        // Events that need organiser approval start as a request ("pending").
        // It still holds a seat, so approving never hits a full event.
        status: event.requiresApproval ? "pending" : "confirmed",
      });
    } catch (err) {
      // Unique index on (user, event) -- two simultaneous clicks from the
      // same account land here instead of creating a duplicate.
      if (err.code === 11000) {
        return res.status(400).json({ message: "You are already registered for this event" });
      }
      throw err;
    }

    // The count check above and the create above aren't one atomic
    // operation, so two different students registering for the last spot
    // at the same instant can both pass the check. Re-count after insert
    // (an operation MongoDB does serialize) and roll back if this
    // registration pushed the event over capacity -- fails closed rather
    // than silently overbooking a real event.
    const countAfterInsert = await Registration.countDocuments({ event: eventId });
    if (countAfterInsert > event.capacity) {
      await registration.deleteOne();
      return res.status(400).json({ message: "This event is full" });
    }

    if (registration.status === "pending") {
      await sendRequestReceived(req.user, event);
      return res.status(201).json({ message: "Request sent -- the organisers will review it", registration });
    }
    await sendRegistrationConfirmation(req.user, event);

    res.status(201).json({ message: "Registered for event", registration });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Registration failed") });
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
    res.status(500).json({ message: safeError(err, "Failed to fetch registrations") });
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

    // Once an event has happened the registration is attendance history
    // (admins mark attended/absent on it), not a booking -- letting a
    // student delete it would erase that record. A missing event (already
    // deleted) is fine to clean up.
    const event = await Event.findById(registration.event);
    if (event && new Date(event.date) < new Date()) {
      return res.status(400).json({ message: "This event has already taken place, so the registration can't be cancelled" });
    }

    await registration.deleteOne();

    // The seat this frees up goes to whoever has been waiting longest. A
    // problem promoting someone must never undo the cancellation itself.
    if (event) {
      try {
        await promoteFromWaitlist(event);
      } catch (promoteErr) {
        console.error("Failed to promote from waitlist:", promoteErr.message);
      }
    }

    res.status(200).json({ message: "Registration cancelled" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to cancel registration") });
  }
}

// GET /api/registrations/:id/check-in-code  (requires login + must own the registration)
// The code goes into the QR the student shows at the door; see utils/checkInCode.
async function getCheckInCode(req, res) {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) return res.status(404).json({ message: "Registration not found" });

    if (registration.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }

    if (registration.status === "pending") {
      return res.status(400).json({ message: "Your request is still waiting for the organisers' approval" });
    }

    res.status(200).json({ code: createCheckInCode(registration._id) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to create check-in code") });
  }
}

// GET /api/registrations/:id/certificate  (requires login + must own the registration)
// Everything needed to render a certificate of attendance. Only available once
// an admin has marked the student as attended -- registering alone proves nothing.
async function getCertificate(req, res) {
  try {
    const registration = await Registration.findById(req.params.id)
      .populate("user", "name studentId program")
      .populate({ path: "event", select: "title date location club", populate: { path: "club", select: "name" } });
    if (!registration) return res.status(404).json({ message: "Registration not found" });

    if (registration.user?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    if (!registration.attended) {
      return res.status(400).json({ message: "Certificates are only available for events you attended" });
    }
    if (!registration.event) {
      return res.status(404).json({ message: "This event no longer exists" });
    }

    res.status(200).json({
      certificate: {
        studentName: registration.user.name,
        studentId: registration.user.studentId || "",
        program: registration.user.program || "",
        eventTitle: registration.event.title,
        eventDate: registration.event.date,
        eventLocation: registration.event.location,
        clubName: registration.event.club?.name || "",
        code: createCertificateCode(registration._id),
      },
    });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to load certificate") });
  }
}

// PUT /api/registrations/:id/feedback  (requires login + must own the registration)
// Body: { rating: 1-5, feedback?: string up to 500 chars }
// Only students an admin has marked as attended can rate, so ratings come
// from people who were actually there. Can be edited later (it overwrites).
async function submitFeedback(req, res) {
  try {
    const { rating, feedback } = req.body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be a whole number from 1 to 5" });
    }
    if (feedback !== undefined && typeof feedback !== "string") {
      return res.status(400).json({ message: "Feedback must be text" });
    }
    const cleanFeedback = (feedback || "").trim();
    if (cleanFeedback.length > 500) {
      return res.status(400).json({ message: "Feedback must be 500 characters or fewer" });
    }

    const registration = await Registration.findById(req.params.id);
    if (!registration) return res.status(404).json({ message: "Registration not found" });

    if (registration.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    if (!registration.attended) {
      return res.status(400).json({ message: "You can only rate events you attended" });
    }

    registration.rating = rating;
    registration.feedback = cleanFeedback;
    await registration.save();

    res.status(200).json({ message: "Thanks for your feedback!", registration });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to save feedback") });
  }
}

module.exports = {
  getCertificate,
  getCheckInCode,
  submitFeedback, registerForEvent, getMyRegistrations, cancelRegistration };
