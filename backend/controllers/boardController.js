const BoardPost = require("../models/BoardPost");
const { cleanBoardPost, CATEGORIES, DAYS_UP, MAX_PER_STUDENT, HIDE_AT_REPORTS } = require("../utils/boardInput");
const { notifyAdmins } = require("../utils/inApp");
const { isAdmin } = require("../utils/clubAccess");
const { recordAudit } = require("../utils/audit");
const { safeError } = require("../utils/errorMessage");

const PAGE = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

const shape = (p, userId, admin = false) => ({
  _id: p._id,
  category: p.category,
  title: p.title,
  body: p.body,
  contact: p.contact || "",
  authorName: p.authorName,
  createdAt: p.createdAt,
  expiresAt: p.expiresAt,
  mine: String(p.author) === String(userId),
  reported: (p.reports || []).some((r) => String(r) === String(userId)),
  // Only admins see how many reports a post has.
  ...(admin ? { reportCount: (p.reports || []).length } : {}),
});

// GET /api/board?category=lost  (requires login)
// Live posts, newest first. Only the first name, the text and the dates are
// public -- never the author's account.
async function getBoard(req, res) {
  try {
    const admin = isAdmin(req.user);
    const filter = { expiresAt: { $gt: new Date() } };
    // Students don't see a post that enough students have reported.
    if (!admin) filter.$expr = { $lt: [{ $size: { $ifNull: ["$reports", []] } }, HIDE_AT_REPORTS] };
    if (CATEGORIES.includes(req.query?.category)) filter.category = req.query.category;
    const posts = await BoardPost.find(filter).sort({ createdAt: -1 }).limit(PAGE).lean();
    res.status(200).json({ posts: posts.map((p) => shape(p, req.user._id, admin)) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch the notice board") });
  }
}

// POST /api/board  { category, title, body, contact? }  (requires login)
async function createBoardPost(req, res) {
  try {
    const { error, ...fields } = cleanBoardPost(req.body);
    if (error) return res.status(400).json({ message: error });
    const up = await BoardPost.countDocuments({ author: req.user._id, expiresAt: { $gt: new Date() } });
    if (up >= MAX_PER_STUDENT) {
      return res.status(400).json({ message: `You already have ${MAX_PER_STUDENT} posts on the board. Remove one to add another.` });
    }
    const firstName = String(req.user.name || "").trim().split(/\s+/)[0] || "Student";
    const post = await BoardPost.create({
      ...fields,
      author: req.user._id,
      authorName: firstName,
      expiresAt: new Date(Date.now() + DAYS_UP * DAY_MS),
    });
    res.status(201).json({ message: "Posted on the notice board", post: shape(post, req.user._id) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to post on the notice board") });
  }
}

// DELETE /api/board/:id  (the author, or an admin)
async function deleteBoardPost(req, res) {
  try {
    const post = await BoardPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const own = String(post.author) === String(req.user._id);
    if (!own && !isAdmin(req.user)) return res.status(403).json({ message: "Access denied: insufficient permissions" });
    await post.deleteOne();
    if (!own) await recordAudit(req.user, "board.postDeleted", `Removed a notice board post: "${post.title}"`);
    res.status(200).json({ message: "Post removed" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to remove the post") });
  }
}

// POST /api/board/:id/report  (requires login)
// A student flags a post for the admins. Reporting twice does nothing; you
// can't report your own post. Admins are told on the first report and when the
// post gets hidden.
async function reportBoardPost(req, res) {
  try {
    const post = await BoardPost.findById(req.params.id);
    if (!post || post.expiresAt <= new Date()) return res.status(404).json({ message: "Post not found" });
    if (String(post.author) === String(req.user._id)) return res.status(400).json({ message: "You can't report your own post" });
    const done = { message: "Thanks, an admin will take a look." };
    const updated = await BoardPost.findOneAndUpdate(
      { _id: post._id, reports: { $ne: req.user._id } },
      { $addToSet: { reports: req.user._id } },
      { new: true }
    );
    if (!updated) return res.status(200).json(done); // already reported by this student
    const count = (updated.reports || []).length;
    if (count === 1) {
      await notifyAdmins({ type: "board_report", title: `A notice board post was reported: "${post.title}"`, link: "/board" });
    } else if (count === HIDE_AT_REPORTS) {
      await notifyAdmins({ type: "board_report", title: `A notice board post was hidden after ${count} reports: "${post.title}"`, link: "/board" });
    }
    res.status(200).json(done);
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to report the post") });
  }
}

module.exports = { getBoard, createBoardPost, deleteBoardPost, reportBoardPost };
