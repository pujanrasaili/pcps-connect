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
