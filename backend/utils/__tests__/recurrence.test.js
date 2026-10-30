const { planOccurrences, MAX_OCCURRENCES } = require("../recurrence");

describe("planOccurrences", () => {
  const first = "2027-01-07T04:15:00.000Z";

  it("returns just the one date when no repeat is asked for", () => {
    for (const repeat of [undefined, null, "", "none"]) {
      const { dates, error } = planOccurrences(first, repeat, undefined);
      expect(error).toBeUndefined();
      expect(dates).toHaveLength(1);
      expect(dates[0].toISOString()).toBe(first);
    }
  });

  it("makes a weekly series at the same time of day", () => {
    const { dates } = planOccurrences(first, "weekly", "4");
    expect(dates.map((d) => d.toISOString())).toEqual([
      "2027-01-07T04:15:00.000Z",
      "2027-01-14T04:15:00.000Z",
      "2027-01-21T04:15:00.000Z",
      "2027-01-28T04:15:00.000Z",
    ]);
  });

  it("makes a fortnightly series", () => {
    const { dates } = planOccurrences(first, "biweekly", 3);
    expect(dates.map((d) => d.toISOString().slice(0, 10))).toEqual(["2027-01-07", "2027-01-21", "2027-02-04"]);
  });

  it("rejects a bad repeat, a bad count, and a bad date", () => {
    expect(planOccurrences(first, "daily", 4).error).toMatch(/weekly/);
    expect(planOccurrences(first, { $gt: "" }, 4).error).toMatch(/weekly/);
    for (const bad of [undefined, "", "abc", 1, 0, -3, 2.5, MAX_OCCURRENCES + 1, "999"]) {
      expect(planOccurrences(first, "weekly", bad).error).toMatch(/between 2 and 12/);
    }
    expect(planOccurrences("banana", "weekly", 4).error).toMatch(/valid date/);
  });

  it("accepts the largest allowed series", () => {
    expect(planOccurrences(first, "weekly", MAX_OCCURRENCES).dates).toHaveLength(MAX_OCCURRENCES);
  });
});
