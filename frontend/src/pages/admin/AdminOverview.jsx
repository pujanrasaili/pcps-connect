import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaUsers, FaCalendarAlt, FaUserFriends, FaClipboardList, FaArrowRight } from "react-icons/fa";
import StatsCard from "../../components/StatsCard";
import { useClubs } from "../../context/ClubsContext";
import { useEvents } from "../../context/EventsContext";
import { api, getErrorMessage } from "../../services/api";

export default function AdminOverview() {
  const { clubs } = useClubs();
  const { events } = useEvents();
  const [userCount, setUserCount] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/users")
      .then((res) => setUserCount(res.data.users.length))
      .catch((err) => setError(getErrorMessage(err, "Failed to load user count")));
  }, []);

  const totalRegistrations = events.reduce((sum, e) => sum + (e.registeredCount || 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
          Admin Overview
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          A snapshot of everything happening on PCPS Connect.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard icon={FaUsers} label="Total Clubs" value={clubs.length} accent="primary" />
        <StatsCard icon={FaCalendarAlt} label="Total Events" value={events.length} accent="accent" />
        <StatsCard icon={FaUserFriends} label="Registered Students" value={userCount ?? "—"} accent="emerald" />
        <StatsCard icon={FaClipboardList} label="Total Event Registrations" value={totalRegistrations} accent="amber" />
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <QuickLink to="/admin/clubs" label="Manage Clubs" desc="Add, edit, or remove clubs" />
        <QuickLink to="/admin/events" label="Manage Events" desc="Add, edit, or remove events" />
        <QuickLink to="/admin/users" label="Manage Users" desc="View students, manage roles" />
      </div>
    </div>
  );
}

function QuickLink({ to, label, desc }) {
  return (
    <Link
      to={to}
      className="card-surface flex items-center justify-between p-5 transition-shadow hover:shadow-soft"
    >
      <div>
        <p className="font-semibold text-slate-800 dark:text-slate-100">{label}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
      <FaArrowRight className="shrink-0 text-primary-500" />
    </Link>
  );
}
