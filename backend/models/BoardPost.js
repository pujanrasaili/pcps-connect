const mongoose = require("mongoose");

// A short campus notice (something lost or found, or a general notice) on the
// notice board. Posts vanish by themselves after 14 days: Mongo's TTL index
// removes a post once `expiresAt` passes. The author's first name is copied in
// so the post still reads properly if the account is renamed.
const boardPostSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorName: { type: String, required: true },
    category: { type: String, enum: ["lost", "found", "notice"], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    // Optional: how to reach the poster (a phone number, an Instagram name, a room).
    contact: { type: String, default: "" },
    expiresAt: { type: Date, required: true },
    // The author marked a lost/found post as sorted out; it then expires soon.
    resolved: { type: Boolean, default: false },
    // Students who reported the post. Enough reports hide it until an admin looks.
    reports: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

boardPostSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
boardPostSchema.index({ createdAt: -1 });

module.exports = mongoose.model("BoardPost", boardPostSchema);
