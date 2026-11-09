// Checks the volunteer roles an organiser submits for an event.
const MAX_ROLES = 5;
const MAX_NAME = 40;
const MAX_SLOTS = 50;

// Returns { value: [{ _id?, name, slots }] } or { error }. An empty list is
// fine (it switches volunteering off). An _id is kept so a role that is only
// renamed or resized keeps its sign-ups.
function cleanRoles(body = {}) {
  const roles = body.roles;
  if (!Array.isArray(roles)) return { error: "Roles must be a list" };
  if (roles.length > MAX_ROLES) return { error: `An event can have at most ${MAX_ROLES} volunteer roles` };
  const out = [];
  const seen = new Set();
  for (const r of roles) {
    if (!r || typeof r !== "object") return { error: "Each role needs a name and a number of places" };
    const name = typeof r.name === "string" ? r.name.trim().replace(/\s+/g, " ") : "";
    if (!name) return { error: "Each role needs a name" };
    if (name.length > MAX_NAME) return { error: `A role name must be ${MAX_NAME} characters or fewer` };
    if (seen.has(name.toLowerCase())) return { error: "Two roles can't have the same name" };
    seen.add(name.toLowerCase());
    const slots = Number(r.slots);
    if (!Number.isInteger(slots) || slots < 1 || slots > MAX_SLOTS) {
      return { error: `Places for a role must be a whole number from 1 to ${MAX_SLOTS}` };
    }
    const item = { name, slots };
    if (r._id) item._id = String(r._id);
    out.push(item);
  }
  return { value: out };
}

module.exports = { cleanRoles, MAX_ROLES, MAX_NAME, MAX_SLOTS };
