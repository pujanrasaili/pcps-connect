const mongoose = require("mongoose");

// A short news update on a club's page, written by an admin or one of the
// club's leaders. The author's name is copied in when posting so the post
// still reads properly if the account is later renamed or deleted.
const clubPostSchema = new mongoose.Schema(
  {
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    body: { type: String, required: true },
    // Optional photo (a Cloudinary address); empty when the post has none.
    image: { type: String, default: "" },
    // Set when a leader edits the text, so readers can see the post was changed.
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClubPost", clubPostSchema);
