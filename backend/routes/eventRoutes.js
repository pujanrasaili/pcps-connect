const express = require("express");
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

router.get("/", getEvents);
router.get("/:id", getEventById);
router.post("/create", protect, upload.single("image"), createEvent);
router.put("/:id", protect, upload.single("image"), updateEvent);
router.delete("/:id", protect, deleteEvent);

module.exports = router;
