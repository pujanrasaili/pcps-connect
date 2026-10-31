const Registration = require("../models/Registration");
const sendEmail = require("./sendEmail");
const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");
const { formatEventDate } = require("./formatEventDate");
const { pushNotifications } = require("./inApp");

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
async function notifyRegistrants(eventId, { heading, bodyHtml, app }) {
  let registrants;
  try {
    registrants = await Registration.find({ event: eventId }).populate("user", "name email");
  } catch (err) {
    console.error("Failed to look up registrants to notify:", err.message);
    return 0;
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
  // The same news under the bell in the app, for students who don't read email.
  if (app) await pushNotifications(registrants.map((r) => r.user?._id), app);
  return sends.length;
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
    app: { type: "event_changed", title: `${event.title} was updated (new time or place)`, link: `/events/${event._id}` },
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
    app: { type: "event_cancelled", title: `${event.title} was cancelled`, link: "/events" },
    bodyHtml: (user) => `
      <p style="margin: 0 0 12px;">Hi ${escapeHtml(user.name)},</p>
      <p style="margin: 0;"><strong>${escapeHtml(event.title)}</strong>, scheduled for ${formatEventDate(event.date)}, has been cancelled. You don't need to do anything -- your registration has been removed automatically.</p>
    `,
  });
}

// A free-text message from an admin to everyone registered for the event
// (venue details, what to bring, a late start...). The text is escaped and
// line breaks kept, so whatever an admin types can't inject markup into the
// email. Returns how many emails were attempted.
async function notifyEventAnnouncement(event, message) {
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br>");
  return notifyRegistrants(event._id, {
    heading: `Message about ${event.title}`,
    app: { type: "event_message", title: `New message about ${event.title}`, link: `/events/${event._id}` },
    bodyHtml: (user) => `
      <p style="margin: 0 0 12px;">Hi ${escapeHtml(user.name)},</p>
      <p style="margin: 0 0 16px;">The organisers of <strong>${escapeHtml(event.title)}</strong> (${formatEventDate(event.date)}, ${escapeHtml(event.location)}) have sent a message to everyone registered:</p>
      <div style="margin: 0; padding: 12px 16px; border-left: 3px solid #6366f1; background: #f8fafc;">${safeMessage}</div>
    `,
  });
}

module.exports = { notifyEventRescheduled, notifyEventCancelled, notifyEventAnnouncement };
