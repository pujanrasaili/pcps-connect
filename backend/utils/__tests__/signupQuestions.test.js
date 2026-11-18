const { cleanQuestions, buildAnswers } = require("../signupQuestions");

describe("cleanQuestions", () => {
  it("trims, tidies spaces and defaults required to false", () => {
    expect(cleanQuestions([{ text: "  T-shirt   size? " }, { text: "Phone", required: true }, { text: "Diet", required: "true" }]).value).toEqual([
      { text: "T-shirt size?", required: false },
      { text: "Phone", required: true },
      { text: "Diet", required: true },
    ]);
  });
  it("keeps an _id so a reworded question stays the same one", () => {
    expect(cleanQuestions([{ _id: 7, text: "Size?" }]).value[0]._id).toBe("7");
  });
  it("accepts an empty list (switches the questions off)", () => {
    expect(cleanQuestions([]).value).toEqual([]);
  });
  it("refuses a non-list, too many, empty, too long and repeated questions", () => {
    expect(cleanQuestions("x").error).toBe("Questions must be a list");
    expect(cleanQuestions(null).error).toBe("Questions must be a list");
    expect(cleanQuestions([{ text: "aa" }, { text: "bb" }, { text: "cc" }, { text: "dd" }]).error).toMatch(/at most 3/);
    expect(cleanQuestions([{ text: " " }]).error).toBe("Each question needs some text");
    expect(cleanQuestions([null]).error).toBe("Each question needs some text");
    expect(cleanQuestions([{ text: "x".repeat(101) }]).error).toMatch(/100 characters/);
    expect(cleanQuestions([{ text: "Size?" }, { text: "size?" }]).error).toBe("Two questions can't be the same");
  });
});

describe("buildAnswers", () => {
  const qs = [{ text: "Size?", required: true }, { text: "Notes?", required: false }];
  it("copies the question text next to each answer and skips blank optional ones", () => {
    expect(buildAnswers(qs, [" M ", "  "]).value).toEqual([{ question: "Size?", answer: "M" }]);
    expect(buildAnswers(qs, ["L", "none"]).value).toHaveLength(2);
  });
  it("asks for a missing required answer by name", () => {
    expect(buildAnswers(qs, ["", "x"]).error).toBe("Please answer: Size?");
    expect(buildAnswers(qs, undefined).error).toBe("Please answer: Size?");
    expect(buildAnswers(qs, [42]).error).toBe("Please answer: Size?");
  });
  it("refuses an answer over 200 characters", () => {
    expect(buildAnswers(qs, ["x".repeat(201)]).error).toMatch(/200 characters/);
  });
  it("gives nothing for an event with no questions, whatever was sent", () => {
    expect(buildAnswers([], ["a"]).value).toEqual([]);
    expect(buildAnswers(undefined, null).value).toEqual([]);
  });
});
