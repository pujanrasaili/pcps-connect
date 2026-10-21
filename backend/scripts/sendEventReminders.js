// Emails every student with a "reminderSent: false" registration for an
// event happening within the next 24 hours, then marks those registrations
// reminderSent so a later run (this is meant to run on a daily schedule,
// see .github/workflows/event-reminders.yml) doesn't email the same person
// again before the event actually happens.
//
// Window is deliberately "the next 24 hours", not "tomorrow" by calendar
// date, so this stays correct regardless of exactly what time of day the
// schedule runs it, or if a run is skipped/delayed a few hours -- it always
// just means "whoever is signed up for something coming up soon and hasn't
// been told yet."
//
// Marks reminderSent = true right after attempting a send, success or
// failure, same reasoning as the rest of this app's best-effort emails:
// retrying a permanently-bad address every single day until the event
// happens would be worse than one missed reminder.
//
// Run with:  node scripts/sendEventReminders.js

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Event = require("../models/Event");
const Registration = require("../models/Registration");
const sendEmail = require("../utils/sendEmail");
const renderEmail = require("../utils/emailTemplate");
const { escapeHtml } = require("../utils/escapeHtml");
const { formatEventDate } = require("../utils/formatEventDate");
const { getReminderWindow } = require("../utils/reminderWindow");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Looking for events in the next 24 hours...");

  const { start, end } = getReminderWindow();

  const upcomingEvents = await Event.find({ date: { $gte: start, $lte: end } });
  console.log(`Found ${upcomingEvents.length} event(s) in the window.`);

  let sent = 0;
  let failed = 0;

  for (const event of upcomingEvents) {
    const registrations = await Registration.find({
      event: event._id,
      reminderSent: false,
      // Students whose request hasn't been approved aren't going yet.
      status: { $ne: "pending" },
    }).populate("user", "name email eventReminders");

    for (const registration of registrations) {
      if (!registration.user?.email) {
        // Dangling reference (deleted account) -- nothing to send to, and
        // no point checking it again tomorrow.
        registration.reminderSent = true;
        await registration.save();
        continue;
      }

      if (registration.user.eventReminders === false) {
        // Student opted out in Settings -- mark it sent so we don't keep
        // re-checking this registration every day, but don't actually email.
        registration.reminderSent = true;
        await registration.save();
        continue;
      }

      try {
        await sendEmail({
          to: registration.user.email,
          subject: `Reminder: ${event.title} is coming up`,
          html: renderEmail({
            heading: "Your event is coming up",
            bodyHtml: `
              <p style="margin: 0 0 12px;">Hi ${escapeHtml(registration.user.name)},</p>
              <p style="margin: 0 0 16px;">Just a reminder that you're registered for <strong>${escapeHtml(event.title)}</strong>, happening soon:</p>
              <p style="margin: 0 0 4px;"><strong>When:</strong> ${formatEventDate(event.date)}</p>
              <p style="margin: 0;"><strong>Where:</strong> ${escapeHtml(event.location)}</p>
              <p style="margin: 16px 0 0;">See you there!</p>
            `,
          }),
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send reminder to ${registration.user.email}:`, err.message);
        failed++;
      }

      registration.reminderSent = true;
      await registration.save();
    }
  }

  console.log(`Done. Sent ${sent} reminder(s), ${failed} failed.`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Sending event reminders failed:", err.message);
  process.exit(1);
});
