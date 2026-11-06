const sendEmail = require("./sendEmail");
const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");
const { pickLanguage } = require("./emailText");
const { noticeEmail } = require("./noticeEmailText");

// Tells students an admin has just made them a club leader, so the new
// "Manage" area doesn't go unnoticed. Best-effort like every other notification
// email: a bounced address never fails the save. Returns how many were attempted.
async function notifyNewLeaders(users, club) {
  const recipients = users.filter((u) => u?.email);
  await Promise.allSettled(
    recipients.map((u) => {
      const lang = pickLanguage(u.language);
      const mail = noticeEmail("leader", lang, { name: escapeHtml(u.name), club: escapeHtml(club.name), rawClub: club.name });
      return sendEmail({
        to: u.email,
        subject: mail.subject,
        html: renderEmail({ heading: mail.heading, bodyHtml: mail.bodyHtml, language: lang }),
      });
    })
  );
  return recipients.length;
}

module.exports = { notifyNewLeaders };
