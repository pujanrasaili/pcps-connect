jest.mock("../../models/SiteNotice");
jest.mock("../../utils/audit");

const SiteNotice = require("../../models/SiteNotice");
const { recordAudit } = require("../../utils/audit");
const { getNotice, setNotice } = require("../noticeController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
const admin = { _id: "a1", name: "Admin Asha" };

afterEach(() => jest.resetAllMocks());

describe("getNotice", () => {
  it("returns only the public fields of the current notice", async () => {
    const updatedAt = new Date();
    SiteNotice.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue({ message: "Hello", tone: "info", updatedAt, updatedByName: "secret" }) });
    const res = mockRes();
    await getNotice({}, res);
    expect(res.json).toHaveBeenCalledWith({ notice: { message: "Hello", tone: "info", updatedAt } });
  });

  it("returns null when there is no notice", async () => {
    SiteNotice.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(null) });
    const res = mockRes();
    await getNotice({}, res);
    expect(res.json).toHaveBeenCalledWith({ notice: null });
  });

  it("returns null (not an error) if the database fails, so pages still load", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    SiteNotice.findOne.mockImplementation(() => {
      throw new Error("db down");
    });
    const res = mockRes();
    await getNotice({}, res);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ notice: null });
  });
});

describe("setNotice", () => {
  it("saves a cleaned notice as the single document and logs it", async () => {
    const updatedAt = new Date();
    SiteNotice.findOneAndUpdate.mockResolvedValue({ message: "Fest closes Friday", tone: "warning", updatedAt });
    const res = mockRes();
    await setNotice({ user: admin, body: { message: "  Fest closes Friday ", tone: "warning" } }, res);
    expect(SiteNotice.findOneAndUpdate).toHaveBeenCalledWith(
      {},
      { message: "Fest closes Friday", tone: "warning", updatedByName: "Admin Asha" },
      expect.objectContaining({ upsert: true })
    );
    expect(res.json).toHaveBeenCalledWith({ notice: { message: "Fest closes Friday", tone: "warning", updatedAt } });
    expect(recordAudit).toHaveBeenCalledWith(admin, "notice.set", expect.stringContaining("Fest closes Friday"));
  });

  it("clears the banner when the message is blank", async () => {
    const res = mockRes();
    await setNotice({ user: admin, body: { message: "  " } }, res);
    expect(SiteNotice.deleteMany).toHaveBeenCalledWith({});
    expect(SiteNotice.findOneAndUpdate).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ notice: null });
    expect(recordAudit).toHaveBeenCalledWith(admin, "notice.cleared", expect.any(String));
  });

  it("answers 400 for bad input and writes nothing", async () => {
    const res = mockRes();
    await setNotice({ user: admin, body: { message: ["a"] } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(SiteNotice.findOneAndUpdate).not.toHaveBeenCalled();
    expect(SiteNotice.deleteMany).not.toHaveBeenCalled();
  });
});
