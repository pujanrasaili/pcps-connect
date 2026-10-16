const mongoose = require("mongoose");

// A record of consequential admin actions (changing roles, approving or
// rejecting accounts, deleting users/events/clubs), so with more than one
// admin there's a way to answer "who did that?". actorName is copied in at
// write time because the admin's account may itself be deleted later.
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actorName: { type: String, default: "Unknown" },
    action: { type: String, required: true },
    summary: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Newest-first listing, and old entries age out after a year so this
// collection can't grow without bound.
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
