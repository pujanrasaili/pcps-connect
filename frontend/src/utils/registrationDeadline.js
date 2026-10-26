// Mirrors the server's rule (backend/utils/registrationDeadline.js): once an
// event's optional deadline has passed, nobody new can register or queue.
export function isRegistrationClosed(event, now = new Date()) {
  if (!event?.registrationDeadline) return false;
  const deadline = new Date(event.registrationDeadline).getTime();
  return !Number.isNaN(deadline) && now.getTime() > deadline;
}

// True when a deadline exists and hasn't passed yet.
export function hasOpenDeadline(event, now = new Date()) {
  return !!event?.registrationDeadline && !isRegistrationClosed(event, now);
}

// "Registration closes in 5 hours" / "in 2 days" when the deadline is close
// (within 3 days), so students who are undecided get a nudge. Null otherwise.
export function deadlineSoonLabel(event, now = new Date()) {
  if (!hasOpenDeadline(event, now)) return null;
  const msLeft = new Date(event.registrationDeadline).getTime() - now.getTime();
  const hours = Math.ceil(msLeft / 3600000);
  if (hours > 72) return null;
  if (hours <= 1) return "Registration closes within the hour";
  if (hours < 24) return `Registration closes in ${hours} hours`;
  const days = Math.ceil(hours / 24);
  return days === 1 ? "Registration closes in 1 day" : `Registration closes in ${days} days`;
}
