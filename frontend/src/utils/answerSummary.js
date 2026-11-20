// A tally of the answers to each sign-up question, for organisers ("how many
// of each T-shirt size?"). Answers are compared ignoring case and spacing; the
// first spelling seen is shown. The most common come first.
const TOP = 5;

export function summariseAnswers(questions = [], registrations = []) {
  return questions.map((q) => {
    const counts = new Map();
    let answered = 0;
    for (const r of registrations) {
      const raw = (r.answers || []).find((a) => a.question === q.text)?.answer;
      const text = String(raw ?? "").trim().replace(/\s+/g, " ");
      if (!text) continue;
      answered += 1;
      const key = text.toLowerCase();
      const entry = counts.get(key) || { answer: text, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    }
    const sorted = [...counts.values()].sort((a, b) => b.count - a.count || a.answer.localeCompare(b.answer));
    return {
      question: q.text,
      answered,
      unanswered: registrations.length - answered,
      top: sorted.slice(0, TOP),
      moreDistinct: Math.max(0, sorted.length - TOP),
    };
  });
}
