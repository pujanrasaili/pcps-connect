const { checkSeedAllowed } = require("../seedGuard");

describe("checkSeedAllowed", () => {
  it("allows seeding an empty database", () => {
    expect(checkSeedAllowed({ clubCount: 0, eventCount: 0, force: false })).toEqual({ allowed: true, message: "" });
  });

  it("refuses when clubs already exist, and says how many", () => {
    const result = checkSeedAllowed({ clubCount: 7, eventCount: 0, force: false });
    expect(result.allowed).toBe(false);
    expect(result.message).toMatch(/7 club/);
    expect(result.message).toMatch(/--force/);
  });

  it("refuses when only events exist", () => {
    const result = checkSeedAllowed({ clubCount: 0, eventCount: 3, force: false });
    expect(result.allowed).toBe(false);
    expect(result.message).toMatch(/3 event/);
  });

  it("proceeds with --force even when data exists", () => {
    expect(checkSeedAllowed({ clubCount: 7, eventCount: 3, force: true }).allowed).toBe(true);
  });
});
