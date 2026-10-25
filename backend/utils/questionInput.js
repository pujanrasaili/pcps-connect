// Text rules for event questions and their answers. Each returns
// { value } (trimmed) or { error }.
const MAX_QUESTION = 300;
const MIN_QUESTION = 3;
const MAX_ANSWER = 1000;
// Open (unanswered) questions one student may have on one event. Stops one
// person filling an event page, without bothering anyone who asks normally.
const MAX_OPEN_PER_STUDENT = 3;

function cleanQuestion(input = {}) {
  const raw = input.question;
  if (typeof raw !== "string") return { error: "Write your question" };
  const value = raw.trim();
  if (value.length < MIN_QUESTION) return { error: "Write your question" };
  if (value.length > MAX_QUESTION) return { error: `A question must be ${MAX_QUESTION} characters or fewer` };
  return { value };
}

function cleanAnswer(input = {}) {
  const raw = input.answer;
  if (typeof raw !== "string" || !raw.trim()) return { error: "Write an answer" };
  const value = raw.trim();
  if (value.length > MAX_ANSWER) return { error: `An answer must be ${MAX_ANSWER} characters or fewer` };
  return { value };
}

// "Sita Rai" -> "Sita". Falls back to "A student" for an empty name.
function firstName(name) {
  const first = String(name || "").trim().split(/\s+/)[0];
  return first ? first.slice(0, 30) : "A student";
}

module.exports = { cleanQuestion, cleanAnswer, firstName, MAX_QUESTION, MAX_ANSWER, MAX_OPEN_PER_STUDENT };
