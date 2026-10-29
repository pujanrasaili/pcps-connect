// What an admin may change on another student through PUT /api/admin/users/:id:
// their role and approval status (the admin panel's buttons) plus the plain
// profile fields. Everything else in the body -- email, emailVerified, token
// fields, passwordChangedAt, notification settings, the password hash -- is
// ignored, so a crafted request can't mark an address verified or invalidate
// someone's sessions behind the app's back.
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
  return null;
}

module.exports = { ADMIN_USER_FIELDS, pickAdminUserFields, adminUserFieldsProblem };
