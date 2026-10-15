const Registration = require("../models/Registration");

// Validates a capacity value sent from the client. Returns the parsed
// positive integer, or null if invalid. (Moved here from eventController so
// the admin routes can share it -- they used to pass the raw request body
// straight to the database and skipped this check entirely.)
function parseCapacity(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

// Returns an error message if lowering an event's capacity to `capacity`
// would leave it with more registered students than seats, otherwise null.
// Without this an admin could shrink a 50-seat event to 10 while 40 people
// are signed up, leaving the event permanently "over capacity" with a
// progress bar past 100%.
async function capacityConflict(eventId, capacity) {
  const registered = await Registration.countDocuments({ event: eventId });
  if (capacity < registered) {
    return `Capacity can't be lower than the ${registered} student(s) already registered`;
  }
  return null;
}

module.exports = { parseCapacity, capacityConflict };
