import { useEffect, useState } from "react";
import { FaTrash, FaFlag } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LanguageContext";
import { formatDate } from "../utils/formatDate";
import ConfirmDialog from "../components/ConfirmDialog";
import Button from "../components/Button";

const MAX_TITLE = 80;
const MAX_BODY = 300;
const MAX_CONTACT = 60;
const CATEGORIES = [
  { id: "lost", label: "Lost" },
  { id: "found", label: "Found" },
  { id: "notice", label: "Notice" },
];
const TAG = {
  lost: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  found: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  notice: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
};

// The campus notice board: short posts (lost, found, general notices) that
// disappear after 14 days. Only logged-in students see it, and only first names
// are shown. The author removes their own post; admins can remove any.
export default function Board() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLang();
  const [posts, setPosts] = useState(null); // null = loading
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ category: "lost", title: "", body: "", contact: "" });
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/board")
      .then((res) => !cancelled && setPosts(Array.isArray(res.data?.posts) ? res.data.posts : []))
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setPosts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const canPost = form.title.trim() && form.body.trim();

  const handlePost = async (e) => {
    e.preventDefault();
    if (!canPost) return;
    setSaving(true);
    try {
      const res = await api.post("/board", form);
      setPosts((prev) => [res.data.post, ...(prev || [])]);
      setForm((f) => ({ ...f, title: "", body: "", contact: "" }));
      toast.success(t("Posted on the notice board"));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't post on the notice board")));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await api.delete(`/board/${removeTarget._id}`);
      setPosts((prev) => prev.filter((p) => p._id !== removeTarget._id));
      setRemoveTarget(null);
      toast.success(t("Post removed"));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't remove the post")));
    } finally {
      setRemoving(false);
    }
  };

  const handleReport = async (post) => {
    try {
      const res = await api.post(`/board/${post._id}/report`);
      setPosts((prev) => prev.map((p) => (p._id === post._id ? { ...p, reported: true } : p)));
      toast.success(t(res.data?.message || "Thanks, an admin will take a look."));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't report the post")));
    }
  };

  const shown = (posts || []).filter((p) => filter === "all" || p.category === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">{t("Notice board")}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {t("Lost something, found something, or have a short notice for the campus? Posts disappear after 14 days, and only your first name is shown.")}
        </p>
      </div>

      <form onSubmit={handlePost} className="card-surface space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">{t("Add a post")}</h2>
        <div>
          <label htmlFor="board-category" className="label-field">{t("Type")}</label>
          <select id="board-category" value={form.category} onChange={set("category")} className="input-field">
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{t(c.label)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="board-title" className="label-field">{t("Title")}</label>
          <input id="board-title" maxLength={MAX_TITLE} value={form.title} onChange={set("title")} placeholder={t("For example: Black umbrella")} className="input-field" />
        </div>
        <div>
          <label htmlFor="board-body" className="label-field">{t("Details")}</label>
          <textarea id="board-body" rows={3} maxLength={MAX_BODY} value={form.body} onChange={set("body")} placeholder={t("Where and when, and anything that helps.")} className="input-field resize-none" />
          <span className="text-xs text-slate-600 dark:text-slate-300">{form.body.length} / {MAX_BODY}</span>
        </div>
        <div>
          <label htmlFor="board-contact" className="label-field">{t("How to reach you (optional)")}</label>
          <input id="board-contact" maxLength={MAX_CONTACT} value={form.contact} onChange={set("contact")} placeholder={t("A phone number, Instagram name or room")} className="input-field" />
        </div>
        <Button type="submit" disabled={saving || !canPost}>{saving ? t("Posting...") : t("Post")}</Button>
      </form>

      <div role="group" aria-label={t("Show")} className="flex flex-wrap gap-2">
        {[{ id: "all", label: "All" }, ...CATEGORIES].map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={filter === c.id}
            onClick={() => setFilter(c.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              filter === c.id
                ? "border-primary-600 bg-primary-600 text-white"
                : "border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200"
            }`}
          >
            {t(c.label)}
          </button>
        ))}
      </div>

      {posts === null ? null : failed ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">{t("Couldn't load the notice board. Please try again.")}</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">{t("Nothing here right now.")}</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((p) => (
            <li key={p._id} className="card-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TAG[p.category] || TAG.notice}`}>
                    {t(CATEGORIES.find((c) => c.id === p.category)?.label || "Notice")}
                  </span>
                  <p className="mt-2 break-words font-semibold text-slate-800 dark:text-slate-100">{p.title}</p>
                  <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700 dark:text-slate-200">{p.body}</p>
                  {p.contact && (
                    <p className="mt-1 break-words text-sm text-slate-700 dark:text-slate-200">{t("Contact: {contact}", { contact: p.contact })}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    {t("Posted by {name}", { name: p.authorName })} · {formatDate(p.createdAt)}
                  </p>
                  {user?.role === "admin" && p.reportCount > 0 && (
                    <p className="mt-1 text-xs font-semibold text-rose-700 dark:text-rose-300">{t("Reported {n} times", { n: p.reportCount })}</p>
                  )}
                  {!p.mine && user?.role !== "admin" && (
                    p.reported ? (
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{t("You reported this post")}</p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReport(p)}
                        aria-label={t("Report the post {title}", { title: p.title })}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-rose-700 dark:text-slate-300 dark:hover:text-rose-300"
                      >
                        <FaFlag /> {t("Report")}
                      </button>
                    )
                  )}
                </div>
                {(p.mine || user?.role === "admin") && (
                  <button
                    type="button"
                    onClick={() => setRemoveTarget(p)}
                    aria-label={t("Remove the post {title}", { title: p.title })}
                    className="shrink-0 rounded-lg p-2 text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/30"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title={t("Remove this post?")}
        message={t("It will disappear from the notice board. This can't be undone.")}
        confirming={removing}
        confirmLabel="Remove"
        confirmingLabel="Removing..."
      />
    </div>
  );
}
