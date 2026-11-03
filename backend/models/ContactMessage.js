const mongoose = require("mongoose");

// A message sent through the public Contact form. It is emailed to the
// college AND kept here, so a message is never lost to a bounced email or a
// full inbox, and admins can see which ones they have dealt with. Messages
// are deleted automatically after 180 days (the index below).
const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    subject: { type: String, trim: true, maxlength: 150, default: "" },
    message: { type: String, required: true, maxlength: 5000 },
    handled: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

contactMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });
contactMessageSchema.index({ email: 1 });

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
