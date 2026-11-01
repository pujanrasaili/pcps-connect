jest.mock("../../models/Club");
jest.mock("../../models/ClubMembership");
jest.mock("../../models/ClubJoinRequest");
jest.mock("../../utils/clubAccess");
jest.mock("../../utils/clubJoinNotices");
jest.mock("../../utils/audit");

const Club = require("../../models/Club");
const ClubMembership = require("../../models/ClubMembership");
const ClubJoinRequest = require("../../models/ClubJoinRequest");
const { canManageClub } = require("../../utils/clubAccess");
const { notifyStudentOfDecision } = require("../../utils/clubJoinNotices");
const { recordAudit } = require("../../utils/audit");
const { getClubJoinRequests, decideClubJoinRequest, getRequestCounts } = require("../clubRequestsController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
const club = { _id: "c1", name: "Chess", requiresApproval: true };
const baseReq = (extra = {}) => ({ params: { id: "c".repeat(24), requestId: "r".repeat(24) }, user: { _id: "a1" }, body: {}, ...extra });

beforeEach(() => {
  Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(club) });
  canManageClub.mockResolvedValue(true);
});
afterEach(() => jest.resetAllMocks());

describe("getClubJoinRequests", () => {
  it("lists waiting students with only the fields staff need, skipping deleted accounts", async () => {
    ClubJoinRequest.find.mockReturnValue({
      sort: () => ({
        populate: jest.fn().mockResolvedValue([
          { _id: "r1", createdAt: "2026-02-01", user: { name: "Sita", email: "s@x.np", studentId: "P1", password: "hash" } },
          { _id: "r2", createdAt: "2026-02-02", user: null },
        ]),
      }),
    });
    const res = mockRes();
    await getClubJoinRequests(baseReq(), res);
    const body = res.json.mock.calls[0][0];
    expect(body.requests).toEqual([{ _id: "r1", name: "Sita", email: "s@x.np", studentId: "P1", requestedAt: "2026-02-01" }]);
    expect(body.club).toEqual({ _id: "c1", name: "Chess", requiresApproval: true });
    expect(JSON.stringify(body)).not.toContain("hash");
  });

  it("refuses people who don't manage the club, and 404s an unknown club", async () => {
    canManageClub.mockResolvedValue(false);
    const res = mockRes();
    await getClubJoinRequests(baseReq(), res);
    expect(res.status).toHaveBeenCalledWith(403);

    Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const res2 = mockRes();
    await getClubJoinRequests(baseReq(), res2);
    expect(res2.status).toHaveBeenCalledWith(404);
  });
});

