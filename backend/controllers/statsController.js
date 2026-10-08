const User = require("../models/User");
const Club = require("../models/Club");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const { safeError } = require("../utils/errorMessage");

// GET /api/stats  (public, no auth)
// Aggregate counts only -- no names, emails, or any per-record data -- so
// it's safe to expose to anyone, including the logged-out homepage. Exists
// so the homepage's "Stats" section shows real numbers pulled from the
// database instead of hardcoded marketing figures.
async function getPublicStats(req, res) {
  try {
    const [totalStudents, totalClubs, totalEvents, totalRegistrations] = await Promise.all([
      User.countDocuments({ role: "user", approvalStatus: "approved" }),
      Club.countDocuments(),
      Event.countDocuments(),
      Registration.countDocuments(),
    ]);

    res.status(200).json({ totalStudents, totalClubs, totalEvents, totalRegistrations });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch stats") });
  }
}

module.exports = { getPublicStats };
