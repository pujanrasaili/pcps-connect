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
      club: event.club?.name || "",
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

// The optional ?from= and ?to= of the report: any date the browser can send
// (the page sends the start and end of the chosen days in the viewer's own time
// zone). Returns { from, to } with a Date or null for each end, or
// { error } when a date is not a date or the end comes before the start.
function reportRange(query = {}) {
  const read = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? undefined : d;
  };
  const from = read(query.from);
  const to = read(query.to);
  if (from === undefined || to === undefined) return { error: "Choose valid dates for the report." };
  if (from && to && to < from) return { error: "The end date must not be before the start date." };
  return { from, to };
}

module.exports = { buildAttendanceReport, percent, reportRange };
