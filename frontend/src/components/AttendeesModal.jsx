import { useEffect, useState } from "react";
import { FaCheckCircle, FaRegCircle, FaUserFriends, FaFileCsv, FaPrint, FaEnvelope, FaCheck, FaTimes } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LanguageContext";
import Modal from "./Modal";
import { Stars } from "./StarRating";
import SearchBar from "./SearchBar";
import WalkInForm from "./WalkInForm";
import EventReportCard from "./EventReportCard";
import { buildCsv, downloadCsv, slugify } from "../utils/csv";
import { buildSheetHtml } from "../utils/attendanceSheet";
import { formatDateTime } from "../utils/formatDate";

function downloadAttendanceCsv(event, registrations) {
  const header = ["Name", "Email", "Student ID", "Registered On", "Status", "Attended", "Rating", "Feedback"];
  const rows = registrations.map((r) => [
    r.user?.name || "Unknown student",
    r.user?.email || "",
    r.user?.studentId || "",
    r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "",
    r.status === "pending" ? "Pending approval" : "Confirmed",
    r.attended ? "Yes" : "No",
    r.rating || "",
    r.feedback || "",
  ]);
  downloadCsv(`${slugify(event?.title, "event")}-attendance.csv`, buildCsv(header, rows));
}

// Opens a printable sign-in sheet in a new tab and starts the print dialog.
function printSignInSheet(event, registrations, onBlocked) {
  const win = window.open("", "_blank");
  if (!win) return onBlocked();
  win.document.write(buildSheetHtml(event, registrations, event?.date ? formatDateTime(event.date) : ""));
  win.document.close();
  win.focus();
  win.print();
}

