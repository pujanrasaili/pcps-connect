const mongoose = require("mongoose");
const Club = require("../models/Club");
const ClubMembership = require("../models/ClubMembership");
const ClubPoll = require("../models/ClubPoll");
const { canManageClub } = require("../utils/clubAccess");
const { cleanClubPoll, MAX_OPEN } = require("../utils/clubPollInput");
const { pushNotifications } = require("../utils/inApp");
const { safeError } = require("../utils/errorMessage");

const SHOWN = 10;
const DAY = 24 * 60 * 60 * 1000;
const KEEP_AFTER_CLOSE = 30 * DAY;
const FORBIDDEN = { message: "Access denied: insufficient permissions" };

// What the browser gets for a poll: counts and the caller's own pick, never
// who voted for what.
function shape(poll, userId, now = new Date()) {
  const me = String(userId);
  let myVote = null;
  const options = poll.options.map((o, i) => {
    const voters = (o.voters || []).map(String);
    if (voters.includes(me)) myVote = i;
    return { text: o.text, count: voters.length };
  });
  return {
    _id: poll._id,
    question: poll.question,
    options,
    total: options.reduce((n, o) => n + o.count, 0),
    myVote,
    closesAt: poll.closesAt,
    closed: new Date(poll.closesAt) <= now,
    createdAt: poll.createdAt,
  };
}

async function isMember(clubId, userId) {
  return !!(await ClubMembership.exists({ club: clubId, user: userId }));
}

// GET /api/clubs/:id/polls  (requires login; members, leaders and admins)
async function getClubPolls(req, res) {
  try {
    const club = await Club.findById(req.params.id).select("_id");
    if (!club) return res.status(404).json({ message: "Club not found" });
    const staff = await canManageClub(req.user, club._id);
    if (!staff && !(await isMember(club._id, req.user._id))) return res.status(403).json(FORBIDDEN);
    const polls = await ClubPoll.find({ club: club._id }).sort({ createdAt: -1 }).limit(SHOWN).lean();
    res.status(200).json({ polls: polls.map((p) => shape(p, req.user._id)) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch polls") });
  }
}

// Puts a line in every other member's bell. Best effort: the poll is already
// saved, so a problem here must never fail it.
async function notifyMembers(club, poll, creatorId) {
  try {
    const ids = (await ClubMembership.find({ club: club._id }).limit(2000).distinct("user")).filter((id) => String(id) !== String(creatorId));
    await pushNotifications(ids, { type: "club_poll", title: `New poll in ${club.name}: ${poll.question}`.slice(0, 200), link: `/clubs?club=${club._id}` });
  } catch (err) {
    console.error("Failed to notify members of a club poll:", err.message);
  }
}

// POST /api/clubs/:id/polls  { question, options[], days? }  (the club's leaders or an admin)
async function createClubPoll(req, res) {
  try {
    const club = await Club.findById(req.params.id).select("name");
    if (!club) return res.status(404).json({ message: "Club not found" });
    if (!(await canManageClub(req.user, club._id))) return res.status(403).json(FORBIDDEN);

    const { question, options, days, error } = cleanClubPoll(req.body);
    if (error) return res.status(400).json({ message: error });

    const now = new Date();
    const open = await ClubPoll.countDocuments({ club: club._id, closesAt: { $gt: now } });
    if (open >= MAX_OPEN) return res.status(400).json({ message: `This club already has ${MAX_OPEN} open polls. Close or remove one first.` });

    const closesAt = new Date(now.getTime() + days * DAY);
    const poll = await ClubPoll.create({
      club: club._id,
      createdBy: req.user._id,
      question,
      options: options.map((text) => ({ text, voters: [] })),
      closesAt,
      purgeAt: new Date(closesAt.getTime() + KEEP_AFTER_CLOSE),
    });
    await notifyMembers(club, poll, req.user._id);
    res.status(201).json({ message: "Poll started", poll: shape(poll, req.user._id) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to start the poll") });
  }
}

// POST /api/clubs/:id/polls/:pollId/vote  { option }  (members). Voting again moves your vote.
async function voteClubPoll(req, res) {
  try {
    const { id, pollId } = req.params;
    if (!mongoose.isValidObjectId(pollId)) return res.status(404).json({ message: "Poll not found" });
    const poll = await ClubPoll.findOne({ _id: pollId, club: id });
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    if (!(await isMember(poll.club, req.user._id))) return res.status(403).json({ message: "Join the club to vote" });
    if (new Date(poll.closesAt) <= new Date()) return res.status(400).json({ message: "This poll has closed" });

    const option = req.body?.option;
    if (!Number.isInteger(option) || option < 0 || option >= poll.options.length) return res.status(400).json({ message: "Pick one of the answers" });

    // Take any earlier vote back, then add the new one: one vote per member.
    await ClubPoll.updateOne({ _id: poll._id }, { $pull: { "options.$[].voters": req.user._id } });
    await ClubPoll.updateOne({ _id: poll._id }, { $addToSet: { [`options.${option}.voters`]: req.user._id } });
    const fresh = await ClubPoll.findById(poll._id).lean();
    res.status(200).json({ message: "Vote saved", poll: shape(fresh, req.user._id) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to save your vote") });
  }
}

// DELETE /api/clubs/:id/polls/:pollId  (the club's leaders or an admin)
async function deleteClubPoll(req, res) {
  try {
    const { id, pollId } = req.params;
    if (!mongoose.isValidObjectId(pollId)) return res.status(404).json({ message: "Poll not found" });
    const poll = await ClubPoll.findOne({ _id: pollId, club: id });
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    if (!(await canManageClub(req.user, poll.club))) return res.status(403).json(FORBIDDEN);
    await poll.deleteOne();
    res.status(200).json({ message: "Poll removed" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to remove the poll") });
  }
}

// POST /api/clubs/:id/polls/:pollId/close  (the club's leaders or an admin)
// Ends a poll now: the results stay for everyone, nobody can vote any more.
async function closeClubPoll(req, res) {
  try {
    const { id, pollId } = req.params;
    if (!mongoose.isValidObjectId(pollId)) return res.status(404).json({ message: "Poll not found" });
    const poll = await ClubPoll.findOne({ _id: pollId, club: id });
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    if (!(await canManageClub(req.user, poll.club))) return res.status(403).json(FORBIDDEN);
    const now = new Date();
    if (new Date(poll.closesAt) <= now) return res.status(400).json({ message: "This poll has already closed" });
    await ClubPoll.updateOne({ _id: poll._id }, { $set: { closesAt: now, purgeAt: new Date(now.getTime() + KEEP_AFTER_CLOSE) } });
    const fresh = await ClubPoll.findById(poll._id).lean();
    res.status(200).json({ message: "Poll closed", poll: shape(fresh, req.user._id) });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to close the poll") });
  }
}

module.exports = { getClubPolls, createClubPoll, voteClubPoll, deleteClubPoll, closeClubPoll, shape };
