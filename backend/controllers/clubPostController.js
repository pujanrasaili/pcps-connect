const Club = require("../models/Club");
const ClubPost = require("../models/ClubPost");
const { canManageClub } = require("../utils/clubAccess");
const { cleanClubPost } = require("../utils/clubPostInput");
const { recordAudit } = require("../utils/audit");
const { safeError } = require("../utils/errorMessage");

const PAGE = 20;

// GET /api/clubs/:id/posts  (public)
// The club's newest news first. Only what is meant to be public: the text, the
// author's display name and the date -- never the author's account.
async function getClubPosts(req, res) {
  try {
    const posts = await ClubPost.find({ club: req.params.id })
      .sort({ createdAt: -1 })
      .limit(PAGE)
      .select("body authorName createdAt");
    res.status(200).json({ posts });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch club news") });
  }
}

// POST /api/clubs/:id/posts  (requires login; admin or a leader of this club)
async function createClubPost(req, res) {
  try {
    const club = await Club.findById(req.params.id).select("name");
    if (!club) return res.status(404).json({ message: "Club not found" });
    if (!(await canManageClub(req.user, club._id))) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }

    const { body, error } = cleanClubPost(req.body);
    if (error) return res.status(400).json({ message: error });

    const post = await ClubPost.create({ club: club._id, author: req.user._id, authorName: req.user.name, body });
    await recordAudit(req.user, "club.post", `Posted news on "${club.name}"`);
    res.status(201).json({
      message: "Posted",
      post: { _id: post._id, body: post.body, authorName: post.authorName, createdAt: post.createdAt },
    });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to post") });
  }
}

// DELETE /api/clubs/:id/posts/:postId  (requires login; admin or a leader of this club)
async function deleteClubPost(req, res) {
  try {
    if (!(await canManageClub(req.user, req.params.id))) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    // Matching the club too means a leader of one club can't delete another club's post by id.
    const post = await ClubPost.findOneAndDelete({ _id: req.params.postId, club: req.params.id });
    if (!post) return res.status(404).json({ message: "Post not found" });
    const club = await Club.findById(req.params.id).select("name");
    await recordAudit(req.user, "club.postDeleted", `Deleted a news post on "${club?.name || "a club"}"`);
    res.status(200).json({ message: "Post deleted" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to delete post") });
  }
}

module.exports = { getClubPosts, createClubPost, deleteClubPost };
