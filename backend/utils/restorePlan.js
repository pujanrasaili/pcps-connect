const fs = require("fs");
const path = require("path");

// Loads a backup folder (made by `npm run backup`) back into the database.
// `EJSON` is passed in (mongoose.mongo.BSON.EJSON) to keep this file free of
// database dependencies.
//
// Safe by design:
//   * every file is read and checked against manifest.json BEFORE anything is
//     written, so a damaged backup changes nothing;
//   * a collection that already has documents is left alone (restore into an
//     empty database; nothing is ever overwritten or deleted);
//   * documents go in through the raw collection, so ids, dates and password
//     hashes come back exactly as saved (no validation, hooks or re-hashing).
// Returns { collection: { restored, skipped? } } for the files that exist.
async function restoreBackup(models, folder, EJSON) {
  const manifestFile = path.join(folder, "manifest.json");
  if (!fs.existsSync(manifestFile)) throw new Error(`${folder} is not a backup folder (manifest.json is missing)`);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));

  const planned = [];
  for (const Model of models) {
    const name = Model.collection.name;
    const file = path.join(folder, `${name}.json`);
    if (!fs.existsSync(file)) continue;
    const docs = EJSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(docs)) throw new Error(`${name}.json is not a list of documents`);
    const expected = manifest.counts?.[name];
    if (expected !== undefined && expected !== docs.length) {
      throw new Error(`${name}.json has ${docs.length} documents but the manifest says ${expected}`);
    }
    planned.push({ Model, name, docs });
  }

  const results = {};
  for (const { Model, name, docs } of planned) {
    if ((await Model.collection.countDocuments({})) > 0) {
      results[name] = { restored: 0, skipped: "already has data" };
      continue;
    }
    if (docs.length > 0) await Model.collection.insertMany(docs);
    results[name] = { restored: docs.length };
  }
  return results;
}

module.exports = { restoreBackup };
