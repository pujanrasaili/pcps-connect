import { useEffect, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LanguageContext";
import { formatDate } from "../utils/formatDate";
import Button from "./Button";

const MAX = 300;
const MAX_WAITING = 3;

// A club's idea box. Members suggest something the club could do; only the
// club's leaders and the admins (`staff`) see everyone's ideas, while a member
// sees (and can take back) just their own. The server checks all of this
// again, so hiding the controls is only convenience. Mount it with key={clubId}
// so each club starts fresh.
export default function ClubIdeas({ clubId, member, staff }) {
  const toast = useToast();
  const { t } = useLang();
  const [ideas, setIdeas] = useState(null); // null = still loading
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!member && !staff) return undefined;
    let cancelled = false;
    api
      .get(`/clubs/${clubId}/ideas`)
      .then((res) => !cancelled && setIdeas(res.data.ideas || []))
      .catch(() => !cancelled && setIdeas([])); // the idea box is a nice-to-have: never block the club page
    return () => {
      cancelled = true;
    };
  }, [clubId, member, staff]);

  if (!member && !staff) return null;
  if (ideas === null) return null;

  const mine = ideas.filter((i) => i.mine);
  const full = mine.length >= MAX_WAITING;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || full) return;
    setSending(true);
    try {
      const res = await api.post(`/clubs/${clubId}/ideas`, { body: draft });
      setIdeas((prev) => [res.data.idea, ...(prev || [])]);
      setDraft("");
      toast.success(t("Idea sent to the club's leaders."));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't send your idea")));
    } finally {
      setSending(false);
    }
  };

  const handleRemove = async (idea) => {
    try {
      await api.delete(`/clubs/${clubId}/ideas/${idea._id}`);
      setIdeas((prev) => (prev || []).filter((i) => i._id !== idea._id));
      toast.success(t("Idea removed."));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't remove the idea")));
    }
  };

  return (
    <section aria-labelledby="club-ideas-heading" className="mt-5">
      <h3 id="club-ideas-heading" className="font-semibold text-slate-800 dark:text-slate-100">
        {staff ? t("Ideas from members") : t("Suggest an idea")}
      </h3>

      {member && (
        <form onSubmit={handleSend} className="mt-2">
          <label htmlFor="club-idea-draft" className="sr-only">
            {t("Your idea for the club")}
          </label>
          <textarea
            id="club-idea-draft"
            rows={2}
            maxLength={MAX}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={full}
            placeholder={t("A trip, a workshop, a match... what should the club do next?")}
            className="input-field resize-none"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {full
                ? t("You have {n} ideas waiting. Remove one to add another.", { n: MAX_WAITING })
                : `${draft.length} / ${MAX} · ${t("Only the club's leaders and admins can read your idea.")}`}
            </span>
            <Button type="submit" disabled={sending || full || !draft.trim()}>
              {sending ? t("Sending...") : t("Send idea")}
            </Button>
          </div>
        </form>
      )}

      {ideas.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {ideas.map((idea) => (
            <li key={idea._id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <p className="whitespace-pre-line break-words text-sm text-slate-700 dark:text-slate-200">{idea.body}</p>
              <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span>
                  {idea.authorName}
                  {idea.mine ? ` ${t("(you)")}` : ""} · {formatDate(idea.createdAt)}
                </span>
                {(staff || idea.mine) && (
                  <button
                    type="button"
                    onClick={() => handleRemove(idea)}
                    aria-label={t("Remove the idea from {date}", { date: formatDate(idea.createdAt) })}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/20"
                  >
                    <FaTrash className="text-xs" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        staff && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t("No ideas yet.")}</p>
      )}
    </section>
  );
}
