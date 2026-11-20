import { useEffect, useState } from "react";
import { FaTrash, FaPlus, FaLock } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LanguageContext";
import { formatDate } from "../utils/formatDate";
import Button from "./Button";
import { useUnsavedWarning } from "../hooks/useUnsavedWarning";

const MAX_OPTIONS = 5;
const DAY_CHOICES = [1, 3, 7, 14];
const BLANK = { question: "", options: ["", ""], days: 7 };

// A club's polls. Members vote (one vote each, and they can change it while
// the poll is open); everyone who can see a poll sees live counts, never who
// voted for what. The club's leaders and the admins (`staff`) can also start
// and remove polls. The server checks all of this again, so hiding the
// controls is only convenience. Mount it with key={clubId} so each club
// starts fresh.
export default function ClubPolls({ clubId, member, staff }) {
  const toast = useToast();
  const { t } = useLang();
  const [polls, setPolls] = useState(null); // null = still loading
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  // A poll that's been started but not published: warn before the tab is closed.
  useUnsavedWarning(creating && (draft.question.trim() !== "" || draft.options.some((o) => o.trim() !== "")));

  useEffect(() => {
    if (!member && !staff) return undefined;
    let cancelled = false;
    api
      .get(`/clubs/${clubId}/polls`)
      .then((res) => !cancelled && setPolls(res.data.polls || []))
      .catch(() => !cancelled && setPolls([])); // polls are a nice-to-have: never block the club page
    return () => {
      cancelled = true;
    };
  }, [clubId, member, staff]);

  if (!member && !staff) return null;
  if (polls === null) return null;
  if (polls.length === 0 && !staff) return null;

  const setOption = (i, value) => setDraft((d) => ({ ...d, options: d.options.map((o, j) => (j === i ? value : o)) }));
  const filled = draft.options.map((o) => o.trim()).filter(Boolean);
  const canStart = draft.question.trim().length >= 3 && filled.length >= 2;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canStart) return;
    setSaving(true);
    try {
      const res = await api.post(`/clubs/${clubId}/polls`, { question: draft.question, options: filled, days: draft.days });
      setPolls((prev) => [res.data.poll, ...(prev || [])]);
      setDraft(BLANK);
      setCreating(false);
      toast.success(t("Poll started."));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't start the poll")));
    } finally {
      setSaving(false);
    }
  };

  const handleVote = async (poll, index) => {
    if (poll.myVote === index) return;
    try {
      const res = await api.post(`/clubs/${clubId}/polls/${poll._id}/vote`, { option: index });
      setPolls((prev) => (prev || []).map((p) => (p._id === poll._id ? res.data.poll : p)));
      toast.success(t("Vote saved."));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't save your vote")));
    }
  };

  const handleClose = async (poll) => {
    try {
      const res = await api.post(`/clubs/${clubId}/polls/${poll._id}/close`);
      setPolls((prev) => (prev || []).map((p) => (p._id === poll._id ? res.data.poll : p)));
      toast.success(t("Poll closed."));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't close the poll")));
    }
  };

  const handleRemove = async (poll) => {
    try {
      await api.delete(`/clubs/${clubId}/polls/${poll._id}`);
      setPolls((prev) => (prev || []).filter((p) => p._id !== poll._id));
      toast.success(t("Poll removed."));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't remove the poll")));
    }
  };

  return (
    <section aria-labelledby="club-polls-heading" className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 id="club-polls-heading" className="font-semibold text-slate-800 dark:text-slate-100">
          {t("Polls")}
        </h3>
        {staff && !creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-900/30"
          >
            <FaPlus className="text-xs" aria-hidden="true" /> {t("Start a poll")}
          </button>
        )}
      </div>

      {staff && creating && (
        <form onSubmit={handleCreate} className="mt-2 space-y-2 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
          <div>
            <label htmlFor="club-poll-question" className="sr-only">
              {t("Your question")}
            </label>
            <input
              id="club-poll-question"
              maxLength={150}
              value={draft.question}
              onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
              placeholder={t("Which day works for the next meeting?")}
              className="input-field"
            />
          </div>
          {draft.options.map((o, i) => (
            <div key={i}>
              <label htmlFor={`club-poll-option-${i}`} className="sr-only">
                {t("Answer {n}", { n: i + 1 })}
              </label>
              <input
                id={`club-poll-option-${i}`}
                maxLength={60}
                value={o}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={t("Answer {n}", { n: i + 1 })}
                className="input-field"
              />
            </div>
          ))}
          {draft.options.length < MAX_OPTIONS && (
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, options: [...d.options, ""] }))}
              className="text-sm font-semibold text-primary-700 hover:underline dark:text-primary-300"
            >
              {t("Add an answer")}
            </button>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200">
              {t("Open for")}
              <select
                value={draft.days}
                onChange={(e) => setDraft((d) => ({ ...d, days: Number(e.target.value) }))}
                className="input-field w-auto py-1.5"
              >
                {DAY_CHOICES.map((n) => (
                  <option key={n} value={n}>
                    {t(n === 1 ? "{n} day" : "{n} days", { n })}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreating(false);
                  setDraft(BLANK);
                }}
              >
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={saving || !canStart}>
                {saving ? t("Starting...") : t("Start poll")}
              </Button>
            </div>
          </div>
        </form>
      )}

      {polls.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {polls.map((poll) => (
            <li key={poll._id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <p className="wrap-break-word text-sm font-semibold text-slate-800 dark:text-slate-100">{poll.question}</p>
                {staff && (
                  <div className="flex shrink-0 items-center gap-1">
                    {!poll.closed && (
                      <button
                        type="button"
                        onClick={() => handleClose(poll)}
                        aria-label={t("Close the poll now: {question}", { question: poll.question })}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <FaLock className="text-xs" aria-hidden="true" />
                      </button>
                    )}
                  <button
                    type="button"
                    onClick={() => handleRemove(poll)}
                    aria-label={t("Remove the poll: {question}", { question: poll.question })}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/20"
                  >
                    <FaTrash className="text-xs" aria-hidden="true" />
                  </button>
                  </div>
                )}
              </div>
              <ul className="mt-2 space-y-1.5">
                {poll.options.map((o, i) => {
                  const pct = poll.total ? Math.round((o.count / poll.total) * 100) : 0;
                  const mine = poll.myVote === i;
                  const canVote = member && !poll.closed;
                  const body = (
                    <>
                      <span aria-hidden="true" className="absolute inset-y-0 left-0 rounded-lg bg-primary-100 dark:bg-primary-900/40" style={{ width: `${pct}%` }} />
                      <span className="relative flex items-center justify-between gap-3">
                        <span className="min-w-0 wrap-break-word">
                          {o.text}
                          {mine ? ` ${t("(your vote)")}` : ""}
                        </span>
                        <span className="shrink-0 text-xs text-slate-600 dark:text-slate-300">
                          {pct}% · {o.count}
                        </span>
                      </span>
                    </>
                  );
                  const cls = `relative block w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm text-slate-800 dark:text-slate-100 ${
                    mine ? "border-primary-500" : "border-slate-200 dark:border-slate-700"
                  }`;
                  return (
                    <li key={i}>
                      {canVote ? (
                        <button type="button" aria-pressed={mine} onClick={() => handleVote(poll, i)} className={`${cls} hover:border-primary-400`}>
                          {body}
                        </button>
                      ) : (
                        <div className={cls}>{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                {t(poll.total === 1 ? "{n} vote" : "{n} votes", { n: poll.total })} ·{" "}
                {poll.closed ? t("Closed") : t("Closes {date}", { date: formatDate(poll.closesAt) })}
                {!member && !poll.closed ? ` · ${t("Only members can vote.")}` : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t("No polls yet.")}</p>
      )}
    </section>
  );
}
