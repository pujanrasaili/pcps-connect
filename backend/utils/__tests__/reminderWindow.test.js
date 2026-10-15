const { getReminderWindow } = require("../reminderWindow");

describe("getReminderWindow", () => {
  it("returns a 24-hour window starting at the given time", () => {
    const now = new Date("2026-03-10T09:00:00Z");
    const { start, end } = getReminderWindow(now);

    expect(start).toBe(now);
    expect(end.toISOString()).toBe("2026-03-11T09:00:00.000Z");
  });

  it("defaults to the current time when called with no argument", () => {
    const before = Date.now();
    const { start, end } = getReminderWindow();
    const after = Date.now();

    expect(start.getTime()).toBeGreaterThanOrEqual(before);
    expect(start.getTime()).toBeLessThanOrEqual(after);
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
