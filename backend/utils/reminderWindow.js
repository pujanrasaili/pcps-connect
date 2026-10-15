// "Next 24 hours from now" rather than "tomorrow" by calendar date -- stays
// correct no matter what time of day the daily schedule actually runs, or
// if a run is skipped/delayed by a few hours. Pulled out of
// scripts/sendEventReminders.js so the boundary math has a unit test
// instead of only being exercised by a real cron run against a real DB.
function getReminderWindow(now = new Date()) {
  return { start: now, end: new Date(now.getTime() + 24 * 60 * 60 * 1000) };
}

module.exports = { getReminderWindow };
