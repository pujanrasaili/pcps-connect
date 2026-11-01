const Club = require("../models/Club");
const ClubMembership = require("../models/ClubMembership");
const ClubJoinRequest = require("../models/ClubJoinRequest");
const { canManageClub } = require("../utils/clubAccess");
const { notifyStudentOfDecision } = require("../utils/clubJoinNotices");
const { recordAudit } = require("../utils/audit");
const { safeError } = require("../utils/errorMessage");

// GET /api/admin/clubs/:id/requests
// Students waiting to join a club that approves its members, oldest first.
// Admins and that club's own leaders only. Deleted accounts are skipped.
async function getClubJoinRequests(req, res) {
  try {
    const club = await Club.findById(req.params.id).select("name requiresApproval");
    if (!club) return res.status(404).json({ message: "Club not found" });
    if (!(await canManageClub(req.user, club._id))) {
      return res.status(403).json({ message: "You don't have access to this club" });
    }
    const rows = await ClubJoinRequest.find({ club: club._id }).sort({ createdAt: 1 }).populate("user", "name email studentId");
    const requests = rows
      .filter((r) => r.user)
      .map((r) => ({
        _id: r._id,
        name: r.user.name,
        email: r.user.email,
        studentId: r.user.studentId || "",
        requestedAt: r.createdAt,
      }));
    res.status(200).json({ club: { _id: club._id, name: club.name, requiresApproval: !!club.requiresApproval }, requests });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch join requests") });
  }
}

const MAX_REASON = 300;

// PUT /api/admin/clubs/:id/requests/:requestId/decision  { decision: "approve" | "reject", reason?: string }
// `reason` is an optional short note that goes in the decline email.
// Approving makes the student a member (and drops the request); rejecting just
// drops it. Either way the student is told. Admins and that club's leaders only.
async function decideClubJoinRequest(req, res) {
  try {
    const { decision } = req.body || {};
    if (decision !== "approve" && decision !== "reject") {
      return res.status(400).json({ message: 'decision must be "approve" or "reject"' });
    }
    const { reason } = req.body || {};
    if (reason !== undefined && (typeof reason !== "string" || reason.length > MAX_REASON)) {
      return res.status(400).json({ message: `The note must be text of ${MAX_REASON} characters or fewer` });
    }
    const club = await Club.findById(req.params.id).select("name");
    if (!club) return res.status(404).json({ message: "Club not found" });
    if (!(await canManageClub(req.user, club._id))) {
      return res.status(403).json({ message: "You don't have access to this club" });
    }

    // Deleting is the "claim": only one of two leaders pressing at once gets it.
    const request = await ClubJoinRequest.findOneAndDelete({ _id: req.params.requestId, club: club._id }).populate("user", "name email");
    if (!request) return res.status(404).json({ message: "That request was already handled" });

    const approved = decision === "approve";
    if (approved && request.user) {
      try {
        await ClubMembership.create({ user: request.user._id, club: club._id });
      } catch (err) {
        if (err.code !== 11000) throw err; // already a member -- fine
      }
    }
    if (request.user) await notifyStudentOfDecision(request.user, club, approved, approved ? "" : String(reason || "").trim());
    await recordAudit(
      req.user,
      approved ? "club.join_approved" : "club.join_declined",
      `${approved ? "Approved" : "Declined"} ${request.user?.name || "a student"} joining "${club.name}"`
    );

    res.status(200).json({ message: approved ? "Request approved" : "Request declined" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to decide the request") });
  }
}

// GET /api/admin/club-request-counts
// How many students are waiting on each club the caller can manage (all
// clubs for an admin, only the clubs they lead for a leader), so the club
// lists can show a badge. Clubs with nobody waiting are left out.
async function getRequestCounts(req, res) {
  try {
    const match = {};
    if (req.user.role !== "admin") {
      const led = await Club.find({ leaders: req.user._id }).select("_id");
      match.club = { $in: led.map((c) => c._id) };
    }
    const rows = await ClubJoinRequest.aggregate([{ $match: match }, { $group: { _id: "$club", n: { $sum: 1 } } }]);
    const counts = {};
    rows.forEach((r) => {
      counts[String(r._id)] = r.n;
    });
    res.status(200).json({ counts });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch request counts") });
  }
}

module.exports = { getClubJoinRequests, decideClubJoinRequest, getRequestCounts };
