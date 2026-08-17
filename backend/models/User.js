const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },

    // Student profile fields -- all optional so registration stays simple;
    // students fill these in later from their Profile page.
    studentId: { type: String, trim: true, default: "" },
    program: { type: String, trim: true, default: "" },
    semester: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    avatar: { type: String, default: "" },
    // A student's one favorite club -- intentionally independent of
    // ClubMembership, so favoriting a club never implies joining it.
    favoriteClub: { type: mongoose.Schema.Types.ObjectId, ref: "Club", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
