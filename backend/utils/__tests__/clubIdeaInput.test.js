const { cleanClubIdea, MAX_BODY, MAX_PER_MEMBER } = require("../clubIdeaInput");

describe("cleanClubIdea", () => {
  it("trims the text", () => expect(cleanClubIdea({ body: "  a trip to Nagarkot " })).toEqual({ body: "a trip to Nagarkot" }));
  it("accepts exactly the limit", () => expect(cleanClubIdea({ body: "x".repeat(MAX_BODY) }).body).toHaveLength(MAX_BODY));
  it("rejects one character over", () => expect(cleanClubIdea({ body: "x".repeat(MAX_BODY + 1) }).error).toMatch(/300/));
  it.each([[undefined], [{}], [{ body: null }], [{ body: 7 }], [{ body: ["a"] }], [{ body: "  " }]])("rejects %j", (input) => expect(cleanClubIdea(input).error).toBe("Write your idea first"));
  it("limits waiting ideas to three", () => expect(MAX_PER_MEMBER).toBe(3));
});
