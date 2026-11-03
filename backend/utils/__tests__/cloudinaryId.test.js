const { eventPhotoPublicId } = require("../cloudinaryId");

describe("eventPhotoPublicId", () => {
  const base = "https://res.cloudinary.com/demo/image/upload";
  it("reads the id with and without a version", () => {
    expect(eventPhotoPublicId(`${base}/v123/pcps-connect/event-photos/a1.jpg`)).toBe("pcps-connect/event-photos/a1");
    expect(eventPhotoPublicId(`${base}/pcps-connect/event-photos/a1.webp`)).toBe("pcps-connect/event-photos/a1");
  });
  it("refuses anything outside the event-photos folder", () => {
    expect(eventPhotoPublicId(`${base}/v1/pcps-connect/clubs/a1.jpg`)).toBeNull();
    expect(eventPhotoPublicId(`${base}/v1/other/event-photos/a1.jpg`)).toBeNull();
  });
  it("refuses path tricks, other hosts and non-strings", () => {
    expect(eventPhotoPublicId(`${base}/v1/pcps-connect/event-photos/../clubs/a1.jpg`)).toBeNull();
    expect(eventPhotoPublicId("https://evil.example/image/upload/v1/pcps-connect/event-photos/a1.jpg")).toBeNull();
    expect(eventPhotoPublicId("http://res.cloudinary.com/demo/image/upload/v1/pcps-connect/event-photos/a1.jpg")).toBeNull();
    expect(eventPhotoPublicId(null)).toBeNull();
    expect(eventPhotoPublicId({})).toBeNull();
  });
});
