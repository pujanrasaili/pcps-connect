import { useState } from "react";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LanguageContext";
import { useRegistrations } from "../context/RegistrationContext";
import { answersComplete } from "../utils/signupAnswers";
import SignupQuestionsFields from "./SignupQuestionsFields";
import Button from "./Button";

// Answers stored on a registration are {question, answer}; line them up with
// the event's current questions by question text.
const lineUp = (questions, stored) =>
  questions.map((q) => (stored || []).find((a) => a.question === q.text)?.answer || "");

// Lets a student fix their answers to the organisers' sign-up questions
// until the event happens. The server checks the same rules again.
export default function MyAnswersCard({ registration, questions = [] }) {
  const toast = useToast();
  const { t } = useLang();
  const { refreshRegistrations } = useRegistrations();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState([]);

  if (!registration || !questions.length) return null;
  const current = lineUp(questions, registration.answers);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put(`/registrations/${registration._id}/answers`, { answers: draft });
      await refreshRegistrations();
      toast.success(t("Your answers were saved"));
      setEditing(false);
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't save your answers")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="my-answers-heading" className="card-surface p-6" data-testid="my-answers">
      <div className="flex items-center justify-between gap-3">
        <h2 id="my-answers-heading" className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100">
          {t("Your answers")}
        </h2>
        {!editing && (
          <Button variant="outline" onClick={() => { setDraft(current); setEditing(true); }}>
            {t("Edit my answers")}
          </Button>
        )}
      </div>
      {editing ? (
        <form onSubmit={save} className="mt-4 space-y-4">
          <SignupQuestionsFields questions={questions} answers={draft} onChange={setDraft} />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || !answersComplete(questions, draft)}>
              {busy ? t("Saving...") : t("Save answers")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={busy}>{t("Cancel")}</Button>
          </div>
        </form>
      ) : (
        <dl className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-200">
          {questions.map((q, i) => (
            <div key={q._id || i}>
              <dt className="text-slate-600 dark:text-slate-300">{q.text}</dt>
              <dd className="font-medium">{current[i] || "-"}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
