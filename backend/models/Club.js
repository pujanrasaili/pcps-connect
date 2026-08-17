const mongoose = require("mongoose");

const clubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    longDescription: { type: String, default: "" },
    image: { type: String, default: null },
    icon: { type: String, default: "FaUsers" }, // react-icons component name, mapped on the frontend
    activities: [{ type: String }],
    leadName: { type: String, default: "" },
    leadRole: { type: String, default: "" },
    email: { type: String, default: "" },
    foundedYear: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Club", clubSchema);
