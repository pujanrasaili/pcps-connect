const express = require("express");
const { getClubs, getClubById, createClub, updateClub, deleteClub } = require("../controllers/clubController");
const upload = require("../middleware/upload");
const { getClubPosts, createClubPost, updateClubPost, setClubPostPinned, deleteClubPost } = require("../controllers/clubPostController");
const { getClubIdeas, createClubIdea, deleteClubIdea } = require("../controllers/clubIdeaController");
const { protect, adminOnly } = require("../middleware/auth");
const { actionLimiter } = require("../middleware/rateLimit");

const { validateIdParam } = require("../middleware/validateId");

const router = express.Router();
router.param("id", validateIdParam);
router.param("postId", validateIdParam);
router.param("ideaId", validateIdParam);


router.get("/", getClubs);
router.get("/:id", getClubById);
router.get("/:id/posts", getClubPosts);
router.post("/:id/posts", protect, actionLimiter, upload.single("image"), createClubPost);
router.patch("/:id/posts/:postId", protect, actionLimiter, updateClubPost);
router.put("/:id/posts/:postId/pin", protect, actionLimiter, setClubPostPinned);
router.delete("/:id/posts/:postId", protect, actionLimiter, deleteClubPost);
router.get("/:id/ideas", protect, getClubIdeas);
router.post("/:id/ideas", protect, actionLimiter, createClubIdea);
router.delete("/:id/ideas/:ideaId", protect, actionLimiter, deleteClubIdea);
router.post("/", protect, adminOnly, createClub);
router.put("/:id", protect, adminOnly, updateClub);
router.delete("/:id", protect, adminOnly, deleteClub);

module.exports = router;
