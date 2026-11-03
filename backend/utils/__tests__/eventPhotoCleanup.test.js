jest.mock("../../config/cloudinary", () => ({ uploader: { destroy: jest.fn() } }));

const cloudinary = require("../../config/cloudinary");
const { destroyEventPhotos } = require("../eventPhotoCleanup");

const url = (n) => `https://res.cloudinary.com/demo/image/upload/v1/pcps-connect/event-photos/${n}.jpg`;

afterEach(() => jest.resetAllMocks());

describe("destroyEventPhotos", () => {
  it("does nothing for no photos", async () => {
    await destroyEventPhotos(undefined);
    await destroyEventPhotos([]);
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
  });

  it("deletes each of the event's photos", async () => {
    cloudinary.uploader.destroy.mockResolvedValue({});
    await destroyEventPhotos([url("a"), url("b")]);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(2);
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("pcps-connect/event-photos/a", { resource_type: "image" });
  });

  it("keeps going and never throws when one delete fails", async () => {
    cloudinary.uploader.destroy.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce({});
    await expect(destroyEventPhotos([url("a"), url("b")])).resolves.toBeUndefined();
    expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(2);
  });

  it("skips addresses outside the event-photos folder", async () => {
    await destroyEventPhotos(["https://res.cloudinary.com/demo/image/upload/v1/pcps-connect/clubs/x.jpg", "junk"]);
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
  });
});
