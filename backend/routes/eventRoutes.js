const express = require("express");
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventController");
const { protect, adminOnly } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

router.get("/", getEvents);
router.get("/:id", getEventById);
// Event management is admin-only -- the frontend never exposes event
// creation to regular students, so without this check anyone calling the
// API directly could post arbitrary public "events" to the site.
router.post("/create", protect, adminOnly, upload.single("image"), createEvent);
router.put("/:id", protect, adminOnly, upload.single("image"), updateEvent);
router.delete("/:id", protect, adminOnly, deleteEvent);

module.exports = router;
