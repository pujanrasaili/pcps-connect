import { useEffect, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { formatDate } from "../utils/formatDate";
import ConfirmDialog from "./ConfirmDialog";
import Button from "./Button";

const MAX = 1000;

// Short news updates on a club's page. Everyone can read them; only admins and
// that club's leaders (`canPost`) see the box to write one and the delete
// buttons. The server checks this again, so hiding the controls is only
// convenience.
export default function ClubNews({ clubId, canPost }) {
  const toast = useToast();
  const [posts, setPosts] = useState(null); // null = still loading
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPosts(null);
    api
      .get(`/clubs/${clubId}/posts`)
      .then((res) => !cancelled && setPosts(res.data.posts || []))
      .catch(() => !cancelled && setPosts([])); // news is a nice-to-have: never block the club page
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const res = await api.post(`/clubs/${clubId}/posts`, { body: draft });
      setPosts((prev) => [res.data.post, ...(prev || [])]);
      setDraft("");
      toast.success("Posted.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't post your update"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/clubs/${clubId}/posts/${deleteTarget._id}`);
      setPosts((prev) => (prev || []).filter((p) => p._id !== deleteTarget._id));
      setDeleteTarget(null);
      toast.success("Post deleted.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't delete the post"));
    } finally {
      setDeleting(false);
    }
  };

  if (posts === null) return null;
  if (posts.length === 0 && !canPost) return null;

  return (
    <section aria-labelledby="club-news-heading" className="mt-5">
      <h3 id="club-news-heading" className="font-semibold text-slate-800 dark:text-slate-100">
        Club news
      </h3>

      {canPost && (
        <form onSubmit={handlePost} className="mt-2">
          <label htmlFor="club-news-draft" className="sr-only">
            Write a news update for this club
          </label>
          <textarea
            id="club-news-draft"
            rows={3}
            maxLength={MAX}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share an update with the club's members and visitors..."
            className="input-field resize-none"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {draft.length} / {MAX}
            </span>
            <Button type="submit" disabled={saving || !draft.trim()}>
              {saving ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      )}

      {posts.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {posts.map((post) => (
            <li key={post._id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <p className="whitespace-pre-line break-words text-sm text-slate-700 dark:text-slate-200">{post.body}</p>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span>
                  {post.authorName} · {formatDate(post.createdAt)}
                </span>
                {canPost && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(post)}
                    aria-label={`Delete the post from ${formatDate(post.createdAt)}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/20"
                  >
                    <FaTrash className="text-xs" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No news yet. Your first update will show here.</p>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this post?"
        message="It will disappear from the club page. This can't be undone."
        confirming={deleting}
      />
    </section>
  );
}
