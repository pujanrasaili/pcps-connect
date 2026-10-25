// One-time migration: marks every EXISTING user as verified + approved.
//
// Why this is necessary: the login flow now requires emailVerified=true
// and approvalStatus='approved' before anyone can log in. Without this
// script, every account created before this feature existed -- including
// your own admin account -- would be locked out the moment this deploys,
// since those fields default to false/"pending" for accounts that never
// went through the new registration flow.
//
// NOT harmless to repeat: it approves EVERY account that is not yet verified
// + approved, including students who are waiting for approval or were
// rejected. So it only counts them unless you pass --yes.
//
// Look first:  npm run backfill
// Then do it:  npm run backfill -- --yes

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const User = require("../models/User");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const filter = { $or: [{ emailVerified: false }, { approvalStatus: { $ne: "approved" } }] };

  if (!process.argv.includes("--yes")) {
    const waiting = await User.countDocuments(filter);
    console.log(`${waiting} account(s) are not verified + approved. Nothing was changed.`);
    console.log("This would approve ALL of them, including pending and rejected students.");
    console.log("If that is really what you want, run: npm run backfill -- --yes");
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log("Connected. Backfilling existing users...");

  const result = await User.updateMany(filter, { emailVerified: true, approvalStatus: "approved" });

  console.log(`Updated ${result.modifiedCount} existing user(s) to verified + approved.`);
  console.log("Done. New registrations from now on will go through the normal verify + approve flow.");

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Backfill failed:", err.message);
  process.exit(1);
});
