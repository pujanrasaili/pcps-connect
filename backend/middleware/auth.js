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

module.exports = { protect, adminOnly };