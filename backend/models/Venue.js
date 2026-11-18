const mongoose = require("mongoose");

// A named place on campus (e.g. "Seminar Hall") with a line on how to find it.
// Events whose location matches a venue's name show these directions.
const venueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    // Lower-case copy of the name: one venue per name, whatever the capitals.
    nameKey: { type: String, required: true, unique: true },
    directions: { type: String, trim: true, maxlength: 200, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Venue", venueSchema);
