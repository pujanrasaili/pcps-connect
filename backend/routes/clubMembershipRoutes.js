const express = require("express");
const { getMyOpenPolls, getMyClubNews, getMyMemberships, getMyJoinRequests, joinClub, leaveClub } = require("../controllers/clubMembershipController");
const { becomeAlumnus, getMyAlumni } = require("../controllers/clubAlumniController");
const { protect } = require("../middleware/auth");
const { actionLimiter } = require("../middleware/rateLimit");

const { validateIdParam } = require("../middleware/validateId");

const router = express.Router();
router.param("clubId", validateIdParam);


router.use(protect);

router.get("/my", getMyMemberships);
router.get("/news", getMyClubNews);
router.get("/polls", getMyOpenPolls);
router.get("/alumni", getMyAlumni);
router.get("/requests/my", getMyJoinRequests);
// Joining and leaving are rate limited per student: with approval clubs every
// join sends leaders a notification, so a script flipping join/leave would
// flood them.
router.post("/join", actionLimiter, joinClub);
router.delete("/:clubId", actionLimiter, leaveClub);
router.post("/:clubId/alumni", actionLimiter, becomeAlumnus);

module.exports = router;
