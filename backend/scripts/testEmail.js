// Sends one test email so you can check that sending works, and see the real
// error if it doesn't.
//
//   npm run test-email -- you@gmail.com
//
// It uses the same settings as the site: BREVO_API_KEY (HTTPS, works on
// Render's free tier) if set, otherwise Gmail SMTP (works from your own
// computer, NOT from Render's free tier). Put the values in backend/.env first.

require("dotenv").config();
const sendEmail = require("../utils/sendEmail");

async function run() {
  const to = (process.argv[2] || "").trim();
  if (!to) {
    console.error("Usage: npm run test-email -- you@gmail.com");
    process.exit(1);
  }
  const provider = process.env.BREVO_API_KEY ? "Brevo (HTTPS)" : "Gmail SMTP";
  console.log(`Sending a test email to ${to} using ${provider}...`);
  try {
    await sendEmail({ to, subject: "PCPS Connect test email", html: "<p>If you can read this, email sending works.</p>" });
    console.log("Sent. Check the inbox (and the spam folder).");
    process.exit(0);
  } catch (err) {
    console.error("FAILED:", err.message);
    if (!process.env.BREVO_API_KEY) console.error("Hint: on Render's free tier, Gmail SMTP is blocked -- set BREVO_API_KEY (see .env.example).");
    process.exit(1);
  }
}

run();
