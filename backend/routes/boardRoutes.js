const express = require("express");
const { getBoard, createBoardPost, deleteBoardPost } = require("../controllers/boardController");
const { protect } = require("../middleware/auth");
const { actionLimiter } = require("../middleware/rateLimit");
const { validateIdParam } = require("../middleware/validateId");

const router = express.Router();
router.param("id", validateIdParam);

router.get("/", protect, getBoard);
router.post("/", protect, actionLimiter, createBoardPost);
router.delete("/:id", protect, actionLimiter, deleteBoardPost);

module.exports = router;
