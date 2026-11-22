const { cleanFeedbackQuestions, buildFeedbackAnswers, MAX_QUESTIONS, MAX_QUESTION, MAX_ANSWER } = require("../feedbackQuestions");

describe("cleanFeedbackQuestions", () => {
  it("accepts texts or { text } objects and tidies spaces", () => {
    expect(cleanFeedbackQuestions(["  Was the   venue easy to find? ", { text: "Food?" }]).value).toEqual([
      { text: "Was the venue easy to find?" },
      { text: "Food?" },
    ]);
  });

  it("an empty list switches the questions off", () => {
    expect(cleanFeedbackQuestions([]).value).toEqual([]);
  });

  it("rejects anything that is not a list, too many, blank, too long or repeated", () => {
    expect(cleanFeedbackQuestions("x").error).toMatch(/list/);
    expect(cleanFeedbackQuestions(Array(MAX_QUESTIONS + 1).fill("a?").map((q, i) => `${q}${i}`)).error).toMatch(/at most 3/);
    expect(cleanFeedbackQuestions([""]).error).toMatch(/some text/);
    expect(cleanFeedbackQuestions([null]).error).toMatch(/some text/);
    expect(cleanFeedbackQuestions(["x".repeat(MAX_QUESTION + 1)]).error).toMatch(/100/);
    expect(cleanFeedbackQuestions(["Food?", "food?"]).error).toMatch(/can't be the same/);
  });
});

describe("buildFeedbackAnswers", () => {
  const questions = [{ text: "Venue?" }, { text: "Food?" }, { text: "Time?" }];

  it("pairs answers with the question text and leaves blank ones out", () => {
    expect(buildFeedbackAnswers(questions, ["Easy", "  ", " Too   late "]).value).toEqual([
      { question: "Venue?", answer: "Easy" },
      { question: "Time?", answer: "Too late" },
    ]);
  });

  it("returns nothing when the event has no questions", () => {
    expect(buildFeedbackAnswers([], ["x"]).value).toEqual([]);
    expect(buildFeedbackAnswers(undefined, ["x"]).value).toEqual([]);
  });

  it("ignores extra answers and non-text answers", () => {
    expect(buildFeedbackAnswers([{ text: "Venue?" }], [42, "extra"]).value).toEqual([]);
  });

  it("rejects an answer that is too long", () => {
    expect(buildFeedbackAnswers(questions, ["x".repeat(MAX_ANSWER + 1)]).error).toMatch(/300/);
  });
});
