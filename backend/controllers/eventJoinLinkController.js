const Event = require("../models/Event");
const Registration = require("../models/Registration");
const { canManageEvent } = require("../utils/clubAccess");
const { cleanJoinLink } = require("../utils/joinLinkInput");
const { recordAudit } = require("../utils/audit");
const { safeError } = require("../utils/errorMessage");

// The link is kept out of every ordinary event response (select: false on the
// model) and handed out only here, to people who may see it.

// GET /api/events/:id/join-link  (requires login)
// The event's organisers, and students whose registration is confirmed.
async function getJoinLink(req, res) {
  try {
    const event = await Event.findById(req.params.id).select("+joinLink club");
    if (!event) return res.status(404).json({ message: "Event not found" });
    const allowed =
      (await canManageEvent(req.user, event)) ||
      !!(await Registration.exists({ event: event._id, user: req.user._id, status: "confirmed" }));
    if (!allowed) return res.status(403).json({ message: "Register for this event to see its link" });
    res.status(200).json({ link: event.joinLink || "" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to load the link") });
  }
}

// PUT /api/events/:id/join-link  { link }  (organisers; an empty link removes it)
async function setJoinLink(req, res) {
  try {
    const event = await Event.findById(req.params.id).select("title club");
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!(await canManageEvent(req.user, event))) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    const { link, error } = cleanJoinLink(req.body?.link);
    if (error) return res.status(400).json({ message: error });
    await Event.updateOne({ _id: event._id }, { joinLink: link });
    await recordAudit(req.user, "event.joinLink", `${link ? "Set" : "Removed"} the online link on "${event.title}"`);
    res.status(200).json({ message: link ? "Link saved" : "Link removed", link });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to save the link") });
  }
}

module.exports = { getJoinLink, setJoinLink };
