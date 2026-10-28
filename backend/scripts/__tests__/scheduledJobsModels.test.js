const fs = require("fs");
const path = require("path");

// The scheduled email jobs call populate() on models they never import by
// name. Mongoose then throws "Schema hasn't been registered for model ..." the
// first time there is something to send -- which only shows up in production.
// Every model a script populates must be required by the script.
const NEEDS = {
  "sendEventReminders.js": ["User"],
  "sendWeeklyDigest.js": ["Club", "User"],
};

describe("scheduled email jobs register the models they populate", () => {
  for (const [file, models] of Object.entries(NEEDS)) {
    for (const model of models) {
      it(`${file} requires models/${model}`, () => {
        const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
        expect(source).toMatch(new RegExp(`require\\("\\.\\./models/${model}"\\)`));
      });
    }
  }
});
