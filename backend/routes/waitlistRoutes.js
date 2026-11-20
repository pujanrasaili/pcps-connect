const express = require("express");
const { getWaitlistStatus, getMyWaitlist, joinWaitlist, updateWaitlistAnswers, leaveWaitlist } = require("../controllers/waitlistController");
const { protect } = require("../middleware/auth");
const { actionLimiter } = require("../middleware/rateLimit");

const { validateIdParam } = require("../middleware/validateId");

const router = express.Router();
router.param("eventId", validateIdParam);


// Before "/:eventId", so "my" is never read as an event id.
router.get("/my", protect, getMyWaitlist);
router.get("/:eventId", protect, getWaitlistStatus);
router.post("/:eventId", protect, actionLimiter, joinWaitlist);
router.put("/:eventId/answers", protect, actionLimiter, updateWaitlistAnswers);
router.delete("/:eventId", protect, actionLimiter, leaveWaitlist);

module.exports = router;
