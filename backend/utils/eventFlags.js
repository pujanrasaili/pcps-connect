// Event forms arrive as multipart/form-data, where a checkbox is the string
// "true" or "false" rather than a boolean. Returns true/false for anything that
// clearly says so, and undefined when the field wasn't sent (so an edit that
// doesn't mention it leaves it alone).
function parseFlag(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;
  const text = String(value).trim().toLowerCase();
  if (["true", "1", "on", "yes"].includes(text)) return true;
  if (["false", "0", "off", "no", ""].includes(text)) return false;
  return undefined;
}

module.exports = { parseFlag };
