import { useEffect, useState } from "react";
import { FaCheckCircle, FaRegCircle, FaUserFriends, FaFileCsv, FaEnvelope } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import Modal from "./Modal";
import { Stars } from "./StarRating";
import { buildCsv, downloadCsv, slugify } from "../utils/csv";

function downloadAttendanceCsv(event, registrations) {
  const header = ["Name", "Email", "Student ID", "Registered On", "Attended", "Rating", "Feedback"];
  const rows = registrations.map((r) => [
    r.user?.name || "Unknown student",
    r.user?.email || "",
    r.user?.studentId || "",
    r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "",
    r.attended ? "Yes" : "No",
    r.rating || "",
    r.feedback || "",
  ]);
  downloadCsv(`${slugify(event?.title, "event")}-attendance.csv`, buildCsv(header, rows));
}

// Lists everyone registered for a given event, with a tap-to-toggle
// attendance mark per student. Fetches fresh each time it opens rather
// than relying on cached event data, since attendance can change often
// during check-in at the actual event.
export default function AttendeesModal({ event, onClose }) {
  const toast = useToast();
  const [registrations, setRegistrations] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Start from a clean composer each time the modal opens for an event.
  useEffect(() => {
    setComposing(false);
    setMessage("");
  }, [event]);

  const sendMessage = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await api.post(`/admin/events/${event._id}/announce`, { message });
      toast.success(res.data.message);
      setComposing(false);
      setMessage("");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to send message"));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!event) return;
    setLoading(true);
    api
      .get(`/admin/events/${event._id}/registrations`)
      .then((res) => {
        setRegistrations(res.data.registrations);
        setWaitlist(res.data.waitlist || []);
      })
      .catch((err) => toast.error(getErrorMessage(err, "Failed to load attendees")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  const toggleAttended = async (registration) => {
    setUpdatingId(registration._id);
    try {
      const res = await api.put(`/admin/registrations/${registration._id}`, {
        attended: !registration.attended,
      });
      setRegistrations((prev) =>
        prev.map((r) => (r._id === registration._id ? res.data.registration : r))
      );
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update attendance"));
    } finally {
      setUpdatingId(null);
    }
  };

  const attendedCount = registrations.filter((r) => r.attended).length;
  const rated = registrations.filter((r) => r.rating);
  const averageRating = rated.length ? rated.reduce((sum, r) => sum + r.rating, 0) / rated.length : null;

  return (
    <Modal isOpen={!!event} onClose={onClose} title={`Attendees — ${event?.title || ""}`} size="lg">
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : registrations.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          <FaUserFriends className="mx-auto mb-2 text-2xl text-slate-300" />
          No one has registered for this event yet.
        </p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {attendedCount}/{registrations.length} marked attended · tap a student to toggle
            </p>
            <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setComposing((v) => !v)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-600 transition-colors hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50"
            >
              <FaEnvelope /> Message everyone
            </button>
            <button
              onClick={() => downloadAttendanceCsv(event, registrations)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
            >
              <FaFileCsv /> Export CSV
            </button>
            </div>
          </div>
          {composing && (
            <form onSubmit={sendMessage} className="mb-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <label className="label-field" htmlFor="announce-message">
                Message to all {registrations.length} registered student{registrations.length > 1 ? "s" : ""}
              </label>
              <textarea
                id="announce-message"
                rows={4}
                maxLength={1000}
                required
                className="input-field"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. The session has moved to Room B2. Please bring your laptop."
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">{message.length}/1000 · sent by email, can't be undone</span>
                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                >
                  {sending ? "Sending..." : `Send to ${registrations.length}`}
                </button>
              </div>
            </form>
          )}
          {averageRating !== null && (
            <p className="mb-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Stars value={Math.round(averageRating)} />
              <span className="font-semibold">{averageRating.toFixed(1)}</span>
              <span className="text-slate-400">from {rated.length} rating{rated.length > 1 ? "s" : ""}</span>
            </p>
          )}
          <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {registrations.map((r) => (
              <button
                key={r._id}
                onClick={() => toggleAttended(r)}
                disabled={updatingId === r._id}
                className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800/50"
              >
                {r.attended ? (
                  <FaCheckCircle className="shrink-0 text-lg text-emerald-500" />
                ) : (
                  <FaRegCircle className="shrink-0 text-lg text-slate-300" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                    {r.user?.name || "Unknown student"}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {r.user?.email}
                    {r.user?.studentId ? ` · ${r.user.studentId}` : ""}
                  </p>
                  {r.rating ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Stars value={r.rating} className="text-[10px]" />
                      {r.feedback ? <span className="truncate italic">"{r.feedback}"</span> : null}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`badge shrink-0 ${
                    r.attended
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {r.attended ? "Attended" : "Not yet"}
                </span>
              </button>
            ))}
          </div>
          {waitlist.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Waitlist ({waitlist.length}) · promoted in this order when a seat opens
              </p>
              <ol className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-slate-700 dark:text-slate-300">
                {waitlist.map((w, i) => (
                  <li key={w._id} className="flex gap-2">
                    <span className="w-5 shrink-0 text-right text-slate-400">{i + 1}.</span>
                    <span className="min-w-0 truncate">
                      {w.user?.name || "Unknown student"}
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {w.user?.email ? ` · ${w.user.email}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
