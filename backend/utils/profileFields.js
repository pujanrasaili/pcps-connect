// Validates and cleans the student-profile fields that registration and
// "edit profile" both accept. The database schema puts no length limit on
// any of them, so without this a direct API call could store a name that is
// megabytes long -- which then gets copied into emails, the admin lists, CSV
// exports and the printed certificate.
const LIMITS = { name: 80, studentId: 30, program: 80, semester: 20, phone: 20 };
const TEXT_FIELDS = Object.keys(LIMITS);
const FLAG_FIELDS = ["eventReminders", "clubUpdates"];
const AVATAR_MAX = 500;
const LANGUAGES = ["en", "ne"];
const MAX_INTERESTS = 5;
const INTEREST_MAX = 50;

const LABELS = {
  name: "Name",
  studentId: "Student ID",
  program: "Program",
  semester: "Semester",
  phone: "Phone",
  avatar: "Avatar",
};

// Returns { values } with only the fields that were supplied (trimmed), or
// { error } with a message that is safe to show the student. null/undefined
// mean "not supplied".
function cleanProfileFields(input = {}) {
  const values = {};

  for (const field of TEXT_FIELDS) {
    const raw = input[field];
    if (raw === undefined || raw === null) continue;
    if (typeof raw !== "string") return { error: `${LABELS[field]} must be text` };
    const text = raw.trim();
    if (field === "name" && !text) return { error: "Name can't be empty" };
    if (text.length > LIMITS[field]) {
      return { error: `${LABELS[field]} must be ${LIMITS[field]} characters or fewer` };
    }
    values[field] = text;
  }

  if (input.avatar !== undefined && input.avatar !== null) {
    if (typeof input.avatar !== "string") return { error: "Avatar must be text" };
    const avatar = input.avatar.trim();
    // Only an https image link (or empty, to go back to the default). Stops
    // data:/javascript: URLs and plain-http links being stored.
    if (avatar && (avatar.length > AVATAR_MAX || !/^https:\/\/\S+$/i.test(avatar))) {
      return { error: "Avatar must be an https link of 500 characters or fewer" };
    }
    values.avatar = avatar;
  }

  for (const field of FLAG_FIELDS) {
    const raw = input[field];
    if (raw === undefined || raw === null) continue;
    if (typeof raw !== "boolean") return { error: "Notification settings must be true or false" };
    values[field] = raw;
  }

  if (input.interests !== undefined && input.interests !== null) {
    if (!Array.isArray(input.interests) || input.interests.some((v) => typeof v !== "string")) {
      return { error: "Interests must be a list of topics" };
    }
    // Lower case and trimmed, so "Workshop" and "workshop " are one topic.
    const topics = [...new Set(input.interests.map((v) => v.trim().toLowerCase()).filter(Boolean))];
    if (topics.some((v) => v.length > INTEREST_MAX)) return { error: `A topic must be ${INTEREST_MAX} characters or fewer` };
    if (topics.length > MAX_INTERESTS) return { error: `Pick at most ${MAX_INTERESTS} topics` };
    values.interests = topics;
  }

  if (input.language !== undefined && input.language !== null) {
    if (!LANGUAGES.includes(input.language)) return { error: "Language must be en or ne" };
    values.language = input.language;
  }

  return { values };
}

module.exports = { cleanProfileFields, LIMITS, MAX_INTERESTS };
