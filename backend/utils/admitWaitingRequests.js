const ClubMembership = require("../models/ClubMembership");
const ClubJoinRequest = require("../models/ClubJoinRequest");
const { notifyStudentOfDecision } = require("./clubJoinNotices");

// A club that stops approving its members has nobody left to approve the
// students already waiting, so they would be stuck. Let them in: each waiting
// request becomes a membership and the student is told, as for an approval.
// Best-effort: it never throws, so saving the club can't fail because of it.
async function admitWaitingRequests(club) {
  try {
    const waiting = await ClubJoinRequest.find({ club: club._id }).populate("user", "name email");
    let admitted = 0;
    for (const request of waiting) {
      try {
        if (request.user) {
          try {
            await ClubMembership.create({ user: request.user._id, club: club._id });
          } catch (err) {
            if (err.code !== 11000) throw err; // already a member -- fine
          }
        }
        await ClubJoinRequest.deleteOne({ _id: request._id });
        if (request.user) {
          await notifyStudentOfDecision(request.user, club, true);
          admitted += 1;
        }
      } catch (err) {
        console.error("Failed to admit a waiting join request:", err.message);
      }
    }
    return admitted;
  } catch (err) {
    console.error("Failed to admit waiting join requests:", err.message);
    return 0;
  }
}

module.exports = { admitWaitingRequests };
