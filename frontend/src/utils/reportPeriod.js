// The optional period of the attendance report download. The two <input
// type="date"> values ("2026-01-15", or "" for open-ended) become the start of
// the first day and the end of the last day in the viewer's own time zone, so a
// late-evening event on the last day is still included. Returns { params } for
// the request, or { error: "order" } when the end is before the start.
export function reportPeriod(from, to) {
  const start = from ? new Date(`${from}T00:00:00`) : null;
  const end = to ? new Date(`${to}T23:59:59.999`) : null;
  if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) return { error: "invalid" };
  if (start && end && end < start) return { error: "order" };
  const params = { all: 1 };
  if (start) params.from = start.toISOString();
  if (end) params.to = end.toISOString();
  return { params };
}

// "attendance-report-2026-11-21" for everything, or with the period spelled out
// so several downloads in a folder can be told apart.
export function reportFileName(today, from, to) {
  const period = from || to ? `-${from || "start"}-to-${to || "today"}` : "";
  return `attendance-report-${today}${period}.csv`;
}
