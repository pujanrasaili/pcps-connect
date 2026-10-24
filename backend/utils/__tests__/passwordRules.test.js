const { passwordProblem } = require("../passwordRules");

describe("passwordProblem", () => {
  it("accepts ordinary passwords up to 72 bytes", () => {
    expect(passwordProblem("secret1")).toBeNull();
    expect(passwordProblem("a".repeat(72))).toBeNull();
  });
  it("rejects too short and non-text", () => {
    expect(passwordProblem("12345")).toMatch(/at least 6/);
    expect(passwordProblem({ a: 1 })).toBe("must be text");
  });
  it("counts bytes, not characters", () => {
    expect(passwordProblem("a".repeat(73))).toMatch(/72 bytes/);
    expect(passwordProblem("é".repeat(37))).toMatch(/72 bytes/); // 74 bytes
  });
});
