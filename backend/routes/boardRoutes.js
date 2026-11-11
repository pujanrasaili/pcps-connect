const express = require("express");
const { getBoard, createBoardPost, deleteBoardPost, reportBoardPost } = require("../controllers/boardController");
const { protect } = require("../middleware/auth");
const { actionLimiter } = require("../middleware/rateLimit");
const { validateIdParam } = require("../middleware/validateId");

const router = express.Router();
router.param("id", validateIdParam);

router.get("/", protect, getBoard);
router.post("/", protect, actionLimiter, createBoardPost);
router.delete("/:id", protect, actionLimiter, deleteBoardPost);
router.post("/:id/report", protect, actionLimiter, reportBoardPost);

module.exports = router;
