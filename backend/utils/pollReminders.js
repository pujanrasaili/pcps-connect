// A bell reminder for club polls that are about to close: members who have not
// voted yet get one message. It is called by the daily reminder job
// (scripts/sendEventReminders.js) and looks at polls closing in the next 24
// hours. Each poll is claimed first (`reminded`), so it is sent once even if
// the job runs twice. Bell only, no email. Never says who voted.
const ClubPoll = require("../models/ClubPoll");
const ClubMembership = require("../models/ClubMembership");
const { pushNotifications } = require("./inApp");

const DAY_MS = 24 * 60 * 60 * 1000;

async function remindPollVoters(now = new Date()) {
  const soon = await ClubPoll.find({
    closesAt: { $gt: now, $lte: new Date(now.getTime() + DAY_MS) },
    reminded: { $ne: true },
  })
    .select("club question options.voters")
    .populate("club", "name");

  let total = 0;
  for (const poll of soon || []) {
    // Claim it; if another run got there first, skip.
    const claimed = await ClubPoll.findOneAndUpdate({ _id: poll._id, reminded: { $ne: true } }, { $set: { reminded: true } });
    if (!claimed) continue;
    const members = await ClubMembership.find({ club: poll.club?._id || poll.club }).select("user");
    const voted = new Set((poll.options || []).flatMap((o) => (o.voters || []).map(String)));
    const targets = (members || []).map((m) => String(m.user)).filter((id) => !voted.has(id));
    total += await pushNotifications(targets, {
      type: "club_poll_closing",
      title: `Poll closing soon in ${poll.club?.name || "your club"}: ${poll.question}`,
      link: `/clubs?club=${poll.club?._id || poll.club}`,
    });
  }
  return total;
}

module.exports = { remindPollVoters };
