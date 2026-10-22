const mongoose = require("mongoose");

// One announcement banner for the whole site (e.g. "Fest registration closes
// Friday"). Only ever one document: saving replaces it, clearing deletes it.
const siteNoticeSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    tone: { type: String, enum: ["info", "warning"], default: "info" },
    updatedByName: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteNotice", siteNoticeSchema);
