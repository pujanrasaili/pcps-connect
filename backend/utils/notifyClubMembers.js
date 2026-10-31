const ClubMembership = require("../models/ClubMembership");
const sendEmail = require("./sendEmail");
const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");
const { formatEventDate } = require("./formatEventDate");
const { unsubscribeHeaders, settingsLink } = require("./unsubscribe");
const { pushNotifications } = require("./inApp");

// Tells everyone who has joined `club` (and hasn't turned club updates off in
// Settings) that it just announced a new event. Same best-effort rules as the
// other notification emails: one bounced address never blocks the rest, and
// nothing here is allowed to turn a successful "event created" into a 500.
// Returns how many emails were attempted.
async function notifyNewClubEvent(event, club) {
  let memberships;
  try {
    memberships = await ClubMembership.find({ club: club._id }).populate("user", "name email clubUpdates");
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

  const heading = `New event from ${club.name}`;
  await Promise.allSettled(
    recipients.map((user) =>
      sendEmail({
        to: user.email,
        headers: unsubscribeHeaders(),
        subject: `${club.name}: ${event.title}`,
        html: renderEmail({
          heading,
          bodyHtml: `
            <p style="margin: 0 0 12px;">Hi ${escapeHtml(user.name)},</p>
            <p style="margin: 0 0 16px;"><strong>${escapeHtml(club.name)}</strong> just announced <strong>${escapeHtml(event.title)}</strong>:</p>
            <p style="margin: 0 0 4px;"><strong>When:</strong> ${formatEventDate(event.date)}</p>
            <p style="margin: 0;"><strong>Where:</strong> ${escapeHtml(event.location)}</p>
            <p style="margin: 16px 0 0;">Log in to PCPS Connect to register. You're getting this because you joined ${escapeHtml(club.name)}; you can turn club updates off in ${settingsLink()}.</p>
          `,
        }),
      }).catch((err) => console.error(`Failed to email ${user.email} about new club event:`, err.message))
    )
  );
  return recipients.length;
}

// Emails a free-text message from the admins to everyone who joined `club`
// (skipping those who turned club updates off). Unlike the new-event mail,
// a failed member lookup is thrown rather than swallowed: the admin pressed
// "send" on purpose and should be told when nothing went out. Individual
// bounced addresses are still just logged. Returns how many were emailed.
async function notifyClubAnnouncement(club, message) {
  const memberships = await ClubMembership.find({ club: club._id }).populate("user", "name email clubUpdates");
  const recipients = memberships
    .map((m) => m.user)
    .filter((u) => u?.email && u.clubUpdates !== false);

  await pushNotifications(
    recipients.map((u) => u._id).filter(Boolean),
    { type: "club_message", title: `${club.name}: ${String(message).slice(0, 120)}`, link: "/dashboard" }
  );

  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br>");
  await Promise.allSettled(
    recipients.map((user) =>
      sendEmail({
        to: user.email,
        headers: unsubscribeHeaders(),
        subject: `Message from ${club.name}`,
        html: renderEmail({
          heading: `Message from ${club.name}`,
          bodyHtml: `
            <p style="margin: 0 0 12px;">Hi ${escapeHtml(user.name)},</p>
            <p style="margin: 0 0 16px;">The organisers of <strong>${escapeHtml(club.name)}</strong> sent a message to all members:</p>
            <div style="margin: 0; padding: 12px 16px; border-left: 3px solid #6366f1; background: #f8fafc;">${safeMessage}</div>
            <p style="margin: 16px 0 0;">You're getting this because you joined ${escapeHtml(club.name)}; you can turn club updates off in ${settingsLink()}.</p>
          `,
        }),
      }).catch((err) => console.error(`Failed to email ${user.email} a club message:`, err.message))
    )
  );
  return recipients.length;
}

module.exports = { notifyNewClubEvent, notifyClubAnnouncement };
