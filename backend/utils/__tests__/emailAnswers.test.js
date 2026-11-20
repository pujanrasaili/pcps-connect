const { answersForEmail } = require("../emailAnswers");

describe("answersForEmail", () => {
  it("keeps only answered questions and escapes HTML in both parts", () => {
    expect(answersForEmail([
      { question: "A <b>?", answer: "x & y" },
      { question: "Blank?", answer: "   " },
      { question: "Missing?" },
      null,
    ])).toEqual([{ question: "A &lt;b&gt;?", answer: "x &amp; y" }]);
  });

  it("copes with nothing at all", () => {
    expect(answersForEmail(undefined)).toEqual([]);
    expect(answersForEmail([])).toEqual([]);
  });
});
