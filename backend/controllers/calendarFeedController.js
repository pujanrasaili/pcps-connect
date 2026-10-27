const Event = require("../models/Event");
const Club = require("../models/Club");
const { isObjectId } = require("../middleware/validateId");
const { buildIcsCalendar } = require("../utils/ics");
const { safeError } = require("../utils/errorMessage");

const PAST_DAYS = 30;
const MAX_EVENTS = 500;

// GET /api/events/calendar.ics            every upcoming (and last 30 days') event
// GET /api/events/calendar.ics?club=<id>  only that club's events
// A public calendar feed students can subscribe to in Google, Apple or Outlook
// Calendar. It carries only what the public events list already shows (title,
// place, description, time) -- no organiser or registration details.
async function getCalendarFeed(req, res) {
  try {
    const filter = { date: { $gte: new Date(Date.now() - PAST_DAYS * 24 * 60 * 60 * 1000) } };
    let name = "PCPS Connect events";

    if (req.query.club !== undefined) {
      if (typeof req.query.club !== "string" || !isObjectId(req.query.club)) return res.status(404).json({ message: "Club not found" });
      const club = await Club.findById(req.query.club).select("name");
      if (!club) return res.status(404).json({ message: "Club not found" });
      filter.club = club._id;
      name = `${club.name} events`;
    }

    const events = await Event.find(filter).select("title description location date").sort({ date: 1 }).limit(MAX_EVENTS);
    const origin = (process.env.CLIENT_ORIGIN || "").replace(/\/$/, "");
    const body = buildIcsCalendar(events, { name, urlFor: origin ? (e) => `${origin}/events/${e._id}` : undefined });

    res.set("Content-Type", "text/calendar; charset=utf-8");
    res.set("Cache-Control", "public, max-age=900");
    res.status(200).send(body);
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to build the calendar") });
  }
}

module.exports = { getCalendarFeed };
