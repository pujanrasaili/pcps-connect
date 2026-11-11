const { cleanJoinLink, MAX_LINK } = require("../joinLinkInput");

describe("cleanJoinLink", () => {
  it("accepts an https link and tidies it", () => {
    expect(cleanJoinLink(" https://meet.google.com/abc-defg-hij ")).toEqual({ link: "https://meet.google.com/abc-defg-hij" });
    expect(cleanJoinLink("https://zoom.us/j/123?pwd=x").link).toBe("https://zoom.us/j/123?pwd=x");
  });
  it("treats empty or missing as removing the link", () => {
    for (const v of [undefined, null, "", "   "]) expect(cleanJoinLink(v)).toEqual({ link: "" });
  });
  it("refuses anything that is not a plain https address", () => {
    for (const v of ["http://zoom.us/j/1", "javascript:alert(1)", "ftp://x.com/a", "zoom.us/j/1", "https://user:pw@zoom.us/j/1", "https://localhost/x", "not a link", 5, { a: 1 }]) {
      expect(cleanJoinLink(v).error).toBeDefined();
    }
  });
  it("caps the length", () => {
    expect(cleanJoinLink("https://a.com/" + "x".repeat(MAX_LINK)).error).toMatch(/300/);
  });
});
