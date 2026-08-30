const express = require("express");
const { register, login, logout, getMe, updateProfile, toggleFavoriteClub } = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/favorite-club", protect, toggleFavoriteClub);

module.exports = router;
