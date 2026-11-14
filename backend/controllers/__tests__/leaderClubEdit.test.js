jest.mock("../../utils/clubAccess");
jest.mock("../../utils/audit");
jest.mock("../../models/Club");
const { canManageClub } = require("../../utils/clubAccess");
const { recordAudit } = require("../../utils/audit");
const Club = require("../../models/Club");
const { updateMyClub } = require("../leaderController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const call = async (body, id = "c1") => {
  const res = mockRes();
  await updateMyClub({ user: { _id: "u1" }, params: { id }, body }, res);
  return res;
};
afterEach(() => jest.resetAllMocks());

describe("PATCH /api/leader/clubs/:id", () => {
  beforeEach(() => {
    canManageClub.mockResolvedValue(true);
    Club.findByIdAndUpdate.mockResolvedValue({ _id: "c1", name: "Tech" });
  });

  it("lets a leader update the descriptive fields and records it", async () => {
    const res = await call({ description: "New blurb", activities: ["Hack nights"], meetings: "Fridays 4 PM", email: "tech@pcps.edu.np", longDescription: "More" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(Club.findByIdAndUpdate).toHaveBeenCalledWith(
      "c1",
      { description: "New blurb", activities: ["Hack nights"], meetings: "Fridays 4 PM", email: "tech@pcps.edu.np", longDescription: "More" },
      { new: true, runValidators: true }
    );
    expect(recordAudit).toHaveBeenCalledWith({ _id: "u1" }, "club.updated", 'Edited details of club "Tech"');
  });

  it("ignores everything a leader may not change", async () => {
    await call({ name: "Hijacked", leaders: ["x"], requiresApproval: true, category: "X", icon: "FaX", image: "http://x", meetings: "Fridays" });
    expect(Club.findByIdAndUpdate.mock.calls[0][1]).toEqual({ meetings: "Fridays" });
  });

  it("403s for someone who doesn't lead the club", async () => {
    canManageClub.mockResolvedValue(false);
    const res = await call({ meetings: "Fridays" });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(Club.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("400s on an empty request or only forbidden fields", async () => {
    expect((await call({})).status).toHaveBeenCalledWith(400);
    expect((await call({ name: "Hijacked" })).status).toHaveBeenCalledWith(400);
    expect(Club.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("400s on invalid values and an emptied short description", async () => {
    expect((await call({ meetings: "x".repeat(121) })).status).toHaveBeenCalledWith(400);
    expect((await call({ activities: "nope" })).status).toHaveBeenCalledWith(400);
    const res = await call({ description: "   " });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Club.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("404s when the club is gone", async () => {
    Club.findByIdAndUpdate.mockResolvedValue(null);
    expect((await call({ meetings: "Fridays" })).status).toHaveBeenCalledWith(404);
    expect(recordAudit).not.toHaveBeenCalled();
  });
});
