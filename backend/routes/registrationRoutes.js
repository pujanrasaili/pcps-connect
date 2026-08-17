const express = require("express");
const {
  registerForEvent,
  getMyRegistrations,
  cancelRegistration,
} = require("../controllers/registrationController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/register", protect, registerForEvent);
router.get("/my", protect, getMyRegistrations);
router.delete("/:id", protect, cancelRegistration);

module.exports = router;
