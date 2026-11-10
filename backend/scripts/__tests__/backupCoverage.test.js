const fs = require("fs");
const path = require("path");

// A backup that quietly skips a collection is worse than none. Every model
// file must either be listed in scripts/backupDatabase.js or be on the
// short list of data that is meant to disappear on its own.
const NOT_BACKED_UP = new Set(["Notification", "PushSubscription"]); // Notification expires after 60 days; a push subscription belongs to one device and is simply made again

describe("backup coverage", () => {
  const script = fs.readFileSync(path.join(__dirname, "..", "backupDatabase.js"), "utf8");
  const modelsDir = path.join(__dirname, "..", "..", "models");
  const models = fs.readdirSync(modelsDir).filter((f) => f.endsWith(".js")).map((f) => f.replace(/\.js$/, ""));

  it.each(models)("%s is backed up (or deliberately not)", (name) => {
    if (NOT_BACKED_UP.has(name)) return;
    expect(script).toContain(`require("../models/${name}")`);
  });
});
