const { ledClubs } = require("../utils/clubAccess");
const { safeError } = require("../utils/errorMessage");

// GET /api/leader/clubs
// Lets the frontend know whether to show the "Manage my clubs" area and which
// clubs the person may create events for.
async function getMyLedClubs(req, res) {
  try {
    const clubs = await ledClubs(req.user);
    res.status(200).json({ clubs });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch your clubs") });
  }
}

module.exports = { getMyLedClubs };
