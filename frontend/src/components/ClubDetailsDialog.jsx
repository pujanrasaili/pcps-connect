import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LanguageContext";

// A club's leaders keep its descriptive text up to date themselves (the server
// accepts only these fields from them; see PATCH /api/leader/clubs/:id).
export default function ClubDetailsDialog({ club, onClose, onSaved }) {
  const { t } = useLang();
  const toast = useToast();
  const [form, setForm] = useState(() => ({
    description: club?.description || "",
    longDescription: club?.longDescription || "",
    activities: (club?.activities || []).join("\n"),
    meetings: club?.meetings || "",
    email: club?.email || "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) {
      setError(t("Short description can't be empty"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.patch(`/leader/clubs/${club._id}`, {
        ...form,
        activities: form.activities.split("\n").map((a) => a.trim()).filter(Boolean),
      });
      toast.success(t("Club details saved."));
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save club details"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={!!club} onClose={onClose} title={t("Edit club details")} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-field" htmlFor="cd-description">{t("Short description")}</label>
          <textarea id="cd-description" name="description" rows={2} maxLength={500} required className="input-field resize-none" value={form.description} onChange={handleChange} />
        </div>
        <div>
          <label className="label-field" htmlFor="cd-long">{t("Full description")}</label>
          <textarea id="cd-long" name="longDescription" rows={4} maxLength={5000} className="input-field resize-none" value={form.longDescription} onChange={handleChange} />
        </div>
        <div>
          <label className="label-field" htmlFor="cd-activities">{t("Activities (one per line)")}</label>
          <textarea id="cd-activities" name="activities" rows={3} className="input-field resize-none" value={form.activities} onChange={handleChange} />
        </div>
        <div>
          <label className="label-field" htmlFor="cd-meetings">{t("Regular meetings")}</label>
          <input id="cd-meetings" name="meetings" maxLength={120} className="input-field" value={form.meetings} onChange={handleChange} placeholder={t("e.g. Thursdays 3 PM, Room 204")} />
        </div>
        <div>
          <label className="label-field" htmlFor="cd-email">{t("Contact email")}</label>
          <input id="cd-email" name="email" type="email" maxLength={254} className="input-field" value={form.email} onChange={handleChange} />
        </div>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t("Cancel")}</Button>
          <Button type="submit" disabled={saving}>{saving ? t("Saving...") : t("Save")}</Button>
        </div>
      </form>
    </Modal>
  );
}
