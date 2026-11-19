const Club = require("../models/Club");
const ClubAlumnus = require("../models/ClubAlumnus");
const ClubMembership = require("../models/ClubMembership");
const { canManageClub } = require("../utils/clubAccess");
const { cleanAlumniInput } = require("../utils/alumniInput");
const { safeError } = require("../utils/errorMessage");

const PAGE = 100;
const FORBIDDEN = { message: "Access denied: insufficient permissions" };

const shape = (a, me) => ({ _id: a._id, name: a.name, year: a.year || null, note: a.note || "", mine: String(a.user) === String(me) });

// GET /api/clubs/:id/alumni  (requires login)
// Former members who chose to stay listed. Newest first.
async function getClubAlumni(req, res) {
  try {
    const club = await Club.findById(req.params.id).select("name");
    if (!club) return res.status(404).json({ message: "Club not found" });
    const rows = await ClubAlumnus.find({ club: club._id }).sort({ createdAt: -1 }).limit(PAGE).select("user name year note").lean();
    res.status(200).json({ alumni: rows.map((a) => shape(a, req.user._id)) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch the alumni") });
  }
}

// POST /api/club-memberships/:clubId/alumni  { year?, note? }  (requires login)
// A current member steps down: they leave the club and are listed as an
// alumnus. Only members can do this, so the list is made of real former members.
async function becomeAlumnus(req, res) {
  try {
    const club = await Club.findById(req.params.clubId).select("name");
    if (!club) return res.status(404).json({ message: "Club not found" });
    const membership = await ClubMembership.findOne({ user: req.user._id, club: club._id });
    if (!membership) return res.status(403).json({ message: "Only members can step down to alumni" });

    const { year, note, error } = cleanAlumniInput(req.body);
    if (error) return res.status(400).json({ message: error });

    // Listed first, so a failure here never leaves the student out of both lists.
    const alumnus = await ClubAlumnus.findOneAndUpdate(
      { user: req.user._id, club: club._id },
      { $set: { name: req.user.name, year, note } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await membership.deleteOne();
    res.status(200).json({ message: "You are now listed as alumni", alumnus: shape(alumnus, req.user._id) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to list you as alumni") });
  }
}

// GET /api/club-memberships/alumni  (requires login)
// The clubs the student is listed as alumni of, so they can see and undo it.
async function getMyAlumni(req, res) {
  try {
    const rows = await ClubAlumnus.find({ user: req.user._id }).populate("club", "name").sort({ createdAt: -1 }).limit(PAGE).lean();
    res.status(200).json({
      alumni: rows.filter((a) => a.club).map((a) => ({ _id: a._id, clubId: a.club._id, clubName: a.club.name, year: a.year || null, note: a.note || "" })),
    });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch your alumni listings") });
  }
}

// DELETE /api/clubs/:id/alumni/:alumniId  (the person themselves, the club's leaders, or an admin)
async function removeAlumnus(req, res) {
  try {
    const alumnus = await ClubAlumnus.findOne({ _id: req.params.alumniId, club: req.params.id });
    if (!alumnus) return res.status(404).json({ message: "Alumni entry not found" });
    const own = String(alumnus.user) === String(req.user._id);
    if (!own && !(await canManageClub(req.user, alumnus.club))) return res.status(403).json(FORBIDDEN);
    await alumnus.deleteOne();
    res.status(200).json({ message: "Alumni entry removed" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to remove the alumni entry") });
  }
}

module.exports = { getClubAlumni, getMyAlumni, becomeAlumnus, removeAlumnus };
