// Checks the text of a club news post. Returns { body } (cleaned) or { error }.
const MAX_BODY = 1000;

function cleanClubPost(input = {}) {
  const raw = input.body;
  if (typeof raw !== "string") return { error: "Write something to post" };
  const body = raw.trim();
  if (!body) return { error: "Write something to post" };
  if (body.length > MAX_BODY) return { error: `A post must be ${MAX_BODY} characters or fewer` };
  return { body };
}

module.exports = { cleanClubPost, MAX_BODY };
