// Human wording and colour for admin activity-log actions (the raw action
// strings are written by backend/utils/audit.js callers).
const LABELS = {
  "user.approved": "User approved",
  "user.rejected": "User rejected",
  "user.approved_bulk": "Bulk approval",
  "user.role_changed": "Role changed",
  "user.deleted": "User deleted",
  "user.selfDeleted": "Self-deleted account",
  "club.deleted": "Club deleted",
  "club.leaders": "Club leaders changed",
  "club.announcement": "Club message sent",
  "event.deleted": "Event deleted",
  "event.announcement": "Event message sent",
  "notice.set": "Site announcement published",
  "notice.cleared": "Site announcement removed",
};

export function actionLabel(action) {
  if (LABELS[action]) return LABELS[action];
  // Unknown future action: "thing.some_action" -> "Thing some action".
  const text = String(action).replace(/[._]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "danger" (destructive), "good" (approvals), "info" (everything else).
export function actionTone(action) {
  if (/(deleted|rejected|selfDeleted)$/i.test(action)) return "danger";
  if (/approved(_bulk)?$/.test(action)) return "good";
  return "info";
}

// Which filter chip an action belongs to: the part before the first dot.
export function actionGroup(action) {
  return String(action).split(".")[0];
}
