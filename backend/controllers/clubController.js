const Club = require("../models/Club");
const ClubMembership = require("../models/ClubMembership");
const { safeError } = require("../utils/errorMessage");

// GET /api/clubs  (public)
async function getClubs(req, res) {
  try {
    const clubs = await Club.find().sort({ name: 1 });
    res.status(200).json({ clubs });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch clubs") });
  }
}

// GET /api/clubs/:id  (public)
async function getClubById(req, res) {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) return res.status(404).json({ message: "Club not found" });
    res.status(200).json({ club });
  } catch (err) {
    res.status(404).json({ message: "Club not found" });
  }
}

// POST /api/clubs  (requires login + admin)
async function createClub(req, res) {
  try {
    const club = await Club.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ message: "Club created", club });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to create club") });
  }
}

// PUT /api/clubs/:id  (requires login + admin)
async function updateClub(req, res) {
  try {
    const club = await Club.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!club) return res.status(404).json({ message: "Club not found" });
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

    res.status(200).json({ message: "Club deleted" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to delete club") });
  }
}

module.exports = { getClubs, getClubById, createClub, updateClub, deleteClub };
