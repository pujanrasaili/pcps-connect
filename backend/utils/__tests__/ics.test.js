const { buildIcs } = require("../ics");

const event = {
  _id: "e1",
  title: "Hack Night",
  location: "Lab 2, Block A",
  description: "Bring a laptop;\nsnacks, too",
  date: "2027-01-15T09:30:00Z",
};

describe("buildIcs", () => {
  it("builds a valid single-event calendar with CRLF line endings", () => {
    const ics = buildIcs(event, new Date("2026-10-01T00:00:00Z"));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20270115T093000Z");
    expect(ics).toContain("DTEND:20270115T113000Z");
    expect(ics).toContain("UID:e1@pcps-connect");
    expect(ics).toContain("METHOD:PUBLISH");
  });

  it("escapes commas, semicolons and newlines in text fields", () => {
    const ics = buildIcs(event);
    expect(ics).toContain("LOCATION:Lab 2\\, Block A");
    expect(ics).toContain("DESCRIPTION:Bring a laptop\;\\nsnacks\\, too");
  });

  it("adds a day-before and an hour-before reminder inside the event", () => {
    const ics = buildIcs(event);
    expect(ics).toContain("TRIGGER:-P1D");
    expect(ics).toContain("TRIGGER:-PT1H");
    expect(ics.indexOf("END:VALARM")).toBeLessThan(ics.indexOf("END:VEVENT"));
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
  });

  it("folds lines longer than 75 characters", () => {
    const ics = buildIcs({ ...event, description: "x".repeat(200) });
    for (const line of ics.split("\r\n")) expect(line.length).toBeLessThanOrEqual(75);
  });
});
