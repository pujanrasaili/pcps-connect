// A running tally for the Check-in page: who has been scanned since the page
// was opened. It lives only in the page (a refresh starts a new tally); the
// attendance itself is saved on the server by each scan.
const MAX_ENTRIES = 50;

// Adds one scan result ({ alreadyCheckedIn, student, event }) to the front of
// the log. Scanning the same student for the same event again moves them to the
// top instead of listing them twice.
export function addScan(log = [], result, now = new Date()) {
  if (!result?.student) return log;
  const key = `${result.student.studentId || result.student.name}|${result.event?.title || ""}`;
  const entry = {
    key,
    name: result.student.name,
    studentId: result.student.studentId || "",
    event: result.event?.title || "",
    // Stays true once someone was newly checked in during this session, even if
    // the same code is scanned again a moment later.
    newlyCheckedIn: !result.alreadyCheckedIn || log.some((e) => e.key === key && e.newlyCheckedIn),
    at: now.toISOString(),
  };
  return [entry, ...log.filter((e) => e.key !== key)].slice(0, MAX_ENTRIES);
}

export function sessionCounts(log = []) {
  const checkedIn = log.filter((e) => e.newlyCheckedIn).length;
  return { checkedIn, repeats: log.length - checkedIn };
}
