const Club = require("../models/Club");

// Who may manage a club's events: admins (everything) and the students an
// admin has named as leaders of that club (only that club). A leader has no
// reach beyond their own clubs' events -- not users, other clubs, or the
// audit log.

const isAdmin = (user) => user?.role === "admin";

async function leadsClub(user, clubId) {
  if (!user?._id || !clubId) return false;
  return !!(await Club.exists({ _id: clubId, leaders: user._id }));
}

async function canManageClub(user, clubId) {
  return isAdmin(user) || (await leadsClub(user, clubId));
}

// `event.club` and the `event.coHosts` entries may be populated documents or bare ids.
// A leader of the main club or of any co-hosting club can manage the event.
async function canManageEvent(user, event) {
  if (isAdmin(user)) return true;
  const ids = [event?.club, ...(event?.coHosts || [])].map((c) => c?._id || c).filter(Boolean);
  for (const id of ids) {
    if (await leadsClub(user, id)) return true;
  }
  return false;
}

async function ledClubs(user) {
  return Club.find({ leaders: user._id }).select("name").sort({ name: 1 });
}

module.exports = { isAdmin, leadsClub, canManageClub, canManageEvent, ledClubs };
