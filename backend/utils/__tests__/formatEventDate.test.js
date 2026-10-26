const { formatEventDate } = require("../formatEventDate");

describe("formatEventDate", () => {
  const original = process.env.EVENT_TIMEZONE;
  afterEach(() => {
    if (original === undefined) delete process.env.EVENT_TIMEZONE;
    else process.env.EVENT_TIMEZONE = original;
  });

  it("writes the time in Nepal, whatever zone the server runs in", () => {
    delete process.env.EVENT_TIMEZONE;
    // 04:15 UTC is 10:00 in Nepal (UTC+5:45).
    expect(formatEventDate("2030-01-10T04:15:00Z")).toBe("Thu, Jan 10, 2030, 10:00 AM (Nepal time)");
  });

  it("rolls over to the next day when Nepal is already past midnight", () => {
    delete process.env.EVENT_TIMEZONE;
    expect(formatEventDate("2030-01-10T20:00:00Z")).toContain("Fri, Jan 11, 2030, 1:45 AM");
  });

  it("uses another zone when EVENT_TIMEZONE says so", () => {
    process.env.EVENT_TIMEZONE = "UTC";
    expect(formatEventDate("2030-01-10T04:15:00Z")).toBe("Thu, Jan 10, 2030, 4:15 AM");
  });

  it("falls back to Nepal if EVENT_TIMEZONE is mistyped", () => {
    process.env.EVENT_TIMEZONE = "Not/AZone";
    expect(formatEventDate("2030-01-10T04:15:00Z")).toContain("10:00 AM (Nepal time)");
  });
});
