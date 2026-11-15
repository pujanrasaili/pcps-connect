// Asks students who attended a recent event to rate it (see
// utils/feedbackRequests.js), then sends each finished event's organisers
// their recap (utils/eventRecaps.js). Meant to run daily from
// .github/workflows/feedback-requests.yml.
//
// Run with:  node scripts/sendFeedbackRequests.js

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("../models/User");
const { requestFeedback } = require("../utils/feedbackRequests");
const { sendEventRecaps } = require("../utils/eventRecaps");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const { events, sent, failed } = await requestFeedback();
  console.log(`Looked at ${events} recent event(s). Sent ${sent} request(s), ${failed} failed.`);
  const recaps = await sendEventRecaps();
  console.log(`Recaps: ${recaps.events} event(s) from the last 2 weeks, sent ${recaps.sent} email(s), ${recaps.failed} failed.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Sending feedback requests failed:", err.message);
  process.exit(1);
});
