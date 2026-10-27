jest.mock("../../models/Event");
jest.mock("../../models/Club");
const Event = require("../../models/Event");
const Club = require("../../models/Club");
const { getCalendarFeed } = require("../calendarFeedController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}
const CLUB_ID = "a".repeat(24);
const query = (events) => ({ select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue(events) });
const sample = [{ _id: "e1", title: "Hack Night", description: "d", location: "Lab", date: new Date("2030-01-01T10:00:00Z") }];

describe("getCalendarFeed", () => {
  afterEach(() => jest.resetAllMocks());

  it("returns every recent and upcoming event as a calendar file", async () => {
    Event.find.mockReturnValue(query(sample));
    const res = mockRes();
    await getCalendarFeed({ query: {} }, res);
    const filter = Event.find.mock.calls[0][0];
    expect(filter.date.$gte).toBeInstanceOf(Date);
    expect(filter.club).toBeUndefined();
    expect(res.set).toHaveBeenCalledWith("Content-Type", "text/calendar; charset=utf-8");
    const body = res.send.mock.calls[0][0];
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("SUMMARY:Hack Night");
    expect(body).toContain("X-WR-CALNAME:PCPS Connect events");
  });

  it("limits the feed to one club and names the calendar after it", async () => {
    Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: CLUB_ID, name: "Coding Club" }) });
    Event.find.mockReturnValue(query(sample));
    const res = mockRes();
    await getCalendarFeed({ query: { club: CLUB_ID } }, res);
    expect(Event.find.mock.calls[0][0].club).toBe(CLUB_ID);
    expect(res.send.mock.calls[0][0]).toContain("X-WR-CALNAME:Coding Club events");
  });

  it("404s for a malformed or unknown club without querying events", async () => {
    for (const club of ["nope", { $gt: "" }, ["a"]]) {
      const res = mockRes();
      await getCalendarFeed({ query: { club } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
    }
    Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const res = mockRes();
    await getCalendarFeed({ query: { club: CLUB_ID } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(Event.find).not.toHaveBeenCalled();
  });

  it("never exposes organiser or registration details", async () => {
    Event.find.mockReturnValue(query(sample));
    await getCalendarFeed({ query: {} }, mockRes());
    expect(Event.find.mock.results[0].value.select).toHaveBeenCalledWith("title description location date");
  });
});
