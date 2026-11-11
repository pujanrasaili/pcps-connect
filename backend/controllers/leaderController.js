const { ledClubs, canManageClub } = require("../utils/clubAccess");
const Club = require("../models/Club");
const ClubMembership = require("../models/ClubMembership");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const { buildAttendanceReport } = require("../utils/attendanceReport");
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

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT = 5;

// GET /api/leader/clubs/:id/stats  (the club's leaders, or an admin)
// A one-club summary for the people who run it: members and how fast they are
// joining, events held and coming up, how many registered students actually
// showed up, and the ratings. Counts only -- no names or emails.
async function getClubStats(req, res) {
  try {
    if (!(await canManageClub(req.user, req.params.id))) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    if (!(await Club.exists({ _id: req.params.id }))) return res.status(404).json({ message: "Club not found" });

    const now = new Date();
    const month = new Date(now - 30 * DAY_MS);
    const twoMonths = new Date(now - 60 * DAY_MS);
    const [members, joinedRecently, joinedBefore, events] = await Promise.all([
      ClubMembership.countDocuments({ club: req.params.id }),
      ClubMembership.countDocuments({ club: req.params.id, createdAt: { $gte: month } }),
      ClubMembership.countDocuments({ club: req.params.id, createdAt: { $gte: twoMonths, $lt: month } }),
      Event.find({ club: req.params.id }).select("title date").sort({ date: -1 }).lean(),
    ]);

    const past = events.filter((e) => new Date(e.date) < now);
    const stats = past.length
      ? await Registration.aggregate([
          { $match: { event: { $in: past.map((e) => e._id) }, status: { $ne: "pending" } } },
          {
            $group: {
              _id: "$event",
              registered: { $sum: 1 },
              attended: { $sum: { $cond: ["$attended", 1, 0] } },
              ratingSum: { $sum: { $ifNull: ["$rating", 0] } },
              ratingCount: { $sum: { $cond: [{ $gt: ["$rating", 0] }, 1, 0] } },
            },
          },
        ])
      : [];
    const report = buildAttendanceReport(past, stats);

    res.status(200).json({
      stats: {
        members,
        newMembers: { current: joinedRecently, previous: joinedBefore },
        upcomingEvents: events.length - past.length,
        pastEvents: past.length,
        attendance: report.totals,
        recent: report.events.slice(0, RECENT).map(({ _id, title, date, registered, attended, attendanceRate, averageRating }) => ({ _id, title, date, registered, attended, attendanceRate, averageRating })),
      },
    });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch the club stats") });
  }
}

module.exports = { getMyLedClubs, getClubStats };
