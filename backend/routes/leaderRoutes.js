const express = require("express");
const { getMyLedClubs, getClubStats, updateMyClub } = require("../controllers/leaderController");
const { actionLimiter } = require("../middleware/rateLimit");
const { protect } = require("../middleware/auth");
const { validateIdParam } = require("../middleware/validateId");

const router = express.Router();
router.param("id", validateIdParam);

// Which clubs the logged-in student leads (empty for everyone else).
router.get("/clubs", protect, getMyLedClubs);
// Numbers for one club, for its leaders and admins.
router.get("/clubs/:id/stats", protect, getClubStats);
// A club's leaders (or an admin) edit its description, activities, meeting line and email.
router.patch("/clubs/:id", protect, actionLimiter, updateMyClub);

module.exports = router;
