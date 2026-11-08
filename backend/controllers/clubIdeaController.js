const Club = require("../models/Club");
const ClubIdea = require("../models/ClubIdea");
const ClubMembership = require("../models/ClubMembership");
const { canManageClub } = require("../utils/clubAccess");
const { cleanClubIdea, MAX_PER_MEMBER } = require("../utils/clubIdeaInput");
const { pushNotifications } = require("../utils/inApp");
const { safeError } = require("../utils/errorMessage");

const PAGE = 50;
const FORBIDDEN = { message: "Access denied: insufficient permissions" };

// GET /api/clubs/:id/ideas  (requires login)
// The club's leaders and the admins see every idea; anyone else sees only
// the ideas they wrote themselves. Newest first.
async function getClubIdeas(req, res) {
  try {
    const club = await Club.findById(req.params.id).select("name");
    if (!club) return res.status(404).json({ message: "Club not found" });
    const staff = await canManageClub(req.user, club._id);
    const filter = staff ? { club: club._id } : { club: club._id, author: req.user._id };
    const ideas = await ClubIdea.find(filter).sort({ createdAt: -1 }).limit(PAGE).select("body authorName author createdAt").lean();
    res.status(200).json({
      ideas: ideas.map((i) => ({ _id: i._id, body: i.body, authorName: i.authorName, createdAt: i.createdAt, mine: String(i.author) === String(req.user._id) })),
      canReadAll: staff,
    });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch ideas") });
  }
}

// Puts a line in the bell of the club's leaders. Best effort: the idea is
// already saved, so a problem here must never fail it.
async function notifyLeaders(clubId, author) {
  try {
    const club = await Club.findById(clubId).select("name +leaders");
    const ids = (club?.leaders || []).filter((id) => String(id) !== String(author._id));
    await pushNotifications(ids, { type: "club_idea", title: `New idea for ${club.name}`, link: `/clubs?club=${clubId}` });
  } catch (err) {
    console.error("Failed to notify leaders of a club idea:", err.message);
  }
}

// POST /api/clubs/:id/ideas  { body }  (requires login; members of the club only)
async function createClubIdea(req, res) {
  try {
    const club = await Club.findById(req.params.id).select("name");
    if (!club) return res.status(404).json({ message: "Club not found" });
    const member = await ClubMembership.exists({ club: club._id, user: req.user._id });
    if (!member) return res.status(403).json({ message: "Join the club to suggest an idea" });

    const { body, error } = cleanClubIdea(req.body);
    if (error) return res.status(400).json({ message: error });

    const waiting = await ClubIdea.countDocuments({ club: club._id, author: req.user._id });
    if (waiting >= MAX_PER_MEMBER) {
      return res.status(400).json({ message: `You already have ${MAX_PER_MEMBER} ideas waiting. Remove one to add another.` });
    }

    const idea = await ClubIdea.create({ club: club._id, author: req.user._id, authorName: req.user.name, body });
    await notifyLeaders(club._id, req.user);
    res.status(201).json({ message: "Idea sent to the club's leaders", idea: { _id: idea._id, body: idea.body, authorName: idea.authorName, createdAt: idea.createdAt, mine: true } });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to send your idea") });
  }
}

// DELETE /api/clubs/:id/ideas/:ideaId  (the author, the club's leaders, or an admin)
async function deleteClubIdea(req, res) {
  try {
    const idea = await ClubIdea.findOne({ _id: req.params.ideaId, club: req.params.id });
    if (!idea) return res.status(404).json({ message: "Idea not found" });
    const own = String(idea.author) === String(req.user._id);
    if (!own && !(await canManageClub(req.user, idea.club))) return res.status(403).json(FORBIDDEN);
    await idea.deleteOne();
    res.status(200).json({ message: "Idea removed" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to remove the idea") });
  }
}

module.exports = { getClubIdeas, createClubIdea, deleteClubIdea };
