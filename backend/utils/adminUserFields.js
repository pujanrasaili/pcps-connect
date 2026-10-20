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

module.exports = { ADMIN_USER_FIELDS, pickAdminUserFields };
