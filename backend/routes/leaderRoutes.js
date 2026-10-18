const express = require("express");
const { getMyLedClubs } = require("../controllers/leaderController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Which clubs the logged-in student leads (empty for everyone else).
router.get("/clubs", protect, getMyLedClubs);

module.exports = router;
