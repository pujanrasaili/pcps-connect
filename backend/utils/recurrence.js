// "Repeat this event" when creating one: a weekly or fortnightly series, e.g. a
// club's Thursday meetup for the next 8 weeks. Each occurrence is its own normal
// event (own seats, registrations, ratings), so everything else works unchanged.
//
// Nepal has no daylight saving, so a fixed 7 or 14 days keeps the same clock
// time. The registration deadline, if any, moves by the same amount.

const DAY_MS = 24 * 60 * 60 * 1000;
const STEP_DAYS = { weekly: 7, biweekly: 14 };
const MAX_OCCURRENCES = 12;

// Returns { dates: [Date, ...] } (the first is the event's own date) or
// { error }. No repeat asked for -> a single date.
function planOccurrences(firstDate, repeat, count) {
  const start = new Date(firstDate);
  if (Number.isNaN(start.getTime())) return { error: "Enter a valid date and time" };
  if (repeat === undefined || repeat === null || repeat === "" || repeat === "none") return { dates: [start] };
  if (typeof repeat !== "string" || !STEP_DAYS[repeat]) return { error: "Repeat must be weekly or every two weeks" };

  const total = Number(count);
  if (!Number.isInteger(total) || total < 2 || total > MAX_OCCURRENCES) {
    return { error: `Choose between 2 and ${MAX_OCCURRENCES} events for a repeating series` };
  }
  const step = STEP_DAYS[repeat] * DAY_MS;
  return { dates: Array.from({ length: total }, (_, i) => new Date(start.getTime() + i * step)) };
}

module.exports = { planOccurrences, MAX_OCCURRENCES, STEP_DAYS };
