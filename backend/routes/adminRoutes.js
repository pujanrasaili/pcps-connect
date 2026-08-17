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

module.exports = router;
