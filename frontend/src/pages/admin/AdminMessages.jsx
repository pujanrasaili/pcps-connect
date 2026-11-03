import { useEffect, useState } from "react";
import { FaEnvelope, FaCheck, FaTrash } from "react-icons/fa";
import { api, getErrorMessage } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import ConfirmDialog from "../../components/ConfirmDialog";
import { timeAgo } from "../../utils/timeAgo";

export default function AdminMessages() {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get("/admin/messages")
      .then((res) => setMessages(res.data.messages || []))
      .catch((err) => setError(getErrorMessage(err, "Failed to load messages")))
      .finally(() => setLoading(false));
  }, []);

  const unhandled = messages.filter((m) => !m.handled).length;

  const toggleHandled = async (m) => {
    try {
      await api.put(`/admin/messages/${m._id}`, { handled: !m.handled });
      setMessages((list) => list.map((x) => (x._id === m._id ? { ...x, handled: !m.handled } : x)));
      window.dispatchEvent(new Event("pcps:messages-changed"));
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update the message"));
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/admin/messages/${deleteTarget._id}`);
      setMessages((list) => list.filter((x) => x._id !== deleteTarget._id));
      toast.success("Message deleted.");
      window.dispatchEvent(new Event("pcps:messages-changed"));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete the message"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">Messages</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Sent through the Contact form. {unhandled > 0 ? `${unhandled} still waiting for a reply.` : "Nothing waiting."}{" "}
          Messages are kept for 180 days.
        </p>
      </div>

      <div className="card-surface p-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : error ? (
          <p className="py-10 text-center text-sm text-rose-700 dark:text-rose-400">{error}</p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            <FaEnvelope className="mx-auto mb-2 text-2xl text-slate-300" />
            No messages yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {messages.map((m) => (
              <li key={m._id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {m.subject || "(No subject)"}
                      {!m.handled && (
                        <span className="badge ml-2 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          New
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {m.name} · {m.email} · {timeAgo(m.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <a
                      href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + (m.subject || "Your message to PCPS Connect"))}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <FaEnvelope className="shrink-0" aria-hidden="true" /> Reply
                    </a>
                    <button
                      type="button"
                      onClick={() => toggleHandled(m)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <FaCheck className="shrink-0" aria-hidden="true" /> {m.handled ? "Mark as new" : "Mark handled"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(m)}
                      aria-label={`Delete message from ${m.name}`}
                      className="inline-flex items-center rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-900/20"
                    >
                      <FaTrash aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
                  {m.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirming={deleting}
        title="Delete this message?"
        message={`This will permanently delete the message from ${deleteTarget?.name || "this person"}. This can't be undone.`}
      />
    </div>
  );
}
