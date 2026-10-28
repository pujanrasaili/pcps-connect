const nodemailer = require("nodemailer");
const { sendViaBrevo } = require("../utils/brevoMail");

// Two ways to send, chosen by what is configured:
//
//  1. BREVO_API_KEY set  -> HTTPS API (utils/brevoMail.js). This is what to use
//     on Render's free tier, which blocks outbound SMTP.
//  2. Otherwise          -> Gmail SMTP with an "App Password" (not your real
//     Gmail password -- see .env.example). Fine on your own computer, GitHub
//     Actions, or a paid host; it does NOT work from Render's free tier.
//
// `pool` matters for the bulk sends (announcements, reminders, the weekly
// digest), which hand dozens or hundreds of messages over at once. Without
// it every message opens its own SMTP connection, and Gmail refuses most of
// them when too many are open together, so students silently miss the email.
// With it, a few reusable connections work through the queue, at most 5
// messages per second.
// Without limits, an unreachable mail server (Render's free tier silently drops
// SMTP connections) makes nodemailer wait about two minutes, and the request that
// asked for the email -- a sign-up, a registration -- hangs the whole time.
const TIMEOUT_OPTIONS = { connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000 };

const POOL_OPTIONS = { pool: true, maxConnections: 3, maxMessages: 100, rateDelta: 1000, rateLimit: 5 };

let transporter;
if (process.env.BREVO_API_KEY) {
  transporter = {
    sendMail: (mail) =>
      sendViaBrevo(mail, { apiKey: process.env.BREVO_API_KEY, senderEmail: process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER }),
  };
} else {
  transporter = nodemailer.createTransport({
    service: "gmail",
    ...POOL_OPTIONS,
    ...TIMEOUT_OPTIONS,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
}

module.exports = transporter;
module.exports.POOL_OPTIONS = POOL_OPTIONS;
module.exports.TIMEOUT_OPTIONS = TIMEOUT_OPTIONS;
