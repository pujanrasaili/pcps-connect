const express = require("express");
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventController");
const { protect } = require("../middleware/auth");
const { staffOnly } = require("../middleware/staff");
const upload = require("../middleware/upload");
const { actionLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.get("/", getEvents);
router.get("/:id", getEventById);
// Event management is for admins and club leaders only -- the frontend never
// exposes event creation to regular students, so without this check anyone
// calling the API directly could post arbitrary public "events" to the site.
// staffOnly is the cheap outer gate; the controller then checks that a leader
// is acting on their own club's events.
// Creating a club event emails every member, so it is rate limited like the
// other "send emails" actions (a club leader can't flood their members).
router.post("/create", protect, staffOnly, actionLimiter, upload.single("image"), createEvent);
router.put("/:id", protect, staffOnly, upload.single("image"), updateEvent);
router.delete("/:id", protect, staffOnly, deleteEvent);

module.exports = router;
