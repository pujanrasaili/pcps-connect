const express = require("express");
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventController");
const { getCalendarFeed } = require("../controllers/calendarFeedController");
const { getQuestions, askQuestion, answerQuestion, deleteQuestion } = require("../controllers/eventQuestionController");
const { protect, optionalAuth } = require("../middleware/auth");
const { staffOnly } = require("../middleware/staff");
const upload = require("../middleware/upload");
const { actionLimiter } = require("../middleware/rateLimit");

const { validateIdParam } = require("../middleware/validateId");

const router = express.Router();
router.param("id", validateIdParam);
router.param("questionId", validateIdParam);


router.get("/", getEvents);
// Must stay above "/:id" or "calendar.ics" would be read as an event id.
router.get("/calendar.ics", getCalendarFeed);
router.get("/:id", optionalAuth, getEventById);
// Public questions and answers on an event's page. Asking and deleting your own
// needs a login; answering is for the event's organisers (checked in the controller).
router.get("/:id/questions", optionalAuth, getQuestions);
router.post("/:id/questions", protect, actionLimiter, askQuestion);
router.put("/:id/questions/:questionId/answer", protect, staffOnly, actionLimiter, answerQuestion);
router.delete("/:id/questions/:questionId", protect, actionLimiter, deleteQuestion);
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
