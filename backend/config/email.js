const nodemailer = require("nodemailer");

// Uses Gmail SMTP with an "App Password" (not your real Gmail password --
// see .env.example for how to generate one). Simple to set up with an
// existing Gmail account; swap this for a dedicated transactional email
// service (Resend, SendGrid, etc.) before a real production launch.
//
// `pool` matters for the bulk sends (announcements, reminders, the weekly
// digest), which hand dozens or hundreds of messages over at once. Without
// it every message opens its own SMTP connection, and Gmail refuses most of
// them when too many are open together, so students silently miss the email.
// With it, a few reusable connections work through the queue, at most 5
// messages per second.
const POOL_OPTIONS = { pool: true, maxConnections: 3, maxMessages: 100, rateDelta: 1000, rateLimit: 5 };

const transporter = nodemailer.createTransport({
  service: "gmail",
  ...POOL_OPTIONS,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

module.exports = transporter;
module.exports.POOL_OPTIONS = POOL_OPTIONS;
