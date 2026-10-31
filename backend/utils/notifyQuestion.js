const sendEmail = require("./sendEmail");
const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");
const { appOrigin } = require("./unsubscribe");
const { pushNotifications } = require("./inApp");

// Two best-effort emails (a failed send never fails the request):
//  * the organiser hears that someone asked, so questions don't sit unseen
//  * the asker hears the answer, so they don't have to keep checking the page
async function notifyOrganiserOfQuestion(organiser, event, question, askerFirstName) {
  if (!organiser?.email) return;
  const url = `${appOrigin()}/events/${event._id}`;
  await sendEmail({
    to: organiser.email,
    subject: `New question on ${event.title}`,
    html: renderEmail({
      heading: "A student asked a question",
      bodyHtml: `
        <p style="margin: 0 0 12px;"><strong>${escapeHtml(askerFirstName)}</strong> asked on <strong>${escapeHtml(event.title)}</strong>:</p>
        <p style="margin: 0 0 16px; padding: 12px; background: #f1f5f9; border-radius: 8px;">${escapeHtml(question)}</p>
        <p style="margin: 0;">Open the event page to answer. Your answer will be public.</p>
      `,
      ctaText: "Answer the question",
      ctaUrl: url,
    }),
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
  await sendEmail({
    to: asker.email,
    subject: `Your question about ${event.title} was answered`,
    html: renderEmail({
      heading: "Your question was answered",
      bodyHtml: `
        <p style="margin: 0 0 12px;">Hi ${escapeHtml(asker.name)},</p>
        <p style="margin: 0 0 8px;"><strong>You asked:</strong></p>
        <p style="margin: 0 0 16px; padding: 12px; background: #f1f5f9; border-radius: 8px;">${escapeHtml(question)}</p>
        <p style="margin: 0 0 8px;"><strong>Answer:</strong></p>
        <p style="margin: 0 0 16px; padding: 12px; background: #eef2ff; border-radius: 8px;">${escapeHtml(answer)}</p>
      `,
      ctaText: "View the event",
      ctaUrl: url,
    }),
  }).catch((err) => console.error("Failed to email asker about an answer:", err.message));
}

module.exports = { notifyOrganiserOfQuestion, notifyAskerOfAnswer };
