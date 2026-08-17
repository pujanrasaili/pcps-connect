import { useMemo, useState } from "react";
import { FaEnvelope, FaPhone, FaIdBadge, FaGraduationCap, FaEdit, FaHeart, FaTimes } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useRegistrations } from "../context/RegistrationContext";
import { useClubMembership } from "../context/ClubMembershipContext";
import { useToast } from "../context/ToastContext";
import { formatDate } from "../utils/formatDate";
import { resolveUploadUrl } from "../services/api";
import Modal from "../components/Modal";
import Button from "../components/Button";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { registrations, cancelRegistration } = useRegistrations();
  const { memberships, favoriteClubId, leaveClub } = useClubMembership();
  const toast = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    studentId: user?.studentId || "",
    program: user?.program || "",
    semester: user?.semester || "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const eventHistory = useMemo(
    () =>
      registrations
        .filter((r) => r.event)
        .sort((a, b) => new Date(b.event.date) - new Date(a.event.date)),
    [registrations]
  );

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await updateUser(form);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Profile updated.");
    setEditOpen(false);
  };

  const handleLeaveClub = (clubId) => {
    leaveClub(clubId);
  };

  const handleUnregister = (eventId) => {
    cancelRegistration(eventId);
  };

  return (
    <div className="space-y-6">
      <div className="card-surface p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <img src={user?.avatar} alt="" className="h-20 w-20 rounded-full ring-4 ring-primary-100 dark:ring-primary-900" />
            <div className="text-center sm:text-left">
              <h1 className="font-display text-xl font-bold text-slate-800 dark:text-slate-100">
                {user?.name}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {[user?.program, user?.semester].filter(Boolean).join(" · ") || "No program set"}
              </p>
            </div>
          </div>
          <Button variant="outline" icon={FaEdit} onClick={() => setEditOpen(true)}>
            Edit profile
          </Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <InfoRow icon={FaIdBadge} label="Student ID" value={user?.studentId || "Not set"} />
          <InfoRow icon={FaEnvelope} label="Email" value={user?.email} />
          <InfoRow icon={FaPhone} label="Phone" value={user?.phone || "Not set"} />
          <InfoRow icon={FaGraduationCap} label="Program" value={user?.program || "Not set"} />
        </div>
      </div>

      <div className="card-surface p-6">
        <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
          Registered Clubs
        </h2>
        {memberships.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {memberships.map((m) => (
              <div key={m._id} className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                <img src={resolveUploadUrl(m.club?.image)} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-medium text-slate-800 dark:text-slate-100">
                    {m.club?.name}
                    {m.club?._id === favoriteClubId && (
                      <FaHeart className="shrink-0 text-xs text-rose-500" title="Favorite club" />
                    )}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{m.club?.category}</p>
                </div>
                <button
                  onClick={() => handleLeaveClub(m.club._id)}
                  aria-label={`Leave ${m.club?.name}`}
                  title="Leave club"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            You haven't joined any clubs yet — browse clubs and hit "Join Club" to add one here.
          </p>
        )}
      </div>

      <div className="card-surface p-6">
        <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
          Event History
        </h2>
        {eventHistory.length > 0 ? (
          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {eventHistory.map((r) => (
              <div key={r._id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800 dark:text-slate-100">{r.event.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(r.event.date)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`badge ${
                      r.attended
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    {r.attended ? "Attended" : "Upcoming"}
                  </span>
                  {!r.attended && (
                    <button
                      onClick={() => handleUnregister(r.event._id)}
                      aria-label={`Unregister from ${r.event.title}`}
                      title="Unregister"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
                    >
                      <FaTimes className="text-sm" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No event history yet.</p>
        )}
      </div>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit profile" size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label-field" htmlFor="edit-name">Full name</label>
            <input id="edit-name" name="name" className="input-field" value={form.name} onChange={handleChange} />
          </div>
          <div>
            <label className="label-field" htmlFor="edit-studentId">Student ID</label>
            <input id="edit-studentId" name="studentId" className="input-field" value={form.studentId} onChange={handleChange} />
          </div>
          <div>
            <label className="label-field" htmlFor="edit-program">Program</label>
            <input id="edit-program" name="program" className="input-field" value={form.program} onChange={handleChange} />
          </div>
          <div>
            <label className="label-field" htmlFor="edit-semester">Semester</label>
            <input id="edit-semester" name="semester" className="input-field" value={form.semester} onChange={handleChange} />
          </div>
          <div>
            <label className="label-field" htmlFor="edit-phone">Phone number</label>
            <input id="edit-phone" name="phone" className="input-field" value={form.phone} onChange={handleChange} />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300">
        <Icon />
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{value}</p>
      </div>
    </div>
  );
}
