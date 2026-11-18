// Sign-up questions: up to three short questions an event's organisers ask
// everyone who registers (T-shirt size, a phone number, dietary needs...).
// Only the organisers see the answers.
const MAX_QUESTIONS = 3;
const MAX_QUESTION = 100;
const MAX_ANSWER = 200;

// Checks the questions an organiser submits. Returns { value: [{ _id?, text,
// required }] } or { error }. An empty list switches the questions off. An _id
// is kept so a question that is only reworded stays the same question.
function cleanQuestions(input) {
  if (!Array.isArray(input)) return { error: "Questions must be a list" };
  if (input.length > MAX_QUESTIONS) return { error: `An event can have at most ${MAX_QUESTIONS} sign-up questions` };
  const out = [];
  const seen = new Set();
  for (const q of input) {
    if (!q || typeof q !== "object") return { error: "Each question needs some text" };
    const text = typeof q.text === "string" ? q.text.trim().replace(/\s+/g, " ") : "";
    if (text.length < 2) return { error: "Each question needs some text" };
    if (text.length > MAX_QUESTION) return { error: `A question must be ${MAX_QUESTION} characters or fewer` };
    if (seen.has(text.toLowerCase())) return { error: "Two questions can't be the same" };
    seen.add(text.toLowerCase());
    const item = { text, required: q.required === true || q.required === "true" };
    if (q._id) item._id = String(q._id);
    out.push(item);
  }
  return { value: out };
}

// Matches a student's answers (a list of texts, in the order of the event's
// questions) to those questions. Returns { value: [{ question, answer }] } --
// the question text is copied in, so the answer still makes sense if the
// organisers reword the question later -- or { error } when a required one is
// empty or an answer is too long. Blank optional answers are left out.
function buildAnswers(questions, answers) {
  const list = Array.isArray(questions) ? questions : [];
  if (list.length === 0) return { value: [] };
  const given = Array.isArray(answers) ? answers : [];
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    const raw = given[i];
    const answer = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
    if (answer.length > MAX_ANSWER) return { error: `An answer must be ${MAX_ANSWER} characters or fewer` };
    if (!answer) {
      if (list[i].required) return { error: `Please answer: ${list[i].text}` };
      continue;
    }
    out.push({ question: list[i].text, answer });
  }
  return { value: out };
}

module.exports = { cleanQuestions, buildAnswers, MAX_QUESTIONS, MAX_QUESTION, MAX_ANSWER };
