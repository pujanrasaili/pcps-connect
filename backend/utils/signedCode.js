const crypto = require("crypto");

// Stateless signed codes shared by check-in QR codes and attendance
// certificates: "<registrationId>.<signature>", where the signature is an
// HMAC of the id keyed with the server's JWT_SECRET. `purpose` is mixed into
// the HMAC so a code issued for one use (say a check-in QR) can never be
// accepted for another (a certificate), even though both name the same
// registration. Nothing is stored, so existing registrations just work.
function sign(purpose, registrationId) {
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`${purpose}:${registrationId}`)
    .digest("base64url")
    .slice(0, 22);
}

function createSignedCode(purpose, registrationId) {
  const id = String(registrationId);
  return `${id}.${sign(purpose, id)}`;
}

// Returns the registration id if the code is genuine for this purpose,
// otherwise null.
function verifySignedCode(purpose, code) {
  if (typeof code !== "string") return null;
  const parts = code.trim().split(".");
  if (parts.length !== 2) return null;
  const [id, signature] = parts;
  if (!/^[a-f\d]{24}$/i.test(id)) return null;

  const expected = Buffer.from(sign(purpose, id));
  const given = Buffer.from(signature);
  if (expected.length !== given.length) return null;
  return crypto.timingSafeEqual(expected, given) ? id : null;
}

module.exports = { createSignedCode, verifySignedCode };
