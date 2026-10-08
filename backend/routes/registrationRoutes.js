const express = require("express");
const {
  registerForEvent,
  getMyRegistrations,
  cancelRegistration,
} = require("../controllers/registrationController");
const { protect } = require("../middleware/auth");
const { actionLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.post("/register", protect, actionLimiter, registerForEvent);
router.get("/my", protect, getMyRegistrations);
router.delete("/:id", protect, actionLimiter, cancelRegistration);

module.exports = router;
