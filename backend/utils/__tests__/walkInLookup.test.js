const { walkInQuery } = require("../walkInLookup");

describe("walkInQuery", () => {
  it("looks up an email in lower case, approved accounts only", () => {
    expect(walkInQuery({ identifier: "  Sita@PatanCollege.edu.np " })).toEqual({
      query: { email: "sita@patancollege.edu.np", approvalStatus: "approved" },
    });
  });
  it("otherwise treats it as a student ID", () => {
    expect(walkInQuery({ identifier: "PCPS-123" })).toEqual({ query: { studentId: "PCPS-123", approvalStatus: "approved" } });
  });
  it("rejects missing, non-text, too short and too long input", () => {
    for (const identifier of [undefined, 42, { $ne: "" }, "", " ab ", "x".repeat(101)]) {
      expect(walkInQuery({ identifier }).error).toBe("Enter the student's email or student ID");
    }
    expect(walkInQuery().error).toBeDefined();
  });
});
