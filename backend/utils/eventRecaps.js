// The post-event recap: once an event is at least 3 days old, everyone who runs
// it (its creator and the hosting clubs' leaders) gets a bell message and an
// email with turnout, the average rating and a few of the comments students
// left. Sent once per event (Event.recapSent), for events up to 14 days old so a
// missed daily run is caught up. Events nobody registered for are skipped.
// Runs from scripts/sendFeedbackRequests.js (the "Feedback Requests" workflow).
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const User = require("../models/User");
const sendEmail = require("./sendEmail");
const { unsubscribeHeaders, settingsLink, appOrigin } = require("./unsubscribe");
const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");
const { pushNotifications } = require("./inApp");
const { pickLanguage } = require("./emailText");
const { eventRecapEmail, settingsWord } = require("./reminderEmailText");
const { organiserIds } = require("./eventOrganisers");

const HOUR = 60 * 60 * 1000;
const MAX_COMMENTS = 3;

function getRecapWindow(now = new Date()) {
  return { start: new Date(now.getTime() - 14 * 24 * HOUR), end: new Date(now.getTime() - 72 * HOUR) };
}

// Turnout and ratings from an event's registrations.
function summarise(registrations) {
  const going = registrations.filter((r) => r.status !== "cancelled" && r.status !== "pending");
  const attended = going.filter((r) => r.attended).length;
  const rated = going.filter((r) => typeof r.rating === "number");
  const average = rated.length ? rated.reduce((sum, r) => sum + r.rating, 0) / rated.length : null;
  const comments = rated.map((r) => (r.feedback || "").trim()).filter(Boolean).slice(0, MAX_COMMENTS);
  return {
    registered: going.length,
    attended,
    percent: going.length ? Math.round((attended / going.length) * 100) : 0,
    average: average === null ? null : average.toFixed(1),
    count: rated.length,
    comments,
  };
}

async function sendEventRecaps(now = new Date()) {
  const { start, end } = getRecapWindow(now);
  const events = await Event.find({ date: { $gte: start, $lte: end }, recapSent: { $ne: true } });
  let sent = 0;
  let failed = 0;
  for (const event of events) {
    const registrations = await Registration.find({ event: event._id }).select("status attended rating feedback");
    const sum = summarise(registrations);
    if (sum.registered > 0) {
      const ids = await organiserIds(event);
      const people = ids.length ? await User.find({ _id: { $in: ids } }).select("name email eventReminders language") : [];
      for (const user of people || []) {
        if (!user.email || user.eventReminders === false) continue;
        await pushNotifications([user._id], {
          type: "event_recap",
          title: `Recap for ${event.title}: ${sum.attended} of ${sum.registered} attended`,
          link: "/admin/events",
        });
        try {
          const lang = pickLanguage(user.language);
          const mail = eventRecapEmail(lang, {
            name: escapeHtml(user.name),
            title: escapeHtml(event.title),
            rawTitle: event.title,
            attended: sum.attended,
            registered: sum.registered,
            percent: sum.percent,
            average: sum.average,
            count: sum.count,
            comments: sum.comments.map(escapeHtml),
            reportLink: `${appOrigin()}/admin/events`,
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
          console.error(`Failed to send event recap to ${user.email}:`, err.message);
          failed++;
        }
      }
    }
    event.recapSent = true;
    await event.save();
  }
  return { events: events.length, sent, failed };
}

module.exports = { sendEventRecaps, getRecapWindow, summarise };
