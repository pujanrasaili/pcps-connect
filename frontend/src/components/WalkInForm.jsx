import { useState } from "react";
import { FaUserPlus } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../context/ToastContext";
import Button from "./Button";

// For a student who turned up without registering: the organiser types their
// PCPS email or student ID and they are registered and checked in at once.
// Exact matches only, and the event's capacity still applies (the server
// decides both). `onAdded` lets the attendee list reload.
export default function WalkInForm({ eventId, onAdded }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post(`/admin/events/${eventId}/walk-in`, { identifier });
      const { student, alreadyCheckedIn } = res.data;
      toast.success(alreadyCheckedIn ? `${student.name} was already checked in.` : `${student.name} is checked in.`);
      setIdentifier("");
      onAdded?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't add the walk-in"));
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-3 flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <FaUserPlus aria-hidden="true" /> Add a walk-in
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <label htmlFor="walk-in-identifier" className="label-field">
        Student who arrived without registering
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="walk-in-identifier"
          data-autofocus
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          maxLength={100}
          placeholder="Their PCPS email or student ID"
          className="input-field min-w-0 flex-1 basis-56"
          autoComplete="off"
        />
        <Button type="submit" disabled={saving || identifier.trim().length < 3}>
          {saving ? "Adding..." : "Add and check in"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
        They are registered and marked attended straight away. The event's capacity still applies.
      </p>
    </form>
  );
}
