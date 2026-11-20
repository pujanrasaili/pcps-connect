const sendEmail = require("./sendEmail");
const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");
const { formatEventDate } = require("./formatEventDate");
const { buildIcs } = require("./ics");
const { pickLanguage } = require("./emailText");
const { eventEmail } = require("./eventEmailText");

// Every function here is best-effort, same pattern as every other email in
// this app (verification, password reset, approval notices): a failed send is
// logged and swallowed, never allowed to turn a successful registration or
// decision into a 500.
async function safeSend(label, message) {
  try {
    await sendEmail(message);
  } catch (err) {
    console.error(`Failed to send ${label} email:`, err.message);
  }
}

// Variables the wording needs; everything shown in HTML is escaped here.
const vars = (user, event, lang, answers = []) => ({
  name: escapeHtml(user.name),
  title: escapeHtml(event.title),
  rawTitle: event.title,
  when: formatEventDate(event.date, lang),
  where: escapeHtml(event.location),
  answers: (answers || [])
    .filter((a) => a && String(a.answer || "").trim())
    .map((a) => ({ question: escapeHtml(`${a.question}`), answer: escapeHtml(a.answer) })),
});

// One send for each kind; the language is the student's account language.
function build(kind, user, event, answers) {
  const lang = pickLanguage(user.language);
  const mail = eventEmail(kind, lang, vars(user, event, lang, answers));
  return { to: user.email, subject: mail.subject, html: renderEmail({ heading: mail.heading, bodyHtml: mail.bodyHtml, language: lang }) };
}

// Registration is confirmed (open events straight away; approval events once
// an organiser approves). Includes the add-to-calendar invite and, when the
// event asked sign-up questions, the answers the student gave.
function sendRegistrationConfirmation(user, event, answers) {
  return safeSend("registration confirmation", { ...build("confirmed", user, event, answers), icalEvent: buildIcs(event) });
}

// The event needs organiser approval: tell the student the request arrived and
// that a seat is being held for them while it is reviewed.
function sendRequestReceived(user, event) {
  return safeSend("join request", build("requestReceived", user, event));
}

// An organiser turned the request down; the seat goes back to the pool.
function sendRequestDeclined(user, event) {
  return safeSend("request declined", build("requestDeclined", user, event));
}

module.exports = { sendRegistrationConfirmation, sendRequestReceived, sendRequestDeclined };
