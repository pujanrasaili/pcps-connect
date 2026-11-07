import { useEffect, useRef, useState } from "react";
import { FaCamera, FaPen, FaTimes, FaTrash } from "react-icons/fa";
import { api, getErrorMessage, resolveUploadUrl } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LanguageContext";
import { formatDate } from "../utils/formatDate";
import ConfirmDialog from "./ConfirmDialog";
import Button from "./Button";
import SafeImage from "./SafeImage";
import { shrinkImage } from "../utils/resizeImage";

const MAX = 1000;

// Short news updates on a club's page. Everyone can read them; only admins and
// that club's leaders (`canPost`) see the box to write one and the delete
// buttons. The server checks this again, so hiding the controls is only
// convenience.
export default function ClubNews({ clubId, canPost }) {
  const toast = useToast();
  const { t } = useLang();
  const [posts, setPosts] = useState(null); // null = still loading
  const [draft, setDraft] = useState("");
  const [photo, setPhoto] = useState(null); // a picked image file, sent with the post
  const [saving, setSaving] = useState(false);
  const fileInput = useRef(null);
  const [editing, setEditing] = useState(null); // { id, text } while a post is being edited
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
      const form = new FormData();
      form.append("body", draft);
      if (photo) form.append("image", await shrinkImage(photo));
      const res = await api.post(`/clubs/${clubId}/posts`, form);
      setPosts((prev) => [res.data.post, ...(prev || [])]);
      setDraft("");
      setPhoto(null);
      toast.success(t("Posted."));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't post your update")));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editing.text.trim()) return;
    setSaving(true);
    try {
      const res = await api.patch(`/clubs/${clubId}/posts/${editing.id}`, { body: editing.text });
      setPosts((prev) => (prev || []).map((p) => (p._id === editing.id ? res.data.post : p)));
      setEditing(null);
      toast.success(t("Post updated."));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't update the post")));
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
      toast.success(t("Post deleted."));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't delete the post")));
    } finally {
      setDeleting(false);
    }
  };

  if (posts === null) return null;
  if (posts.length === 0 && !canPost) return null;

  return (
    <section aria-labelledby="club-news-heading" className="mt-5">
      <h3 id="club-news-heading" className="font-semibold text-slate-800 dark:text-slate-100">
        {t("Club news")}
      </h3>

      {canPost && (
        <form onSubmit={handlePost} className="mt-2">
          <label htmlFor="club-news-draft" className="sr-only">
            {t("Write a news update for this club")}
          </label>
          <textarea
            id="club-news-draft"
            rows={3}
            maxLength={MAX}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("Share an update with the club's members and visitors...")}
            className="input-field resize-none"
          />
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              setPhoto(e.target.files?.[0] || null);
              e.target.value = "";
            }}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-3">
              <span className="text-xs text-slate-600 dark:text-slate-300">
                {draft.length} / {MAX}
              </span>
              {photo ? (
                <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <span className="max-w-[10rem] truncate">{photo.name}</span>
                  <button
                    type="button"
                    onClick={() => setPhoto(null)}
                    aria-label={t("Remove the photo from this post")}
                    className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <FaTimes className="text-[10px]" aria-hidden="true" />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="inline-flex min-h-[2rem] items-center gap-2 rounded-lg px-2 text-xs font-semibold text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-slate-800"
                >
                  <FaCamera className="shrink-0" aria-hidden="true" />
                  {t("Add photo")}
                </button>
              )}
            </span>
            <Button type="submit" disabled={saving || !draft.trim()}>
              {saving ? t("Posting...") : t("Post")}
            </Button>
          </div>
        </form>
      )}

      {posts.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {posts.map((post) => (
            <li key={post._id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              {editing?.id === post._id ? (
                <form onSubmit={handleSaveEdit}>
                  <label htmlFor={`edit-${post._id}`} className="sr-only">
                    {t("Edit your update")}
                  </label>
                  <textarea
                    id={`edit-${post._id}`}
                    rows={3}
                    maxLength={MAX}
                    autoFocus
                    value={editing.text}
                    onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                    className="input-field resize-none"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                      {t("Cancel")}
                    </Button>
                    <Button type="submit" disabled={saving || !editing.text.trim()}>
                      {saving ? t("Saving...") : t("Save")}
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="whitespace-pre-line break-words text-sm text-slate-700 dark:text-slate-200">{post.body}</p>
              )}
              {post.image && (
                <a
                  href={resolveUploadUrl(post.image, 1600)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("Open the photo from the post of {date}", { date: formatDate(post.createdAt) })}
                  className="mt-2 block overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800"
                >
                  <SafeImage src={resolveUploadUrl(post.image, 800)} alt="" loading="lazy" className="max-h-72 w-full object-cover" />
                </a>
              )}
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span>
                  {post.authorName} · {formatDate(post.createdAt)}
                  {post.editedAt ? ` · ${t("edited")}` : ""}
                </span>
                {canPost && (
                  <span className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing({ id: post._id, text: post.body })}
                    aria-label={t("Edit the post from {date}", { date: formatDate(post.createdAt) })}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <FaPen className="text-xs" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(post)}
                    aria-label={t("Delete the post from {date}", { date: formatDate(post.createdAt) })}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/20"
                  >
                    <FaTrash className="text-xs" />
                  </button>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{t("No news yet. Your first update will show here.")}</p>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this post?"
        message={t("It will disappear from the club page. This can't be undone.")}
        confirming={deleting}
      />
    </section>
  );
}
