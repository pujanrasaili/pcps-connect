// One-time migration: clears the invented club-lead names/emails/founded
// years that seed.js originally wrote into the database.
//
// Why this is necessary: seed.js's sample data included made-up club
// president names (e.g. "Aayush Shrestha"), made-up emails, and made-up
// founding years, purely as placeholder demo content. Those were never
// meant to be shown as real people on the live site. This script blanks
// those three fields on every existing club WITHOUT deleting or
// recreating the club documents -- deleting and reinserting would hand
// out new _ids and silently break any ClubMembership rows that already
// point at the old ones. The club's real name/category/description are
// left untouched.
//
// Safe to run more than once -- it only clears fields that are still set.
// Once PCPS gives you real club leads, set them from the admin panel (or
// re-run a script like this one with real values).
//
// Run with:  node scripts/backfillRemoveFakeClubLeads.js

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Club = require("../models/Club");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Clearing placeholder club-lead info...");

  const result = await Club.updateMany(
    {},
    { $set: { leadName: "", leadRole: "", email: "", foundedYear: "" } }
  );

  console.log(`Updated ${result.modifiedCount} club(s) -- lead name/role/email/founded year cleared.`);
  console.log("Club names, categories, and descriptions were left untouched.");

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Backfill failed:", err.message);
  process.exit(1);
});
