const express = require("express");
const {
  registerForEvent,
  getMyRegistrations,
  cancelRegistration,
  submitFeedback,
  getCheckInCode,
  getCertificate,
} = require("../controllers/registrationController");
const { getMyRecord } = require("../controllers/recordController");
const { protect } = require("../middleware/auth");
const { actionLimiter } = require("../middleware/rateLimit");

const { validateIdParam } = require("../middleware/validateId");

const router = express.Router();
router.param("id", validateIdParam);


router.post("/register", protect, actionLimiter, registerForEvent);
router.get("/my", protect, getMyRegistrations);
router.get("/record", protect, getMyRecord);
router.get("/:id/check-in-code", protect, getCheckInCode);
router.get("/:id/certificate", protect, getCertificate);
router.put("/:id/feedback", protect, actionLimiter, submitFeedback);
router.delete("/:id", protect, actionLimiter, cancelRegistration);

module.exports = router;
