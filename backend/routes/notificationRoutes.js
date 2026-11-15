const express = require("express");
const { getMyNotifications, markAllRead, clearMine } = require("../controllers/notificationController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, getMyNotifications);
router.put("/read-all", protect, markAllRead);
router.delete("/", protect, clearMine);

module.exports = router;
