// Finds the campus venue an event's location names, ignoring capitals and
// extra spaces. Returns the venue, or undefined.
export function findVenue(venues, location) {
  const key = String(location || "").trim().replace(/\s+/g, " ").toLowerCase();
  if (!key) return undefined;
  return (venues || []).find((v) => String(v.name || "").trim().toLowerCase() === key);
}

// The event as calendar apps should get it: when its location is a known venue
// with directions, they are added to the description so they travel with the
// invite. Returns the same event object when there is nothing to add.
export function withVenueDirections(event, venue) {
  if (!event || !venue?.directions) return event;
  const note = `How to find it: ${venue.directions}`;
  return { ...event, description: event.description ? `${event.description}\n\n${note}` : note };
}
