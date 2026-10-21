const express = require("express");
const { getClubs, getClubById, createClub, updateClub, deleteClub } = require("../controllers/clubController");
const { protect, adminOnly } = require("../middleware/auth");

const { validateIdParam } = require("../middleware/validateId");

const router = express.Router();
router.param("id", validateIdParam);


router.get("/", getClubs);
router.get("/:id", getClubById);
router.post("/", protect, adminOnly, createClub);
router.put("/:id", protect, adminOnly, updateClub);
router.delete("/:id", protect, adminOnly, deleteClub);

module.exports = router;
