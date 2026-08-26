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
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/auth");

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

router.put("/registrations/:id", updateRegistrationAttendance);

module.exports = router;
