const Club = require("../models/Club");
const ClubMembership = require("../models/ClubMembership");
const { safeError } = require("../utils/errorMessage");
const { recordAudit } = require("../utils/audit");
const { pickClubFields } = require("../utils/clubFields");
const { validateClubFields } = require("../utils/clubInput");
const { withMemberCounts } = require("../utils/memberCounts");

// GET /api/clubs  (public)
async function getClubs(req, res) {
  try {
    const clubs = await Club.find().sort({ name: 1 });
    // The member count is a nice-to-have: if counting fails the list still loads.
    let counts = [];
    try {
      counts = await ClubMembership.aggregate([{ $group: { _id: "$club", members: { $sum: 1 } } }]);
    } catch (countErr) {
      console.error("Failed to count club members:", countErr.message);
    }
    res.status(200).json({ clubs: withMemberCounts(clubs, counts) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch clubs") });
  }
}

// GET /api/clubs/:id  (public)
async function getClubById(req, res) {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) return res.status(404).json({ message: "Club not found" });
    const memberCount = await ClubMembership.countDocuments({ club: club._id }).catch(() => 0);
    res.status(200).json({ club: { ...club.toObject(), memberCount } });
  } catch (err) {
    res.status(404).json({ message: "Club not found" });
  }
}

// POST /api/clubs  (requires login + admin)
async function createClub(req, res) {
  try {
    const fields = pickClubFields(req.body);
    const missing = ["name", "category", "description"].find((f) => fields[f] === undefined);
    if (missing) return res.status(400).json({ message: "Name, category and description are required" });
    const inputError = validateClubFields(fields);
    if (inputError) return res.status(400).json({ message: inputError });
    const club = await Club.create({ ...pickClubFields(req.body), createdBy: req.user._id });
    await recordAudit(req.user, "club.created", `Created club "${club.name}"`);
    res.status(201).json({ message: "Club created", club });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to create club") });
  }
}

// PUT /api/clubs/:id  (requires login + admin)
async function updateClub(req, res) {
  try {
    const inputError = validateClubFields(pickClubFields(req.body));
    if (inputError) return res.status(400).json({ message: inputError });
    const club = await Club.findByIdAndUpdate(req.params.id, pickClubFields(req.body), {
      new: true,
      runValidators: true,
    });
    if (!club) return res.status(404).json({ message: "Club not found" });
    await recordAudit(req.user, "club.updated", `Edited club "${club.name}"`);
    res.status(200).json({ message: "Club updated", club });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to update club") });
  }
}

// DELETE /api/clubs/:id  (requires login + admin)
async function deleteClub(req, res) {
  try {
    const club = await Club.findByIdAndDelete(req.params.id);
    if (!club) return res.status(404).json({ message: "Club not found" });

    // Clean up so deleting a club doesn't leave dangling references.
    await ClubMembership.deleteMany({ club: club._id });
    const User = require("../models/User");
    await User.updateMany({ favoriteClub: club._id }, { favoriteClub: null });
    await require("../models/Event").updateMany({ club: club._id }, { club: null });

    await recordAudit(req.user, "club.deleted", `Deleted club "${club.name}"`);
    res.status(200).json({ message: "Club deleted" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to delete club") });
  }
}

module.exports = { getClubs, getClubById, createClub, updateClub, deleteClub };
