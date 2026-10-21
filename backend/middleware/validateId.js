// A MongoDB id is exactly 24 hex characters. Anything else (a typo in a link,
// "undefined", a probing request) can never match a record, so answer 404
// straight away instead of letting the database throw a cast error (which
// would surface as a 500 and a noisy log line).
//
// Not mongoose.isValidObjectId: that also accepts any 12-character string.
const OBJECT_ID = /^[a-fA-F0-9]{24}$/;

function isObjectId(value) {
  return typeof value === "string" && OBJECT_ID.test(value);
}

// For router.param("id", validateIdParam): runs before any route that has that
// parameter, so no controller needs its own check.
function validateIdParam(req, res, next, value) {
  if (!isObjectId(value)) return res.status(404).json({ message: "Not found" });
  next();
}

module.exports = { isObjectId, validateIdParam };
