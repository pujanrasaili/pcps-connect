import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaTrash, FaReply } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { formatDate } from "../utils/formatDate";
import ConfirmDialog from "./ConfirmDialog";
import Button from "./Button";

const MAX_QUESTION = 300;
const MAX_ANSWER = 1000;

// Public questions and answers on an event page. Anyone can read; a logged-in
// student can ask (on an upcoming event) and delete their own; the event's
// organisers (`canAnswer`) can answer and delete. The server enforces all of
// this again, so hiding controls here is only convenience. Only first names
// are shown, so a student's full name is never public.
export default function EventQuestions({ eventId, eventOver, canAnswer, isAuthenticated }) {
  const toast = useToast();
  const [questions, setQuestions] = useState(null); // null = loading
  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState(false);
  const [answering, setAnswering] = useState(null); // id of the question being answered
  const [answerDraft, setAnswerDraft] = useState("");
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setQuestions(null);
    api
      .get(`/events/${eventId}/questions`)
      .then((res) => !cancelled && setQuestions(res.data.questions || []))
      .catch(() => !cancelled && setQuestions([])); // never block the event page
    return () => {
      cancelled = true;
    };
  }, [eventId, isAuthenticated]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (draft.trim().length < 3) return;
    setAsking(true);
    try {
      const res = await api.post(`/events/${eventId}/questions`, { question: draft });
      setQuestions((prev) => [res.data.question, ...(prev || [])]);
      setDraft("");
      toast.success("Question posted. You'll get an email when it's answered.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't post your question"));
    } finally {
      setAsking(false);
    }
  };

  const startAnswer = (q) => {
    setAnswering(q._id);
    setAnswerDraft(q.answer || "");
  };

  const handleAnswer = async (e) => {
    e.preventDefault();
    if (!answerDraft.trim()) return;
    setSavingAnswer(true);
    try {
      const res = await api.put(`/events/${eventId}/questions/${answering}/answer`, { answer: answerDraft });
      const saved = res.data.question;
      setQuestions((prev) => prev.map((q) => (q._id === answering ? { ...q, ...saved, mine: q.mine } : q)));
      setAnswering(null);
      setAnswerDraft("");
      toast.success("Answer saved.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't save the answer"));
    } finally {
      setSavingAnswer(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/events/${eventId}/questions/${deleteTarget._id}`);
      setQuestions((prev) => prev.filter((q) => q._id !== deleteTarget._id));
      setDeleteTarget(null);
      toast.success("Question deleted.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't delete the question"));
    } finally {
      setDeleting(false);
    }
  };

  if (questions === null) return null;
  // Nothing to show, nobody who can add to it: leave the section out entirely.
  if (questions.length === 0 && eventOver && !canAnswer) return null;

  return (
    <section aria-labelledby="event-questions-heading" className="card-surface p-6">
      <h2 id="event-questions-heading" className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100">
        Questions &amp; answers
      </h2>

      {!eventOver &&
        (isAuthenticated ? (
          <form onSubmit={handleAsk} className="mt-4">
            <label htmlFor="event-question-draft" className="label-field">
              Ask the organisers
            </label>
            <textarea
              id="event-question-draft"
              rows={2}
              maxLength={MAX_QUESTION}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="For example: is food provided, or should I bring a laptop?"
              className="input-field resize-none"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-600 dark:text-slate-300">
                {draft.length} / {MAX_QUESTION} · your first name is shown
              </span>
              <Button type="submit" disabled={asking || draft.trim().length < 3}>
                {asking ? "Posting..." : "Ask"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            <Link
              to="/login"
              state={{ from: `/events/${eventId}` }}
              className="font-semibold text-primary-600 hover:underline dark:text-primary-300"
            >
              Log in
            </Link>{" "}
            to ask the organisers a question.
          </p>
        ))}

      {questions.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">No questions yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {questions.map((q) => (
            <li key={q._id} className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
              <p className="whitespace-pre-line break-words text-sm font-medium text-slate-800 dark:text-slate-100">{q.question}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {q.authorName} asked · {formatDate(q.createdAt)}
              </p>

              {q.answer ? (
                <div className="mt-3 rounded-lg bg-primary-50 p-3 dark:bg-primary-900/20">
                  <p className="whitespace-pre-line break-words text-sm text-slate-800 dark:text-slate-100">{q.answer}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Answered by {q.answeredByName || "the organisers"}</p>
                </div>
              ) : (
                <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">Waiting for an answer</p>
              )}

              {answering === q._id && (
                <form onSubmit={handleAnswer} className="mt-3">
                  <label htmlFor={`answer-${q._id}`} className="sr-only">
                    Your answer
                  </label>
                  <textarea
                    id={`answer-${q._id}`}
                    rows={3}
                    maxLength={MAX_ANSWER}
                    value={answerDraft}
                    onChange={(e) => setAnswerDraft(e.target.value)}
                    className="input-field resize-none"
                    data-autofocus
                  />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      {answerDraft.length} / {MAX_ANSWER} · public
                    </span>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setAnswering(null)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={savingAnswer || !answerDraft.trim()}>
                        {savingAnswer ? "Saving..." : "Save answer"}
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {(canAnswer || q.mine) && answering !== q._id && (
                <div className="mt-2 flex items-center gap-3">
                  {canAnswer && (
                    <button
                      type="button"
                      onClick={() => startAnswer(q)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-300"
                    >
                      <FaReply aria-hidden="true" /> {q.answer ? "Edit answer" : "Answer"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(q)}
                    aria-label={`Delete the question from ${q.authorName}`}
                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/20"
                  >
                    <FaTrash className="text-xs" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this question?"
        message="The question and its answer will be removed from the event page. This can't be undone."
        confirming={deleting}
      />
    </section>
  );
}
