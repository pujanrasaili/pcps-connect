import { useMemo, useState } from "react";
import { FaEnvelope, FaPhone, FaIdBadge, FaGraduationCap, FaEdit } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useRegistrations } from "../context/RegistrationContext";
import { clubs } from "../data/clubs";
import { getEventById } from "../data/events";
import { formatDate } from "../utils/formatDate";
import Modal from "../components/Modal";
import Button from "../components/Button";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { registrations } = useRegistrations();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "" });

  const joinedClubs = clubs.filter((c) => user?.joinedClubs?.includes(c.id));
  const eventHistory = useMemo(
    () =>
      registrations
        .map((r) => ({ ...r, event: getEventById(r.eventId) }))
        .filter((r) => r.event)
        .sort((a, b) => new Date(b.event.date) - new Date(a.event.date)),
    [registrations]
  );

  const handleSave = (e) => {
    e.preventDefault();
    updateUser(form);
    setEditOpen(false);
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
              <p className="text-sm text-slate-500 dark:text-slate-400">{user?.program} · {user?.semester}</p>
            </div>
          </div>
          <Button variant="outline" icon={FaEdit} onClick={() => setEditOpen(true)}>
            Edit profile
          </Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <InfoRow icon={FaIdBadge} label="Student ID" value={user?.studentId} />
          <InfoRow icon={FaEnvelope} label="Email" value={user?.email} />
          <InfoRow icon={FaPhone} label="Phone" value={user?.phone} />
          <InfoRow icon={FaGraduationCap} label="Program" value={user?.program} />
        </div>
      </div>

      <div className="card-surface p-6">
        <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
          Registered Clubs
        </h2>
        {joinedClubs.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {joinedClubs.map((club) => (
              <div key={club.id} className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                <img src={club.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{club.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{club.category}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">You haven't joined any clubs yet.</p>
        )}
      </div>

      <div className="card-surface p-6">
        <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
          Event History
        </h2>
        {eventHistory.length > 0 ? (
          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {eventHistory.map((r) => (
              <div key={r.eventId} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{r.event.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(r.event.date)}</p>
                </div>
                <span
                  className={`badge ${
                    r.attended
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}
                >
                  {r.attended ? "Attended" : "Upcoming"}
                </span>
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
            <input
              id="edit-name"
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label-field" htmlFor="edit-phone">Phone number</label>
            <input
              id="edit-phone"
              className="input-field"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full">Save changes</Button>
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
