const ClubMembership = require("../models/ClubMembership");
const sendEmail = require("./sendEmail");
const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");
const { formatEventDate } = require("./formatEventDate");
const { unsubscribeHeaders, settingsLink } = require("./unsubscribe");
const { pushNotifications } = require("./inApp");
const { pickLanguage } = require("./emailText");
const { clubEmail, settingsWord } = require("./clubEmailText");

// Tells everyone who has joined `club` (and hasn't turned club updates off in
// Settings) that it just announced a new event. Same best-effort rules as the
// other notification emails: one bounced address never blocks the rest, and
// nothing here is allowed to turn a successful "event created" into a 500.
// Returns how many emails were attempted.
async function notifyNewClubEvent(event, club) {
  let memberships;
  try {
    memberships = await ClubMembership.find({ club: club._id }).populate("user", "name email clubUpdates language");
  } catch (err) {
    console.error("Failed to look up club members to notify:", err.message);
    return 0;
  }

  const recipients = memberships
    .map((m) => m.user)
    .filter((u) => u?.email && u.clubUpdates !== false);

  await pushNotifications(
    recipients.map((u) => u._id).filter(Boolean),
    {
      type: "club_event",
      title: `${club.name} announced ${event.title}`,
      link: event._id ? `/events/${event._id}` : "/events",
    }
  );

  await Promise.allSettled(
    recipients.map((user) => {
      const lang = pickLanguage(user.language);
      const mail = clubEmail("newEvent", lang, {
        name: escapeHtml(user.name),
        club: escapeHtml(club.name),
        rawClub: club.name,
        title: escapeHtml(event.title),
        rawTitle: event.title,
        when: formatEventDate(event.date, lang),
        where: escapeHtml(event.location),
        settings: settingsLink(undefined, settingsWord(lang)),
      });
      return sendEmail({
        to: user.email,
        headers: unsubscribeHeaders(),
        subject: mail.subject,
        html: renderEmail({ heading: mail.heading, bodyHtml: mail.bodyHtml, language: lang }),
      }).catch((err) => console.error(`Failed to email ${user.email} about new club event:`, err.message));
    })
  );
  return recipients.length;
}

// Emails a free-text message from the admins to everyone who joined `club`
// (skipping those who turned club updates off). Unlike the new-event mail,
// a failed member lookup is thrown rather than swallowed: the admin pressed
// "send" on purpose and should be told when nothing went out. Individual
// bounced addresses are still just logged. Returns how many were emailed.
async function notifyClubAnnouncement(club, message) {
  const memberships = await ClubMembership.find({ club: club._id }).populate("user", "name email clubUpdates language");
  const recipients = memberships
    .map((m) => m.user)
    .filter((u) => u?.email && u.clubUpdates !== false);

  await pushNotifications(
    recipients.map((u) => u._id).filter(Boolean),
    { type: "club_message", title: `${club.name}: ${String(message).slice(0, 120)}`, link: "/dashboard" }
  );

  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br>");
  await Promise.allSettled(
    recipients.map((user) => {
      const lang = pickLanguage(user.language);
      const mail = clubEmail("message", lang, {
        name: escapeHtml(user.name),
        club: escapeHtml(club.name),
        rawClub: club.name,
        messageHtml: safeMessage,
        settings: settingsLink(undefined, settingsWord(lang)),
      });
      return sendEmail({
        to: user.email,
        headers: unsubscribeHeaders(),
        subject: mail.subject,
        html: renderEmail({ heading: mail.heading, bodyHtml: mail.bodyHtml, language: lang }),
      }).catch((err) => console.error(`Failed to email ${user.email} a club message:`, err.message));
    })
  );
  return recipients.length;
}

module.exports = { notifyNewClubEvent, notifyClubAnnouncement };
