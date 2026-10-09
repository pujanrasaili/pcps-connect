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

// Looser limiter for logged-in actions like event registration -- a student
// browsing a club fair might legitimately register for several events in a
// few minutes, so this only needs to stop a script from hammering the
// endpoint, not slow down normal use.
const actionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes 
  max: 30, // 30 requests per IP per window
  message: { message: "Too many requests. Please slow down and try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, actionLimiter };
