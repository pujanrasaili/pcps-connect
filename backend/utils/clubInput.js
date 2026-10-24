// Server-side checks for the club fields an admin submits. Same idea as
// eventInput.js: the form's checks are not a security boundary, and without
// this a missing name or an absurdly long description became a vague 500 (or
// was stored as-is). Only fields that are present are checked, so it serves
// both create (caller requires name/category/description) and edit.

const LIMITS = {
  name: 100,
  category: 50,
  description: 500,
  longDescription: 5000,
  image: 500,
  icon: 50,
  leadName: 100,
  leadRole: 100,
  email: 254,
  foundedYear: 10,
};
const LABELS = {
  name: "Club name",
  category: "Category",
  description: "Short description",
  longDescription: "Full description",
  image: "Image URL",
  icon: "Icon",
  leadName: "Lead name",
  leadRole: "Lead role",
  email: "Email",
  foundedYear: "Founded year",
};
const REQUIRED_TEXT = ["name", "category", "description"];
const MAX_ACTIVITIES = 30;
const MAX_ACTIVITY_LENGTH = 200;

function validateClubFields(body = {}) {
  for (const [field, max] of Object.entries(LIMITS)) {
    let value = body[field];
    if (value === undefined || (value === null && !REQUIRED_TEXT.includes(field))) continue;
    if (field === "foundedYear" && typeof value === "number") value = String(value);
    if (typeof value !== "string") return `${LABELS[field]} must be text`;
    if (REQUIRED_TEXT.includes(field) && value.trim() === "") return `${LABELS[field]} can't be empty`;
    if (value.length > max) return `${LABELS[field]} must be ${max} characters or fewer`;
  }

  if (body.activities !== undefined) {
    if (!Array.isArray(body.activities) || body.activities.some((a) => typeof a !== "string")) {
      return "Activities must be a list of text lines";
    }
    if (body.activities.length > MAX_ACTIVITIES) return `Add at most ${MAX_ACTIVITIES} activities`;
    if (body.activities.some((a) => a.length > MAX_ACTIVITY_LENGTH)) {
      return `Each activity must be ${MAX_ACTIVITY_LENGTH} characters or fewer`;
    }
  }

  return null;
}

module.exports = { validateClubFields, LIMITS };
