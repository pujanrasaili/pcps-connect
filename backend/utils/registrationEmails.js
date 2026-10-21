const sendEmail = require("./sendEmail");
const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");
const { formatEventDate } = require("./formatEventDate");
const { buildIcs } = require("./ics");

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

const details = (event) => `
  <p style="margin: 0 0 4px;"><strong>When:</strong> ${formatEventDate(event.date)}</p>
  <p style="margin: 0;"><strong>Where:</strong> ${escapeHtml(event.location)}</p>`;

// Registration is confirmed (open events straight away; approval events once
// an organiser approves). Includes the add-to-calendar invite.
function sendRegistrationConfirmation(user, event) {
  return safeSend("registration confirmation", {
    to: user.email,
    subject: `You're registered: ${event.title}`,
    html: renderEmail({
      heading: "Registration confirmed",
      bodyHtml: `
          <p style="margin: 0 0 12px;">Hi ${escapeHtml(user.name)},</p>
          <p style="margin: 0 0 16px;">You're confirmed for <strong>${escapeHtml(event.title)}</strong>. Here are the details:</p>
          ${details(event)}
          <p style="margin: 16px 0 0;">You can cancel anytime from your Dashboard if your plans change.</p>
        `,
    }),
    icalEvent: buildIcs(event),
  });
}

// The event needs organiser approval: tell the student the request arrived and
// that a seat is being held for them while it is reviewed.
function sendRequestReceived(user, event) {
  return safeSend("join request", {
    to: user.email,
    subject: `Request received: ${event.title}`,
    html: renderEmail({
      heading: "We got your request",
      bodyHtml: `
          <p style="margin: 0 0 12px;">Hi ${escapeHtml(user.name)},</p>
          <p style="margin: 0 0 16px;">The organisers of <strong>${escapeHtml(event.title)}</strong> approve each person who joins. Your request has been sent and a seat is being held for you.</p>
          ${details(event)}
          <p style="margin: 16px 0 0;">You'll get another email as soon as they decide. You can withdraw your request from your Dashboard.</p>
        `,
    }),
  });
}

// An organiser turned the request down; the seat goes back to the pool.
function sendRequestDeclined(user, event) {
  return safeSend("request declined", {
    to: user.email,
    subject: `Update on your request: ${event.title}`,
    html: renderEmail({
      heading: "Your request wasn't approved",
      bodyHtml: `
          <p style="margin: 0 0 12px;">Hi ${escapeHtml(user.name)},</p>
          <p style="margin: 0 0 16px;">Sorry -- the organisers couldn't approve your request to join <strong>${escapeHtml(event.title)}</strong> this time.</p>
          <p style="margin: 0;">There are plenty of other events on PCPS Connect, and you're welcome to ask the club directly if you have questions.</p>
        `,
    }),
  });
}

module.exports = { sendRegistrationConfirmation, sendRequestReceived, sendRequestDeclined };
