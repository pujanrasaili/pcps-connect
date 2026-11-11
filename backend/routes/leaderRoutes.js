const express = require("express");
const { getMyLedClubs, getClubStats } = require("../controllers/leaderController");
const { protect } = require("../middleware/auth");
const { validateIdParam } = require("../middleware/validateId");

const router = express.Router();
router.param("id", validateIdParam);

// Which clubs the logged-in student leads (empty for everyone else).
router.get("/clubs", protect, getMyLedClubs);
// Numbers for one club, for its leaders and admins.
router.get("/clubs/:id/stats", protect, getClubStats);

module.exports = router;
