const express = require("express");
const { getClubs, getClubById, createClub, updateClub, deleteClub } = require("../controllers/clubController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.get("/", getClubs);
router.get("/:id", getClubById);
router.post("/", protect, adminOnly, createClub);
router.put("/:id", protect, adminOnly, updateClub);
router.delete("/:id", protect, adminOnly, deleteClub);

module.exports = router;
