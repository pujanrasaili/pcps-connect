// Errors that come from the CLIENT's request itself (not from our code), so
// they should be answered with a short, honest 4xx instead of "Server error"
// plus a stack trace in the logs.
//
// body-parser (express.json) marks them with `type`:
//   entity.parse.failed  -- the body wasn't valid JSON
//   entity.too.large     -- the body was bigger than the limit
// Returns { status, message } for those, or null for anything else.
function clientRequestError(err) {
  if (err?.type === "entity.parse.failed") return { status: 400, message: "The request body is not valid JSON" };
  if (err?.type === "entity.too.large") return { status: 413, message: "The request is too large" };
  return null;
}

module.exports = { clientRequestError };
