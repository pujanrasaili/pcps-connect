const transporter = require("../config/email");

// Wraps nodemailer's sendMail in a Promise with a consistent shape.
// Callers should catch failures themselves and decide how to respond --
// e.g. forgotPassword still returns a generic success message even if the
// email fails to send, to avoid leaking whether an address is registered.
async function sendEmail({ to, subject, html, replyTo, icalEvent }) {
  return transporter.sendMail({
    from: `"PCPS Connect" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    ...(replyTo && { replyTo }),
    // Lets mail apps (Gmail, Outlook, Apple Mail) show an "add to calendar" card.
    ...(icalEvent && { icalEvent: { method: "PUBLISH", content: icalEvent } }),
  });
}

module.exports = sendEmail;
