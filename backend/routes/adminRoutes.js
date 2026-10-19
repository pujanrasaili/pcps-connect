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
  getClubLeaders,
  setClubLeaders,
  checkInByCode,
  getAttendanceReport,
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/auth");
const { staffOnly } = require("../middleware/staff");
const { actionLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.use(protect);

// Event staff: admins, plus club leaders for their own club's events. staffOnly
// is the cheap outer gate; each controller then checks the specific event or
// club (utils/clubAccess.js), so a leader can never touch another club's.
router.get("/events/:id/registrations", staffOnly, getEventRegistrations);
router.post("/events/:id/announce", staffOnly, actionLimiter, announceToRegistrants);
router.post("/clubs/:id/announce", staffOnly, actionLimiter, announceToClubMembers);
router.put("/registrations/:id", staffOnly, updateRegistrationAttendance);
router.get("/attendance-report", staffOnly, getAttendanceReport);
// Deliberately not behind actionLimiter: at a busy door one phone (one IP)
// legitimately scans far more than 30 students in 10 minutes.
router.post("/check-in", staffOnly, checkInByCode);

// Everything below is admin-only.
router.use(adminOnly);

router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.get("/users/:id/events", getUserEvents);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

router.get("/events", getAllEventsAdmin);
router.get("/events/:id", getEventByIdAdmin);
router.put("/events/:id", updateEventAdmin);
router.delete("/events/:id", deleteEventAdmin);

router.get("/clubs/:id/leaders", getClubLeaders);
router.put("/clubs/:id/leaders", setClubLeaders);

router.get("/audit", getAuditLog);

module.exports = router;
