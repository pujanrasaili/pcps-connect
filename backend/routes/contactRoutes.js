const express = require("express");
const { submitContactForm } = require("../controllers/contactController");
const { authLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// Reuses the same rate limiter as auth routes -- a public form is an easy
// spam target otherwise.
router.post("/", authLimiter, submitContactForm);

module.exports = router;
