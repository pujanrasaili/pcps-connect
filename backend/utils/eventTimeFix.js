// One-off repair for events saved before the time-zone fix: the admin form used
// to send "10:00" with no zone, the server read it as 10:00 UTC, so a Nepal
// organiser's 10:00 was stored as 15:45 Nepal time -- 5h45m too late.
// Shifting those events back by 345 minutes restores what was typed.
const NEPAL_OFFSET_MINUTES = 345;

// Turns --before / --minutes style options into a plan.
//  cutoff:  only events CREATED before this moment are touched (events made
//           after the fix are already right, and shifting them would break them)
function parseFixOptions(args = []) {
  const get = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const before = get("--before");
  if (!before) return { error: "Give the moment the fix went live: --before 2026-10-26T04:00:00Z (events created before it are shifted)." };
  const cutoff = new Date(before);
  if (Number.isNaN(cutoff.getTime())) return { error: `"${before}" is not a valid date/time.` };
  const minutesRaw = get("--minutes");
  const minutes = minutesRaw === undefined ? NEPAL_OFFSET_MINUTES : Number(minutesRaw);
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 24 * 60) return { error: "--minutes must be a whole number between 1 and 1440." };
  return { cutoff, minutes, apply: args.includes("--yes") };
}

// For each event that was created before the cutoff, the corrected date (and
// deadline, if it has one). Events with no creation time are left alone.
function planEventTimeFix(events, { cutoff, minutes }) {
  const shift = (d) => new Date(new Date(d).getTime() - minutes * 60 * 1000);
  return events
    .filter((e) => e.createdAt && new Date(e.createdAt) < cutoff)
    .map((e) => ({
      id: e._id,
      title: e.title,
      from: new Date(e.date),
      to: shift(e.date),
      deadlineTo: e.registrationDeadline ? shift(e.registrationDeadline) : null,
    }));
}

module.exports = { parseFixOptions, planEventTimeFix, NEPAL_OFFSET_MINUTES };
