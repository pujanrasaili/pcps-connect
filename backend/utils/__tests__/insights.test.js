const { lastMonths, fillMonthly, rankClubs } = require("../insights");

describe("lastMonths", () => {
  it("returns the window oldest-first, crossing a year boundary", () => {
    const months = lastMonths(new Date("2026-02-15T10:00:00Z"), 4);
    expect(months.map((m) => m.key)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(months.map((m) => m.label)).toEqual(["Nov", "Dec", "Jan", "Feb"]);
  });

  it("handles the last day of a long month without skipping a month", () => {
    const months = lastMonths(new Date("2026-03-31T23:59:00Z"), 3);
    expect(months.map((m) => m.key)).toEqual(["2026-01", "2026-02", "2026-03"]);
  });
});

describe("fillMonthly", () => {
  it("fills months with no registrations with zero and ignores rows outside the window", () => {
    const rows = [
      { _id: { y: 2026, m: 10 }, count: 7 },
      { _id: { y: 2026, m: 8 }, count: 2 },
      { _id: { y: 2020, m: 1 }, count: 99 },
    ];
    const out = fillMonthly(rows, new Date("2026-10-20T00:00:00Z"), 4);
    expect(out).toEqual([
      { month: "2026-07", label: "Jul", count: 0 },
      { month: "2026-08", label: "Aug", count: 2 },
      { month: "2026-09", label: "Sep", count: 0 },
      { month: "2026-10", label: "Oct", count: 7 },
    ]);
  });
});

describe("rankClubs", () => {
  it("attaches names, keeps order and drops deleted clubs", () => {
    const counts = [{ _id: "c2", members: 9 }, { _id: "gone", members: 5 }, { _id: "c1", members: 3 }];
    const clubs = [{ _id: "c1", name: "Coding" }, { _id: "c2", name: "Music" }];
    expect(rankClubs(counts, clubs)).toEqual([
      { _id: "c2", name: "Music", members: 9 },
      { _id: "c1", name: "Coding", members: 3 },
    ]);
  });
});
