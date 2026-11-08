// Checks the text of a club idea. Returns { body } (cleaned) or { error }.
const MAX_BODY = 300;
// Each member can have this many ideas waiting per club, so one person
// cannot fill a leader's inbox.
const MAX_PER_MEMBER = 3;

function cleanClubIdea(input = {}) {
  const raw = input.body;
  if (typeof raw !== "string") return { error: "Write your idea first" };
  const body = raw.trim();
  if (!body) return { error: "Write your idea first" };
  if (body.length > MAX_BODY) return { error: `An idea must be ${MAX_BODY} characters or fewer` };
  return { body };
}

module.exports = { cleanClubIdea, MAX_BODY, MAX_PER_MEMBER };
