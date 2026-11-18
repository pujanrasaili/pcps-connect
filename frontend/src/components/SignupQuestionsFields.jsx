import { useId } from "react";
import { useLang } from "../context/LanguageContext";
import { ANSWER_MAX } from "../utils/signupAnswers";

// Inputs for an event's sign-up questions. `answers` lines up with
// `questions` by position; the server checks the same rules again.
export default function SignupQuestionsFields({ questions = [], answers = [], onChange }) {
  const { t } = useLang();
  const base = useId();
  if (!questions.length) return null;

  const set = (i, value) => {
    const next = questions.map((_, j) => answers[j] || "");
    next[i] = value;
    onChange(next);
  };

  return (
    <div className="space-y-3" data-testid="signup-questions">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("A few questions from the organisers")}</p>
      {questions.map((q, i) => (
        <div key={q._id || i}>
          <label htmlFor={`${base}-${i}`} className="mb-1 block text-sm text-slate-600 dark:text-slate-300">
            {q.text}
            {q.required ? <span className="ml-1 text-rose-600" aria-hidden="true">*</span> : <span className="ml-1 text-xs text-slate-600 dark:text-slate-300">({t("optional")})</span>}
          </label>
          <input
            id={`${base}-${i}`}
            className="input-field"
            value={answers[i] || ""}
            maxLength={ANSWER_MAX}
            required={!!q.required}
            aria-required={!!q.required}
            onChange={(e) => set(i, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