describe("decideClubJoinRequest", () => {
  const claim = (doc) => ClubJoinRequest.findOneAndDelete.mockReturnValue({ populate: jest.fn().mockResolvedValue(doc) });
  const waiting = { _id: "r1", user: { _id: "s1", name: "Asha", email: "a@x.np" } };

  it("approving makes the student a member, drops the request and tells them", async () => {
    claim(waiting);
    ClubMembership.create.mockResolvedValue({});
    const res = mockRes();
    await decideClubJoinRequest(baseReq({ body: { decision: "approve" } }), res);
    expect(ClubMembership.create).toHaveBeenCalledWith({ user: "s1", club: "c1" });
    expect(notifyStudentOfDecision).toHaveBeenCalledWith(waiting.user, club, true, "");
    expect(res.json).toHaveBeenCalledWith({ message: "Request approved" });
    expect(recordAudit).toHaveBeenCalledWith(baseReq().user, "club.join_approved", 'Approved Asha joining "Chess"');
  });

  it("a decline can carry a short note for the student; an approval ignores it", async () => {
    claim(waiting);
    await decideClubJoinRequest(baseReq({ body: { decision: "reject", reason: "  Applications open in March  " } }), mockRes());
    expect(notifyStudentOfDecision).toHaveBeenCalledWith(waiting.user, club, false, "Applications open in March");
    claim(waiting);
    ClubMembership.create.mockResolvedValue({});
    await decideClubJoinRequest(baseReq({ body: { decision: "approve", reason: "ignored" } }), mockRes());
    expect(notifyStudentOfDecision).toHaveBeenLastCalledWith(waiting.user, club, true, "");
  });

  it("rejects a note that is not text or is too long, before touching anything", async () => {
    for (const reason of [123, { $ne: 1 }, "x".repeat(301)]) {
      const res = mockRes();
      await decideClubJoinRequest(baseReq({ body: { decision: "reject", reason } }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(ClubJoinRequest.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("declining drops the request without creating a membership", async () => {
    claim(waiting);
    const res = mockRes();
    await decideClubJoinRequest(baseReq({ body: { decision: "reject" } }), res);
    expect(ClubMembership.create).not.toHaveBeenCalled();
    expect(notifyStudentOfDecision).toHaveBeenCalledWith(waiting.user, club, false, "");
    expect(res.json).toHaveBeenCalledWith({ message: "Request declined" });
    expect(recordAudit).toHaveBeenCalledWith(baseReq().user, "club.join_declined", 'Declined Asha joining "Chess"');
  });

  it("a request someone else already handled is a 404, and nobody is notified twice", async () => {
    claim(null);
    const res = mockRes();
    await decideClubJoinRequest(baseReq({ body: { decision: "approve" } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(ClubMembership.create).not.toHaveBeenCalled();
    expect(notifyStudentOfDecision).not.toHaveBeenCalled();
  });

  it("an already-a-member duplicate is fine; other database errors are a 500", async () => {
    claim(waiting);
    ClubMembership.create.mockRejectedValue(Object.assign(new Error("dup"), { code: 11000 }));
    const res = mockRes();
    await decideClubJoinRequest(baseReq({ body: { decision: "approve" } }), res);
    expect(res.json).toHaveBeenCalledWith({ message: "Request approved" });

    claim(waiting);
    ClubMembership.create.mockRejectedValue(new Error("db down"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res2 = mockRes();
    await decideClubJoinRequest(baseReq({ body: { decision: "approve" } }), res2);
    expect(res2.status).toHaveBeenCalledWith(500);
  });

  it("needs a valid decision and manager access before touching anything", async () => {
    const bad = mockRes();
    await decideClubJoinRequest(baseReq({ body: { decision: "maybe" } }), bad);
    expect(bad.status).toHaveBeenCalledWith(400);
    canManageClub.mockResolvedValue(false);
    const denied = mockRes();
    await decideClubJoinRequest(baseReq({ body: { decision: "approve" } }), denied);
    expect(denied.status).toHaveBeenCalledWith(403);
    expect(ClubJoinRequest.findOneAndDelete).not.toHaveBeenCalled();
  });
});

describe("getRequestCounts", () => {
  it("counts waiting students per club for an admin, across every club", async () => {
    ClubJoinRequest.aggregate.mockResolvedValue([{ _id: "c1", n: 3 }, { _id: "c2", n: 1 }]);
    const res = mockRes();
    await getRequestCounts({ user: { _id: "a1", role: "admin" } }, res);
    expect(ClubJoinRequest.aggregate.mock.calls[0][0][0]).toEqual({ $match: {} });
    expect(res.json).toHaveBeenCalledWith({ counts: { c1: 3, c2: 1 } });
  });

  it("limits a leader to the clubs they lead", async () => {
    Club.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: "c9" }]) });
    ClubJoinRequest.aggregate.mockResolvedValue([{ _id: "c9", n: 2 }]);
    const res = mockRes();
    await getRequestCounts({ user: { _id: "l1", role: "student" } }, res);
    expect(Club.find).toHaveBeenCalledWith({ leaders: "l1" });
    expect(ClubJoinRequest.aggregate.mock.calls[0][0][0]).toEqual({ $match: { club: { $in: ["c9"] } } });
    expect(res.json).toHaveBeenCalledWith({ counts: { c9: 2 } });
  });

  it("answers 500 with a safe message when the database fails", async () => {
    ClubJoinRequest.aggregate.mockRejectedValue(new Error("boom"));
    const res = mockRes();
    await getRequestCounts({ user: { _id: "a1", role: "admin" } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
