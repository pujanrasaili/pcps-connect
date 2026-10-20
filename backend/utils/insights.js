// Pure helpers for the admin "Insights" card. Months are calendar months in
// UTC, matching how MongoDB's $year/$month group dates.

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The last `count` calendar months ending with `now`'s month, oldest first.
function lastMonths(now = new Date(), count = 6) {
  const months = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const month = d.getUTCMonth() + 1;
    months.push({ year: d.getUTCFullYear(), month, key: `${d.getUTCFullYear()}-${String(month).padStart(2, "0")}`, label: MONTH_LABELS[month - 1] });
  }
  return months;
}

// Turns the $group output ([{ _id: { y, m }, count }]) into one entry per
// month in the window, with 0 for months nobody registered in.
function fillMonthly(rows, now = new Date(), count = 6) {
  const byKey = new Map(rows.map((r) => [`${r._id.y}-${String(r._id.m).padStart(2, "0")}`, r.count]));
  return lastMonths(now, count).map(({ key, label }) => ({ month: key, label, count: byKey.get(key) || 0 }));
}

// Joins membership counts to club names, keeping the counts' order. Clubs that
// were deleted since (no matching name) are dropped rather than shown blank.
function rankClubs(counts, clubs) {
  const names = new Map(clubs.map((c) => [String(c._id), c.name]));
  return counts
    .filter((c) => names.has(String(c._id)))
    .map((c) => ({ _id: c._id, name: names.get(String(c._id)), members: c.members }));
}

module.exports = { lastMonths, fillMonthly, rankClubs };
