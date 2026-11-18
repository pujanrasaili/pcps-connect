import { useEffect, useState } from "react";
import { FaMapMarkerAlt, FaTrash, FaPen } from "react-icons/fa";
import { api, getErrorMessage } from "../../services/api";
import { clearSharedRequests } from "../../utils/sharedRequest";
import { useToast } from "../../context/ToastContext";
import { useLang } from "../../context/LanguageContext";
import ConfirmDialog from "../../components/ConfirmDialog";
import Button from "../../components/Button";

// Admins keep the list of named campus places. When an event's location is
// exactly a venue's name, the event page shows that venue's directions. The
// server checks the admin role, the limits and duplicate names again.
export default function AdminVenues() {
  const toast = useToast();
  const { t } = useLang();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null = adding, otherwise the venue
  const [name, setName] = useState("");
  const [directions, setDirections] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () =>
    api
      .get("/venues")
      .then((res) => setVenues(res.data.venues || []))
      .catch((err) => setError(getErrorMessage(err, t("Failed to load venues"))))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    setEditing(null);
    setName("");
    setDirections("");
  };

  const startEdit = (v) => {
    setEditing(v);
    setName(v.name);
    setDirections(v.directions || "");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.put(`/admin/venues/${editing._id}`, { name, directions });
      else await api.post("/admin/venues", { name, directions });
      clearSharedRequests();
      toast.success(editing ? t("Venue saved.") : t("Venue added."));
      reset();
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't save the venue")));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/admin/venues/${deleteTarget._id}`);
      clearSharedRequests();
      setVenues((prev) => prev.filter((v) => v._id !== deleteTarget._id));
      if (editing?._id === deleteTarget._id) reset();
      toast.success(t("Venue removed."));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't remove the venue")));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">{t("Campus venues")}</h1>
        <p className="text-slate-600 dark:text-slate-300">
          {t("Name the places events happen in. When an event's location is exactly a venue's name, the event page shows how to find it.")}
        </p>
      </div>

      <form onSubmit={handleSave} className="card-surface space-y-3 p-6" aria-label={editing ? t("Edit venue") : t("Add a venue")}>
        <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">{editing ? t("Edit venue") : t("Add a venue")}</h2>
        <div>
          <label className="label-field" htmlFor="venue-name">{t("Venue name")}</label>
          <input id="venue-name" className="input-field" value={name} maxLength={60} required onChange={(e) => setName(e.target.value)} placeholder={t("e.g. Seminar Hall")} />
        </div>
        <div>
          <label className="label-field" htmlFor="venue-directions">{t("How to find it (optional)")}</label>
          <input id="venue-directions" className="input-field" value={directions} maxLength={200} onChange={(e) => setDirections(e.target.value)} placeholder={t("e.g. Block B, second floor, next to the library")} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={saving || name.trim().length < 2}>
            {editing ? t("Save venue") : t("Add venue")}
          </Button>
          {editing && (
            <Button variant="ghost" onClick={reset}>
              {t("Cancel")}
            </Button>
          )}
        </div>
      </form>

      <div className="card-surface p-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : error ? (
          <p role="alert" className="py-10 text-center text-sm text-rose-700 dark:text-rose-400">{error}</p>
        ) : venues.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-600 dark:text-slate-300">
            <FaMapMarkerAlt className="mx-auto mb-2 text-2xl text-slate-300" aria-hidden="true" />
            {t("No venues yet.")}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {venues.map((v) => (
              <li key={v._id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{v.name}</p>
                  {v.directions && <p className="text-sm text-slate-600 dark:text-slate-300">{v.directions}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(v)}
                    aria-label={t("Edit {name}", { name: v.name })}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <FaPen className="text-xs" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(v)}
                    aria-label={t("Remove {name}", { name: v.name })}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/20"
                  >
                    <FaTrash className="text-xs" aria-hidden="true" />
                  </button>
                </div>
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
        title={t("Remove this venue?")}
        message={t("Events keep their location text; they just stop showing directions for {name}.", { name: deleteTarget?.name || "" })}
      />
    </div>
  );
}
