jest.mock("../../models/Club");
jest.mock("../../models/ClubMembership");
jest.mock("../../models/ClubJoinRequest");
jest.mock("../../models/ClubPost");
jest.mock("../../utils/clubJoinNotices");

const Club = require("../../models/Club");
const ClubMembership = require("../../models/ClubMembership");
const ClubJoinRequest = require("../../models/ClubJoinRequest");
const { notifyClubStaffOfRequest } = require("../../utils/clubJoinNotices");
const ClubPost = require("../../models/ClubPost");
const { getMyClubNews, getMyMemberships, joinClub, leaveClub, getMyJoinRequests } = require("../clubMembershipController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
const CLUB_ID = "c".repeat(24);
const student = { _id: "s1", name: "Asha" };
const joinReq = () => ({ body: { clubId: CLUB_ID }, user: student });

afterEach(() => jest.resetAllMocks());

describe("joinClub", () => {
  it("an open club makes the student a member straight away", async () => {
    Club.findById.mockResolvedValue({ _id: CLUB_ID, name: "Chess", requiresApproval: false });
    ClubMembership.findOne.mockResolvedValue(null);
    ClubMembership.create.mockResolvedValue({ _id: "m1" });
    const res = mockRes();
    await joinClub(joinReq(), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(ClubMembership.create).toHaveBeenCalledWith({ user: "s1", club: CLUB_ID });
    expect(ClubJoinRequest.create).not.toHaveBeenCalled();
  });

  it("a club that approves members stores a request instead, and tells its leaders", async () => {
    const club = { _id: CLUB_ID, name: "Chess", requiresApproval: true };
    Club.findById.mockResolvedValue(club);
    ClubMembership.findOne.mockResolvedValue(null);
    ClubJoinRequest.create.mockResolvedValue({});
    const res = mockRes();
    await joinClub(joinReq(), res);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json.mock.calls[0][0].pending).toBe(true);
    expect(ClubJoinRequest.create).toHaveBeenCalledWith({ user: "s1", club: CLUB_ID });
    expect(ClubMembership.create).not.toHaveBeenCalled();
    expect(notifyClubStaffOfRequest).toHaveBeenCalledWith(club, student);
  });

  it("asking twice is a 400 and doesn't notify again", async () => {
    Club.findById.mockResolvedValue({ _id: CLUB_ID, name: "Chess", requiresApproval: true });
    ClubMembership.findOne.mockResolvedValue(null);
    ClubJoinRequest.create.mockRejectedValue(Object.assign(new Error("dup"), { code: 11000 }));
    const res = mockRes();
    await joinClub(joinReq(), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(notifyClubStaffOfRequest).not.toHaveBeenCalled();
  });

  it("a member who asks again is told they already joined (no new request)", async () => {
    Club.findById.mockResolvedValue({ _id: CLUB_ID, requiresApproval: true });
    ClubMembership.findOne.mockResolvedValue({ _id: "m1" });
    const res = mockRes();
    await joinClub(joinReq(), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(ClubJoinRequest.create).not.toHaveBeenCalled();
  });
});

describe("leaveClub", () => {
  it("leaving as a member removes the membership", async () => {
    ClubMembership.findOneAndDelete.mockResolvedValue({ _id: "m1" });
    const res = mockRes();
    await leaveClub({ params: { clubId: CLUB_ID }, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Left club" });
    expect(ClubJoinRequest.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("with no membership it withdraws a waiting request", async () => {
    ClubMembership.findOneAndDelete.mockResolvedValue(null);
    ClubJoinRequest.findOneAndDelete.mockResolvedValue({ _id: "r1" });
    const res = mockRes();
    await leaveClub({ params: { clubId: CLUB_ID }, user: student }, res);
    expect(ClubJoinRequest.findOneAndDelete).toHaveBeenCalledWith({ user: "s1", club: CLUB_ID });
    expect(res.json).toHaveBeenCalledWith({ message: "Request withdrawn" });
  });

  it("404s when there is neither a membership nor a request", async () => {
    ClubMembership.findOneAndDelete.mockResolvedValue(null);
    ClubJoinRequest.findOneAndDelete.mockResolvedValue(null);
    const res = mockRes();
    await leaveClub({ params: { clubId: CLUB_ID }, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("getMyJoinRequests", () => {
  it("only asks for the caller's own requests", async () => {
    ClubJoinRequest.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ club: CLUB_ID }]) });
    const res = mockRes();
    await getMyJoinRequests({ user: student }, res);
    expect(ClubJoinRequest.find).toHaveBeenCalledWith({ user: "s1" });
    expect(res.json).toHaveBeenCalledWith({ requests: [{ club: CLUB_ID }] });
  });
});

describe("getMyMemberships", () => {
  it("returns only the caller's memberships, with each club filled in", async () => {
    const populate = jest.fn().mockResolvedValue([{ _id: "m1" }]);
    ClubMembership.find.mockReturnValue({ populate });
    const res = mockRes();
    await getMyMemberships({ user: student }, res);
    expect(ClubMembership.find).toHaveBeenCalledWith({ user: "s1" });
    expect(populate).toHaveBeenCalledWith("club");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ memberships: [{ _id: "m1" }] });
  });

  it("answers 500, and in production says nothing about the database error", async () => {
    const before = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      ClubMembership.find.mockImplementation(() => { throw new Error("secret db detail"); });
      const res = mockRes();
      await getMyMemberships({ user: student }, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Failed to fetch memberships" });
    } finally {
      process.env.NODE_ENV = before;
      console.error.mockRestore();
    }
  });
});

describe("joinClub -- bad input and failures", () => {
  it("needs a clubId, and an id that is not a real id is just 'not found'", async () => {
    let res = mockRes();
    await joinClub({ body: {}, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    for (const clubId of ["nope", { $ne: 1 }, 123]) {
      res = mockRes();
      await joinClub({ body: { clubId }, user: student }, res);
      expect(res.status).toHaveBeenCalledWith(404);
    }
    expect(Club.findById).not.toHaveBeenCalled();
  });

  it("404s for a club that does not exist", async () => {
    Club.findById.mockResolvedValue(null);
    const res = mockRes();
    await joinClub(joinReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(ClubMembership.create).not.toHaveBeenCalled();
  });

  it("answers 500 when saving fails for a reason other than a duplicate", async () => {
    Club.findById.mockResolvedValue({ _id: CLUB_ID, requiresApproval: true });
    ClubMembership.findOne.mockResolvedValue(null);
    ClubJoinRequest.create.mockRejectedValue(new Error("db down"));
    const res = mockRes();
    await joinClub(joinReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(notifyClubStaffOfRequest).not.toHaveBeenCalled();
  });
});

describe("leaveClub / getMyJoinRequests -- failures", () => {
  it("leaveClub answers 500 when the database fails", async () => {
    ClubMembership.findOneAndDelete.mockRejectedValue(new Error("db down"));
    const res = mockRes();
    await leaveClub({ params: { clubId: CLUB_ID }, user: student }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("getMyJoinRequests answers 500 when the database fails", async () => {
    ClubJoinRequest.find.mockImplementation(() => { throw new Error("db down"); });
    const res = mockRes();
    await getMyJoinRequests({ user: student }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("getMyClubNews", () => {
  it("returns nothing, without querying posts, when the student has joined no clubs", async () => {
    ClubMembership.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
    const res = mockRes();
    await getMyClubNews({ user: student }, res);
    expect(res.json).toHaveBeenCalledWith({ posts: [] });
    expect(ClubPost.find).not.toHaveBeenCalled();
  });

  it("returns the newest recent posts of only the clubs they joined", async () => {
    ClubMembership.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ club: "c1" }, { club: "c2" }]) });
    const populate = jest.fn().mockResolvedValue([{ body: "Hi" }]);
    const select = jest.fn().mockReturnValue({ populate });
    const limit = jest.fn().mockReturnValue({ select });
    const sort = jest.fn().mockReturnValue({ limit });
    ClubPost.find.mockReturnValue({ sort });
    const res = mockRes();
    await getMyClubNews({ user: student }, res);
    const filter = ClubPost.find.mock.calls[0][0];
    expect(filter.club).toEqual({ $in: ["c1", "c2"] });
    expect(filter.createdAt.$gte.getTime()).toBeLessThan(Date.now() - 29 * 24 * 3600e3);
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(limit).toHaveBeenCalledWith(5);
    expect(populate).toHaveBeenCalledWith("club", "name");
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
