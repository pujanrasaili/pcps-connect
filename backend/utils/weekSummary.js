// Pure helpers for the admin "Last 7 days" card: the two back-to-back
// 7-day windows being compared, and how the latest one moved.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// `now` is the end of the latest window; `prevStart` is 14 days back.
function weekWindows(now = new Date()) {
  const end = now.getTime();
  return {
    thisStart: new Date(end - WEEK_MS),
    prevStart: new Date(end - 2 * WEEK_MS),
    now: new Date(end),
    nextWeekEnd: new Date(end + WEEK_MS),
  };
}

// { current, previous, change } where change is the whole-number percent move,
// or null when there is nothing to compare against (previous week was 0).
function trend(current, previous) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  return { current: cur, previous: prev, change: prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null };
}

module.exports = { WEEK_MS, weekWindows, trend };
