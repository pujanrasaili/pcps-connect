import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaUsers,
  FaCalendarAlt,
  FaUserFriends,
  FaClipboardList,
  FaArrowRight,
  FaExclamationCircle,
} from "react-icons/fa";
import StatsCard from "../../components/StatsCard";
import { useClubs } from "../../context/ClubsContext";
import { useEvents } from "../../context/EventsContext";
import { api, getErrorMessage } from "../../services/api";
import AttendanceReportCard from "../../components/AttendanceReportCard";
import InsightsCard from "../../components/InsightsCard";
import { formatDate, isUpcoming } from "../../utils/formatDate";

export default function AdminOverview() {
  const { clubs } = useClubs();
  const { events } = useEvents();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    api
      .get("/admin/users")
      .then((res) => setUsers(res.data.users))
      .catch((err) => setError(getErrorMessage(err, "Failed to load users")));
    // The report is a nice-to-have; if it fails the rest of the page still works.
    api
      .get("/admin/attendance-report")
      .then((res) => setReport(res.data))
      .catch(() => setReport(null));
    api
      .get("/admin/insights")
      .then((res) => setInsights(res.data))
      .catch(() => setInsights(null));
  }, []);

  const totalRegistrations = events.reduce((sum, e) => sum + (e.registeredCount || 0), 0);
  const pendingUsers = users?.filter((u) => u.approvalStatus === "pending") ?? [];
  const nextEvents = events
    .filter((e) => isUpcoming(e.date))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

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
        <p className="rounded-lg bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}

      {/* The single most actionable thing on this page -- students can't log
          in until an admin approves them, so this needs to be impossible to
          miss the moment someone lands here, not buried a click away on the
          Users page. */}
      {pendingUsers.length > 0 && (
        <Link
          to="/admin/users"
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20 dark:hover:bg-amber-900/30"
        >
          <FaExclamationCircle className="shrink-0 text-lg text-amber-500" />
          <p className="flex-1 text-sm font-medium text-amber-800 dark:text-amber-300">
            {pendingUsers.length} {pendingUsers.length === 1 ? "student is" : "students are"} waiting
            for approval
          </p>
          <FaArrowRight className="shrink-0 text-xs text-amber-700 dark:text-amber-400" />
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={FaUsers} label="Total Clubs" value={clubs.length} accent="primary" />
        <StatsCard icon={FaCalendarAlt} label="Total Events" value={events.length} accent="accent" />
        <StatsCard icon={FaUserFriends} label="Registered Students" value={users?.length ?? "—"} accent="emerald" />
        <StatsCard icon={FaClipboardList} label="Total Event Registrations" value={totalRegistrations} accent="amber" />
      </div>

      <InsightsCard insights={insights} />

      <AttendanceReportCard report={report} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Coming Up</h2>
            <Link to="/admin/events" className="text-xs font-semibold text-primary-600 dark:text-primary-300">
              View all
            </Link>
          </div>
          {nextEvents.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming events scheduled.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {nextEvents.map((e) => (
                <li key={e._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">{e.title}</span>
                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(e.date)} &middot; {e.registeredCount || 0}/{e.capacity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <QuickLink to="/admin/clubs" label="Manage Clubs" desc="Add, edit, or remove clubs" />
          <QuickLink to="/admin/events" label="Manage Events" desc="Add, edit, or remove events" />
          <QuickLink to="/admin/users" label="Manage Users" desc="View students, manage roles" />
        </div>
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
