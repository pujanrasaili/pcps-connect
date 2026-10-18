const sendEmail = require("./sendEmail");
const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");

// Tells students an admin has just made them a club leader, so the new
// "Manage" area doesn't go unnoticed. Best-effort like every other notification
// email: a bounced address never fails the save. Returns how many were attempted.
async function notifyNewLeaders(users, club) {
  const recipients = users.filter((u) => u?.email);
  await Promise.allSettled(
    recipients.map((u) =>
      sendEmail({
        to: u.email,
        subject: `You're now a leader of ${club.name}`,
        html: renderEmail({
          heading: `You're a leader of ${club.name}`,
          bodyHtml: `
            <p style="margin: 0 0 12px;">Hi ${escapeHtml(u.name)},</p>
            <p style="margin: 0 0 16px;">An admin has made you a leader of <strong>${escapeHtml(club.name)}</strong> on PCPS Connect.</p>
            <p style="margin: 0;">Log in and open <strong>Manage</strong> in the top menu to create events for the club, see who registered, mark attendance and check students in.</p>
          `,
        }),
      })
    )
  );
  return recipients.length;
}

module.exports = { notifyNewLeaders };
