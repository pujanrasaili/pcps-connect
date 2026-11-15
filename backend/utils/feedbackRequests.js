// The "How was the event?" nudge: a bell message and an email, sent once, to
// students who were marked as attended but have not rated the event. It looks
// at events that started between 3 hours and 3 days ago, so it is correct
// whenever the daily schedule runs (see .github/workflows/feedback-requests.yml)
// and a missed run is caught the next day. Every registration is marked
// feedbackAsked once handled -- emailed, skipped (the student turned event
// reminders off) or failed -- so nobody is asked twice and a bad address isn't
// retried daily.
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const sendEmail = require("./sendEmail");
const { unsubscribeHeaders, settingsLink, appOrigin } = require("./unsubscribe");
const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");
const { pushNotifications } = require("./inApp");
const { pickLanguage } = require("./emailText");
const { feedbackRequestEmail, settingsWord } = require("./reminderEmailText");

const HOUR = 60 * 60 * 1000;

function getFeedbackWindow(now = new Date()) {
  return { start: new Date(now.getTime() - 72 * HOUR), end: new Date(now.getTime() - 3 * HOUR) };
}

async function requestFeedback(now = new Date()) {
  const { start, end } = getFeedbackWindow(now);
  const events = await Event.find({ date: { $gte: start, $lte: end } });
  let sent = 0;
  let failed = 0;
  for (const event of events) {
    const rows = await Registration.find({ event: event._id, attended: true, feedbackAsked: false, rating: null })
      .populate("user", "name email eventReminders language");
    for (const row of rows) {
      const user = row.user;
      if (user?.email && user.eventReminders !== false) {
        await pushNotifications([user._id], {
          type: "feedback_request",
          title: `How was ${event.title}? Rate it`,
          link: "/profile",
        });
        try {
          const lang = pickLanguage(user.language);
          const mail = feedbackRequestEmail(lang, {
            name: escapeHtml(user.name),
            title: escapeHtml(event.title),
            rawTitle: event.title,
            profileLink: `${appOrigin()}/profile`,
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
          console.error(`Failed to send feedback request to ${user.email}:`, err.message);
          failed++;
        }
      }
      row.feedbackAsked = true;
      await row.save();
    }
  }
  return { events: events.length, sent, failed };
}

module.exports = { requestFeedback, getFeedbackWindow };
