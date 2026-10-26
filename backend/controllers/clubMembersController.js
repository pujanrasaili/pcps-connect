const Club = require("../models/Club");
const ClubMembership = require("../models/ClubMembership");
const { canManageClub } = require("../utils/clubAccess");
const { safeError } = require("../utils/errorMessage");

// GET /api/admin/clubs/:id/members
// The roster of a club: who joined and when, newest first. Admins and that
// club's own leaders only (the route is staffOnly, then canManageClub checks
// this specific club). Accounts that were deleted are skipped.
async function getClubMembers(req, res) {
  try {
    const club = await Club.findById(req.params.id).select("name");
    if (!club) return res.status(404).json({ message: "Club not found" });
    if (!(await canManageClub(req.user, club._id))) {
      return res.status(403).json({ message: "You don't have access to this club" });
    }

    const memberships = await ClubMembership.find({ club: club._id })
      .sort({ createdAt: -1 })
      .populate("user", "name email studentId");
    const members = memberships
      .filter((m) => m.user)
      .map((m) => ({
        _id: m.user._id,
        name: m.user.name,
        email: m.user.email,
        studentId: m.user.studentId || "",
        joinedAt: m.createdAt,
      }));

    res.status(200).json({ club: { _id: club._id, name: club.name }, members });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch club members") });
  }
}

module.exports = { getClubMembers };
