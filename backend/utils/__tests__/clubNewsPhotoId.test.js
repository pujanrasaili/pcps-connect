const { clubNewsPhotoPublicId, eventPhotoPublicId } = require("../cloudinaryId");

describe("club news photo ids", () => {
  const ok = "https://res.cloudinary.com/demo/image/upload/v123/pcps-connect/club-news/abc.jpg";
  it("finds the public id inside the club-news folder only", () => {
    expect(clubNewsPhotoPublicId(ok)).toBe("pcps-connect/club-news/abc");
    expect(clubNewsPhotoPublicId("https://res.cloudinary.com/demo/image/upload/v1/pcps-connect/event-photos/abc.jpg")).toBeNull();
    expect(clubNewsPhotoPublicId("https://res.cloudinary.com/demo/image/upload/v1/other/abc.jpg")).toBeNull();
    expect(clubNewsPhotoPublicId("https://res.cloudinary.com/demo/image/upload/v1/pcps-connect/club-news/../x.jpg")).toBeNull();
    expect(clubNewsPhotoPublicId("")).toBeNull();
    expect(clubNewsPhotoPublicId(undefined)).toBeNull();
  });
  it("keeps the event photo check unchanged", () => {
    expect(eventPhotoPublicId(ok)).toBeNull();
    expect(eventPhotoPublicId("https://res.cloudinary.com/demo/image/upload/v1/pcps-connect/event-photos/e.png")).toBe("pcps-connect/event-photos/e");
  });
});
