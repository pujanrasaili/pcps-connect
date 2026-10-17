const { ratingSummary } = require("./ratingSummary");

// Percentage rounded to a whole number; null when there is nothing to divide
// by, so the UI shows "—" instead of a misleading 0%.
function percent(part, whole) {
  return whole ? Math.round((part / whole) * 100) : null;
}

// Merges past events with the per-event totals from the registrations
// aggregation into what the admin overview shows: one row per event plus
// overall turnout and rating across all of them. Events nobody registered
// for still appear (with zeros) so they aren't silently hidden.
function buildAttendanceReport(events, stats) {
  const byEvent = new Map(stats.map((s) => [String(s._id), s]));
  let registered = 0;
  let attended = 0;
  let ratingSum = 0;
  let ratingCount = 0;

  const rows = events.map((event) => {
    const s = byEvent.get(String(event._id)) || {};
    const reg = s.registered || 0;
    const att = s.attended || 0;
    registered += reg;
    attended += att;
    ratingSum += s.ratingSum || 0;
    ratingCount += s.ratingCount || 0;
    return {
      _id: event._id,
      title: event.title,
      date: event.date,
      registered: reg,
      attended: att,
      noShows: reg - att,
      attendanceRate: percent(att, reg),
      ...ratingSummary(s.ratingSum || 0, s.ratingCount || 0),
    };
  });

  return {
    events: rows,
    totals: {
      registered,
      attended,
      attendanceRate: percent(attended, registered),
      ...ratingSummary(ratingSum, ratingCount),
    },
  };
}

module.exports = { buildAttendanceReport, percent };
