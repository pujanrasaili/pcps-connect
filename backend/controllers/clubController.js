const Club = require("../models/Club");

// GET /api/clubs  (public)
async function getClubs(req, res) {
  try {
    const clubs = await Club.find().sort({ name: 1 });
    res.status(200).json({ clubs });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch clubs" });
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
    res.status(500).json({ message: err.message || "Failed to create club" });
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
    res.status(500).json({ message: err.message || "Failed to update club" });
  }
}

// DELETE /api/clubs/:id  (requires login + admin)
async function deleteClub(req, res) {
  try {
    const club = await Club.findByIdAndDelete(req.params.id);
    if (!club) return res.status(404).json({ message: "Club not found" });
    res.status(200).json({ message: "Club deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete club" });
  }
}

module.exports = { getClubs, getClubById, createClub, updateClub, deleteClub };
