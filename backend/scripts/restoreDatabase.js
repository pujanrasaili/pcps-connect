// Loads a backup made by `npm run backup` into the database in MONGO_URI.
//   npm run restore -- "D:\backups\pcps-backup-2026-11-11-0700"
// Only empty collections are filled (nothing is overwritten), so point
// MONGO_URI at a new, empty database. It asks you to type the database name
// first; --yes skips that question.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const { restoreBackup } = require("../utils/restorePlan");

const { EJSON } = mongoose.mongo.BSON;
const modelsDir = path.join(__dirname, "..", "models");

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); }));
}

async function run() {
  const args = process.argv.slice(2);
  const folder = args.find((a) => !a.startsWith("--"));
  if (!folder) {
    console.error('Usage: npm run restore -- "<backup folder>" [--yes]');
    process.exit(1);
  }
  const models = fs.readdirSync(modelsDir).filter((f) => f.endsWith(".js")).map((f) => require(path.join(modelsDir, f)));

  await mongoose.connect(process.env.MONGO_URI);
  const dbName = mongoose.connection.name;
  console.log(`Backup:   ${path.resolve(folder)}`);
  console.log(`Database: ${dbName}`);
  console.log("Only empty collections are filled; nothing is overwritten or deleted.");
  if (!args.includes("--yes")) {
    const typed = await ask(`Type the database name (${dbName}) to continue: `);
    if (typed !== dbName) {
      console.log("Not confirmed. Nothing was changed.");
      await mongoose.disconnect();
      process.exit(1);
    }
  }

  const results = await restoreBackup(models, path.resolve(folder), EJSON);
  for (const [name, r] of Object.entries(results)) {
    console.log(r.skipped ? `${name}: skipped (${r.skipped})` : `${name}: restored ${r.restored}`);
  }
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Restore failed:", err.message);
  process.exit(1);
});
