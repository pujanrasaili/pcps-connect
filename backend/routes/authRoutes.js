const express = require("express");
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  toggleFavoriteClub,
  changePassword,
  deleteAccount,
  exportMyData,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { authLimiter, loginLimiter, registerLimiter, guessLimiter, actionLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/favorite-club", protect, toggleFavoriteClub);
router.put("/change-password", protect, guessLimiter, changePassword);
router.get("/export", protect, actionLimiter, exportMyData);
router.delete("/account", protect, guessLimiter, deleteAccount);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", guessLimiter, resetPassword);
router.post("/verify-email", guessLimiter, verifyEmail);
router.post("/resend-verification", authLimiter, resendVerification);

module.exports = router;
