const AuditLog = require("../models/AuditLog");

// Best-effort, like the notification emails: failing to write an audit entry
// is logged but must never turn a successful admin action into an error.
async function recordAudit(actor, action, summary) {
  try {
    await AuditLog.create({
      actor: actor?._id || null,
      actorName: actor?.name || "Unknown",
      action,
      summary: String(summary).slice(0, 300),
    });
  } catch (err) {
    console.error("Failed to record audit entry:", err.message);
  }
}

module.exports = { recordAudit };
