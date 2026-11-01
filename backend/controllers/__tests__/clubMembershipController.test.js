jest.mock("../../models/Club");
jest.mock("../../models/ClubMembership");
jest.mock("../../models/ClubJoinRequest");
jest.mock("../../utils/clubJoinNotices");

const Club = require("../../models/Club");
const ClubMembership = require("../../models/ClubMembership");
const ClubJoinRequest = require("../../models/ClubJoinRequest");
const { notifyClubStaffOfRequest } = require("../../utils/clubJoinNotices");
const { joinClub, leaveClub, getMyJoinRequests } = require("../clubMembershipController");

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
