const User = require("../models/User");
const Club = require("../models/Club");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const ClubMembership = require("../models/ClubMembership");
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

const LEADERBOARD_DAYS = 90;
const LEADERBOARD_SIZE = 5;

// GET /api/stats/clubs  (public, no auth)
// The most active clubs: ranked by events held in the last 90 days, then by
// members. Club names and counts only -- the same things the public Clubs
// page already shows -- so it is safe for anyone to read.
async function getClubLeaderboard(req, res) {
  try {
    const now = new Date();
    const since = new Date(now.getTime() - LEADERBOARD_DAYS * 86400000);
    const held = await Event.aggregate([
      { $match: { club: { $ne: null }, date: { $gte: since, $lte: now } } },
      { $group: { _id: "$club", eventsHeld: { $sum: 1 } } },
      { $sort: { eventsHeld: -1 } },
      { $limit: 50 },
    ]);
    if (held.length === 0) return res.status(200).json({ days: LEADERBOARD_DAYS, leaderboard: [] });

    const ids = held.map((row) => row._id);
    const [clubs, memberRows] = await Promise.all([
      Club.find({ _id: { $in: ids } }).select("name category image").lean(),
      ClubMembership.aggregate([{ $match: { club: { $in: ids } } }, { $group: { _id: "$club", members: { $sum: 1 } } }]),
    ]);
    const members = new Map(memberRows.map((row) => [String(row._id), row.members]));
    const byId = new Map(clubs.map((club) => [String(club._id), club]));

    const leaderboard = held
      .filter((row) => byId.has(String(row._id)))
      .map((row) => {
        const club = byId.get(String(row._id));
        return {
          _id: club._id,
          name: club.name,
          category: club.category,
          image: club.image || null,
          eventsHeld: row.eventsHeld,
          members: members.get(String(row._id)) || 0,
        };
      })
      .sort((a, b) => b.eventsHeld - a.eventsHeld || b.members - a.members || a.name.localeCompare(b.name))
      .slice(0, LEADERBOARD_SIZE);

    res.status(200).json({ days: LEADERBOARD_DAYS, leaderboard });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch the club leaderboard") });
  }
}

module.exports = { getPublicStats, getClubLeaderboard };
