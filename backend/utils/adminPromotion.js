// Decides what `npm run make-admin -- someone@patancollege.edu.np` should do
// to the account it found. Kept separate from the script so the rules are
// testable without a database.
//
// Promoting also marks the account verified and approved: the very first admin
// can't be approved by another admin, so without this they could be made an
// admin and still be unable to log in.
function planAdminPromotion(user) {
  if (!user) return { action: "none", message: "No account with that email. Register it on the site first, then run this again." };

  const alreadyAdmin = user.role === "admin";
  const loginReady = user.emailVerified === true && user.approvalStatus === "approved";
  if (alreadyAdmin && loginReady) {
    return { action: "none", message: `${user.email} is already an admin. Nothing changed.` };
  }

  return {
    action: "promote",
    update: { role: "admin", emailVerified: true, approvalStatus: "approved" },
    message: `${user.email} is now an admin (and verified + approved, so they can log in).`,
  };
}

module.exports = { planAdminPromotion };
