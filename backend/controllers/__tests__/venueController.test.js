jest.mock("../../models/Venue");
jest.mock("../../utils/audit");

const Venue = require("../../models/Venue");
const { recordAudit } = require("../../utils/audit");
const { listVenues, createVenue, updateVenue, deleteVenue } = require("../venueController");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn();
  return res;
};
const admin = { _id: "a1", name: "Admin" };
beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

describe("listVenues", () => {
  it("returns the venues A to Z with a short public cache", async () => {
    Venue.find.mockReturnValue({ sort: () => ({ limit: () => ({ select: () => ({ lean: () => Promise.resolve([{ _id: "v1", name: "Lab 2", directions: "Block A" }, { _id: "v2", name: "Hall" }]) }) }) }) });
    const res = mockRes();
    await listVenues({}, res);
    expect(res.set).toHaveBeenCalledWith("Cache-Control", "public, max-age=60");
    expect(res.json).toHaveBeenCalledWith({ venues: [{ _id: "v1", name: "Lab 2", directions: "Block A" }, { _id: "v2", name: "Hall", directions: "" }] });
  });
  it("gives an empty list instead of an error when the database fails", async () => {
    Venue.find.mockImplementation(() => { throw new Error("db"); });
    const res = mockRes();
    await listVenues({}, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ venues: [] });
  });
});

describe("createVenue", () => {
  it("400s on a bad name and on a repeated one", async () => {
    let res = mockRes();
    await createVenue({ user: admin, body: { name: "" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    Venue.countDocuments.mockResolvedValue(3);
    Venue.exists.mockResolvedValue(true);
    res = mockRes();
    await createVenue({ user: admin, body: { name: "Hall" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "There is already a venue with that name" });
    expect(Venue.create).not.toHaveBeenCalled();
  });
  it("stops at 100 venues", async () => {
    Venue.countDocuments.mockResolvedValue(100);
    const res = mockRes();
    await createVenue({ user: admin, body: { name: "Hall" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it("saves the cleaned venue and logs it", async () => {
    Venue.countDocuments.mockResolvedValue(0);
    Venue.exists.mockResolvedValue(null);
    Venue.create.mockResolvedValue({ _id: "v1", name: "Seminar Hall", directions: "Block B" });
    const res = mockRes();
    await createVenue({ user: admin, body: { name: " Seminar Hall ", directions: "Block B" } }, res);
    expect(Venue.create).toHaveBeenCalledWith({ name: "Seminar Hall", nameKey: "seminar hall", directions: "Block B" });
    expect(recordAudit).toHaveBeenCalledWith(admin, "venue.created", expect.stringContaining("Seminar Hall"));
    expect(res.status).toHaveBeenCalledWith(201);
  });
  it("treats a unique-index clash (two admins at once) as a normal 400", async () => {
    Venue.countDocuments.mockResolvedValue(0);
    Venue.exists.mockResolvedValue(null);
    Venue.create.mockRejectedValue({ code: 11000 });
    const res = mockRes();
    await createVenue({ user: admin, body: { name: "Hall" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("updateVenue", () => {
  const req = (body) => ({ user: admin, params: { id: "v1" }, body });
  it("404s for an unknown venue", async () => {
    Venue.findById.mockResolvedValue(null);
    const res = mockRes();
    await updateVenue(req({ name: "Hall" }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  it("refuses a name another venue already has", async () => {
    Venue.findById.mockResolvedValue({ _id: "v1", save: jest.fn() });
    Venue.findOne.mockReturnValue({ select: () => Promise.resolve({ _id: "v2" }) });
    const res = mockRes();
    await updateVenue(req({ name: "Hall" }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it("saves the new name and directions", async () => {
    const venue = { _id: "v1", name: "Old", save: jest.fn().mockResolvedValue() };
    Venue.findById.mockResolvedValue(venue);
    Venue.findOne.mockReturnValue({ select: () => Promise.resolve(null) });
    const res = mockRes();
    await updateVenue(req({ name: "New Hall", directions: "Block C" }), res);
    expect(venue).toMatchObject({ name: "New Hall", nameKey: "new hall", directions: "Block C" });
    expect(venue.save).toHaveBeenCalled();
    expect(recordAudit).toHaveBeenCalledWith(admin, "venue.updated", expect.stringContaining("New Hall"));
  });
});

describe("deleteVenue", () => {
  it("404s, then removes and logs", async () => {
    Venue.findById.mockResolvedValueOnce(null);
    let res = mockRes();
    await deleteVenue({ user: admin, params: { id: "v1" } }, res);
    expect(res.status).toHaveBeenCalledWith(404);

    const del = jest.fn().mockResolvedValue();
    Venue.findById.mockResolvedValueOnce({ name: "Lab", deleteOne: del });
    res = mockRes();
    await deleteVenue({ user: admin, params: { id: "v1" } }, res);
    expect(del).toHaveBeenCalled();
    expect(recordAudit).toHaveBeenCalledWith(admin, "venue.deleted", expect.stringContaining("Lab"));
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
