// Makes one account an admin. This is how the very first admin is created:
// signing up can never produce an admin, by design, and an existing admin can
// only promote others from the Users page.
//
// 1. Register the account on the site (a @patancollege.edu.np address).
// 2. From backend/, with your normal .env (the live MONGO_URI):
//      npm run make-admin -- someone@patancollege.edu.np
//
// The account is also marked verified + approved so it can log in right away.

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const User = require("../models/User");
const { planAdminPromotion } = require("../utils/adminPromotion");

async function run() {
  const email = (process.argv[2] || "").trim().toLowerCase();
  if (!email) {
    console.error("Usage: npm run make-admin -- someone@patancollege.edu.np");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email });
  const plan = planAdminPromotion(user);
  if (plan.action === "promote") await User.updateOne({ _id: user._id }, plan.update);
  console.log(plan.message);

  await mongoose.disconnect();
  process.exit(plan.action === "promote" || user ? 0 : 1);
}

run().catch((err) => {
  console.error("make-admin failed:", err.message);
  process.exit(1);
});
