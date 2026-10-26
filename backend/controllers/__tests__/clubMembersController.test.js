jest.mock("../../models/Club");
jest.mock("../../models/ClubMembership");
jest.mock("../../utils/clubAccess");

const Club = require("../../models/Club");
const ClubMembership = require("../../models/ClubMembership");
const { canManageClub } = require("../../utils/clubAccess");
const { getClubMembers } = require("../clubMembersController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
const req = { params: { id: "c".repeat(24) }, user: { _id: "u1" } };

beforeEach(() => {
  Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: "c1", name: "Chess" }) });
  canManageClub.mockResolvedValue(true);
});
afterEach(() => jest.resetAllMocks());

function memberships(list) {
  ClubMembership.find.mockReturnValue({ sort: () => ({ populate: jest.fn().mockResolvedValue(list) }) });
}

describe("getClubMembers", () => {
  it("lists members with only the fields staff need and skips deleted accounts", async () => {
    memberships([
      { createdAt: "2026-01-02", user: { _id: "s1", name: "Sita", email: "s@x.np", studentId: "P1", password: "hash" } },
      { createdAt: "2026-01-01", user: null },
      { createdAt: "2026-01-01", user: { _id: "s2", name: "Ram", email: "r@x.np" } },
    ]);
    const res = mockRes();
    await getClubMembers(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.members).toEqual([
      { _id: "s1", name: "Sita", email: "s@x.np", studentId: "P1", joinedAt: "2026-01-02" },
      { _id: "s2", name: "Ram", email: "r@x.np", studentId: "", joinedAt: "2026-01-01" },
    ]);
  });

  it("refuses staff who don't manage this club", async () => {
    canManageClub.mockResolvedValue(false);
    const res = mockRes();
    await getClubMembers(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(ClubMembership.find).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown club", async () => {
    Club.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const res = mockRes();
    await getClubMembers(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 500 without leaking internals", async () => {
    Club.findById.mockReturnValue({ select: jest.fn().mockRejectedValue(new Error("db down")) });
    const res = mockRes();
    await getClubMembers(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
