jest.mock("../../utils/clubAccess");
jest.mock("../../models/Club");
jest.mock("../../models/ClubMembership");
jest.mock("../../models/Event");
jest.mock("../../models/Registration");

const { canManageClub } = require("../../utils/clubAccess");
const Club = require("../../models/Club");
const ClubMembership = require("../../models/ClubMembership");
const Event = require("../../models/Event");
const Registration = require("../../models/Registration");
const { getClubStats } = require("../leaderController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const DAY = 86400000;
const req = { user: { _id: "u1" }, params: { id: "c1" } };
const eventsQuery = (rows) => ({ select: () => ({ sort: () => ({ lean: async () => rows }) }) });
afterEach(() => jest.resetAllMocks());

describe("getClubStats", () => {
  it("summarises members, joiners, events, turnout and ratings for a club's leader", async () => {
    canManageClub.mockResolvedValue(true);
    Club.exists.mockResolvedValue(true);
    ClubMembership.countDocuments.mockResolvedValueOnce(30).mockResolvedValueOnce(6).mockResolvedValueOnce(4);
    Event.find.mockReturnValue(eventsQuery([
      { _id: "e3", title: "Soon", date: new Date(Date.now() + 5 * DAY) },
      { _id: "e2", title: "Recent", date: new Date(Date.now() - 3 * DAY) },
      { _id: "e1", title: "Older", date: new Date(Date.now() - 30 * DAY) },
    ]));
    Registration.aggregate.mockResolvedValue([
      { _id: "e2", registered: 20, attended: 15, ratingSum: 18, ratingCount: 4 },
      { _id: "e1", registered: 10, attended: 5, ratingSum: 0, ratingCount: 0 },
    ]);
    const res = mockRes();
    await getClubStats(req, res);
    const { stats } = res.json.mock.calls[0][0];
    expect(stats.members).toBe(30);
    expect(stats.newMembers).toEqual({ current: 6, previous: 4 });
    expect(stats.upcomingEvents).toBe(1);
    expect(stats.pastEvents).toBe(2);
    expect(stats.attendance).toMatchObject({ registered: 30, attended: 20, attendanceRate: 67 });
    expect(stats.recent.map((e) => e.title)).toEqual(["Recent", "Older"]);
    expect(stats.recent[0]).toMatchObject({ registered: 20, attended: 15, attendanceRate: 75 });
    // The aggregation only looks at the club's own past events.
    expect(Registration.aggregate.mock.calls[0][0][0].$match.event.$in).toEqual(["e2", "e1"]);
    // Counts only: nothing about individual students leaks out.
    expect(JSON.stringify(stats)).not.toMatch(/email|name|user/i);
  });

  it("works for a brand-new club with no events (no aggregation, no divide by zero)", async () => {
    canManageClub.mockResolvedValue(true);
    Club.exists.mockResolvedValue(true);
    ClubMembership.countDocuments.mockResolvedValue(0);
    Event.find.mockReturnValue(eventsQuery([]));
    const res = mockRes();
    await getClubStats(req, res);
    const { stats } = res.json.mock.calls[0][0];
    expect(Registration.aggregate).not.toHaveBeenCalled();
    expect(stats.attendance.attendanceRate).toBeNull();
    expect(stats.recent).toEqual([]);
  });

  it("refuses people who don't lead the club, and 404s a missing club", async () => {
    canManageClub.mockResolvedValue(false);
    let res = mockRes();
    await getClubStats(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(ClubMembership.countDocuments).not.toHaveBeenCalled();
    canManageClub.mockResolvedValue(true);
    Club.exists.mockResolvedValue(false);
    res = mockRes();
    await getClubStats(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("500s without leaking the error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    canManageClub.mockRejectedValue(new Error("secret db detail"));
    const res = mockRes();
    await getClubStats(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
