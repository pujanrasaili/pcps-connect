const express = require("express");
const { submitContactForm } = require("../controllers/contactController");
const { contactLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// Its own rate limiter, separate from the auth routes' -- a public form is an
// easy spam target, and spam here must not block password resets.
router.post("/", contactLimiter, submitContactForm);

module.exports = router;
