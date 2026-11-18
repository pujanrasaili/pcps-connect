const Event = require("../models/Event");
const { recordAudit } = require("../utils/audit");
const { safeError } = require("../utils/errorMessage");
const { canManageEvent } = require("../utils/clubAccess");
const { cleanSponsors } = require("../utils/sponsors");

// PUT /api/events/:id/sponsors  { sponsors: [{ name, url? }] }  (organisers)
// Replaces the list (up to 6). An empty list removes the "Thanks to our partners" box.
async function setSponsors(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!(await canManageEvent(req.user, event))) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    const { value, error } = cleanSponsors(req.body?.sponsors);
    if (error) return res.status(400).json({ message: error });

    event.sponsors = value;
    await event.save();
    await recordAudit(req.user, "event.sponsors", `Set ${value.length} sponsor(s) on "${event.title}"`);
    res.status(200).json({ message: "Sponsors saved", sponsors: event.sponsors });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to save the sponsors") });
  }
}

module.exports = { setSponsors };
