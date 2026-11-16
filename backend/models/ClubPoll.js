const mongoose = require("mongoose");

// A quick question a club's leader asks the members ("Which day for the next
// meeting?"). Each option keeps the ids of the members who picked it, so a
// member has exactly one vote; those ids never leave the server (people only
// see counts and which option is theirs). A poll closes at `closesAt`, and
// Mongo's TTL index removes it 30 days after that.
const optionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    voters: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { _id: false }
);

const clubPollSchema = new mongoose.Schema(
  {
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    question: { type: String, required: true },
    options: { type: [optionSchema], required: true },
    closesAt: { type: Date, required: true },
    purgeAt: { type: Date, required: true },
  },
  { timestamps: true }
);

clubPollSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
// Votes are looked up (and removed on account deletion) by voter.
clubPollSchema.index({ "options.voters": 1 });

module.exports = mongoose.model("ClubPoll", clubPollSchema);
