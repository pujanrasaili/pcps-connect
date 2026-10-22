const MAX_LENGTH = 200;
const TONES = ["info", "warning"];

// Turns an admin's form input into what gets stored.
//  - blank message  -> { clear: true }   (remove the banner)
//  - otherwise      -> { message, tone } or { error }
// JSON can carry any type, so non-text input is rejected rather than coerced.
function cleanNotice(body) {
  const { message, tone } = body || {};
  if (message !== undefined && typeof message !== "string") return { error: "Notice must be text" };
  if (tone !== undefined && !TONES.includes(tone)) return { error: "Tone must be info or warning" };
  const text = (message || "").replace(/\s+/g, " ").trim();
  if (!text) return { clear: true };
  if (text.length > MAX_LENGTH) return { error: `Notice must be ${MAX_LENGTH} characters or fewer` };
  return { message: text, tone: tone || "info" };
}

module.exports = { cleanNotice, MAX_LENGTH, TONES };
