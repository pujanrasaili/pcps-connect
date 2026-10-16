const ClubMembership = require("../models/ClubMembership");
const sendEmail = require("./sendEmail");
const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");
const { formatEventDate } = require("./formatEventDate");

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

  const heading = `New event from ${club.name}`;
  await Promise.allSettled(
    recipients.map((user) =>
      sendEmail({
        to: user.email,
        subject: `${club.name}: ${event.title}`,
        html: renderEmail({
          heading,
          bodyHtml: `
            <p style="margin: 0 0 12px;">Hi ${escapeHtml(user.name)},</p>
            <p style="margin: 0 0 16px;"><strong>${escapeHtml(club.name)}</strong> just announced <strong>${escapeHtml(event.title)}</strong>:</p>
            <p style="margin: 0 0 4px;"><strong>When:</strong> ${formatEventDate(event.date)}</p>
            <p style="margin: 0;"><strong>Where:</strong> ${escapeHtml(event.location)}</p>
            <p style="margin: 16px 0 0;">Log in to PCPS Connect to register. You're getting this because you joined ${escapeHtml(club.name)}; you can turn club updates off in Settings.</p>
          `,
        }),
      }).catch((err) => console.error(`Failed to email ${user.email} about new club event:`, err.message))
    )
  );
  return recipients.length;
}

module.exports = { notifyNewClubEvent };
