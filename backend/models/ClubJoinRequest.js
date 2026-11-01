const mongoose = require("mongoose");

// A student's request to join a club that approves its members. Kept apart from
// ClubMembership on purpose: a membership always means "is a member", so member
// counts, rosters and club emails never include someone still waiting. When a
// leader approves, the request is replaced by a real membership.
const clubJoinRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One open request per student per club.
clubJoinRequestSchema.index({ user: 1, club: 1 }, { unique: true });
clubJoinRequestSchema.index({ club: 1, createdAt: 1 });

module.exports = mongoose.model("ClubJoinRequest", clubJoinRequestSchema);
