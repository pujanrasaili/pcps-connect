const MAX_NAME = 60;
const MAX_DIRECTIONS = 200;

// Checks what an admin types for a venue. Returns { name, nameKey, directions } or { error }.
function cleanVenue(input = {}) {
  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2) return { error: "A venue needs a name" };
  if (name.length > MAX_NAME) return { error: `A venue name must be ${MAX_NAME} characters or fewer` };
  let directions = "";
  if (input.directions !== undefined && input.directions !== null) {
    if (typeof input.directions !== "string") return { error: "The directions must be text" };
    directions = input.directions.trim();
    if (directions.length > MAX_DIRECTIONS) return { error: `The directions must be ${MAX_DIRECTIONS} characters or fewer` };
  }
  return { name, nameKey: name.toLowerCase(), directions };
}

module.exports = { cleanVenue, MAX_NAME, MAX_DIRECTIONS };
