const express = require("express");
const { getKey, subscribe, unsubscribe } = require("../controllers/pushController");
const { protect } = require("../middleware/auth");
const { actionLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.get("/key", protect, getKey);
router.post("/subscribe", protect, actionLimiter, subscribe);
router.delete("/subscribe", protect, actionLimiter, unsubscribe);

module.exports = router;
