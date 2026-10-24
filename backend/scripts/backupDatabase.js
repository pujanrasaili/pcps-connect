// Saves a copy of every collection to a folder on this computer, because the
// free MongoDB Atlas plan doesn't keep backups for you (as far as I know --
// check your Atlas cluster's "Backup" tab). Run it now and then, and before
// any risky change:
//
//   npm run backup                    (saves into ~/pcps-backups/pcps-backup-<date>/)
//   npm run backup -- --out D:\backups
//
// The files are "canonical Extended JSON" (one JSON array per collection) --
// keep object ids and dates intact and can be loaded back with mongoimport:
//   mongoimport --uri "<MONGO_URI>" --collection users --file users.json --jsonArray
//
// A backup contains students' personal details and password hashes: keep it
// private. The script refuses to write inside the project folder, because the
// GitHub repository is public.

require("dotenv").config();
const path = require("path");
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const { backupFolderName, defaultBackupRoot, isInsideDirectory, writeBackup } = require("../utils/backupPlan");

const MODELS = [
  require("../models/User"),
  require("../models/Club"),
  require("../models/Event"),
  require("../models/Registration"),
  require("../models/ClubMembership"),
  require("../models/WaitlistEntry"),
  require("../models/AuditLog"),
  require("../models/SiteNotice"),
];

const { EJSON } = mongoose.mongo.BSON;
const PROJECT_ROOT = path.join(__dirname, "..", "..");

function chooseFolder(argv) {
  const i = argv.indexOf("--out");
  const root = i !== -1 && argv[i + 1] ? path.resolve(argv[i + 1]) : defaultBackupRoot();
  return path.join(root, backupFolderName());
}

async function run() {
  const folder = chooseFolder(process.argv);
  if (isInsideDirectory(folder, PROJECT_ROOT)) {
    console.error(`Refusing to write the backup inside the project folder (${folder}).`);
    console.error("It contains personal data and the repository is public. Use --out with a folder elsewhere.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const counts = await writeBackup(MODELS, folder, EJSON);
  for (const [name, count] of Object.entries(counts)) console.log(`${name}: ${count}`);

  console.log(`\nBackup saved to ${folder}`);
  console.log("Keep it private: it contains students' details and password hashes.");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Backup failed:", err.message);
  process.exit(1);
});
