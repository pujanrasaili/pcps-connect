const mongoose = require("mongoose");

const clubMembershipSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
  },
  { timestamps: true }
);

// A student can only have one membership row per club.
clubMembershipSchema.index({ user: 1, club: 1 }, { unique: true });
// Member lists, counts and "tell the club" emails look up by club alone.
clubMembershipSchema.index({ club: 1 });

module.exports = mongoose.model("ClubMembership", clubMembershipSchema);
