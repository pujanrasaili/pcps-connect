import { useMemo, useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaCalendarAlt, FaUserFriends } from "react-icons/fa";
import { useEvents } from "../../context/EventsContext";
import { useToast } from "../../context/ToastContext";
import { api, getErrorMessage, resolveUploadUrl } from "../../services/api";
import { formatDate } from "../../utils/formatDate";
import { useDebounce } from "../../hooks/useDebounce";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import AttendeesModal from "../../components/AttendeesModal";
import SearchBar from "../../components/SearchBar";
import Button from "../../components/Button";
import Pagination from "../../components/Pagination";
import { usePagination } from "../../hooks/usePagination";

const PAGE_SIZE = 10;
const EMPTY_FORM = {
  title: "",
  description: "",
  date: "",
  location: "",
  capacity: 100,
  category: "",
  price: "Free",
};

// Converts a stored ISO date into the "YYYY-MM-DDTHH:mm" shape a
// datetime-local input expects.
function toDatetimeLocal(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminEvents() {
  const { events, loading, refreshEvents } = useEvents();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [attendeesEvent, setAttendeesEvent] = useState(null);

  const filteredEvents = useMemo(
    () => events.filter((e) => e.title.toLowerCase().includes(debouncedQuery.toLowerCase())),
    [events, debouncedQuery]
  );

  const { page, setPage, totalPages, pageItems: pagedEvents } = usePagination(filteredEvents, PAGE_SIZE);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openCreate = () => {
    setEditingEvent(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setFormOpen(true);
  };

  const openEdit = (event) => {
    setEditingEvent(event);
    setForm({
      title: event.title || "",
      description: event.description || "",
      date: toDatetimeLocal(event.date),
      location: event.location || "",
      capacity: event.capacity ?? 100,
      category: event.category || "",
      price: event.price || "Free",
    });
    setImageFile(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    if (imageFile) formData.append("image", imageFile);

    try {
      if (editingEvent) {
        await api.put(`/events/${editingEvent._id}`, formData);
        toast.success("Event updated.");
      } else {
        await api.post("/events/create", formData);
        toast.success("Event created.");
      }
      await refreshEvents();
      setFormOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save event"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/events/${deleteTarget._id}`);
      toast.success("Event deleted.");
      await refreshEvents();
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete event"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
            Manage Events
          </h1>
          <p className="text-slate-500 dark:text-slate-400">{events.length} events total</p>
        </div>
        <Button icon={FaPlus} onClick={openCreate}>
          Add Event
        </Button>
      </div>

      <div className="max-w-sm">
        <SearchBar value={query} onChange={setQuery} placeholder="Search events..." />
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
                src={resolveUploadUrl(event.image)}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg object-cover bg-slate-100 dark:bg-slate-800"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800 dark:text-slate-100">{event.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(event.date)} · {event.registeredCount ?? 0}/{event.capacity ?? 100} registered
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => setAttendeesEvent(event)}
                  aria-label={`View attendees for ${event.title}`}
                  title="View attendees"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20"
                >
                  <FaUserFriends />
                </button>
                <button
                  onClick={() => openEdit(event)}
                  aria-label={`Edit ${event.title}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => setDeleteTarget(event)}
                  aria-label={`Delete ${event.title}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))
        )}
        {!loading && filteredEvents.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            <FaCalendarAlt className="mx-auto mb-2 text-2xl text-slate-300" />
            {events.length === 0 ? 'No events yet. Click "Add Event" to create one.' : "No events match your search."}
          </p>
        )}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editingEvent ? "Edit Event" : "Add Event"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-field">Event title</label>
            <input name="title" className="input-field" value={form.title} onChange={handleChange} required />
          </div>
          <div>
            <label className="label-field">Description</label>
            <textarea name="description" rows={3} className="input-field resize-none" value={form.description} onChange={handleChange} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-field">Date &amp; time</label>
              <input name="date" type="datetime-local" className="input-field" value={form.date} onChange={handleChange} required />
            </div>
            <div>
              <label className="label-field">Location</label>
              <input name="location" className="input-field" value={form.location} onChange={handleChange} required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label-field">Capacity</label>
              <input name="capacity" type="number" min="1" className="input-field" value={form.capacity} onChange={handleChange} required />
            </div>
            <div>
              <label className="label-field">Category</label>
              <input name="category" className="input-field" value={form.category} onChange={handleChange} placeholder="Technology, Workshop..." />
            </div>
            <div>
              <label className="label-field">Price</label>
              <input name="price" className="input-field" value={form.price} onChange={handleChange} placeholder="Free or NPR 200" />
            </div>
          </div>
          <div>
            <label className="label-field">Event image {editingEvent && "(leave blank to keep current)"}</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="input-field file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-600 dark:file:bg-primary-900/30 dark:file:text-primary-300"
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving..." : editingEvent ? "Save changes" : "Create event"}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirming={deleting}
        title="Delete this event?"
        message={`This will permanently delete "${deleteTarget?.title}" and all student registrations for it. This can't be undone.`}
      />

      <AttendeesModal event={attendeesEvent} onClose={() => setAttendeesEvent(null)} />
    </div>
  );
}
