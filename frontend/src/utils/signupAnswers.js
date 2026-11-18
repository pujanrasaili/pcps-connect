export const ANSWER_MAX = 200;

// True when every required question has a non-blank answer. `answers` lines up
// with `questions` by position; the server checks the same rule again.
export function answersComplete(questions, answers) {
  return (questions || []).every((q, i) => !q.required || String((answers || [])[i] ?? "").trim() !== "");
}
