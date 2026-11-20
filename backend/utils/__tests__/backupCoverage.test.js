const fs = require("fs");
const path = require("path");

// A new model must be added to the backup script (scripts/backupDatabase.js)
// or deliberately left out here, so data is never silently missing from backups.
const LEFT_OUT = ["Notification", "PushSubscription"];

const modelsDir = path.join(__dirname, "..", "..", "models");
const script = fs.readFileSync(path.join(__dirname, "..", "..", "scripts", "backupDatabase.js"), "utf8");
const models = fs.readdirSync(modelsDir).filter((f) => f.endsWith(".js")).map((f) => f.replace(/\.js$/, ""));

describe("database backup coverage", () => {
  it("saves every model except the ones deliberately left out", () => {
    const missing = models.filter((m) => !LEFT_OUT.includes(m) && !script.includes(`require("../models/${m}")`));
    expect(missing).toEqual([]);
  });

  it("only leaves out models that exist", () => {
    expect(LEFT_OUT.filter((m) => !models.includes(m))).toEqual([]);
  });
});
