import { useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaUsers } from "react-icons/fa";
import { useClubs } from "../../context/ClubsContext";
import { useToast } from "../../context/ToastContext";
import { api, getErrorMessage, resolveUploadUrl } from "../../services/api";
import { getClubIcon } from "../../utils/iconMap";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import Button from "../../components/Button";

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
  const { clubs, refreshClubs } = useClubs();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingClub, setEditingClub] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
            Manage Clubs
          </h1>
          <p className="text-slate-500 dark:text-slate-400">{clubs.length} clubs total</p>
        </div>
        <Button icon={FaPlus} onClick={openCreate}>
          Add Club
        </Button>
      </div>

      <div className="card-surface divide-y divide-slate-100 dark:divide-slate-800">
        {clubs.map((club) => {
          const Icon = getClubIcon(club.icon);
          return (
            <div key={club._id} className="flex items-center gap-4 p-4">
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
              <button
                onClick={() => openEdit(club)}
                aria-label={`Edit ${club.name}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20"
              >
                <FaEdit />
              </button>
              <button
                onClick={() => setDeleteTarget(club)}
                aria-label={`Delete ${club.name}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
              >
                <FaTrash />
              </button>
            </div>
          );
        })}
        {clubs.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            <FaUsers className="mx-auto mb-2 text-2xl text-slate-300" />
            No clubs yet. Click "Add Club" to create one.
          </p>
        )}
      </div>

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
