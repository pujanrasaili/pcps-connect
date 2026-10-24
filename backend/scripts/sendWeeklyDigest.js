// Emails each student one summary of the coming week's events from the clubs
// they joined (see utils/weeklyDigest.js for who gets what). Meant to run
// weekly, see .github/workflows/weekly-digest.yml. Students who turned club
// updates off in Settings are skipped, and nobody gets an empty digest.
//
// Best-effort like the rest of the app's email: a bounced address is logged
// and the run carries on. Pass --dry to print who would be emailed without
// sending anything.
//
// Run with:  node scripts/sendWeeklyDigest.js [--dry]

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Event = require("../models/Event");
const ClubMembership = require("../models/ClubMembership");
const Registration = require("../models/Registration");
const sendEmail = require("../utils/sendEmail");
const { unsubscribeHeaders } = require("../utils/unsubscribe");
const { digestWindow, buildDigests, renderDigest } = require("../utils/weeklyDigest");

const DRY = process.argv.includes("--dry");
const ORIGIN = process.env.CLIENT_ORIGIN || "https://pcps-connect.vercel.app";

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const { start, end } = digestWindow();

  const events = await Event.find({ date: { $gte: start, $lte: end }, club: { $ne: null } }).populate("club", "name");
  console.log(`Found ${events.length} club event(s) in the next 7 days.`);

  let digests = [];
  if (events.length) {
    const clubIds = [...new Set(events.map((e) => String(e.club._id)))];
    const memberships = await ClubMembership.find({ club: { $in: clubIds } }).populate("user", "name email clubUpdates");
    const registrations = await Registration.find({ event: { $in: events.map((e) => e._id) }, status: { $ne: "cancelled" } }).select("user event");
    digests = buildDigests({ events, memberships, registrations });
  }
  console.log(`${digests.length} student(s) have something to hear about.`);

  let sent = 0;
  let failed = 0;
  for (const digest of digests) {
    if (DRY) {
      console.log(`[dry] ${digest.user.email}: ${digest.events.length + digest.more} event(s)`);
      continue;
    }
    try {
      const { subject, html } = renderDigest(digest, ORIGIN);
      await sendEmail({ to: digest.user.email, subject, html, headers: unsubscribeHeaders(ORIGIN) });
      sent++;
    } catch (err) {
      console.error(`Failed to send digest to ${digest.user.email}:`, err.message);
      failed++;
    }
  }

  console.log(DRY ? "Dry run: nothing sent." : `Done. Sent ${sent} digest(s), ${failed} failed.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Sending weekly digest failed:", err.message);
  process.exit(1);
});
