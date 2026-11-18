// Finds the campus venue an event's location names, ignoring capitals and
// extra spaces. Returns the venue, or undefined.
export function findVenue(venues, location) {
  const key = String(location || "").trim().replace(/\s+/g, " ").toLowerCase();
  if (!key) return undefined;
  return (venues || []).find((v) => String(v.name || "").trim().toLowerCase() === key);
}
