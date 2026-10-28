// bcrypt only uses the first 72 BYTES of a password and silently ignores the
// rest, so two long passwords that differ only after byte 72 would be treated
// as the same one. Rejecting them up front is honest: the user is told, rather
// than believing a 100-character passphrase is fully checked.
const MIN_LENGTH = 8;
const MAX_BYTES = 72;

// Returns an error message (without a leading label, so callers can prefix),
// or null if the password is acceptable.
function passwordProblem(password) {
  if (typeof password !== "string") return "must be text";
  if (password.length < MIN_LENGTH) return `must be at least ${MIN_LENGTH} characters`;
  if (Buffer.byteLength(password, "utf8") > MAX_BYTES) return `must be ${MAX_BYTES} bytes or fewer (about ${MAX_BYTES} characters)`;
  return null;
}

module.exports = { passwordProblem, MIN_LENGTH, MAX_BYTES };
