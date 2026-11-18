import { useState } from "react";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LanguageContext";
import Button from "./Button";

const MAX_QUESTIONS = 3;
const MAX_TEXT = 100;

// Organisers (admins and the event's club leaders) choose up to three extra
// questions that students answer when they register or join the waitlist.
// The server checks permission and the limits again.
export default function SignupQuestionsEditor({ eventId, questions = [], onSaved }) {
  const toast = useToast();
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState([]);

  const startEdit = () => {
    setDraft(questions.map((q) => ({ _id: q._id, text: q.text, required: !!q.required })));
    setEditing(true);
  };
  const setRow = (i, patch) => setDraft((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put(`/events/${eventId}/signup-questions`, {
        questions: draft.map((r) => ({ ...(r._id ? { _id: r._id } : {}), text: r.text, required: r.required })),
      });
      toast.success(t("Sign-up questions saved"));
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
    <section aria-labelledby="signup-questions-heading" className="card-surface p-6" data-testid="signup-questions-editor">
      <div className="flex items-center justify-between gap-3">
        <h2 id="signup-questions-heading" className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100">
          {t("Sign-up questions")}
        </h2>
        {!editing && (
          <Button variant="outline" onClick={startEdit}>
            {questions.length ? t("Edit questions") : t("Add questions")}
          </Button>
        )}
      </div>

      {editing ? (
        <form onSubmit={save} className="mt-4 space-y-3">
          {draft.map((row, i) => (
            <div key={row._id || `new-${i}`} className="flex flex-wrap items-end gap-2">
              <label className="min-w-[12rem] flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("Question")}
                <input value={row.text} onChange={(e) => setRow(i, { text: e.target.value })} maxLength={MAX_TEXT} required className={`${input} mt-1 block w-full`} />
              </label>
              <label className="flex items-center gap-2 pb-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={row.required} onChange={(e) => setRow(i, { required: e.target.checked })} />
                {t("Required")}
              </label>
              <Button variant="ghost" onClick={() => setDraft((rows) => rows.filter((_, j) => j !== i))} aria-label={`${t("Remove")} ${row.text}`.trim()}>
                {t("Remove")}
              </Button>
            </div>
          ))}
          {draft.length < MAX_QUESTIONS && (
            <Button variant="outline" onClick={() => setDraft((rows) => [...rows, { text: "", required: false }])}>
              {t("Add a question")}
            </Button>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {t("Students answer these when they register. Answers already given are kept.")}
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
            <li key={q._id || q.text}>
              {q.text} {q.required ? <span className="text-xs text-slate-500">({t("required")})</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t("Ask students for something extra when they sign up, like a T-shirt size or a phone number.")}</p>
      )}
    </section>
  );
}
