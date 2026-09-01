const sendEmail = require("../utils/sendEmail");

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
      html: `
        <p><strong>From:</strong> ${name} (${email})</p>
        ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ""}
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `,
    });

    res.status(200).json({ message: "Message sent successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to send message. Please try again or email us directly." });
  }
}

module.exports = { submitContactForm };
