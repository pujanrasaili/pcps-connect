// Emails the leaders of a club (or the admins, if it has none) when students
// have been waiting more than 5 days for a decision on a request to join a
// club that approves its members. Meant to run twice a week, see
// .github/workflows/join-request-reminders.yml. Nothing is sent when nobody
// is overdue. Pass --dry to list who would be emailed without sending.
//
// Run with:  node scripts/sendJoinRequestReminders.js [--dry]

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const User = require("../models/User");
const Club = require("../models/Club");
const ClubJoinRequest = require("../models/ClubJoinRequest");
const sendEmail = require("../utils/sendEmail");
const { appOrigin } = require("../utils/unsubscribe");
const { buildReminders, renderReminder, MIN_AGE_DAYS } = require("../utils/requestReminders");

const DRY = process.argv.includes("--dry");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const cutoff = new Date(Date.now() - MIN_AGE_DAYS * 24 * 60 * 60 * 1000);
  const requests = await ClubJoinRequest.find({ createdAt: { $lte: cutoff } }).select("club createdAt");
  console.log(`${requests.length} join request(s) have waited more than ${MIN_AGE_DAYS} days.`);

  let reminders = [];
  if (requests.length) {
    const clubIds = [...new Set(requests.map((r) => String(r.club)))];
    const clubs = await Club.find({ _id: { $in: clubIds } }).select("name +leaders").populate("leaders", "name email");
    const admins = await User.find({ role: "admin" }).select("name email");
    reminders = buildReminders({ requests, clubs, admins });
  }
  console.log(`${reminders.length} ${reminders.length === 1 ? "person" : "people"} to remind.`);

  const origin = appOrigin();
  let sent = 0;
  let failed = 0;
  for (const reminder of reminders) {
    if (DRY) {
      console.log(`[dry] ${reminder.user.email}: ${reminder.items.map((i) => `${i.club} (${i.count})`).join(", ")}`);
      continue;
    }
    try {
      const { subject, html } = renderReminder(reminder, origin);
      await sendEmail({ to: reminder.user.email, subject, html });
      sent++;
    } catch (err) {
      console.error(`Failed to remind ${reminder.user.email}:`, err.message);
      failed++;
    }
  }

  console.log(DRY ? "Dry run: nothing sent." : `Done. Sent ${sent} reminder(s), ${failed} failed.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Sending join request reminders failed:", err.message);
  process.exit(1);
});
