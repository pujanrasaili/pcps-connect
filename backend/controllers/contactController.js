const sendEmail = require("../utils/sendEmail");
const renderEmail = require("../utils/emailTemplate");
const { safeError } = require("../utils/errorMessage");
const { escapeHtml } = require("../utils/escapeHtml");

// POST /api/contact  (public, rate-limited)
// Emails the submission straight to the college's contact address --
// replyTo is set to the submitter's own email so a staff member can just
// hit "reply" in their inbox to respond directly.
async function submitContactForm(req, res) {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email, and message are required" });
    }

    // This is the one public, unauthenticated endpoint that sends email, so
    // it's strict about shape: JSON lets a caller send an object or array
    // where a string is expected (which would otherwise throw somewhere
    // below and surface as a confusing 500), and replyTo is built straight
    // from the submitted email.
    const fields = { name, email, message, ...(subject !== undefined && { subject }) };
    if (Object.values(fields).some((v) => typeof v !== "string")) {
      return res.status(400).json({ message: "Invalid form data" });
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }
    if (name.length > 100 || email.length > 254 || (subject && subject.length > 150) || message.length > 5000) {
      return res.status(400).json({ message: "One or more fields are too long" });
    }

    const receiver = process.env.CONTACT_RECEIVER_EMAIL || process.env.EMAIL_USER;

    await sendEmail({
      to: receiver,
      subject: subject ? `[PCPS Connect Contact] ${subject}` : "[PCPS Connect Contact] New message",
      replyTo: email.trim(),
      html: renderEmail({
        heading: "New contact form message",
        bodyHtml: `
          <p style="margin: 0 0 8px;"><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
          ${subject ? `<p style="margin: 0 0 8px;"><strong>Subject:</strong> ${escapeHtml(subject)}</p>` : ""}
          <p style="margin: 16px 0 4px;"><strong>Message:</strong></p>
          <p style="margin: 0;">${escapeHtml(message).replace(/\n/g, "<br>")}</p>
        `,
      }),
    });

    res.status(200).json({ message: "Message sent successfully" });
  } catch (err) {
    safeError(err, "Failed to send message");
    res.status(500).json({ message: "Failed to send message. Please try again or email us directly." });
  }
}

module.exports = { submitContactForm };
