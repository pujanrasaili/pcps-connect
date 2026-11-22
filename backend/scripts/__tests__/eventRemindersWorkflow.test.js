const fs = require("fs");
const path = require("path");

const text = fs.readFileSync(path.join(__dirname, "../../../.github/workflows/event-reminders.yml"), "utf8");

// The script reminds about "the next 24 hours". Run once a day, an event that
// starts just after that run the next day is only reminded minutes before it
// begins, so there are two runs, about six hours apart in the working day.
describe("event reminders workflow", () => {
  it("runs twice a day: 03:00 and 09:00 UTC (8:45 am and 2:45 pm in Nepal)", () => {
    const crons = [...text.matchAll(/cron: "([^"]+)"/g)].map((m) => m[1]);
    expect(crons).toEqual(["0 3 * * *", "0 9 * * *"]);
  });

  it("describes the times correctly in the comment", () => {
    expect(text).toContain("8:45 am in Nepal");
    expect(text).not.toContain("mid-to-late morning");
  });

  it("can be started by hand and sends no mail without the secrets", () => {
    expect(text).toContain("workflow_dispatch:");
    expect(text).toContain("secrets.MONGO_URI");
  });
});
