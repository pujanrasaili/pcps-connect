const express = require("express");
const { getClubs, getClubById, createClub, updateClub, deleteClub } = require("../controllers/clubController");
const { getClubPosts, createClubPost, deleteClubPost } = require("../controllers/clubPostController");
const { protect, adminOnly } = require("../middleware/auth");
const { actionLimiter } = require("../middleware/rateLimit");

const { validateIdParam } = require("../middleware/validateId");

const router = express.Router();
router.param("id", validateIdParam);
router.param("postId", validateIdParam);


router.get("/", getClubs);
router.get("/:id", getClubById);
router.get("/:id/posts", getClubPosts);
router.post("/:id/posts", protect, actionLimiter, createClubPost);
router.delete("/:id/posts/:postId", protect, actionLimiter, deleteClubPost);
router.post("/", protect, adminOnly, createClub);
router.put("/:id", protect, adminOnly, updateClub);
router.delete("/:id", protect, adminOnly, deleteClub);

module.exports = router;
