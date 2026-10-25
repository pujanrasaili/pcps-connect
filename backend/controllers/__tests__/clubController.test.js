jest.mock("../../models/Club");
jest.mock("../../models/ClubPost");
jest.mock("../../models/ClubMembership");
jest.mock("../../models/User");
jest.mock("../../models/Event");
jest.mock("../../utils/audit");

const Club = require("../../models/Club");
const ClubMembership = require("../../models/ClubMembership");
const User = require("../../models/User");
const Event = require("../../models/Event");
const { recordAudit } = require("../../utils/audit");
const { getClubs, getClubById, createClub, updateClub, deleteClub } = require("../clubController");
const { pickClubFields } = require("../../utils/clubFields");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
const admin = { _id: "a1", role: "admin", name: "Admin" };

afterEach(() => jest.clearAllMocks());

describe("pickClubFields", () => {
  it("keeps only the editable club fields", () => {
    expect(pickClubFields({ name: "Coding", leaders: ["x"], createdBy: "evil", _id: "1", __v: 3, activities: ["a"] })).toEqual({
      name: "Coding",
      activities: ["a"],
    });
  });

  it("keeps empty strings (clearing a field) but drops undefined", () => {
    expect(pickClubFields({ longDescription: "", email: undefined })).toEqual({ longDescription: "" });
  });

  it("copes with a missing body", () => {
    expect(pickClubFields(undefined)).toEqual({});
  });
});

describe("getClubs / getClubById", () => {
  it("lists clubs sorted by name, with a public member count", async () => {
    const sort = jest.fn().mockResolvedValue([{ _id: "c1", name: "A" }, { _id: "c2", name: "B" }]);
    Club.find = jest.fn().mockReturnValue({ sort });
    ClubMembership.aggregate = jest.fn().mockResolvedValue([{ _id: "c1", members: 7 }]);
    const res = mockRes();
    await getClubs({}, res);
    expect(sort).toHaveBeenCalledWith({ name: 1 });
    expect(res.json).toHaveBeenCalledWith({
      clubs: [{ _id: "c1", name: "A", memberCount: 7 }, { _id: "c2", name: "B", memberCount: 0 }],
    });
  });

  it("still lists clubs if counting members fails", async () => {
    Club.find = jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([{ _id: "c1", name: "A" }]) });
    ClubMembership.aggregate = jest.fn().mockRejectedValue(new Error("db hiccup"));
    const res = mockRes();
    await getClubs({}, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].clubs[0]).toMatchObject({ name: "A", memberCount: 0 });
  });

  it("returns one club with its member count", async () => {
    Club.findById = jest.fn().mockResolvedValue({ _id: "c1", toObject: () => ({ _id: "c1", name: "A" }) });
    ClubMembership.countDocuments = jest.fn().mockResolvedValue(4);
    const res = mockRes();
    await getClubById({ params: { id: "c1" } }, res);
    expect(res.json).toHaveBeenCalledWith({ club: { _id: "c1", name: "A", memberCount: 4 } });
  });

  it("returns 404 for an unknown or malformed id", async () => {
    Club.findById = jest.fn().mockResolvedValue(null);
    let res = mockRes();
    await getClubById({ params: { id: "x" } }, res);
    expect(res.status).toHaveBeenCalledWith(404);

    Club.findById = jest.fn().mockRejectedValue(new Error("Cast to ObjectId failed"));
    res = mockRes();
    await getClubById({ params: { id: "not-an-id" } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("createClub", () => {
  it("creates from whitelisted fields only and records the creator", async () => {
    Club.create = jest.fn().mockResolvedValue({ _id: "c1", name: "Coding" });
    const res = mockRes();
    await createClub({ user: admin, body: { name: "Coding", category: "Tech", description: "d", leaders: ["sneaky"], createdBy: "other" } }, res);
    expect(Club.create).toHaveBeenCalledWith({ name: "Coding", category: "Tech", description: "d", createdBy: "a1" });
    expect(recordAudit).toHaveBeenCalledWith(admin, "club.created", 'Created club "Coding"');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("returns 500 when the database fails", async () => {
    Club.create = jest.fn().mockRejectedValue(new Error("db down"));
    const res = mockRes();
    await createClub({ user: admin, body: { name: "n", category: "c", description: "d" } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("updateClub", () => {
  it("cannot be used to change leaders or the creator", async () => {
    Club.findByIdAndUpdate = jest.fn().mockResolvedValue({ _id: "c1", name: "New" });
    const res = mockRes();
    await updateClub({ user: admin, params: { id: "c1" }, body: { name: "New", leaders: ["sneaky"], createdBy: "x" } }, res);
    expect(Club.findByIdAndUpdate).toHaveBeenCalledWith("c1", { name: "New" }, { new: true, runValidators: true });
    expect(recordAudit).toHaveBeenCalledWith(admin, "club.updated", 'Edited club "New"');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 404 when the club does not exist", async () => {
    Club.findByIdAndUpdate = jest.fn().mockResolvedValue(null);
    const res = mockRes();
    await updateClub({ params: { id: "nope" }, body: { name: "x" } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("deleteClub", () => {
  it("removes memberships, favourites and event links, and logs it", async () => {
    Club.findByIdAndDelete = jest.fn().mockResolvedValue({ _id: "c1", name: "Coding" });
    ClubMembership.deleteMany = jest.fn().mockResolvedValue({});
    User.updateMany = jest.fn().mockResolvedValue({});
    Event.updateMany = jest.fn().mockResolvedValue({});
    const res = mockRes();
    await deleteClub({ user: admin, params: { id: "c1" } }, res);
    expect(ClubMembership.deleteMany).toHaveBeenCalledWith({ club: "c1" });
    expect(User.updateMany).toHaveBeenCalledWith({ favoriteClub: "c1" }, { favoriteClub: null });
    expect(Event.updateMany).toHaveBeenCalledWith({ club: "c1" }, { club: null });
    expect(recordAudit).toHaveBeenCalledWith(admin, "club.deleted", 'Deleted club "Coding"');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 404 for a missing club without touching related data", async () => {
    Club.findByIdAndDelete = jest.fn().mockResolvedValue(null);
    ClubMembership.deleteMany = jest.fn();
    const res = mockRes();
    await deleteClub({ user: admin, params: { id: "nope" } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(ClubMembership.deleteMany).not.toHaveBeenCalled();
  });
});

describe("club field validation", () => {
  it("createClub answers 400 when required fields are missing", async () => {
    const res = mockRes();
    await createClub({ body: { name: "Only a name" }, user: admin }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Club.create).not.toHaveBeenCalled();
  });

  it("createClub rejects an over-long name", async () => {
    const res = mockRes();
    await createClub({ body: { name: "x".repeat(101), category: "c", description: "d" }, user: admin }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Club.create).not.toHaveBeenCalled();
  });

  it("updateClub rejects a blank name without touching the database", async () => {
    const res = mockRes();
    await updateClub({ params: { id: "c1" }, body: { name: " " }, user: admin }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Club.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
