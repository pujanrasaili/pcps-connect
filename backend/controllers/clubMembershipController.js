const ClubMembership = require("../models/ClubMembership");
const Club = require("../models/Club");

// GET /api/club-memberships/my  (requires login)
// Returns this student's memberships, each populated with the club's info.
async function getMyMemberships(req, res) {
  try {
    const memberships = await ClubMembership.find({ user: req.user._id }).populate("club");
    res.status(200).json({ memberships });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch memberships" });
  }
}

// POST /api/club-memberships/join  (requires login)
async function joinClub(req, res) {
  try {
    const { clubId } = req.body;
    if (!clubId) return res.status(400).json({ message: "clubId is required" });

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club not found" });

    const existing = await ClubMembership.findOne({ user: req.user._id, club: clubId });
    if (existing) return res.status(400).json({ message: "Already joined this club" });

    const membership = await ClubMembership.create({ user: req.user._id, club: clubId });
    res.status(201).json({ message: "Joined club", membership });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to join club" });
  }
}

// DELETE /api/club-memberships/:clubId  (requires login) -- leave a club
async function leaveClub(req, res) {
  try {
    const membership = await ClubMembership.findOneAndDelete({
      user: req.user._id,
      club: req.params.clubId,
    });
    if (!membership) return res.status(404).json({ message: "Membership not found" });
    res.status(200).json({ message: "Left club" });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to leave club" });
  }
}

module.exports = { getMyMemberships, joinClub, leaveClub };
