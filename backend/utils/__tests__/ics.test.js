const { buildIcs, buildIcsCalendar } = require("../ics");

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
    expect(ics).toContain("DESCRIPTION:Bring a laptop\\;\\nsnacks\\, too");
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

describe("end time in the calendar file", () => {
  const base = { _id: "e1", title: "T", location: "L", description: "D", date: "2027-01-15T09:30:00.000Z" };
  it("uses the organiser's end time when there is one", () => {
    expect(buildIcs({ ...base, endDate: "2027-01-15T10:00:00.000Z" })).toContain("DTEND:20270115T100000Z");
  });
  it("falls back to two hours when there is none, or it is not after the start", () => {
    for (const endDate of [undefined, null, "2027-01-15T09:30:00.000Z", "2027-01-15T08:00:00.000Z"]) {
      expect(buildIcs({ ...base, endDate })).toContain("DTEND:20270115T113000Z");
    }
  });
});

describe("buildIcsCalendar", () => {
  const other = { ...event, _id: "e2", title: "Chess Day", date: "2027-02-01T05:00:00Z" };
  const cal = buildIcsCalendar([event, other], { name: "Coding, Club", now: new Date("2026-10-01T00:00:00Z"), urlFor: (e) => `https://site.test/events/${e._id}` });

  it("holds every event in one calendar and names it", () => {
    expect(cal.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(cal.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(cal.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(cal.match(/BEGIN:VCALENDAR/g)).toHaveLength(1);
    expect(cal).toContain("X-WR-CALNAME:Coding\\, Club");
    expect(cal).toContain("SUMMARY:Chess Day");
  });

  it("asks calendar apps to refresh and links each event to its page", () => {
    expect(cal).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT1H");
    expect(cal).toContain("URL:https://site.test/events/e2");
  });

  it("is a valid empty calendar when there are no events", () => {
    const empty = buildIcsCalendar([]);
    expect(empty).toContain("BEGIN:VCALENDAR");
    expect(empty).not.toContain("BEGIN:VEVENT");
  });
});
