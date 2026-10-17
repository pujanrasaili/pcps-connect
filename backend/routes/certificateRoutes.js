const express = require("express");
const { verifyCertificate } = require("../controllers/certificateController");
const { actionLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// Public on purpose: whoever is handed a certificate can check it's genuine.
router.get("/verify/:code", actionLimiter, verifyCertificate);

module.exports = router;
