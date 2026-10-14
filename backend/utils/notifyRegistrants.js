const Registration = require("../models/Registration");
const sendEmail = require("./sendEmail");
const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");

function formatEventDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Shared by both the owner/admin event routes (eventController) and the
// admin-override routes (adminController) -- registered students have no
// way to find out an event they signed up for changed or was cancelled
// except by revisiting the site, so both update paths need this, not just
// one of them.
//
// Every send is best-effort and run in parallel (Promise.allSettled): one
// student's full mailbox or bounced address shouldn't slow down or break
// notifying everyone else, and this must never be allowed to turn a
// successful admin action into a 500.
async function notifyRegistrants(eventId, { heading, bodyHtml }) {
  let registrants;
  try {
    registrants = await Registration.find({ event: eventId }).populate("user", "name email");
  } catch (err) {
    console.error("Failed to look up registrants to notify:", err.message);
    return;
  }

  const sends = registrants
    .filter((r) => r.user?.email)
    .map((r) =>
      sendEmail({
        to: r.user.email,
        subject: heading,
        html: renderEmail({ heading, bodyHtml: bodyHtml(r.user) }),
      }).catch((err) => {
        console.error(`Failed to notify ${r.user.email}:`, err.message);
      })
    );

  await Promise.allSettled(sends);
}

// event must have title/date/location from BEFORE the fields below were
// changed is for comparison -- call this after saving the new values, with
// what the fields used to be.
async function notifyEventRescheduled(event, { oldDate, oldLocation }) {
  const dateChanged = new Date(oldDate).getTime() !== new Date(event.date).getTime();
  const locationChanged = oldLocation !== event.location;
  if (!dateChanged && !locationChanged) return;

  const changes = [
    dateChanged &&
      `<p style="margin: 0 0 4px;"><strong>New date/time:</strong> ${formatEventDate(event.date)} <span style="color: #94a3b8;">(was ${formatEventDate(oldDate)})</span></p>`,
    locationChanged &&
      `<p style="margin: 0;"><strong>New location:</strong> ${escapeHtml(event.location)} <span style="color: #94a3b8;">(was ${escapeHtml(oldLocation)})</span></p>`,
  ]
    .filter(Boolean)
    .join("");

  await notifyRegistrants(event._id, {
    heading: `Event updated: ${event.title}`,
    bodyHtml: (user) => `
      <p style="margin: 0 0 12px;">Hi ${escapeHtml(user.name)},</p>
      <p style="margin: 0 0 16px;">An event you're registered for -- <strong>${escapeHtml(event.title)}</strong> -- has changed:</p>
      ${changes}
      <p style="margin: 16px 0 0;">If the new details don't work for you, you can cancel anytime from your Dashboard.</p>
    `,
  });
}

async function notifyEventCancelled(event) {
  await notifyRegistrants(event._id, {
    heading: `Event cancelled: ${event.title}`,
    bodyHtml: (user) => `
      <p style="margin: 0 0 12px;">Hi ${escapeHtml(user.name)},</p>
      <p style="margin: 0;"><strong>${escapeHtml(event.title)}</strong>, scheduled for ${formatEventDate(event.date)}, has been cancelled. You don't need to do anything -- your registration has been removed automatically.</p>
    `,
  });
}

module.exports = { notifyEventRescheduled, notifyEventCancelled };
