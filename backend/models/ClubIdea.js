const mongoose = require("mongoose");

// A suggestion from a club member for something the club could do (an event,
// a workshop, a trip). Only the club's leaders and the admins read these; the
// author sees their own. The author's name is copied in so it still reads
// properly if the account is renamed.
const clubIdeaSchema = new mongoose.Schema(
  {
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorName: { type: String, required: true },
    body: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClubIdea", clubIdeaSchema);
