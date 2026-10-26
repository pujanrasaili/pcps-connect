const { parseFixOptions, planEventTimeFix } = require("../eventTimeFix");

describe("parseFixOptions", () => {
  it("requires --before", () => {
    expect(parseFixOptions([]).error).toMatch(/--before/);
  });
  it("rejects a bad date and a bad --minutes", () => {
    expect(parseFixOptions(["--before", "banana"]).error).toMatch(/not a valid/);
    expect(parseFixOptions(["--before", "2026-10-26T04:00:00Z", "--minutes", "0"]).error).toMatch(/--minutes/);
    expect(parseFixOptions(["--before", "2026-10-26T04:00:00Z", "--minutes", "x"]).error).toMatch(/--minutes/);
  });
  it("defaults to 345 minutes and previews unless --yes is given", () => {
    const o = parseFixOptions(["--before", "2026-10-26T04:00:00Z"]);
    expect(o.minutes).toBe(345);
    expect(o.apply).toBe(false);
    expect(o.cutoff).toEqual(new Date("2026-10-26T04:00:00Z"));
    expect(parseFixOptions(["--before", "2026-10-26T04:00:00Z", "--yes"]).apply).toBe(true);
  });
});

describe("planEventTimeFix", () => {
  const options = { cutoff: new Date("2026-10-26T04:00:00Z"), minutes: 345 };
  it("shifts only events created before the cutoff, and their deadline too", () => {
    const plan = planEventTimeFix(
      [
        { _id: "old", title: "Old", date: "2026-11-01T10:00:00Z", createdAt: "2026-10-01T00:00:00Z", registrationDeadline: "2026-10-31T10:00:00Z" },
        { _id: "new", title: "New", date: "2026-11-02T04:15:00Z", createdAt: "2026-10-27T00:00:00Z" },
        { _id: "nodate", title: "Unknown", date: "2026-11-03T10:00:00Z" },
      ],
      options
    );
    expect(plan).toHaveLength(1);
    expect(plan[0].id).toBe("old");
    expect(plan[0].to).toEqual(new Date("2026-11-01T04:15:00Z"));
    expect(plan[0].deadlineTo).toEqual(new Date("2026-10-31T04:15:00Z"));
  });
  it("leaves the deadline null when there is none", () => {
    const [p] = planEventTimeFix([{ _id: "a", title: "A", date: "2026-11-01T10:00:00Z", createdAt: "2026-10-01T00:00:00Z" }], options);
    expect(p.deadlineTo).toBeNull();
  });
});
