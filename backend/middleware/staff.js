const Club = require("../models/Club");

// Coarse gate for the event-management routes: admins, or a student who
// leads at least one club. It only keeps everyone else out cheaply -- each
// controller still checks that the specific event/club is one this person
// may manage (utils/clubAccess.js). Must run after protect().
async function staffOnly(req, res, next) {
  try {
    if (req.user?.role === "admin") return next();
    if (req.user?._id && (await Club.exists({ leaders: req.user._id }))) return next();
    return res.status(403).json({ message: "Access denied: insufficient permissions" });
  } catch (err) {
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}

module.exports = { staffOnly };
