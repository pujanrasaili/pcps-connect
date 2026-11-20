const { escapeHtml } = require("./escapeHtml");

// The sign-up answers a student gave, ready for an email: only the answered
// ones, with both the question and the answer HTML-escaped.
function answersForEmail(answers) {
  return (answers || [])
    .filter((a) => a && String(a.answer || "").trim())
    .map((a) => ({ question: escapeHtml(`${a.question}`), answer: escapeHtml(a.answer) }));
}

module.exports = { answersForEmail };
