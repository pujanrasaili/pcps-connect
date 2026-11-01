const Club = require("../models/Club");
const User = require("../models/User");
const sendEmail = require("./sendEmail");
const renderEmail = require("./emailTemplate");
const { escapeHtml } = require("./escapeHtml");
const { pushNotifications } = require("./inApp");

// Tells the people who can decide a join request -- the club's leaders and
// every admin -- that a student is waiting. Best-effort like every other
// notification: it never throws, so the student's request itself can't fail.
async function notifyClubStaffOfRequest(club, student) {
  try {
    const withLeaders = await Club.findById(club._id).select("+leaders");
    const admins = await User.find({ role: "admin" }).select("_id");
    const title = `${student.name} asked to join ${club.name}`;
    const leaderIds = (withLeaders?.leaders || []).map(String);
    const adminIds = admins.map((a) => String(a._id)).filter((id) => !leaderIds.includes(id));
    // Leaders review in "My clubs", admins in the clubs list; an admin who also leads goes to "My clubs".
    const sent = await pushNotifications(leaderIds, { type: "club_join_request", title, link: "/admin/my-clubs" });
    return sent + (await pushNotifications(adminIds, { type: "club_join_request", title, link: "/admin/clubs" }));
  } catch (err) {
    console.error("Failed to notify club staff of a join request:", err.message);
    return 0;
  }
}

// Tells the student how their request was decided: a bell message and an
// email. Also best-effort.
async function notifyStudentOfDecision(student, club, approved) {
  const title = approved ? `You're in! ${club.name} approved your request to join` : `${club.name} declined your request to join`;
  await pushNotifications([student._id], {
    type: approved ? "club_join_approved" : "club_join_declined",
    title,
    link: "/clubs",
  });
  if (!student.email) return;
  try {
    await sendEmail({
      to: student.email,
      subject: approved ? `Welcome to ${club.name}` : `Your request to join ${club.name}`,
      html: renderEmail({
        heading: approved ? "Your request was approved" : "Your request was declined",
        bodyHtml: approved
          ? `<p style="margin: 0 0 12px;">Hi ${escapeHtml(student.name)},</p><p style="margin: 0;">The leaders of <strong>${escapeHtml(club.name)}</strong> approved your request. You are now a member, and you will see its events and news.</p>`
          : `<p style="margin: 0 0 12px;">Hi ${escapeHtml(student.name)},</p><p style="margin: 0;">The leaders of <strong>${escapeHtml(club.name)}</strong> could not accept your request to join this time. You can contact the club if you have questions.</p>`,
      }),
    });
  } catch (err) {
    console.error(`Failed to email ${student.email} about a club join decision:`, err.message);
  }
}

module.exports = { notifyClubStaffOfRequest, notifyStudentOfDecision };
