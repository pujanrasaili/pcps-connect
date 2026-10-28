const { weekWindows, trend, WEEK_MS } = require("../weekSummary");

describe("weekWindows", () => {
  it("returns back-to-back 7-day windows and the next 7 days", () => {
    const now = new Date("2026-10-28T06:00:00Z");
    const w = weekWindows(now);
    expect(w.now.toISOString()).toBe("2026-10-28T06:00:00.000Z");
    expect(w.thisStart.toISOString()).toBe("2026-10-21T06:00:00.000Z");
    expect(w.prevStart.toISOString()).toBe("2026-10-14T06:00:00.000Z");
    expect(w.nextWeekEnd.toISOString()).toBe("2026-11-04T06:00:00.000Z");
    expect(w.now - w.thisStart).toBe(WEEK_MS);
  });
});

describe("trend", () => {
  it("rounds the percent change", () => {
    expect(trend(5, 4)).toEqual({ current: 5, previous: 4, change: 25 });
    expect(trend(1, 3)).toEqual({ current: 1, previous: 3, change: -67 });
    expect(trend(3, 3).change).toBe(0);
  });

  it("has no percentage when last week was zero", () => {
    expect(trend(4, 0)).toEqual({ current: 4, previous: 0, change: null });
    expect(trend(0, 0).change).toBeNull();
  });

  it("treats missing values as zero", () => {
    expect(trend(undefined, null)).toEqual({ current: 0, previous: 0, change: null });
  });
});
