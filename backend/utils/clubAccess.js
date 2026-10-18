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

// `event.club` may be a populated document or a bare id.
async function canManageEvent(user, event) {
  if (isAdmin(user)) return true;
  const clubId = event?.club?._id || event?.club;
  return leadsClub(user, clubId);
}

async function ledClubs(user) {
  return Club.find({ leaders: user._id }).select("name").sort({ name: 1 });
}

module.exports = { isAdmin, leadsClub, canManageClub, canManageEvent, ledClubs };
