jest.mock("../../models/User");
jest.mock("../../models/Club");
jest.mock("../../models/Event");
jest.mock("../../models/Registration");
jest.mock("../../models/ClubMembership");

const User = require("../../models/User");
const Club = require("../../models/Club");
const Event = require("../../models/Event");
const Registration = require("../../models/Registration");
const { getPublicStats } = require("../statsController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

describe("getPublicStats", () => {
  it("returns four counts and nothing else", async () => {
    User.countDocuments.mockResolvedValue(120);
    Club.countDocuments.mockResolvedValue(9);
    Event.countDocuments.mockResolvedValue(44);
    Registration.countDocuments.mockResolvedValue(530);
    const res = mockRes();
    await getPublicStats({}, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ totalStudents: 120, totalClubs: 9, totalEvents: 44, totalRegistrations: 530 });
  });

  it("counts only approved students, not staff or people waiting for approval", async () => {
    User.countDocuments.mockResolvedValue(0);
    Club.countDocuments.mockResolvedValue(0);
    Event.countDocuments.mockResolvedValue(0);
    Registration.countDocuments.mockResolvedValue(0);
    await getPublicStats({}, mockRes());
    expect(User.countDocuments).toHaveBeenCalledWith({ role: "user", approvalStatus: "approved" });
  });

  it("returns a 500 when the database fails", async () => {
    User.countDocuments.mockRejectedValue(new Error("db down"));
    Club.countDocuments.mockResolvedValue(0);
    Event.countDocuments.mockResolvedValue(0);
    Registration.countDocuments.mockResolvedValue(0);
    const res = mockRes();
    await getPublicStats({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
