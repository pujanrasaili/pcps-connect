const sendEmail = require("./sendEmail");
const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");
const { appOrigin } = require("./unsubscribe");
const { pushNotifications } = require("./inApp");
const { pickLanguage } = require("./emailText");
const { noticeEmail } = require("./noticeEmailText");

// Two best-effort emails (a failed send never fails the request):
//  * the organiser hears that someone asked, so questions don't sit unseen
//  * the asker hears the answer, so they don't have to keep checking the page
async function notifyOrganiserOfQuestion(organiser, event, question, askerFirstName) {
  if (!organiser?.email) return;
  const url = `${appOrigin()}/events/${event._id}`;
  const lang = pickLanguage(organiser.language);
  const mail = noticeEmail("asked", lang, {
    asker: escapeHtml(askerFirstName),
    title: escapeHtml(event.title),
    rawTitle: event.title,
    question: escapeHtml(question),
  });
  await sendEmail({
    to: organiser.email,
    subject: mail.subject,
    html: renderEmail({ heading: mail.heading, bodyHtml: mail.bodyHtml, ctaText: mail.ctaText, ctaUrl: url, language: lang }),
  }).catch((err) => console.error("Failed to email organiser about a question:", err.message));
}

async function notifyAskerOfAnswer(asker, event, question, answer) {
  await pushNotifications([asker?._id], {
    type: "question_answered",
    title: `Your question about ${event.title} was answered`,
    link: `/events/${event._id}`,
  });
  if (!asker?.email) return;
  const url = `${appOrigin()}/events/${event._id}`;
  const lang = pickLanguage(asker.language);
  const mail = noticeEmail("answered", lang, {
    name: escapeHtml(asker.name),
    rawTitle: event.title,
    question: escapeHtml(question),
    answer: escapeHtml(answer),
  });
  await sendEmail({
    to: asker.email,
    subject: mail.subject,
    html: renderEmail({ heading: mail.heading, bodyHtml: mail.bodyHtml, ctaText: mail.ctaText, ctaUrl: url, language: lang }),
  }).catch((err) => console.error("Failed to email asker about an answer:", err.message));
}

module.exports = { notifyOrganiserOfQuestion, notifyAskerOfAnswer };
