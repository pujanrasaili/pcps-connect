jest.mock("../../config/cloudinary", () => ({ uploader: {} }));
const { isAllowedImage } = require("../upload");

describe("isAllowedImage", () => {
  it.each([
    ["photo.jpg", "image/jpeg"],
    ["photo.JPEG", "image/jpeg"],
    ["logo.png", "image/png"],
    ["pic.webp", "image/webp"],
    ["anim.gif", "image/gif"],
  ])("accepts %s (%s)", (originalname, mimetype) => {
    expect(isAllowedImage({ originalname, mimetype })).toBe(true);
  });

  it.each([
    ["script.png", "text/html"], // renamed file
    ["page.html", "image/png"], // wrong extension
    ["doc.pdf", "application/pdf"],
    ["image.svg", "image/svg+xml"], // SVG can carry scripts
    ["noext", "image/png"],
    ["x.png.exe", "image/png"],
  ])("refuses %s (%s)", (originalname, mimetype) => {
    expect(isAllowedImage({ originalname, mimetype })).toBe(false);
  });

  it("refuses a file with no name or type", () => {
    expect(isAllowedImage({})).toBe(false);
  });
});

describe("uploadBufferToCloudinary", () => {
  const cloudinary = require("../../config/cloudinary");
  const { uploadBufferToCloudinary } = require("../upload");

  // upload_stream(options, callback) returns a writable; the callback fires
  // once the buffer is ended into it.
  const fakeStream = (outcome) => (options, callback) => ({
    end: (buffer) => {
      fakeStream.seen = { options, buffer };
      outcome(callback);
    },
  });

  it("sends the bytes to Cloudinary as an image, in the folder given, and resolves with the result", async () => {
    cloudinary.uploader.upload_stream = fakeStream((cb) => cb(null, { secure_url: "https://cdn.example/a.jpg" }));
    const buffer = Buffer.from("bytes");
    const result = await uploadBufferToCloudinary(buffer, "pcps-connect/events");
    expect(result.secure_url).toBe("https://cdn.example/a.jpg");
    expect(fakeStream.seen.options).toEqual({ folder: "pcps-connect/events", resource_type: "image" });
    expect(fakeStream.seen.buffer).toBe(buffer);
  });

  it("uses a default folder, and always insists on resource_type image (never raw or video)", async () => {
    cloudinary.uploader.upload_stream = fakeStream((cb) => cb(null, {}));
    await uploadBufferToCloudinary(Buffer.from("x"));
    expect(fakeStream.seen.options).toEqual({ folder: "pcps-connect", resource_type: "image" });
  });

  it("rejects when Cloudinary says the file is not a valid image (or anything else fails)", async () => {
    cloudinary.uploader.upload_stream = fakeStream((cb) => cb(new Error("Invalid image file")));
    await expect(uploadBufferToCloudinary(Buffer.from("<script>"))).rejects.toThrow("Invalid image file");
  });
});
