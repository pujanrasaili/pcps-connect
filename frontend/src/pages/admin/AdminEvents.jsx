import { useEffect, useMemo, useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaCalendarAlt, FaUserFriends, FaRegCopy, FaLock, FaLockOpen } from "react-icons/fa";
import { useEvents } from "../../context/EventsContext";
import { useClubs } from "../../context/ClubsContext";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { useLedClubs } from "../../hooks/useLedClubs";
import { api, getErrorMessage, resolveUploadUrl } from "../../services/api";
import { formatDateAndTime, isUpcoming } from "../../utils/formatDate";
import { useDebounce } from "../../hooks/useDebounce";
import { useLang } from "../../context/LanguageContext";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import AttendeesModal from "../../components/AttendeesModal";
import AttendanceReportCard from "../../components/AttendanceReportCard";
import SearchBar from "../../components/SearchBar";
import { ADMIN_EVENT_TABS, countAdminEvents, filterAdminEvents } from "../../utils/adminEventFilters";
import Button from "../../components/Button";
import Pagination from "../../components/Pagination";
import { usePagination } from "../../hooks/usePagination";
import { isoToLocalInput, localInputToIso } from "../../utils/dateTimeInput";
import { isRegistrationClosed } from "../../utils/registrationDeadline";
import { shrinkImage } from "../../utils/resizeImage";

const PAGE_SIZE = 10;
const EMPTY_FORM = {
  title: "",
  description: "",
  date: "",
  endDate: "",
  location: "",
  capacity: 100,
  category: "",
  price: "Free",
  club: "",
  requiresApproval: false,
  registrationDeadline: "",
  repeat: "none",
  repeatCount: 4,
  copyRoles: false,
};

