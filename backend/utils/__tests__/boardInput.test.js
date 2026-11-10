const { cleanBoardPost, MAX_TITLE, MAX_BODY, MAX_CONTACT } = require("../boardInput");

const ok = { category: "lost", title: " Black umbrella ", body: " Left in room 204 ", contact: " 98xxxxxxxx " };

describe("cleanBoardPost", () => {
  it("trims and accepts a good post", () => {
    expect(cleanBoardPost(ok)).toEqual({ category: "lost", title: "Black umbrella", body: "Left in room 204", contact: "98xxxxxxxx" });
  });
  it("makes the contact optional", () => {
    expect(cleanBoardPost({ ...ok, contact: undefined }).contact).toBe("");
  });
  it("only allows the three categories", () => {
    for (const category of ["", "sale", undefined, 5]) expect(cleanBoardPost({ ...ok, category }).error).toMatch(/Lost, Found or Notice/);
  });
  it("needs a title and details, and caps every length", () => {
    expect(cleanBoardPost({ ...ok, title: "  " }).error).toMatch(/title/);
    expect(cleanBoardPost({ ...ok, body: "" }).error).toMatch(/details/);
    expect(cleanBoardPost({ ...ok, title: "a".repeat(MAX_TITLE + 1) }).error).toMatch(/title/);
    expect(cleanBoardPost({ ...ok, body: "a".repeat(MAX_BODY + 1) }).error).toMatch(/details/);
    expect(cleanBoardPost({ ...ok, contact: "a".repeat(MAX_CONTACT + 1) }).error).toMatch(/contact/);
    expect(cleanBoardPost({ ...ok, title: "a".repeat(MAX_TITLE) }).error).toBeUndefined();
  });
  it("copes with missing input", () => {
    expect(cleanBoardPost().error).toBeDefined();
    expect(cleanBoardPost({ ...ok, body: { $gt: "" } }).error).toMatch(/details/);
  });
});
