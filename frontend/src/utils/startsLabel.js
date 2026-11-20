const DAY = 24 * 3600000;
const SOON_DAYS = 7;

function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// How soon an event is, in the viewer's own calendar days: { key, n } for the
// translator, or null when it has started (the app treats a started event as
// past) or is more than a week away (a date that far off is already on the
// card). Days are counted by the calendar, so 11 pm tonight and 1 am tomorrow
// are one day apart, not "in 2 hours".
export function startsLabel(event, now = new Date()) {
  const start = new Date(event?.date).getTime();
  if (Number.isNaN(start)) return null;
  const t = now.getTime();
  if (t >= start) return null;
  const days = Math.round((startOfDay(start) - startOfDay(t)) / DAY);
  if (days <= 0) return { key: "Starts today" };
  if (days === 1) return { key: "Starts tomorrow" };
  if (days <= SOON_DAYS) return { key: "Starts in {n} days", n: days };
  return null;
}
