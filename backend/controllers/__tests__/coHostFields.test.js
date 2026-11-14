// Controllers that load only some fields of an event must still load `coHosts`,
// or canManageEvent can't see the co-hosting clubs and refuses their leaders.
const fs = require("fs");
const path = require("path");

const FILES = [
  "adminController.js",
  "eventJoinLinkController.js",
  "eventQuestionController.js",
  "eventVolunteerController.js",
  "walkInController.js",
];

describe("partial event loads keep coHosts", () => {
  it.each(FILES)("%s asks for coHosts wherever it asks for club on an event", (file) => {
    const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    // Event field lists: .select("...") / .populate("event", "...") that mention club
    const lists = [...source.matchAll(/(?:Event\.find(?:ById|One)?\([^)]*\)|\.populate\("event",)\s*\.?(?:select\()?\s*"([^"]*\bclub\b[^"]*)"/g)].map((m) => m[1]);
    expect(lists.length).toBeGreaterThan(0);
    for (const list of lists) expect(list).toMatch(/\bcoHosts\b/);
  });
});
