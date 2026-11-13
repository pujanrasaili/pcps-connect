jest.mock("../../models/Club");
jest.mock("../../models/ClubMembership");
jest.mock("../../models/Event");
jest.mock("../../models/Registration");
jest.mock("../../models/User");

const Club = require("../../models/Club");
const ClubMembership = require("../../models/ClubMembership");
const Event = require("../../models/Event");
const { getClubLeaderboard } = require("../statsController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const clubsQuery = (rows) => ({ select: () => ({ lean: async () => rows }) });
afterEach(() => jest.resetAllMocks());

describe("getClubLeaderboard", () => {
  it("ranks clubs by events held, then members, and returns counts only", async () => {
    Event.aggregate.mockResolvedValue([
      { _id: "c1", eventsHeld: 3 },
      { _id: "c2", eventsHeld: 5 },
      { _id: "c3", eventsHeld: 3 },
    ]);
    Club.find.mockReturnValue(clubsQuery([
      { _id: "c1", name: "Coding Club", category: "Technology", image: null },
      { _id: "c2", name: "Robotics Society", category: "Technology", image: "/uploads/r.jpg" },
      { _id: "c3", name: "Art Circle", category: "Arts", image: null },
    ]));
    ClubMembership.aggregate.mockResolvedValue([{ _id: "c1", members: 10 }, { _id: "c2", members: 4 }, { _id: "c3", members: 25 }]);
    const res = mockRes();
    await getClubLeaderboard({}, res);
    const body = res.json.mock.calls[0][0];
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.days).toBe(90);
    // 5 events first, then the two 3-event clubs split by members (25 vs 10).
    expect(body.leaderboard.map((c) => c.name)).toEqual(["Robotics Society", "Art Circle", "Coding Club"]);
    expect(body.leaderboard[0]).toMatchObject({ eventsHeld: 5, members: 4, image: "/uploads/r.jpg" });
    expect(JSON.stringify(body)).not.toMatch(/email|leaders|user/i);
    // Only events from the last 90 days that already happened count.
    const match = Event.aggregate.mock.calls[0][0][0].$match;
    expect(match.date.$lte.getTime() - match.date.$gte.getTime()).toBe(90 * 86400000);
    // Co-hosted events count for every hosting club (main club + coHosts, no double count).
    const stages = JSON.stringify(Event.aggregate.mock.calls[0][0]);
    expect(stages).toContain("$coHosts");
    expect(stages).toContain("$setUnion");
    expect(stages).toContain("$unwind");
  });

  it("keeps the top five and treats a club with no members as zero", async () => {
    const rows = Array.from({ length: 7 }, (_, i) => ({ _id: `c${i}`, eventsHeld: 10 - i }));
    Event.aggregate.mockResolvedValue(rows);
    Club.find.mockReturnValue(clubsQuery(rows.map((r) => ({ _id: r._id, name: `Club ${r._id}`, category: "General" }))));
    ClubMembership.aggregate.mockResolvedValue([]);
    const res = mockRes();
    await getClubLeaderboard({}, res);
    const { leaderboard } = res.json.mock.calls[0][0];
    expect(leaderboard).toHaveLength(5);
    expect(leaderboard[0]).toMatchObject({ name: "Club c0", members: 0, image: null });
  });

  it("skips clubs that were deleted, and returns an empty list when nothing happened", async () => {
    Event.aggregate.mockResolvedValueOnce([{ _id: "gone", eventsHeld: 4 }]);
    Club.find.mockReturnValue(clubsQuery([]));
    ClubMembership.aggregate.mockResolvedValue([]);
    let res = mockRes();
    await getClubLeaderboard({}, res);
    expect(res.json.mock.calls[0][0].leaderboard).toEqual([]);

    Event.aggregate.mockResolvedValueOnce([]);
    res = mockRes();
    await getClubLeaderboard({}, res);
    expect(res.json.mock.calls[0][0]).toEqual({ days: 90, leaderboard: [] });
    expect(Club.find).toHaveBeenCalledTimes(1);
  });

  it("returns a 500 when the database fails", async () => {
    Event.aggregate.mockRejectedValue(new Error("db down"));
    const res = mockRes();
    await getClubLeaderboard({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
