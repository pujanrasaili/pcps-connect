const express = require("express");
const { getMyMemberships, joinClub, leaveClub } = require("../controllers/clubMembershipController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/my", getMyMemberships);
router.post("/join", joinClub);
router.delete("/:clubId", leaveClub);

module.exports = router;
