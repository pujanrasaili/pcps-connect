const mongoose = require("mongoose");

// A public question on an event's page and, once an organiser has replied, the
// answer. `authorName` is only the asker's FIRST name, copied in when asking:
// questions are public and a student's full name should not be.
const eventQuestionSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorName: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, default: "" },
    answeredByName: { type: String, default: "" },
    answeredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EventQuestion", eventQuestionSchema);
