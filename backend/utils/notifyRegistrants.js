const Registration = require("../models/Registration");
const EventVolunteer = require("../models/EventVolunteer");
const sendEmail = require("./sendEmail");
const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");
const { formatEventDate } = require("./formatEventDate");
const { pushNotifications } = require("./inApp");
const { pickLanguage } = require("./emailText");
const { eventEmail } = require("./eventEmailText");

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
// `heading` and `bodyHtml` are functions of the student's language (and, for
// bodyHtml, the student), so each person gets the email in their own language.
async function notifyRegistrants(eventId, { heading, bodyHtml, app }) {
  let registrants;
  try {
    registrants = await Registration.find({ event: eventId }).populate("user", "name email language");
  } catch (err) {
    console.error("Failed to look up registrants to notify:", err.message);
    return 0;
  }

  // Students signed up to help at the event are told too (once, even if they are also registered).
  try {
    const helpers = await EventVolunteer.find({ event: eventId }).populate("user", "name email language");
    const known = new Set(registrants.map((r) => String(r.user?._id)));
    registrants = [...registrants, ...helpers.filter((h) => h.user && !known.has(String(h.user._id))).map((h) => ({ user: h.user, helper: true }))];
  } catch (err) {
    console.error("Failed to look up volunteers to notify:", err.message);
  }

  const sends = registrants
    .filter((r) => r.user?.email)
    .map((r) =>
      sendEmail({
        to: r.user.email,
        subject: heading(pickLanguage(r.user.language)),
        html: renderEmail({
          heading: heading(pickLanguage(r.user.language)),
          bodyHtml: bodyHtml(r.user, pickLanguage(r.user.language), !!r.helper),
          language: pickLanguage(r.user.language),
        }),
      }).catch((err) => {
        console.error(`Failed to notify ${r.user.email}:`, err.message);
      })
    );

  await Promise.allSettled(sends);
  // The same news under the bell in the app, for students who don't read email.
  if (app) await pushNotifications(registrants.map((r) => r.user?._id), app);
  return sends.length;
}

const base = (user, event, lang, helper = false) => ({
  helper,
  name: escapeHtml(user.name),
  title: escapeHtml(event.title),
  rawTitle: event.title,
  when: formatEventDate(event.date, lang),
  where: escapeHtml(event.location),
});

// event must have title/date/location from BEFORE the fields below were
// changed is for comparison -- call this after saving the new values, with
// what the fields used to be.
async function notifyEventRescheduled(event, { oldDate, oldLocation }) {
  const dateChanged = new Date(oldDate).getTime() !== new Date(event.date).getTime();
  const locationChanged = oldLocation !== event.location;
  if (!dateChanged && !locationChanged) return;

  await notifyRegistrants(event._id, {
    heading: (lang) => eventEmail("rescheduled", lang, { name: "", title: "", rawTitle: event.title }).heading,
    app: { type: "event_changed", title: `${event.title} was updated (new time or place)`, link: `/events/${event._id}` },
    bodyHtml: (user, lang, helper) =>
      eventEmail("rescheduled", lang, {
        ...base(user, event, lang, helper),
        dateChanged,
        locationChanged,
        oldWhen: formatEventDate(oldDate, lang),
        oldWhere: escapeHtml(oldLocation),
      }).bodyHtml,
  });
}

async function notifyEventCancelled(event) {
  await notifyRegistrants(event._id, {
    heading: (lang) => eventEmail("cancelled", lang, { name: "", title: "", rawTitle: event.title }).heading,
    app: { type: "event_cancelled", title: `${event.title} was cancelled`, link: "/events" },
    bodyHtml: (user, lang, helper) => eventEmail("cancelled", lang, base(user, event, lang, helper)).bodyHtml,
  });
}

// A free-text message from an admin to everyone registered for the event
// (venue details, what to bring, a late start...). The text is escaped and
// line breaks kept, so whatever an admin types can't inject markup into the
// email. Returns how many emails were attempted.
async function notifyEventAnnouncement(event, message) {
  const messageHtml = escapeHtml(message).replace(/\r?\n/g, "<br>");
  return notifyRegistrants(event._id, {
    heading: (lang) => eventEmail("announcement", lang, { name: "", title: "", rawTitle: event.title, messageHtml: "" }).heading,
    app: { type: "event_message", title: `New message about ${event.title}`, link: `/events/${event._id}` },
    bodyHtml: (user, lang, helper) => eventEmail("announcement", lang, { ...base(user, event, lang, helper), messageHtml }).bodyHtml,
  });
}

module.exports = { notifyEventRescheduled, notifyEventCancelled, notifyEventAnnouncement };
