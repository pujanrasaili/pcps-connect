// Pure helpers for scripts/backupDatabase.js (kept apart so they can be tested
// without a database).
const path = require("path");
const os = require("os");
const fs = require("fs");

// "pcps-backup-2026-10-24-1230" -- sorts by date in a folder listing.
function backupFolderName(date = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `pcps-backup-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`;
}

// Where backups go when --out isn't given: a folder in the person's home
// directory, NOT inside the project.
function defaultBackupRoot(home = os.homedir()) {
  return path.join(home, "pcps-backups");
}

// A backup holds students' personal details and password hashes. The GitHub
// repository is public, so a backup written inside the project folder could
// be committed by accident. The script refuses to write there.
function isInsideDirectory(target, directory) {
  const relative = path.relative(path.resolve(directory), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

// Writes one <collection>.json per model (canonical Extended JSON, so object
// ids and dates survive) plus a manifest of counts. Returns the counts.
// `EJSON` is passed in (mongoose.mongo.BSON.EJSON) to keep this file free of
// database dependencies.
async function writeBackup(models, folder, EJSON, now = new Date()) {
  fs.mkdirSync(folder, { recursive: true });
  const counts = {};
  for (const Model of models) {
    const name = Model.collection.name;
    const docs = await Model.find({}).lean();
    fs.writeFileSync(path.join(folder, `${name}.json`), EJSON.stringify(docs, { relaxed: false }, 2));
    counts[name] = docs.length;
  }
  fs.writeFileSync(path.join(folder, "manifest.json"), JSON.stringify({ savedAt: now.toISOString(), counts }, null, 2));
  return counts;
}

module.exports = { backupFolderName, defaultBackupRoot, isInsideDirectory, writeBackup };
