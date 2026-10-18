import { useEffect, useMemo, useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaUsers, FaEnvelope, FaUserTie } from "react-icons/fa";
import { useClubs } from "../../context/ClubsContext";
import { useToast } from "../../context/ToastContext";
import { api, getErrorMessage, resolveUploadUrl } from "../../services/api";
import { getClubIcon } from "../../utils/iconMap";
import { useDebounce } from "../../hooks/useDebounce";
import { pluralize } from "../../utils/plural";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import SearchBar from "../../components/SearchBar";
import Button from "../../components/Button";
import Pagination from "../../components/Pagination";
import { usePagination } from "../../hooks/usePagination";

const PAGE_SIZE = 10;
const ICON_OPTIONS = ["FaCode", "FaRobot", "FaCamera", "FaFutbol", "FaLightbulb", "FaUsers"];
const EMPTY_FORM = {
  name: "",
  category: "",
  description: "",
  longDescription: "",
  image: "",
  icon: "FaUsers",
  activities: "",
  leadName: "",
  leadRole: "",
  email: "",
  foundedYear: "",
};

export default function AdminClubs() {
  const { clubs, loading, refreshClubs } = useClubs();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [formOpen, setFormOpen] = useState(false);
  const [editingClub, setEditingClub] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [messageTarget, setMessageTarget] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Club leaders: students who can manage this club's events (admin-assigned).
  const [leadersTarget, setLeadersTarget] = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [leadersLoading, setLeadersLoading] = useState(false);
  const [leaderQuery, setLeaderQuery] = useState("");
  const [leaderResults, setLeaderResults] = useState([]);
  const [savingLeaders, setSavingLeaders] = useState(false);
  const debouncedLeaderQuery = useDebounce(leaderQuery, 250);
  const [allUsers, setAllUsers] = useState(null);

  const openLeaders = async (club) => {
    setLeadersTarget(club);
    setLeaders([]);
    setLeaderQuery("");
    setLeadersLoading(true);
    try {
      const res = await api.get(`/admin/clubs/${club._id}/leaders`);
      setLeaders(res.data.leaders || []);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load club leaders"));
      setLeadersTarget(null);
    } finally {
      setLeadersLoading(false);
    }
  };

  // Candidates are fetched once, the first time the modal is searched.
  useEffect(() => {
    const q = debouncedLeaderQuery.trim().toLowerCase();
    if (!leadersTarget || q.length < 2) {
      setLeaderResults([]);
      return undefined;
    }
    let cancelled = false;
    const filter = (users) =>
      users
        .filter(
          (u) =>
            u.approvalStatus === "approved" &&
            !leaders.some((l) => l._id === u._id) &&
            [u.name, u.email, u.studentId].some((v) => (v || "").toLowerCase().includes(q))
        )
        .slice(0, 6);
    if (allUsers) {
      setLeaderResults(filter(allUsers));
    } else {
      api
        .get("/admin/users")
        .then((res) => {
          if (cancelled) return;
          setAllUsers(res.data.users);
          setLeaderResults(filter(res.data.users));
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [debouncedLeaderQuery, leadersTarget, leaders, allUsers]);

  const saveLeaders = async () => {
    setSavingLeaders(true);
    try {
      await api.put(`/admin/clubs/${leadersTarget._id}/leaders`, { userIds: leaders.map((l) => l._id) });
      toast.success("Club leaders updated.");
      setLeadersTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update club leaders"));
    } finally {
      setSavingLeaders(false);
    }
  };

  const openMessage = (club) => {
    setMessage("");
    setMessageTarget(club);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await api.post(`/admin/clubs/${messageTarget._id}/announce`, { message });
      toast.success(res.data.message);
      setMessageTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to send message"));
    } finally {
      setSending(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openCreate = () => {
    setEditingClub(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (club) => {
    setEditingClub(club);
    setForm({
      name: club.name || "",
      category: club.category || "",
      description: club.description || "",
      longDescription: club.longDescription || "",
      image: club.image || "",
      icon: club.icon || "FaUsers",
      activities: (club.activities || []).join("\n"),
      leadName: club.leadName || "",
      leadRole: club.leadRole || "",
      email: club.email || "",
      foundedYear: club.foundedYear || "",
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      activities: form.activities
        .split("\n")
        .map((a) => a.trim())
        .filter(Boolean),
    };
    try {
      if (editingClub) {
        await api.put(`/clubs/${editingClub._id}`, payload);
        toast.success("Club updated.");
      } else {
        await api.post("/clubs", payload);
        toast.success("Club created.");
      }
      await refreshClubs();
      setFormOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save club"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/clubs/${deleteTarget._id}`);
      toast.success("Club deleted.");
      await refreshClubs();
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete club"));
    } finally {
      setDeleting(false);
    }
  };

  const filteredClubs = useMemo(
    () => clubs.filter((c) => c.name.toLowerCase().includes(debouncedQuery.toLowerCase())),
    [clubs, debouncedQuery]
  );

  const { page, setPage, totalPages, pageItems: pagedClubs } = usePagination(filteredClubs, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
            Manage Clubs
          </h1>
          <p className="text-slate-500 dark:text-slate-400">{pluralize(clubs.length, "club")} total</p>
        </div>
        <Button icon={FaPlus} onClick={openCreate}>
          Add Club
        </Button>
      </div>

      <div className="max-w-sm">
        <SearchBar value={query} onChange={setQuery} placeholder="Search clubs..." />
      </div>

      <div className="card-surface divide-y divide-slate-100 dark:divide-slate-800">
        {loading ? (
          <div className="flex justify-center p-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : (
          pagedClubs.map((club) => {
            const Icon = getClubIcon(club.icon);
            return (
              <div key={club._id} className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
                <img
                  src={resolveUploadUrl(club.image)}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg object-cover bg-slate-100 dark:bg-slate-800"
                />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Icon className="shrink-0 text-primary-500" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800 dark:text-slate-100">{club.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{club.category}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => openMessage(club)}
                    aria-label={`Message members of ${club.name}`}
                    title="Message members"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20"
                  >
                    <FaEnvelope />
                  </button>
                  <button
                    onClick={() => openLeaders(club)}
                    aria-label={`Manage leaders of ${club.name}`}
                    title="Club leaders"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/20"
                  >
                    <FaUserTie />
                  </button>
                  <button
                    onClick={() => openEdit(club)}
                    aria-label={`Edit ${club.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(club)}
                    aria-label={`Delete ${club.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            );
          })
        )}
        {!loading && filteredClubs.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            <FaUsers className="mx-auto mb-2 text-2xl text-slate-300" />
            {clubs.length === 0 ? 'No clubs yet. Click "Add Club" to create one.' : "No clubs match your search."}
          </p>
        )}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editingClub ? "Edit Club" : "Add Club"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-field">Club name</label>
              <input name="name" className="input-field" value={form.name} onChange={handleChange} required />
            </div>
            <div>
              <label className="label-field">Category</label>
              <input name="category" className="input-field" value={form.category} onChange={handleChange} required placeholder="Technology, Arts, Sports..." />
            </div>
          </div>
          <div>
            <label className="label-field">Short description</label>
            <textarea name="description" rows={2} className="input-field resize-none" value={form.description} onChange={handleChange} required />
          </div>
          <div>
            <label className="label-field">Full description</label>
            <textarea name="longDescription" rows={3} className="input-field resize-none" value={form.longDescription} onChange={handleChange} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-field">Image URL</label>
              <input name="image" className="input-field" value={form.image} onChange={handleChange} placeholder="https://..." />
            </div>
            <div>
              <label className="label-field">Icon</label>
              <select name="icon" className="input-field" value={form.icon} onChange={handleChange}>
                {ICON_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt.replace("Fa", "")}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label-field">Activities (one per line)</label>
            <textarea name="activities" rows={3} className="input-field resize-none" value={form.activities} onChange={handleChange} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-field">Club lead name</label>
              <input name="leadName" className="input-field" value={form.leadName} onChange={handleChange} />
            </div>
            <div>
              <label className="label-field">Club lead role</label>
              <input name="leadRole" className="input-field" value={form.leadRole} onChange={handleChange} placeholder="Club President" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-field">Contact email</label>
              <input name="email" type="email" className="input-field" value={form.email} onChange={handleChange} />
            </div>
            <div>
              <label className="label-field">Founded year</label>
              <input name="foundedYear" className="input-field" value={form.foundedYear} onChange={handleChange} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving..." : editingClub ? "Save changes" : "Create club"}
          </Button>
        </form>
      </Modal>

      <Modal isOpen={!!messageTarget} onClose={() => setMessageTarget(null)} title={`Message members — ${messageTarget?.name || ""}`} size="md">
        <form onSubmit={sendMessage} className="space-y-3">
          <label className="label-field" htmlFor="club-message">Message to everyone who joined this club</label>
          <textarea
            id="club-message"
            rows={5}
            maxLength={1000}
            required
            className="input-field"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. This week's meeting is moved to Friday, 3 PM, Room B2."
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              {message.length}/1000 · sent by email, can't be undone. Members who turned off club updates are skipped.
            </span>
            <Button type="submit" disabled={sending || !message.trim()}>
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!leadersTarget} onClose={() => setLeadersTarget(null)} title={`Club leaders — ${leadersTarget?.name || ""}`} size="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Leaders can create and manage events for this club, see who registered, mark attendance and check
            students in. They can't touch anything else.
          </p>
          {leadersLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
              {leaders.length === 0 && (
                <li className="p-3 text-sm text-slate-500 dark:text-slate-400">No leaders yet.</li>
              )}
              {leaders.map((l) => (
                <li key={l._id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{l.name}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{l.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLeaders((prev) => prev.filter((x) => x._id !== l._id))}
                    aria-label={`Remove ${l.name} as leader`}
                    className="text-xs font-medium text-rose-500 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div>
            <label className="label-field" htmlFor="leader-search">Add a leader</label>
            <input
              id="leader-search"
              className="input-field"
              value={leaderQuery}
              onChange={(e) => setLeaderQuery(e.target.value)}
              placeholder="Search by name, email or student ID"
              autoComplete="off"
            />
            {leaderResults.length > 0 && (
              <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {leaderResults.map((u) => (
                  <li key={u._id}>
                    <button
                      type="button"
                      disabled={leaders.length >= 10}
                      onClick={() => {
                        setLeaders((prev) => [...prev, u]);
                        setLeaderQuery("");
                      }}
                      className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{u.name}</span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</span>
                      </span>
                      <span className="text-xs font-medium text-primary-600">Add</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button className="w-full" onClick={saveLeaders} disabled={savingLeaders || leadersLoading}>
            {savingLeaders ? "Saving..." : "Save leaders"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirming={deleting}
        title="Delete this club?"
        message={`This will permanently delete "${deleteTarget?.name}". Students' memberships in this club will also be removed. This can't be undone.`}
      />
    </div>
  );
}
