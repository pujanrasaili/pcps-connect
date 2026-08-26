import { useEffect, useState } from "react";
import { FaCheckCircle, FaRegCircle, FaUserFriends } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import Modal from "./Modal";

// Lists everyone registered for a given event, with a tap-to-toggle
// attendance mark per student. Fetches fresh each time it opens rather
// than relying on cached event data, since attendance can change often
// during check-in at the actual event.
export default function AttendeesModal({ event, onClose }) {
  const toast = useToast();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    if (!event) return;
    setLoading(true);
    api
      .get(`/admin/events/${event._id}/registrations`)
      .then((res) => setRegistrations(res.data.registrations))
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
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            {attendedCount}/{registrations.length} marked attended · tap a student to toggle
          </p>
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
        </>
      )}
    </Modal>
  );
}