// Lists everyone registered for a given event, with a tap-to-toggle
// attendance mark per student. Fetches fresh each time it opens rather
// than relying on cached event data, since attendance can change often
// during check-in at the actual event.
export default function AttendeesModal({ event, onClose }) {
  const toast = useToast();
  const { t } = useLang();
  const [registrations, setRegistrations] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [search, setSearch] = useState("");
  const [onlyNotAttended, setOnlyNotAttended] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Start from a clean composer each time the modal opens for an event.
  useEffect(() => {
    setComposing(false);
    setMessage("");
    setSearch("");
    setOnlyNotAttended(false);
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
      toast.error(getErrorMessage(err, t("Failed to send message")));
    } finally {
      setSending(false);
    }
  };

  const loadAttendees = (showSpinner = true) => {
    if (!event) return;
    if (showSpinner) setLoading(true);
    api
      .get(`/admin/events/${event._id}/registrations`)
      .then((res) => {
        setRegistrations(res.data.registrations);
        setWaitlist(res.data.waitlist || []);
      })
      .catch((err) => toast.error(getErrorMessage(err, t("Failed to load attendees"))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAttendees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  // Approve or decline a join request (events that need organiser approval).
  // Approving swaps in the confirmed registration; declining removes the row.
  const decide = async (registration, decision) => {
    setUpdatingId(registration._id);
    try {
      const res = await api.put(`/admin/registrations/${registration._id}/decision`, { decision });
      setRegistrations((prev) =>
        decision === "approve"
          ? prev.map((r) => (r._id === registration._id ? res.data.registration : r))
          : prev.filter((r) => r._id !== registration._id)
      );
      toast.success(decision === "approve" ? t("Approved -- the student has been emailed.") : t("Declined -- the student has been emailed."));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Failed to update the request")));
    } finally {
      setUpdatingId(null);
    }
  };

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
      toast.error(getErrorMessage(err, t("Failed to update attendance")));
    } finally {
      setUpdatingId(null);
    }
  };

  // Narrowing the list is for finding someone quickly at the door; the counts,
  // message and CSV export above/below always cover everyone.
  const pending = registrations.filter((r) => r.status === "pending");
  const confirmed = registrations.filter((r) => r.status !== "pending");
  const q = search.trim().toLowerCase();
  const visibleRegistrations = confirmed.filter(
    (r) =>
      (!onlyNotAttended || !r.attended) &&
      (!q ||
        (r.user?.name || "").toLowerCase().includes(q) ||
        (r.user?.email || "").toLowerCase().includes(q) ||
        (r.user?.studentId || "").toLowerCase().includes(q))
  );

  const attendedCount = confirmed.filter((r) => r.attended).length;
  const rated = registrations.filter((r) => r.rating);
  const averageRating = rated.length ? rated.reduce((sum, r) => sum + r.rating, 0) / rated.length : null;

  return (
    <Modal isOpen={!!event} onClose={onClose} title={t("Attendees — {title}", { title: event?.title || "" })} size="lg">
      {event && <WalkInForm eventId={event._id} onAdded={() => loadAttendees(false)} />}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : registrations.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          <FaUserFriends className="mx-auto mb-2 text-2xl text-slate-300" />
          {t("No one has registered for this event yet.")}
        </p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("{done}/{total} marked attended · tap a student to toggle", { done: attendedCount, total: confirmed.length })}
            </p>
            <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setComposing((v) => !v)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-600 transition-colors hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50"
            >
              <FaEnvelope /> {t("Message everyone")}
            </button>
            <button
              onClick={() => printSignInSheet(event, registrations, () => toast.error(t("Allow pop-ups for this site to print the sheet.")))}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <FaPrint aria-hidden="true" /> {t("Print sheet")}
            </button>
            <button
              onClick={() => downloadAttendanceCsv(event, registrations)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
            >
              <FaFileCsv /> {t("Export CSV")}
            </button>
            </div>
          </div>
          {composing && (
            <form onSubmit={sendMessage} className="mb-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <label className="label-field" htmlFor="announce-message">
                {t(registrations.length > 1 ? "Message to all {n} registered students" : "Message to all {n} registered student", { n: registrations.length })}
              </label>
              <textarea
                id="announce-message"
                rows={4}
                maxLength={1000}
                required
                className="input-field"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("e.g. The session has moved to Room B2. Please bring your laptop.")}
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">{t("{n}/1000 · sent by email, can't be undone", { n: message.length })}</span>
                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                >
                  {sending ? t("Sending...") : t("Send to {n}", { n: registrations.length })}
                </button>
              </div>
            </form>
          )}
          <EventReportCard title={event?.title || "Event"} registrations={registrations} waitlistCount={waitlist.length} />
          {averageRating !== null && (
            <p className="mb-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Stars value={Math.round(averageRating)} />
              <span className="font-semibold">{averageRating.toFixed(1)}</span>
              <span className="text-slate-500 dark:text-slate-400">{t(rated.length > 1 ? "from {n} ratings" : "from {n} rating", { n: rated.length })}</span>
            </p>
          )}
          {confirmed.length > 8 && (
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1 basis-48">
                <SearchBar value={search} onChange={setSearch} placeholder={t("Find by name, email or student ID...")} />
              </div>
              <label className="flex shrink-0 items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={onlyNotAttended}
                  onChange={(e) => setOnlyNotAttended(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary-500"
                />
                {t("Not yet attended")}
              </label>
            </div>
          )}
          {pending.length > 0 && (
            <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50/60 p-3 dark:border-primary-900/50 dark:bg-primary-900/10">
              <p className="text-sm font-semibold text-primary-800 dark:text-primary-200">
                {t("Waiting for your approval ({n})", { n: pending.length })}
              </p>
              <ul className="mt-2 divide-y divide-primary-100 dark:divide-primary-900/40">
                {pending.map((r) => (
                  <li key={r._id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="truncate font-medium text-slate-800 dark:text-slate-100">{r.user?.name || t("Unknown student")}</p>
                      <p className="truncate text-xs text-slate-600 dark:text-slate-400">
                        {r.user?.email}
                        {r.user?.studentId ? ` · ${r.user.studentId}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => decide(r, "approve")}
                        disabled={updatingId === r._id}
                        aria-label={t("Approve {name}", { name: r.user?.name || t("student") })}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
                      >
                        <FaCheck /> {t("Approve")}
                      </button>
                      <button
                        onClick={() => decide(r, "reject")}
                        disabled={updatingId === r._id}
                        aria-label={t("Decline {name}", { name: r.user?.name || t("student") })}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                      >
                        <FaTimes /> {t("Decline")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {confirmed.length > 0 && visibleRegistrations.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{t("No one matches.")}</p>
          )}
          <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {visibleRegistrations.map((r) => (
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
                    {r.user?.name || t("Unknown student")}
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
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {r.attended ? t("Attended") : t("Not yet")}
                </span>
              </button>
            ))}
          </div>
          {waitlist.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-900/10">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {t("Waitlist ({n}) · promoted in this order when a seat opens", { n: waitlist.length })}
              </p>
              <ol className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-slate-700 dark:text-slate-300">
                {waitlist.map((w, i) => (
                  <li key={w._id} className="flex gap-2">
                    <span className="w-5 shrink-0 text-right text-slate-500 dark:text-slate-400">{i + 1}.</span>
                    <span className="min-w-0 truncate">
                      {w.user?.name || t("Unknown student")}
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
