const { cleanClubPoll } = require("../clubPollInput");

describe("cleanClubPoll", () => {
  const ok = { question: "  Which day? ", options: [" Friday ", "Saturday"] };

  it("trims and accepts a normal poll, defaulting to 7 days", () => {
    expect(cleanClubPoll(ok)).toEqual({ question: "Which day?", options: ["Friday", "Saturday"], days: 7 });
  });

  it("takes a chosen number of days", () => {
    expect(cleanClubPoll({ ...ok, days: "3" }).days).toBe(3);
  });

  it("rejects a missing or tiny question and an over-long one", () => {
    expect(cleanClubPoll({ ...ok, question: "  " }).error).toMatch(/question/);
    expect(cleanClubPoll({ ...ok, question: "ab" }).error).toMatch(/question/);
    expect(cleanClubPoll({ ...ok, question: "x".repeat(151) }).error).toMatch(/150/);
    expect(cleanClubPoll({ ...ok, question: 42 }).error).toMatch(/question/);
  });

  it("needs 2 to 5 non-empty answers, each short and different", () => {
    expect(cleanClubPoll({ ...ok, options: ["Only one"] }).error).toMatch(/2 to 5/);
    expect(cleanClubPoll({ ...ok, options: ["a", "b", "c", "d", "e", "f"] }).error).toMatch(/2 to 5/);
    expect(cleanClubPoll({ ...ok, options: ["a", "  ", ""] }).error).toMatch(/2 to 5/);
    expect(cleanClubPoll({ ...ok, options: "nope" }).error).toMatch(/2 to 5/);
    expect(cleanClubPoll({ ...ok, options: ["a", "x".repeat(61)] }).error).toMatch(/60/);
    expect(cleanClubPoll({ ...ok, options: ["Fri", "fri"] }).error).toMatch(/different/);
  });

  it("limits how long a poll stays open", () => {
    expect(cleanClubPoll({ ...ok, days: 0 }).error).toMatch(/1 to 14/);
    expect(cleanClubPoll({ ...ok, days: 15 }).error).toMatch(/1 to 14/);
    expect(cleanClubPoll({ ...ok, days: 2.5 }).error).toMatch(/1 to 14/);
    expect(cleanClubPoll({ ...ok, days: "abc" }).error).toMatch(/1 to 14/);
  });

  it("copes with no input at all", () => {
    expect(cleanClubPoll().error).toBeDefined();
  });
});
