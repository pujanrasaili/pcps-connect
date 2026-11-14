const ClubMembership = require("../models/ClubMembership");
const { pushNotifications } = require("./inApp");

// When a club's regular meetings line changes to something new, its members get
// a bell message. Clearing the line, or saving it unchanged, tells nobody.
// Best-effort like every notification here: it never throws. Returns how many
// members were told.
async function notifyMeetingChange(club, previousMeetings) {
  try {
    const now = String(club?.meetings || "").trim();
    if (!now || now === String(previousMeetings || "").trim()) return 0;
    const members = await ClubMembership.find({ club: club._id }).select("user");
    return await pushNotifications(
      members.map((m) => m.user),
      { type: "club_meetings", title: `${club.name} updated its meeting time`, link: `/clubs?club=${club._id}` }
    );
  } catch (err) {
    console.error("Failed to notify about the meeting change:", err.message);
    return 0;
  }
}

module.exports = { notifyMeetingChange };
