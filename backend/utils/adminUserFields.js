// What an admin may change on another student through PUT /api/admin/users/:id:
// their role and approval status (the admin panel's buttons) plus the plain
// profile fields. Everything else in the body -- email, emailVerified, token
// fields, passwordChangedAt, notification settings, the password hash -- is
// ignored, so a crafted request can't mark an address verified or invalidate
// someone's sessions behind the app's back.
const ROLES = ["user", "admin"];
const APPROVAL_STATUSES = ["pending", "approved", "rejected"];
const ADMIN_USER_FIELDS = ["role", "approvalStatus", "name", "studentId", "program", "semester", "phone"];

function pickAdminUserFields(body = {}) {
  const picked = {};
  for (const field of ADMIN_USER_FIELDS) {
    if (body[field] !== undefined) picked[field] = body[field];
  }
  return picked;
}

// Every one of these fields is plain text. Anything else (an object, a list, a
// number) used to reach the database and come back as a 500 "Cast to string
// failed"; it is a bad request instead. Returns a message or null.
function adminUserFieldsProblem(picked) {
  for (const [field, value] of Object.entries(picked)) {
    if (typeof value !== "string") return `${field} must be text`;
  }
  // Text, but not one of the allowed words, is also a bad request (it used to
  // reach the database and come back as a 500 "not a valid enum value").
  if ("role" in picked && !ROLES.includes(picked.role)) return `role must be one of: ${ROLES.join(", ")}`;
  if ("approvalStatus" in picked && !APPROVAL_STATUSES.includes(picked.approvalStatus)) {
    return `approvalStatus must be one of: ${APPROVAL_STATUSES.join(", ")}`;
  }
  return null;
}

module.exports = { ADMIN_USER_FIELDS, pickAdminUserFields, adminUserFieldsProblem };
