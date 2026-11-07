const ClubMembership = require("../models/ClubMembership");
const ClubJoinRequest = require("../models/ClubJoinRequest");
const { notifyClubStaffOfRequest } = require("../utils/clubJoinNotices");
const { isObjectId } = require("../middleware/validateId");
const Club = require("../models/Club");
const ClubPost = require("../models/ClubPost");
const { safeError } = require("../utils/errorMessage");

// GET /api/club-memberships/my  (requires login)
// Returns this student's memberships, each populated with the club's info.
async function getMyMemberships(req, res) {
  try {
    const memberships = await ClubMembership.find({ user: req.user._id }).populate("club");
    res.status(200).json({ memberships });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch memberships") });
  }
}

// GET /api/club-memberships/news  (requires login)
// The latest news posts from the clubs the student has joined, newest first
// (a short list for the Dashboard). Only what is public on the club page.
const NEWS_LIMIT = 5;
const NEWS_DAYS = 30;
async function getMyClubNews(req, res) {
  try {
    const memberships = await ClubMembership.find({ user: req.user._id }).select("club");
    const clubIds = memberships.map((m) => m.club);
    if (clubIds.length === 0) return res.status(200).json({ posts: [] });
    const since = new Date(Date.now() - NEWS_DAYS * 24 * 60 * 60 * 1000);
    const posts = await ClubPost.find({ club: { $in: clubIds }, createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(NEWS_LIMIT)
      .select("club body image authorName createdAt editedAt")
      .populate("club", "name");
    res.status(200).json({ posts });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch club news") });
  }
}

// POST /api/club-memberships/join  (requires login)
async function joinClub(req, res) {
  try {
    const { clubId } = req.body;
    if (!clubId) return res.status(400).json({ message: "clubId is required" });

    if (!isObjectId(clubId)) return res.status(404).json({ message: "Club not found" });

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club not found" });

    const existing = await ClubMembership.findOne({ user: req.user._id, club: clubId });
    if (existing) return res.status(400).json({ message: "Already joined this club" });

    // Clubs that approve members: this is a request, not a membership.
    if (club.requiresApproval) {
      try {
        await ClubJoinRequest.create({ user: req.user._id, club: clubId });
      } catch (err) {
        if (err.code === 11000) return res.status(400).json({ message: "You already asked to join this club" });
        throw err;
      }
      await notifyClubStaffOfRequest(club, req.user);
      return res.status(202).json({ message: "Request sent -- the club's leaders will review it", pending: true });
    }

    const membership = await ClubMembership.create({ user: req.user._id, club: clubId });
    res.status(201).json({ message: "Joined club", membership });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to join club") });
  }
}

// GET /api/club-memberships/requests/my  (requires login)
// The clubs this student has asked to join and is still waiting on.
async function getMyJoinRequests(req, res) {
  try {
    const requests = await ClubJoinRequest.find({ user: req.user._id }).select("club createdAt");
    res.status(200).json({ requests });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch your requests") });
  }
}

// DELETE /api/club-memberships/:clubId  (requires login)
// Leaves a club, or withdraws a request that is still waiting.
async function leaveClub(req, res) {
  try {
    const membership = await ClubMembership.findOneAndDelete({
      user: req.user._id,
      club: req.params.clubId,
    });
    if (!membership) {
      const request = await ClubJoinRequest.findOneAndDelete({ user: req.user._id, club: req.params.clubId });
      if (!request) return res.status(404).json({ message: "Membership not found" });
      return res.status(200).json({ message: "Request withdrawn" });
    }
    res.status(200).json({ message: "Left club" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to leave club") });
  }
}

module.exports = { getMyClubNews, getMyMemberships, getMyJoinRequests, joinClub, leaveClub };
