const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Reads the JWT from the httpOnly "token" cookie (never from headers/body),
// verifies it, and attaches the logged-in user to req.user.
async function protect(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ message: "Not logged in" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Login tokens are signed as { id } only. Email-verification and
    // password-reset tokens are also JWTs signed with the same secret, but
    // carry a "purpose" claim and are only ever meant to be used once,
    // against their own single-purpose endpoints -- a login token should
    // never double as one of those.
    if (decoded.purpose) {
      return res.status(401).json({ message: "Not logged in" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Not logged in" });
    }

    // Login only lets approved accounts in, but a token lasts days. If an
    // admin rejects (or sends back to pending) a student who is already
    // logged in, their existing cookie must stop working straight away,
    // not whenever it happens to expire.
    if (user.approvalStatus === "rejected" || user.approvalStatus === "pending") {
      return res.status(401).json({ message: "Not logged in" });
    }

    // If the password was changed/reset after this token was issued, the
    // token is stale -- reject it. Without this, changing your password
    // because you suspect your session/cookie leaked wouldn't actually log
    // out whoever has that leaked cookie; they could keep using it with
    // the old token indefinitely (tokens don't carry anything that changes
    // on password change otherwise).
    //
    // JWT `iat` has whole-second precision but passwordChangedAt has
    // millisecond precision, so both are compared in whole seconds -- a
    // fresh token re-issued by changePassword() in the same second as the
    // save must NOT come out "older" than it just because its iat got
    // floored down past the save's milliseconds.
    if (user.passwordChangedAt) {
      const changedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < changedAtSeconds) {
        return res.status(401).json({ message: "Not logged in" });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not logged in" });
  }
}

// Must run after protect(). Blocks anyone whose role isn't "admin".
function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Access denied: insufficient permissions" });
  }
  next();
}

// For public routes that show a little more to someone who is logged in. With
// a valid login it behaves like protect() (req.user is set); with no cookie, an
// expired or invalid one, it simply carries on as a guest. It reuses protect so
// every rule there (revoked accounts, changed passwords) applies here too.
async function optionalAuth(req, res, next) {
  if (!req.cookies?.token) return next();
  const asGuest = { status: () => ({ json: () => next() }) };
  return protect(req, asGuest, next);
}

module.exports = { protect, adminOnly, optionalAuth };