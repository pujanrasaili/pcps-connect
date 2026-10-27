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
