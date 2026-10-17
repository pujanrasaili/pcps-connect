const crypto = require("crypto");

// A student's personal check-in code is "<registrationId>.<signature>", where
// the signature is an HMAC of the registration id keyed with the server's
// JWT_SECRET. Nothing is stored: any code the server didn't issue fails
// verification, so a student can't make up a code for someone else's
// registration, and existing registrations work without a migration.
function sign(registrationId) {
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`check-in:${registrationId}`)
    .digest("base64url")
    .slice(0, 22);
}

function createCheckInCode(registrationId) {
  const id = String(registrationId);
  return `${id}.${sign(id)}`;
}

// Returns the registration id if the code is genuine, otherwise null.
function verifyCheckInCode(code) {
  if (typeof code !== "string") return null;
  const parts = code.trim().split(".");
  if (parts.length !== 2) return null;
  const [id, signature] = parts;
  if (!/^[a-f\d]{24}$/i.test(id)) return null;

  const expected = Buffer.from(sign(id));
  const given = Buffer.from(signature);
  if (expected.length !== given.length) return null;
  return crypto.timingSafeEqual(expected, given) ? id : null;
}

module.exports = { createCheckInCode, verifyCheckInCode };
