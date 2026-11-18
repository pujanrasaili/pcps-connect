const Venue = require("../models/Venue");
const { cleanVenue } = require("../utils/venueInput");
const { recordAudit } = require("../utils/audit");
const { safeError } = require("../utils/errorMessage");

const MAX_VENUES = 100;
const shape = (v) => ({ _id: v._id, name: v.name, directions: v.directions || "" });

// GET /api/venues  (public) -- the campus places, A to Z. A nicety for the
// event page, so a problem here returns an empty list instead of an error.
async function listVenues(req, res) {
  try {
    const venues = await Venue.find().sort({ nameKey: 1 }).limit(MAX_VENUES).select("name directions").lean();
    res.set("Cache-Control", "public, max-age=60");
    res.status(200).json({ venues: venues.map(shape) });
  } catch (err) {
    console.error("Failed to list venues:", err.message);
    res.status(200).json({ venues: [] });
  }
}

// POST /api/admin/venues  { name, directions? }  (admin only)
async function createVenue(req, res) {
  try {
    const { error, ...fields } = cleanVenue(req.body);
    if (error) return res.status(400).json({ message: error });
    if ((await Venue.countDocuments()) >= MAX_VENUES) {
      return res.status(400).json({ message: `There can be at most ${MAX_VENUES} venues` });
    }
    if (await Venue.exists({ nameKey: fields.nameKey })) {
      return res.status(400).json({ message: "There is already a venue with that name" });
    }
    const venue = await Venue.create(fields);
    await recordAudit(req.user, "venue.created", `Added the venue "${venue.name}"`);
    res.status(201).json({ message: "Venue added", venue: shape(venue) });
  } catch (err) {
    if (err && err.code === 11000) return res.status(400).json({ message: "There is already a venue with that name" });
    res.status(500).json({ message: safeError(err, "Failed to add the venue") });
  }
}

// PUT /api/admin/venues/:id  { name, directions? }  (admin only)
async function updateVenue(req, res) {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ message: "Venue not found" });
    const { error, ...fields } = cleanVenue(req.body);
    if (error) return res.status(400).json({ message: error });
    const clash = await Venue.findOne({ nameKey: fields.nameKey, _id: { $ne: venue._id } }).select("_id");
    if (clash) return res.status(400).json({ message: "There is already a venue with that name" });
    venue.name = fields.name;
    venue.nameKey = fields.nameKey;
    venue.directions = fields.directions;
    await venue.save();
    await recordAudit(req.user, "venue.updated", `Updated the venue "${venue.name}"`);
    res.status(200).json({ message: "Venue saved", venue: shape(venue) });
  } catch (err) {
    if (err && err.code === 11000) return res.status(400).json({ message: "There is already a venue with that name" });
    res.status(500).json({ message: safeError(err, "Failed to save the venue") });
  }
}

// DELETE /api/admin/venues/:id  (admin only)
async function deleteVenue(req, res) {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ message: "Venue not found" });
    await venue.deleteOne();
    await recordAudit(req.user, "venue.deleted", `Removed the venue "${venue.name}"`);
    res.status(200).json({ message: "Venue removed" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to remove the venue") });
  }
}

module.exports = { listVenues, createVenue, updateVenue, deleteVenue };
