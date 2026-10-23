const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

// Limits repeated login/register attempts per IP, to slow down brute-force
// password guessing and automated account-creation spam. Doesn't apply to
// any other route -- browsing clubs/events stays unrestricted.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 per IP per window -- campus Wi-Fi shares one IP
  message: { message: "Too many attempts. Please try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Sign-up gets its own, roomier counter: at orientation many new students
// register from the same campus Wi-Fi IP within minutes. Accounts still need
// a verified email, so this only has to stop a script mass-creating them.
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40, // sign-ups per IP per window
  message: { message: "Too many sign-ups from this network. Please try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login gets its own counter that only counts FAILED attempts. A college's
// students often share one public IP (campus Wi-Fi), so counting successful
// logins too would lock real students out on a busy morning. Password
// guessing is still capped, since every wrong guess counts.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // failed attempts per IP per window
  skipSuccessfulRequests: true,
  message: { message: "Too many attempts. Please try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// For routes that check a secret (verification or reset token, current
// password): only wrong guesses count, so a successful verification during
// orientation doesn't use up the allowance of the students sharing that IP.
const guessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // failed guesses per IP per window
  skipSuccessfulRequests: true,
  message: { message: "Too many attempts. Please try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Looser limiter for logged-in actions like event registration -- a student
// browsing a club fair might legitimately register for several events in a
// few minutes, so this only needs to stop a script from hammering the
// endpoint, not slow down normal use.
//
// Counted per logged-in student rather than per IP: at a club fair dozens of
// students share the campus Wi-Fi's single public IP and would otherwise
// use up one shared allowance. Routes with no logged-in user (certificate
// verification) fall back to the IP.
function actionKey(req) {
  if (req.user?._id) return `user:${req.user._id}`;
  return ipKeyGenerator(req.ip);
}

const actionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // 30 requests per student (or per IP when logged out) per window
  keyGenerator: actionKey,
  message: { message: "Too many requests. Please slow down and try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, loginLimiter, registerLimiter, guessLimiter, actionLimiter, actionKey };
