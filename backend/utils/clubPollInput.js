// Checks the text of a new club poll. Returns { question, options, days } (cleaned) or { error }.
const MAX_QUESTION = 150;
const MAX_OPTION = 60;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 5;
const DEFAULT_DAYS = 7;
const MAX_DAYS = 14;
// A club can have this many polls open at once, so members aren't buried.
const MAX_OPEN = 3;

function cleanClubPoll(input = {}) {
  const question = typeof input.question === "string" ? input.question.trim() : "";
  if (question.length < 3) return { error: "Write the question first" };
  if (question.length > MAX_QUESTION) return { error: `A question must be ${MAX_QUESTION} characters or fewer` };

  if (!Array.isArray(input.options)) return { error: `Give ${MIN_OPTIONS} to ${MAX_OPTIONS} answers` };
  const options = input.options.map((o) => (typeof o === "string" ? o.trim() : "")).filter(Boolean);
  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) return { error: `Give ${MIN_OPTIONS} to ${MAX_OPTIONS} answers` };
  if (options.some((o) => o.length > MAX_OPTION)) return { error: `An answer must be ${MAX_OPTION} characters or fewer` };
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return { error: "Each answer must be different" };

  let days = DEFAULT_DAYS;
  if (input.days !== undefined && input.days !== null && input.days !== "") {
    days = Number(input.days);
    if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) return { error: `A poll can stay open for 1 to ${MAX_DAYS} days` };
  }
  return { question, options, days };
}

module.exports = { cleanClubPoll, MAX_QUESTION, MAX_OPTION, MIN_OPTIONS, MAX_OPTIONS, DEFAULT_DAYS, MAX_DAYS, MAX_OPEN };
