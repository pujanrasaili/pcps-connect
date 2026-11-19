import { answersComplete } from "./signupAnswers.js";
import { isUpcoming } from "./formatDate.js";

// Upcoming events where the student is signed up but a required sign-up
// question has no answer (the organisers added it after they registered).
// `events` carry the questions; a registration's answers are {question, answer}.
export function answersNeeded(registrations = [], events = []) {
  const byId = new Map((events || []).map((e) => [e._id, e]));
  const out = [];
  for (const r of registrations || []) {
    const event = byId.get(r.event?._id);
    const questions = event?.signupQuestions || [];
    if (!event || !questions.length || !isUpcoming(event.date)) continue;
    const answers = questions.map((q) => (r.answers || []).find((a) => a.question === q.text)?.answer || "");
    if (!answersComplete(questions, answers)) out.push(event);
  }
  return out;
}
