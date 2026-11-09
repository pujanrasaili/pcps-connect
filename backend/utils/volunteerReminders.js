// The day-before reminder for students who signed up to help at an event (the
// registered-attendee reminders live in scripts/sendEventReminders.js, which
// calls this for each event in the window). Every sign-up is marked
// reminderSent once handled, whether it was emailed, skipped (the student
// turned reminders off) or failed, so a bad address isn't retried every day.
const EventVolunteer = require("../models/EventVolunteer");
const sendEmail = require("./sendEmail");
const { unsubscribeHeaders, settingsLink } = require("./unsubscribe");
const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");
const { formatEventDate } = require("./formatEventDate");
const { pushNotifications } = require("./inApp");
const { pickLanguage } = require("./emailText");
const { volunteerReminderEmail, settingsWord } = require("./reminderEmailText");

async function remindVolunteers(event) {
  let sent = 0;
  let failed = 0;
  const rows = await EventVolunteer.find({ event: event._id, reminderSent: false }).populate("user", "name email eventReminders language");
  for (const row of rows) {
    const user = row.user;
    // A deleted account, or a student who turned event reminders off: nothing to send.
    if (user?.email && user.eventReminders !== false) {
      const role = (event.volunteerRoles || []).find((r) => String(r._id) === String(row.role));
      await pushNotifications([user._id], {
        type: "volunteer_reminder",
        title: `You're helping at ${event.title} on ${formatEventDate(event.date)}${role ? ` (${role.name})` : ""}`,
        link: `/events/${event._id}`,
      });
      try {
        const lang = pickLanguage(user.language);
        const mail = volunteerReminderEmail(lang, {
          name: escapeHtml(user.name),
          title: escapeHtml(event.title),
          rawTitle: event.title,
          role: escapeHtml(role ? role.name : ""),
          when: formatEventDate(event.date, lang),
          where: escapeHtml(event.location),
          settings: settingsLink(undefined, settingsWord(lang)),
        });
        await sendEmail({
          to: user.email,
          headers: unsubscribeHeaders(),
          subject: mail.subject,
          html: renderEmail({ heading: mail.heading, bodyHtml: mail.bodyHtml, language: mail.lang }),
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send volunteer reminder to ${user.email}:`, err.message);
        failed++;
      }
    }
    row.reminderSent = true;
    await row.save();
  }
  return { sent, failed };
}

module.exports = { remindVolunteers };
