const express = require("express");
const { getMyMemberships, joinClub, leaveClub } = require("../controllers/clubMembershipController");
const { protect } = require("../middleware/auth");

const { validateIdParam } = require("../middleware/validateId");

const router = express.Router();
router.param("clubId", validateIdParam);


router.use(protect);

router.get("/my", getMyMemberships);
router.post("/join", joinClub);
router.delete("/:clubId", leaveClub);

module.exports = router;
