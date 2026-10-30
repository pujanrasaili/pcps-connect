// Server-side checks for the text, date and capacity an organiser submits when
// creating or editing an event. The form has its own checks, but those are not
// a security boundary -- a direct API call skips them. Without this a date like
// "banana" came back as a vague 500, and titles and descriptions of any length
// were stored.
//
// Returns an error message to send back with a 400, or null if the fields that
// are present are fine. Fields that were not sent are not checked, so the same
// function serves both "create" (the caller already requires the main fields)
// and "edit" (only what changed is sent).

const LIMITS = { title: 150, description: 5000, location: 200, category: 50, price: 50 };
const LABELS = { title: "Title", description: "Description", location: "Location", category: "Category", price: "Price" };
const REQUIRED_TEXT = ["title", "description", "location"];
const MAX_CAPACITY = 100000;

function validateEventFields(body = {}) {
  for (const [field, max] of Object.entries(LIMITS)) {
    const value = body[field];
    if (value === undefined) continue;
    if (typeof value !== "string") return `${LABELS[field]} must be text`;
    if (REQUIRED_TEXT.includes(field) && value.trim() === "") return `${LABELS[field]} can't be empty`;
    if (value.length > max) return `${LABELS[field]} must be ${max} characters or fewer`;
  }

  if (body.date !== undefined) {
    const parsed = new Date(body.date);
    if (typeof body.date === "object" && !(body.date instanceof Date)) return "Enter a valid date and time";
    if (Number.isNaN(parsed.getTime())) return "Enter a valid date and time";
  }

  if (body.capacity !== undefined && body.capacity !== null && body.capacity !== "") {
    const n = Number(body.capacity);
    if (Number.isInteger(n) && n > MAX_CAPACITY) return `Capacity can't be more than ${MAX_CAPACITY.toLocaleString("en-US")}`;
  }

  return null;
}

// A blank category (an edit that cleared the box, or only spaces) would show as
// an empty label on cards and the dashboard, so it falls back to "General" --
// the same default a new event gets.
function cleanCategory(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || "General";
}

module.exports = { validateEventFields, cleanCategory, LIMITS, MAX_CAPACITY };
