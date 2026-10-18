const express = require("express");
const {
  getAllUsers,
  getUserById,
  getUserEvents,
  updateUser,
  deleteUser,
  getAllEventsAdmin,
  getEventByIdAdmin,
  updateEventAdmin,
  deleteEventAdmin,
  getEventRegistrations,
  updateRegistrationAttendance,
  getAuditLog,
  announceToRegistrants,
  announceToClubMembers,
  checkInByCode,
  getAttendanceReport,
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/auth");
const { actionLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.use(protect, adminOnly);

router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.get("/users/:id/events", getUserEvents);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

router.get("/events", getAllEventsAdmin);
router.get("/events/:id", getEventByIdAdmin);
router.put("/events/:id", updateEventAdmin);
router.delete("/events/:id", deleteEventAdmin);
router.get("/events/:id/registrations", getEventRegistrations);
router.post("/events/:id/announce", actionLimiter, announceToRegistrants);
router.post("/clubs/:id/announce", actionLimiter, announceToClubMembers);

router.put("/registrations/:id", updateRegistrationAttendance);
// Deliberately not behind actionLimiter: at a busy door one admin phone (one
// IP) legitimately scans far more than 30 students in 10 minutes.
router.post("/check-in", checkInByCode);
router.get("/audit", getAuditLog);
router.get("/attendance-report", getAttendanceReport);

module.exports = router;
