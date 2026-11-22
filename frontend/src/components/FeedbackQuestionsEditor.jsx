import { useState } from "react";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LanguageContext";
import Button from "./Button";

const MAX_QUESTIONS = 3;
const MAX_TEXT = 100;

// Organisers (admins and the event's club leaders) choose up to three short
// questions that people who attended can answer next to their star rating.
// Answering is always optional. The server checks permission and the limits
// again.
export default function FeedbackQuestionsEditor({ eventId, questions = [], onSaved }) {
  const toast = useToast();
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState([]);

  const startEdit = () => {
    setDraft(questions.map((q) => q.text));
    setEditing(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put(`/events/${eventId}/feedback-questions`, { questions: draft.map((text) => ({ text })) });
      toast.success(t("Feedback questions saved"));
      setEditing(false);
      onSaved?.();
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't save the questions")));
    } finally {
      setBusy(false);
    }
  };

  const input =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

  return (
    <section aria-labelledby="feedback-questions-heading" className="card-surface p-6" data-testid="feedback-questions-editor">
      <div className="flex items-center justify-between gap-3">
        <h2 id="feedback-questions-heading" className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100">
          {t("Feedback questions")}
        </h2>
        {!editing && (
          <Button variant="outline" onClick={startEdit}>
            {questions.length ? t("Edit feedback questions") : t("Add feedback questions")}
          </Button>
        )}
      </div>

      {editing ? (
        <form onSubmit={save} className="mt-4 space-y-3">
          {draft.map((text, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <label className="min-w-48 flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("Question")}
                <input
                  value={text}
                  onChange={(e) => setDraft((rows) => rows.map((r, j) => (j === i ? e.target.value : r)))}
                  maxLength={MAX_TEXT}
                  required
                  className={`${input} mt-1 block w-full`}
                />
              </label>
              <Button variant="ghost" onClick={() => setDraft((rows) => rows.filter((_, j) => j !== i))} aria-label={`${t("Remove")} ${text}`.trim()}>
                {t("Remove")}
              </Button>
            </div>
          ))}
          {draft.length < MAX_QUESTIONS && (
            <Button variant="outline" onClick={() => setDraft((rows) => [...rows, ""])}>
              {t("Add a question")}
            </Button>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {t("People who attended can answer these with their rating. Answering is optional, and only organisers see the answers.")}
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {t("Save questions")}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              {t("Cancel")}
            </Button>
          </div>
        </form>
      ) : questions.length ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
          {questions.map((q) => (
            <li key={q._id || q.text}>{q.text}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {t("Ask people who attended something specific, like whether the venue was easy to find.")}
        </p>
      )}
    </section>
  );
}
