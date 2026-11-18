jest.mock("../../models/Club");
jest.mock("../../models/ClubAlumnus");
jest.mock("../../models/ClubMembership");
jest.mock("../../utils/clubAccess");

const Club = require("../../models/Club");
const ClubAlumnus = require("../../models/ClubAlumnus");
const ClubMembership = require("../../models/ClubMembership");
const { canManageClub } = require("../../utils/clubAccess");
const { getClubAlumni, becomeAlumnus, removeAlumnus } = require("../clubAlumniController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const chain = (rows) => ({ sort: () => ({ limit: () => ({ select: () => ({ lean: () => Promise.resolve(rows) }) }) }) });
const me = { _id: "u1", name: "Asha" };
afterEach(() => jest.resetAllMocks());

describe("getClubAlumni", () => {
  it("404s for an unknown club", async () => {
    Club.findById.mockReturnValue({ select: () => Promise.resolve(null) });
    const res = mockRes();
    await getClubAlumni({ params: { id: "c1" }, user: me }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it("lists the alumni without leaking user ids, marking the caller's own entry", async () => {
    Club.findById.mockReturnValue({ select: () => Promise.resolve({ _id: "c1" }) });
    ClubAlumnus.find.mockReturnValue(chain([{ _id: "a1", user: "u1", name: "Asha", year: 2024, note: "President" }, { _id: "a2", user: "u2", name: "Bikash" }]));
    const res = mockRes();
    await getClubAlumni({ params: { id: "c1" }, user: me }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      alumni: [
        { _id: "a1", name: "Asha", year: 2024, note: "President", mine: true },
        { _id: "a2", name: "Bikash", year: null, note: "", mine: false },
      ],
    });
  });
});

describe("becomeAlumnus", () => {
  const req = (body) => ({ params: { clubId: "c1" }, user: me, body });
  const club = () => Club.findById.mockReturnValue({ select: () => Promise.resolve({ _id: "c1", name: "Robotics" }) });

  it("refuses someone who is not a member", async () => {
    club();
    ClubMembership.findOne.mockResolvedValue(null);
    const res = mockRes();
    await becomeAlumnus(req({}), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(ClubAlumnus.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it("400s on a bad year without changing anything", async () => {
    club();
    const del = jest.fn();
    ClubMembership.findOne.mockResolvedValue({ deleteOne: del });
    const res = mockRes();
    await becomeAlumnus(req({ year: 1850 }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(del).not.toHaveBeenCalled();
  });
  it("lists them first, then removes the membership", async () => {
    club();
    const order = [];
    ClubMembership.findOne.mockResolvedValue({ deleteOne: jest.fn(() => order.push("leave")) });
    ClubAlumnus.findOneAndUpdate.mockImplementation(() => { order.push("list"); return Promise.resolve({ _id: "a1", user: "u1", name: "Asha", year: 2024, note: "" }); });
    const res = mockRes();
    await becomeAlumnus(req({ year: 2024 }), res);
    expect(order).toEqual(["list", "leave"]);
    expect(ClubAlumnus.findOneAndUpdate.mock.calls[0][1]).toEqual({ $set: { name: "Asha", year: 2024, note: "" } });
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it("500s cleanly on a database error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    Club.findById.mockImplementation(() => { throw new Error("db"); });
    const res = mockRes();
    await becomeAlumnus(req({}), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("removeAlumnus", () => {
  const req = { params: { id: "c1", alumniId: "a1" }, user: me };
  it("404s when the entry is missing", async () => {
    ClubAlumnus.findOne.mockResolvedValue(null);
    const res = mockRes();
    await removeAlumnus(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it("lets the person remove themselves", async () => {
    const del = jest.fn();
    ClubAlumnus.findOne.mockResolvedValue({ user: "u1", club: "c1", deleteOne: del });
    const res = mockRes();
    await removeAlumnus(req, res);
    expect(del).toHaveBeenCalled();
    expect(canManageClub).not.toHaveBeenCalled();
  });
  it("lets a club manager remove someone else's entry, but nobody else", async () => {
    const del = jest.fn();
    ClubAlumnus.findOne.mockResolvedValue({ user: "u2", club: "c1", deleteOne: del });
    canManageClub.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    let res = mockRes();
    await removeAlumnus(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(del).not.toHaveBeenCalled();
    res = mockRes();
    await removeAlumnus(req, res);
    expect(del).toHaveBeenCalled();
  });
});
