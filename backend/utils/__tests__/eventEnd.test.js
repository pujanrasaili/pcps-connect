const { parseEndDate, shiftedEnd } = require("../eventEnd");

const start = "2027-01-07T04:15:00.000Z";

describe("parseEndDate", () => {
  it("treats an empty value as no end time", () => {
    for (const raw of [undefined, null, "", "null"]) expect(parseEndDate(raw, start)).toEqual({ value: null });
  });

  it("accepts a later time on the same day or the next", () => {
    expect(parseEndDate("2027-01-07T06:15:00.000Z", start).value.toISOString()).toBe("2027-01-07T06:15:00.000Z");
    expect(parseEndDate("2027-01-08T02:00:00.000Z", start).error).toBeUndefined();
  });

  it("rejects an end that is not after the start", () => {
    expect(parseEndDate(start, start).error).toMatch(/after the start/);
    expect(parseEndDate("2027-01-07T03:00:00.000Z", start).error).toMatch(/after the start/);
  });

  it("rejects junk and objects, and events longer than 7 days", () => {
    expect(parseEndDate("banana", start).error).toMatch(/valid end time/);
    expect(parseEndDate({ $gt: "" }, start).error).toMatch(/valid end time/);
    expect(parseEndDate("2027-01-20T04:15:00.000Z", start).error).toMatch(/7 days/);
  });
});

describe("shiftedEnd", () => {
  it("moves the end by the same amount as the start, keeping the length", () => {
    const out = shiftedEnd("2027-01-07T04:15:00.000Z", "2027-01-07T06:15:00.000Z", "2027-01-14T05:00:00.000Z");
    expect(out.toISOString()).toBe("2027-01-14T07:00:00.000Z");
  });

  it("returns null when there was no end time", () => {
    expect(shiftedEnd(start, null, "2027-02-01T00:00:00.000Z")).toBeNull();
  });
});
