// What an organiser types to add someone who turned up without registering:
// the student's PCPS email, or their student ID. Returns { query } for
// User.findOne, or { error }. Exact matches only -- an organiser can confirm
// one student they are looking at, but can't browse or search everyone.
function walkInQuery(input = {}) {
  const raw = input.identifier;
  if (typeof raw !== "string") return { error: "Enter the student's email or student ID" };
  const identifier = raw.trim();
  if (identifier.length < 3 || identifier.length > 100) return { error: "Enter the student's email or student ID" };

  // Only approved accounts: a pending or rejected student isn't a member yet.
  if (identifier.includes("@")) {
    return { query: { email: identifier.toLowerCase(), approvalStatus: "approved" } };
  }
  return { query: { studentId: identifier, approvalStatus: "approved" } };
}

module.exports = { walkInQuery };
