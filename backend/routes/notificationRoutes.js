const express = require("express");
const { getMyNotifications, markAllRead } = require("../controllers/notificationController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, getMyNotifications);
router.put("/read-all", protect, markAllRead);

module.exports = router;
