const ContactMessage = require("../models/ContactMessage");
const { recordAudit } = require("../utils/audit");
const { safeError } = require("../utils/errorMessage");

const MAX_LIST = 200;

// GET /api/admin/messages
// Messages from the Contact form, newest first, with how many are still
// waiting. Admin only (the router enforces it).
async function getContactMessages(req, res) {
  try {
    const [messages, unhandled] = await Promise.all([
      ContactMessage.find().sort({ createdAt: -1 }).limit(MAX_LIST),
      ContactMessage.countDocuments({ handled: false }),
    ]);
    res.status(200).json({ messages, unhandled });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to fetch messages") });
  }
}

// PUT /api/admin/messages/:id  { handled: boolean }
async function setMessageHandled(req, res) {
  try {
    const { handled } = req.body || {};
    if (typeof handled !== "boolean") return res.status(400).json({ message: "handled must be true or false" });
    const message = await ContactMessage.findByIdAndUpdate(req.params.id, { handled }, { new: true });
    if (!message) return res.status(404).json({ message: "Message not found" });
    res.status(200).json({ message: handled ? "Marked as handled" : "Marked as not handled", contactMessage: message });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to update the message") });
  }
}

// DELETE /api/admin/messages/:id
async function deleteContactMessage(req, res) {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    await recordAudit(req.user, "contact.deleted", `Deleted a contact message from ${message.name}`);
    res.status(200).json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ message: safeError(err, "Failed to delete the message") });
  }
}

module.exports = { getContactMessages, setMessageHandled, deleteContactMessage };
