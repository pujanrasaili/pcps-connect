const Club = require("../models/Club");

const idOf = (v) => String(v && v._id ? v._id : v);

// Everyone who runs an event: the person who created it plus the leaders of
// the club that hosts it and of any co-hosting club. Admins usually create
// events, so without the leaders the people actually running them never hear
// things like "the event is full". Never throws; falls back to the creator.
async function organiserIds(event) {
  const ids = new Set();
  if (event.createdBy) ids.add(idOf(event.createdBy));
  try {
    const clubIds = [event.club, ...(event.coHosts || [])].filter(Boolean).map(idOf);
    if (clubIds.length) {
      const clubs = await Club.find({ _id: { $in: clubIds } }).select("+leaders");
      for (const club of clubs || []) for (const leader of club.leaders || []) ids.add(idOf(leader));
    }
  } catch (err) {
    console.error("Failed to look up event organisers:", err.message);
  }
  return [...ids];
}

module.exports = { organiserIds };
