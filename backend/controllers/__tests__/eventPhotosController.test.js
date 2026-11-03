jest.mock("../../models/Event");
jest.mock("../../utils/audit");
jest.mock("../../utils/clubAccess");
jest.mock("../../config/cloudinary", () => ({ uploader: { destroy: jest.fn() } }));
jest.mock("../../middleware/upload", () => ({ uploadBufferToCloudinary: jest.fn() }));

const Event = require("../../models/Event");
const { recordAudit } = require("../../utils/audit");
const { canManageEvent } = require("../../utils/clubAccess");
const cloudinary = require("../../config/cloudinary");
const { uploadBufferToCloudinary } = require("../../middleware/upload");
const { addEventPhoto, removeEventPhoto } = require("../eventPhotosController");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
const EV = "e".repeat(24);
const user = { _id: "u1" };
const file = { buffer: Buffer.from("x") };
const mkEvent = (photos = []) => ({ _id: EV, title: "Hack Night", photos, save: jest.fn().mockResolvedValue() });

afterEach(() => jest.resetAllMocks());

describe("addEventPhoto", () => {
  it("404s for a missing event", async () => {
    Event.findById.mockResolvedValue(null);
    const res = mockRes();
    await addEventPhoto({ params: { id: EV }, user, file }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("403s for someone who cannot manage the event, without uploading", async () => {
    Event.findById.mockResolvedValue(mkEvent());
    canManageEvent.mockResolvedValue(false);
    const res = mockRes();
    await addEventPhoto({ params: { id: EV }, user, file }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(uploadBufferToCloudinary).not.toHaveBeenCalled();
  });

  it("400s when no file was sent", async () => {
    Event.findById.mockResolvedValue(mkEvent());
    canManageEvent.mockResolvedValue(true);
    const res = mockRes();
    await addEventPhoto({ params: { id: EV }, user }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("refuses a ninth photo", async () => {
    Event.findById.mockResolvedValue(mkEvent(Array.from({ length: 8 }, (_, i) => `u${i}`)));
    canManageEvent.mockResolvedValue(true);
    const res = mockRes();
    await addEventPhoto({ params: { id: EV }, user, file }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(uploadBufferToCloudinary).not.toHaveBeenCalled();
  });

  it("uploads, saves, audits and returns the photos", async () => {
    const ev = mkEvent(["https://a/1.jpg"]);
    Event.findById.mockResolvedValue(ev);
    canManageEvent.mockResolvedValue(true);
    uploadBufferToCloudinary.mockResolvedValue({ secure_url: "https://a/2.jpg" });
    const res = mockRes();
    await addEventPhoto({ params: { id: EV }, user, file }, res);
    expect(ev.save).toHaveBeenCalled();
    expect(recordAudit).toHaveBeenCalledWith(user, "event.photoAdded", expect.stringContaining("Hack Night"));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].photos).toEqual(["https://a/1.jpg", "https://a/2.jpg"]);
  });

  it("500s cleanly when the upload fails", async () => {
    Event.findById.mockResolvedValue(mkEvent());
    canManageEvent.mockResolvedValue(true);
    uploadBufferToCloudinary.mockRejectedValue(new Error("cloudinary down"));
    const res = mockRes();
    await addEventPhoto({ params: { id: EV }, user, file }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("removeEventPhoto", () => {
  it("400s without a url", async () => {
    const res = mockRes();
    await removeEventPhoto({ params: { id: EV }, query: {}, user }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("400s when url is not a string (query objects)", async () => {
    const res = mockRes();
    await removeEventPhoto({ params: { id: EV }, query: { url: { $ne: "" } }, user }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("403s for someone who cannot manage the event", async () => {
    Event.findById.mockResolvedValue(mkEvent(["https://a/1.jpg"]));
    canManageEvent.mockResolvedValue(false);
    const res = mockRes();
    await removeEventPhoto({ params: { id: EV }, query: { url: "https://a/1.jpg" }, user }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("404s for a photo the event does not have", async () => {
    Event.findById.mockResolvedValue(mkEvent(["https://a/1.jpg"]));
    canManageEvent.mockResolvedValue(true);
    const res = mockRes();
    await removeEventPhoto({ params: { id: EV }, query: { url: "https://a/other.jpg" }, user }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("removes exactly the named photo and audits", async () => {
    const ev = mkEvent(["https://a/1.jpg", "https://a/2.jpg"]);
    Event.findById.mockResolvedValue(ev);
    canManageEvent.mockResolvedValue(true);
    const res = mockRes();
    await removeEventPhoto({ params: { id: EV }, query: { url: "https://a/1.jpg" }, user }, res);
    expect(ev.photos).toEqual(["https://a/2.jpg"]);
    expect(recordAudit).toHaveBeenCalledWith(user, "event.photoRemoved", expect.any(String));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  const CLOUD = "https://res.cloudinary.com/demo/image/upload/v1700000000/pcps-connect/event-photos/abc123.jpg";

  it("also deletes the file from Cloudinary", async () => {
    Event.findById.mockResolvedValue(mkEvent([CLOUD]));
    canManageEvent.mockResolvedValue(true);
    const res = mockRes();
    await removeEventPhoto({ params: { id: EV }, query: { url: CLOUD }, user }, res);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("pcps-connect/event-photos/abc123", { resource_type: "image" });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("still succeeds when Cloudinary fails to delete", async () => {
    Event.findById.mockResolvedValue(mkEvent([CLOUD]));
    canManageEvent.mockResolvedValue(true);
    cloudinary.uploader.destroy.mockRejectedValue(new Error("down"));
    const res = mockRes();
    await removeEventPhoto({ params: { id: EV }, query: { url: CLOUD }, user }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("does not touch Cloudinary for addresses outside the event-photos folder", async () => {
    const other = "https://res.cloudinary.com/demo/image/upload/v1/pcps-connect/clubs/logo.jpg";
    Event.findById.mockResolvedValue(mkEvent([other]));
    canManageEvent.mockResolvedValue(true);
    const res = mockRes();
    await removeEventPhoto({ params: { id: EV }, query: { url: other }, user }, res);
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
