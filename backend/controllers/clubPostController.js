const Club = require("../models/Club");
const ClubPost = require("../models/ClubPost");
const { canManageClub } = require("../utils/clubAccess");
const { cleanClubPost } = require("../utils/clubPostInput");
const { recordAudit } = require("../utils/audit");
const { safeError } = require("../utils/errorMessage");
const { uploadBufferToCloudinary } = require("../middleware/upload");
const { CLUB_NEWS_FOLDER } = require("../utils/cloudinaryId");
const ClubMembership = require("../models/ClubMembership");
const { pushNotifications } = require("../utils/inApp");
const { destroyClubNewsPhotos } = require("../utils/clubNewsPhotoCleanup");

const PAGE = 20;

// GET /api/clubs/:id/posts  (public)
// The club's newest news first. Only what is meant to be public: the text, the
// author's display name and the date -- never the author's account.
async function getClubPosts(req, res) {
  try {
    const posts = await ClubPost.find({ club: req.params.id })
      .sort({ createdAt: -1 })
      .limit(PAGE)
      .select("body image authorName createdAt editedAt");
    res.status(200).json({ posts });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch club news") });
  }
}

// Puts a short line in the bell of each member of the club (not the author).
// Best effort: the post is already saved, so a problem here must never fail it.
async function notifyMembersOfPost(club, author) {
  try {
    const members = await ClubMembership.find({ club: club._id }).select("user");
    const ids = members.map((m) => m.user).filter((u) => String(u) !== String(author._id));
    await pushNotifications(ids, { type: "club_news", title: `${club.name} shared a news update`, link: `/clubs?club=${club._id}` });
  } catch (err) {
    console.error("Failed to notify club members of a news post:", err.message);
  }
}

// POST /api/clubs/:id/posts  (requires login; admin or a leader of this club)
// JSON {body}, or multipart with the text in "body" and an optional photo in "image".
async function createClubPost(req, res) {
  try {
    const club = await Club.findById(req.params.id).select("name");
    if (!club) return res.status(404).json({ message: "Club not found" });
    if (!(await canManageClub(req.user, club._id))) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }

    const { body, error } = cleanClubPost(req.body);
    if (error) return res.status(400).json({ message: error });

    const fields = { club: club._id, author: req.user._id, authorName: req.user.name, body };
    if (req.file) {
      const uploaded = await uploadBufferToCloudinary(req.file.buffer, CLUB_NEWS_FOLDER.replace(/\/$/, ""));
      fields.image = uploaded.secure_url;
    }
    let post;
    try {
      post = await ClubPost.create(fields);
    } catch (err) {
      // The photo is already in Cloudinary; don't leave it there with no post pointing at it.
      await destroyClubNewsPhotos([fields.image]);
      throw err;
    }
    await recordAudit(req.user, "club.post", `Posted news on "${club.name}"`);
    await notifyMembersOfPost(club, req.user);
    res.status(201).json({
      message: "Posted",
      post: { _id: post._id, body: post.body, image: post.image || "", authorName: post.authorName, createdAt: post.createdAt, editedAt: null },
    });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to post") });
  }
}

// DELETE /api/clubs/:id/posts/:postId  (requires login; admin or a leader of this club)
// PATCH /api/clubs/:id/posts/:postId  { body }
// Fixes the text of a post (a typo, a changed time). The photo stays as it is.
async function updateClubPost(req, res) {
  try {
    if (!(await canManageClub(req.user, req.params.id))) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    const { body, error } = cleanClubPost(req.body);
    if (error) return res.status(400).json({ message: error });

    // Matching the club too means a leader of one club can't edit another club's post by id.
    const post = await ClubPost.findOneAndUpdate(
      { _id: req.params.postId, club: req.params.id },
      { body, editedAt: new Date() },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Post not found" });
    const club = await Club.findById(req.params.id).select("name");
    await recordAudit(req.user, "club.postEdited", `Edited a news post on "${club?.name || "a club"}"`);
    res.status(200).json({
      message: "Post updated",
      post: { _id: post._id, body: post.body, image: post.image || "", authorName: post.authorName, createdAt: post.createdAt, editedAt: post.editedAt },
    });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to update post") });
  }
}

async function deleteClubPost(req, res) {
  try {
    if (!(await canManageClub(req.user, req.params.id))) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    // Matching the club too means a leader of one club can't delete another club's post by id.
    const post = await ClubPost.findOneAndDelete({ _id: req.params.postId, club: req.params.id });
    if (!post) return res.status(404).json({ message: "Post not found" });
    await destroyClubNewsPhotos([post.image]);
    const club = await Club.findById(req.params.id).select("name");
    await recordAudit(req.user, "club.postDeleted", `Deleted a news post on "${club?.name || "a club"}"`);
    res.status(200).json({ message: "Post deleted" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to delete post") });
  }
}

module.exports = { getClubPosts, createClubPost, updateClubPost, deleteClubPost };
