const { cleanClubPost, MAX_BODY } = require("../clubPostInput");

describe("cleanClubPost", () => {
  it("trims and accepts normal text", () => {
    expect(cleanClubPost({ body: "  Meeting moved to 3pm  " })).toEqual({ body: "Meeting moved to 3pm" });
  });
  it("rejects empty, blank and non-text bodies", () => {
    for (const body of [undefined, "", "   ", 42, { a: 1 }, ["x"]]) {
      expect(cleanClubPost({ body }).error).toBe("Write something to post");
    }
    expect(cleanClubPost(undefined).error).toBe("Write something to post");
  });
  it("rejects posts over the limit but accepts exactly the limit", () => {
    expect(cleanClubPost({ body: "x".repeat(MAX_BODY) }).body).toHaveLength(MAX_BODY);
    expect(cleanClubPost({ body: "x".repeat(MAX_BODY + 1) }).error).toMatch(/1000 characters/);
  });
});
