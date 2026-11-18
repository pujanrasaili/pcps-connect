const mongoose = require("mongoose");

// A former member who chose to stay listed on the club's page. The student does
// this themselves when they step down (see clubAlumniController), so a name is
// only ever shown with the person's own say-so.
const clubAlumnusSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
    // Kept so the list still reads right if the person later renames themselves
    // or deletes their account (the entry is removed with the account).
    name: { type: String, required: true, trim: true, maxlength: 100 },
    // The year they left (optional), and a short line such as "President 2024".
    year: { type: Number },
    note: { type: String, trim: true, maxlength: 80, default: "" },
  },
  { timestamps: true }
);

clubAlumnusSchema.index({ user: 1, club: 1 }, { unique: true });
clubAlumnusSchema.index({ club: 1, createdAt: -1 });

module.exports = mongoose.model("ClubAlumnus", clubAlumnusSchema);
