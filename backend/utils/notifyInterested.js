const User = require("../models/User");
const ClubMembership = require("../models/ClubMembership");
const { pushNotifications } = require("./inApp");

// Students pick topics in Settings ("workshop", "technology"...). When a new
// event in one of them is announced they get a bell message -- unless they
// already heard because they belong to a hosting club (`hostClubIds`), or they
// turned club updates off. The default "General" category matches nothing: it
// isn't a topic anyone chooses. Best-effort like every notification here: it
// never throws, so a failed lookup can't turn "event created" into an error.
// Returns how many students were told.
async function notifyInterestedStudents(event, hostClubIds = []) {
  try {
    const topic = String(event?.category || "").trim().toLowerCase();
    if (!topic || topic === "general") return 0;

    const users = await User.find({
      interests: topic,
      approvalStatus: "approved",
      clubUpdates: { $ne: false },
    }).select("_id");
    if (users.length === 0) return 0;

    let skip = new Set();
    const hosts = (hostClubIds || []).filter(Boolean);
    if (hosts.length > 0) {
      const members = await ClubMembership.find({ club: { $in: hosts } }).select("user");
      skip = new Set(members.map((m) => String(m.user)));
    }

    return await pushNotifications(
      users.map((u) => u._id).filter((id) => !skip.has(String(id))),
      {
        type: "interest_event",
        title: `New ${event.category} event: ${event.title}`,
        link: event._id ? `/events/${event._id}` : "/events",
      }
    );
  } catch (err) {
    console.error("Failed to notify interested students:", err.message);
    return 0;
  }
}

module.exports = { notifyInterestedStudents };
