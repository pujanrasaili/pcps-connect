const sendEmail = require("../utils/sendEmail");
const renderEmail = require("../utils/emailTemplate");

// Escapes HTML-special characters so a submitter can't inject markup or
// script tags into the HTML email an admin opens in their inbox -- this is
// a public, unauthenticated form, so its input is the least trusted in the
// whole app.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

    const receiver = process.env.CONTACT_RECEIVER_EMAIL || process.env.EMAIL_USER;

    await sendEmail({
      to: receiver,
      subject: subject ? `[PCPS Connect Contact] ${subject}` : "[PCPS Connect Contact] New message",
      replyTo: email,
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
    res.status(500).json({ message: "Failed to send message. Please try again or email us directly." });
  }
}

module.exports = { submitContactForm };
