const express = require("express");
const { getPublicStats, getClubLeaderboard } = require("../controllers/statsController");

const router = express.Router();

router.get("/", getPublicStats);
router.get("/clubs", getClubLeaderboard);

module.exports = router;
