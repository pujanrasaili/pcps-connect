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
    // When and where it usually meets, free text ("Thursdays 3 PM, Room 204").
    meetings: { type: String, default: "", maxlength: 120 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // When true, "Join" is a request that the club's leaders (or an admin)
    // approve; the student is not a member until then. Off by default.
    requiresApproval: { type: Boolean, default: false },
    // Students who run this club's events (see utils/clubAccess.js). Never
    // sent by the public club endpoints -- select:false keeps their identities
    // out of every normal query; only the admin leaders endpoints opt in.
    leaders: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [], select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Club", clubSchema);
