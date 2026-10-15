const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    image: { type: String, default: null },
    capacity: { type: Number, default: 100, min: 1 },
    category: { type: String, default: "General" },
    price: { type: String, default: "Free" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

// Every public events page sorts by date, and this is unindexed data growing
// without bound (unlike most other collections here, which top out at a
// few hundred rows).
eventSchema.index({ date: 1 });

module.exports = mongoose.model("Event", eventSchema);
