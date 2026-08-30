const rateLimit = require("express-rate-limit");

// Limits repeated login/register attempts per IP, to slow down brute-force
// password guessing and automated account-creation spam. Doesn't apply to
// any other route -- browsing clubs/events stays unrestricted.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per window
  message: { message: "Too many attempts. Please try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter };
