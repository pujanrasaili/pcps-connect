// Month-grid helpers for the Events calendar view. Everything works in the
// viewer's local time, the same way the rest of the app shows dates, and weeks
// start on Sunday (the first day of the week in Nepal).

const pad = (n) => String(n).padStart(2, "0");

// "2027-03-05" for a local calendar day -- the key events are grouped under.
export function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Weeks (arrays of 7 cells) covering `month` (0-11) of `year`, padded with the
// neighbouring months' days so every row is full. Each cell carries the events
// starting that day, earliest first.
export function buildMonthGrid(year, month, events = []) {
  const byDay = new Map();
  for (const event of [...events].sort((a, b) => new Date(a.date) - new Date(b.date))) {
    const key = dayKey(event.date);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(event);
  }

  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay()); // back up to Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekCount = Math.ceil((first.getDay() + daysInMonth) / 7);

  const weeks = [];
  for (let w = 0; w < weekCount; w += 1) {
    const week = [];
    for (let d = 0; d < 7; d += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
      const key = dayKey(date);
      week.push({ date, key, day: date.getDate(), inMonth: date.getMonth() === month, events: byDay.get(key) || [] });
    }
    weeks.push(week);
  }
  return weeks;
}

// Month `offset` months away, handling year roll-over: shiftMonth(2026, 11, 1) -> { year: 2027, month: 0 }.
export function shiftMonth(year, month, offset) {
  const d = new Date(year, month + offset, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
