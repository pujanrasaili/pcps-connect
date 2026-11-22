// Feedback questions: up to three short questions an event's organisers ask
// people who attended, next to the star rating and comment ("Was the venue
// easy to find?"). Answering is always optional. Only the organisers see the
// answers.
const MAX_QUESTIONS = 3;
const MAX_QUESTION = 100;
const MAX_ANSWER = 300;

// Checks the questions an organiser submits. Returns { value: [{ text }] } or
// { error }. An empty list switches the questions off.
function cleanFeedbackQuestions(input) {
  if (!Array.isArray(input)) return { error: "Questions must be a list" };
  if (input.length > MAX_QUESTIONS) return { error: `An event can have at most ${MAX_QUESTIONS} feedback questions` };
  const out = [];
  const seen = new Set();
  for (const q of input) {
    const raw = typeof q === "string" ? q : q && typeof q === "object" ? q.text : "";
    const text = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
    if (text.length < 2) return { error: "Each question needs some text" };
    if (text.length > MAX_QUESTION) return { error: `A question must be ${MAX_QUESTION} characters or fewer` };
    if (seen.has(text.toLowerCase())) return { error: "Two questions can't be the same" };
    seen.add(text.toLowerCase());
    out.push({ text });
  }
  return { value: out };
}

// Matches a student's answers (a list of texts, in the order of the event's
// questions) to those questions. Returns { value: [{ question, answer }] } with
// the question text copied in, so an answer still makes sense if the organisers
// reword the question later, or { error } when an answer is too long. Blank
// answers are left out.
function buildFeedbackAnswers(questions, answers) {
  const list = Array.isArray(questions) ? questions : [];
  if (list.length === 0) return { value: [] };
  const given = Array.isArray(answers) ? answers : [];
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    const raw = given[i];
    const answer = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
    if (answer.length > MAX_ANSWER) return { error: `An answer must be ${MAX_ANSWER} characters or fewer` };
    if (answer) out.push({ question: list[i].text, answer });
  }
  return { value: out };
}

module.exports = { cleanFeedbackQuestions, buildFeedbackAnswers, MAX_QUESTIONS, MAX_QUESTION, MAX_ANSWER };
