const { cleanQuestion, cleanAnswer, firstName, MAX_QUESTION, MAX_ANSWER } = require("../questionInput");

describe("cleanQuestion", () => {
  it("trims and accepts a normal question", () => {
    expect(cleanQuestion({ question: "  Is food provided?  " })).toEqual({ value: "Is food provided?" });
  });
  it("rejects missing, non-text, too short and too long", () => {
    for (const q of [undefined, 5, { a: 1 }, "", "  ", "hi"]) expect(cleanQuestion({ question: q }).error).toBe("Write your question");
    expect(cleanQuestion({ question: "x".repeat(MAX_QUESTION + 1) }).error).toMatch(/300 characters/);
    expect(cleanQuestion().error).toBe("Write your question");
  });
});

describe("cleanAnswer", () => {
  it("trims and accepts an answer", () => {
    expect(cleanAnswer({ answer: " Yes, lunch is free. " })).toEqual({ value: "Yes, lunch is free." });
  });
  it("rejects empty, non-text and over-long", () => {
    expect(cleanAnswer({ answer: "   " }).error).toBe("Write an answer");
    expect(cleanAnswer({ answer: 3 }).error).toBe("Write an answer");
    expect(cleanAnswer({ answer: "x".repeat(MAX_ANSWER + 1) }).error).toMatch(/1000 characters/);
  });
});

describe("firstName", () => {
  it("keeps only the first name so full names are never public", () => {
    expect(firstName("Sita Kumari Rai")).toBe("Sita");
    expect(firstName("  Ram ")).toBe("Ram");
  });
  it("falls back for empty names and caps absurd ones", () => {
    expect(firstName("")).toBe("A student");
    expect(firstName(undefined)).toBe("A student");
    expect(firstName("x".repeat(100))).toHaveLength(30);
  });
});
