const nodemailer = require("nodemailer");

// Uses Gmail SMTP with an "App Password" (not your real Gmail password --
// see .env.example for how to generate one). Simple to set up with an
// existing Gmail account; swap this for a dedicated transactional email
// service (Resend, SendGrid, etc.) before a real production launch.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

module.exports = transporter;