export default function AdminEvents() {
  const { events, loading, error, refreshEvents } = useEvents();
  const { clubs: allClubs } = useClubs();
  const { user } = useAuth();
  const { clubs: ledClubs } = useLedClubs();
  const toast = useToast();
  const { t } = useLang();
  // A club leader (not an admin) sees and manages only their own clubs' events,
  // and every event they create must belong to one of those clubs.
  const leaderMode = user?.role !== "admin";
  const ledIds = useMemo(() => new Set(ledClubs.map((c) => c._id)), [ledClubs]);
  const clubs = leaderMode ? allClubs.filter((c) => ledIds.has(c._id)) : allClubs;
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const debouncedQuery = useDebounce(query, 250);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [attendeesEvent, setAttendeesEvent] = useState(null);
  const [duplicatedFrom, setDuplicatedFrom] = useState(null);

  // Leaders get a turnout summary for their own clubs (admins see theirs on the overview).
  const [report, setReport] = useState(null);
  useEffect(() => {
    if (!leaderMode || ledClubs.length === 0) return;
    api
      .get("/admin/attendance-report")
      .then((res) => setReport(res.data))
      .catch(() => setReport(null));
  }, [leaderMode, ledClubs.length]);

  const visibleEvents = useMemo(
    () => (leaderMode ? events.filter((e) => ledIds.has(e.club?._id || e.club)) : events),
    [events, leaderMode, ledIds]
  );

  const filteredEvents = useMemo(
    () => filterAdminEvents(visibleEvents, { tab, query: debouncedQuery }),
    [visibleEvents, tab, debouncedQuery]
  );
  const tabCounts = useMemo(() => countAdminEvents(visibleEvents), [visibleEvents]);

  const { page, setPage, totalPages, pageItems: pagedEvents } = usePagination(filteredEvents, PAGE_SIZE);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: type === "checkbox" ? checked : value };
      // Moving the start moves the end with it, so the length stays the same.
      if (name === "date" && prev.date && prev.endDate && value) {
        const delta = new Date(value).getTime() - new Date(prev.date).getTime();
        if (!Number.isNaN(delta)) next.endDate = isoToLocalInput(new Date(new Date(prev.endDate).getTime() + delta).toISOString());
      }
      return next;
    });
  };

  const openCreate = () => {
    setDuplicatedFrom(null);
    setEditingEvent(null);
    setForm({ ...EMPTY_FORM, club: leaderMode ? clubs[0]?._id || "" : "" });
    setImageFile(null);
    setFormOpen(true);
  };

  // Starts a brand-new event pre-filled from an existing one, for events that
  // repeat (weekly workshops, annual fests). The date is left blank on purpose
  // so a copy can't be saved with the old, already-past date, and the image
  // isn't copied -- pick one again or leave it for the default.
  const openDuplicate = (event) => {
    setEditingEvent(null);
    setDuplicatedFrom(event);
    setForm({
      title: event.title || "",
      description: event.description || "",
      date: "",
      endDate: "",
      location: event.location || "",
      capacity: event.capacity ?? 100,
      category: event.category || "",
      price: event.price || "Free",
      club: event.club?._id || event.club || "",
      requiresApproval: !!event.requiresApproval,
      registrationDeadline: "",
      repeat: "none",
      repeatCount: 4,
      copyRoles: (event.volunteerRoles || []).length > 0,
    });
    setImageFile(null);
    setFormOpen(true);
  };

  const openEdit = (event) => {
    setDuplicatedFrom(null);
    setEditingEvent(event);
    setForm({
      title: event.title || "",
      description: event.description || "",
      date: isoToLocalInput(event.date),
      endDate: isoToLocalInput(event.endDate),
      location: event.location || "",
      capacity: event.capacity ?? 100,
      category: event.category || "",
      price: event.price || "Free",
      club: event.club?._id || event.club || "",
      requiresApproval: !!event.requiresApproval,
      registrationDeadline: isoToLocalInput(event.registrationDeadline),
      repeat: "none",
      repeatCount: 4,
    });
    setImageFile(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      // Repeating only applies to creating; an edit changes this one event.
      if ((key === "repeat" || key === "repeatCount") && (editingEvent || form.repeat === "none")) return;
      if (key === "copyRoles") return; // sent below as the list itself
      // Times go to the server as exact instants (see utils/dateTimeInput.js).
      formData.append(key, key === "date" || key === "endDate" || key === "registrationDeadline" ? localInputToIso(value) : value);
    });
    // A duplicate can carry over the roles volunteers sign up for (names and places only).
    if (!editingEvent && duplicatedFrom && form.copyRoles) {
      formData.append(
        "volunteerRoles",
        JSON.stringify((duplicatedFrom.volunteerRoles || []).map((r) => ({ name: r.name, slots: r.slots })))
      );
    }
    // Big phone photos are shrunk first so they fit the server's 5 MB limit.
    if (imageFile) formData.append("image", await shrinkImage(imageFile));

    try {
      if (editingEvent) {
        await api.put(`/events/${editingEvent._id}`, formData);
        toast.success(t("Event updated."));
      } else {
        const { data } = await api.post("/events/create", formData);
        toast.success(data?.createdCount > 1 ? t("{n} events created.", { n: data.createdCount }) : t("Event created."));
      }
      await refreshEvents();
      setFormOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, t("Failed to save event")));
    } finally {
      setSaving(false);
    }
  };

  // One-click "stop taking sign-ups now" / "open it again" for an upcoming event.
  const [togglingId, setTogglingId] = useState(null);
  const toggleRegistration = async (event) => {
    const closing = !isRegistrationClosed(event);
    setTogglingId(event._id);
    try {
      await api.put(`/events/${event._id}`, { registrationDeadline: closing ? new Date().toISOString() : "" });
      toast.success(closing ? t("Registration closed. People already registered keep their place.") : t("Registration is open again."));
      await refreshEvents();
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't change registration")));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/events/${deleteTarget._id}`);
      toast.success(t("Event deleted."));
      await refreshEvents();
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err, t("Failed to delete event")));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
            {leaderMode ? t("My Club Events") : t("Manage Events")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">{t(visibleEvents.length === 1 ? "{n} event total" : "{n} events total", { n: visibleEvents.length })}</p>
        </div>
        <Button icon={FaPlus} onClick={openCreate}>
          {t("Add Event")}
        </Button>
      </div>

      {leaderMode && <AttendanceReportCard report={report} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <SearchBar value={query} onChange={setQuery} placeholder={t("Search events...")} />
        </div>
        <div className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label={t("Filter events")}>
          {ADMIN_EVENT_TABS.filter(([value]) => value !== "pending" || tabCounts.pending > 0 || tab === "pending").map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              aria-pressed={tab === value}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                tab === value
                  ? "bg-white text-primary-600 shadow-sm dark:bg-slate-900 dark:text-primary-300"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {t(label)} <span className="font-normal">({tabCounts[value]})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card-surface divide-y divide-slate-100 dark:divide-slate-800">
        {loading ? (
          <div className="flex justify-center p-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : (
          pagedEvents.map((event) => (
            <div key={event._id} className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
              <img
                src={resolveUploadUrl(event.image, 160)}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg object-cover bg-slate-100 dark:bg-slate-800"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800 dark:text-slate-100">{event.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDateAndTime(event.date)} · {t("{count}/{capacity} registered", { count: event.registeredCount ?? 0, capacity: event.capacity ?? 100 })}{event.requiresApproval ? ` · ${t("approval needed")}` : ""}
                  {event.pendingCount > 0 && (
                    <span className="font-semibold text-amber-700 dark:text-amber-400"> · {t("{n} awaiting your decision", { n: event.pendingCount })}</span>
                  )}
                  {event.averageRating != null && ` · ★ ${event.averageRating.toFixed(1)} (${event.ratingCount})`}
                  {isUpcoming(event.date) && isRegistrationClosed(event) && (
                    <span className="font-semibold text-slate-700 dark:text-slate-200"> · {t("registration closed")}</span>
                  )}
                </p>
              </div>
              <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
                <button
                  onClick={() => setAttendeesEvent(event)}
                  aria-label={t("View attendees for {title}", { title: event.title })}
                  title={t("View attendees")}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20"
                >
                  <FaUserFriends />
                </button>
                {isUpcoming(event.date) && (
                  <button
                    onClick={() => toggleRegistration(event)}
                    disabled={togglingId === event._id}
                    aria-label={isRegistrationClosed(event) ? t("Reopen registration for {title}", { title: event.title }) : t("Close registration for {title}", { title: event.title })}
                    title={isRegistrationClosed(event) ? t("Reopen registration") : t("Close registration now")}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50 dark:hover:bg-amber-900/20"
                  >
                    {isRegistrationClosed(event) ? <FaLockOpen /> : <FaLock />}
                  </button>
                )}
                {/* Past events have no lock: keep the other buttons in the same columns. */}
                {!isUpcoming(event.date) && <span aria-hidden="true" className="hidden h-9 w-9 sm:block" />}
                <button
                  onClick={() => openDuplicate(event)}
                  aria-label={t("Duplicate {title}", { title: event.title })}
                  title={t("Duplicate as a new event")}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition-colors hover:bg-accent-50 hover:text-accent-500 dark:hover:bg-accent-900/20"
                >
                  <FaRegCopy />
                </button>
                <button
                  onClick={() => openEdit(event)}
                  aria-label={t("Edit {title}", { title: event.title })}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => setDeleteTarget(event)}
                  aria-label={t("Delete {title}", { title: event.title })}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))
        )}
        {!loading && error && filteredEvents.length === 0 && (
          <div className="p-6 text-center" role="alert">
            <p role="alert" className="font-medium text-rose-700 dark:text-rose-400">{t("Couldn't load events.")}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{error}</p>
            <button type="button" onClick={() => refreshEvents()} className="btn-outline mt-3">{t("Try again")}</button>
          </div>
        )}
        {!loading && !error && filteredEvents.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            <FaCalendarAlt className="mx-auto mb-2 text-2xl text-slate-300" />
            {visibleEvents.length === 0 ? t("No events yet. Click “Add Event” to create one.") : t("No events match your search or filter.")}
          </p>
        )}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editingEvent ? t("Edit Event") : t("Add Event")} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {duplicatedFrom && (
            <p className="rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              {t("Copied from “{title}”. Choose the new date & time, and an image if you want one.", { title: duplicatedFrom.title })}
            </p>
          )}
          <div>
            <label className="label-field" htmlFor="ev-title">{t("Event title")}</label>
            <input data-autofocus id="ev-title" name="title" maxLength={150} className="input-field" value={form.title} onChange={handleChange} required />
          </div>
          <div>
            <label className="label-field" htmlFor="ev-description">{t("Description")}</label>
            <textarea id="ev-description" name="description" rows={3} maxLength={5000} className="input-field resize-none" value={form.description} onChange={handleChange} required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label-field" htmlFor="ev-date">{t("Date & time")}</label>
              <input id="ev-date" name="date" type="datetime-local" className="input-field" value={form.date} onChange={handleChange} required />
            </div>
            <div>
              <label className="label-field" htmlFor="ev-location">{t("Location")}</label>
              <input id="ev-location" name="location" maxLength={200} className="input-field" value={form.location} onChange={handleChange} required />
            </div>
          </div>
          <div>
            <label className="label-field" htmlFor="ev-end">{t("Ends at (optional)")}</label>
            <input
              id="ev-end"
              name="endDate"
              type="datetime-local"
              className="input-field"
              value={form.endDate}
              min={form.date || undefined}
              onChange={handleChange}
              aria-describedby="ev-end-hint"
            />
            <p id="ev-end-hint" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t("Shown as “10:00 AM – 12:00 PM” and used as the length in calendar invites. Leave blank and calendars assume 2 hours.")}
            </p>
          </div>
          <div>
            <label className="label-field" htmlFor="ev-deadline">{t("Registration closes (optional)")}</label>
            <input
              id="ev-deadline"
              name="registrationDeadline"
              type="datetime-local"
              className="input-field"
              value={form.registrationDeadline}
              max={form.date || undefined}
              onChange={handleChange}
              aria-describedby="ev-deadline-hint"
            />
            <p id="ev-deadline-hint" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t("After this time nobody new can register or join the waitlist. Leave blank to keep registration open until the event.")}
            </p>
          </div>
          {!editingEvent && (
            <div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label-field" htmlFor="ev-repeat">{t("Repeat")}</label>
                  <select id="ev-repeat" name="repeat" className="input-field" value={form.repeat} onChange={handleChange} aria-describedby="ev-repeat-hint">
                    <option value="none">{t("Does not repeat")}</option>
                    <option value="weekly">{t("Every week")}</option>
                    <option value="biweekly">{t("Every two weeks")}</option>
                  </select>
                </div>
                {form.repeat !== "none" && (
                  <div>
                    <label className="label-field" htmlFor="ev-repeat-count">{t("Number of events (2-12)")}</label>
                    <input
                      id="ev-repeat-count"
                      name="repeatCount"
                      type="number"
                      min="2"
                      max="12"
                      className="input-field"
                      value={form.repeatCount}
                      onChange={handleChange}
                      required
                    />
                  </div>
                )}
              </div>
              <p id="ev-repeat-hint" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {form.repeat === "none"
                  ? t("For a regular meetup, choose how often it repeats and you get all the dates in one go.")
                  : t("Creates {n} separate events at the same time, starting on the date above. Each has its own seats and sign-ups, and you can edit or delete them one by one. Club members are emailed about the first one only.", { n: Number(form.repeatCount) || t("that many") })}
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label-field" htmlFor="ev-capacity">{t("Capacity")}</label>
              <input id="ev-capacity" name="capacity" type="number" min="1" className="input-field" value={form.capacity} onChange={handleChange} required />
            </div>
            <div>
              <label className="label-field" htmlFor="ev-category">{t("Category")}</label>
              <input id="ev-category" name="category" maxLength={50} className="input-field" value={form.category} onChange={handleChange} placeholder={t("Technology, Workshop...")} />
            </div>
            <div>
              <label className="label-field" htmlFor="ev-price">{t("Price")}</label>
              <input id="ev-price" name="price" maxLength={50} className="input-field" value={form.price} onChange={handleChange} placeholder={t("Free or NPR 200")} />
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <input
              type="checkbox"
              name="requiresApproval"
              checked={form.requiresApproval}
              onChange={handleChange}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary-500"
            />
            <span className="text-sm">
              <span className="font-medium text-slate-800 dark:text-slate-100">{t("Approve each person who joins")}</span>
              <span className="block text-slate-500 dark:text-slate-400">
                {t("Students send a request instead of being confirmed straight away. A seat is held for each request, and you approve or decline them from the attendee list.")}
              </span>
            </span>
          </label>
          {!editingEvent && duplicatedFrom && (duplicatedFrom.volunteerRoles || []).length > 0 && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <input
                type="checkbox"
                name="copyRoles"
                checked={form.copyRoles}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary-500"
              />
              <span className="text-sm">
                <span className="font-medium text-slate-800 dark:text-slate-100">{t("Copy the volunteer roles")}</span>
                <span className="block text-slate-500 dark:text-slate-400">
                  {t("{roles} come across with the same number of places and no sign-ups.", { roles: duplicatedFrom.volunteerRoles.map((r) => r.name).join(", ") })}
                </span>
              </span>
            </label>
          )}
          <div>
            <label className="label-field" htmlFor="ev-club">{leaderMode ? t("Hosting club") : t("Hosting club (optional)")}</label>
            <select id="ev-club" name="club" className="input-field" value={form.club} onChange={handleChange} required={leaderMode}>
              {!leaderMode && <option value="">{t("No club")}</option>}
              {clubs.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            {!editingEvent && form.club && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                {t("Members of this club will be emailed when you create the event.")}
              </p>
            )}
          </div>
          <div>
            <label className="label-field" htmlFor="ev-image">{t("Event image")} {editingEvent && t("(leave blank to keep current)")}</label>
            <input
              id="ev-image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="input-field file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-600 dark:file:bg-primary-900/30 dark:file:text-primary-300"
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? t("Saving...") : editingEvent ? t("Save changes") : t("Create event")}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirming={deleting}
        title="Delete this event?"
        message={t("This will permanently delete “{title}” and all student registrations for it. This can't be undone.", { title: deleteTarget?.title })}
      />

      <AttendeesModal event={attendeesEvent} onClose={() => setAttendeesEvent(null)} />
    </div>
  );
}
