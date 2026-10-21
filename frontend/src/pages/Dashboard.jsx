import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FaCalendarCheck,
  FaCheckDouble,
  FaHeart,
  FaClock,
  FaArrowRight,
  FaTimes,
  FaStar,
  FaCertificate,
  FaUsers,
  FaUserTie,
  FaCalendarPlus,
} from "react-icons/fa";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import StatsCard from "../components/StatsCard";
import { useAuth } from "../context/AuthContext";
import { useLedClubs } from "../hooks/useLedClubs";
import { useClubMembership } from "../context/ClubMembershipContext";
import { useClubs } from "../context/ClubsContext";
import { useEvents } from "../context/EventsContext";
import { useRegistrations } from "../context/RegistrationContext";
import { formatDate, isUpcoming, relativeDay } from "../utils/formatDate";
import { resolveUploadUrl } from "../services/api";
import { downloadIcsAll } from "../utils/calendar";

const COLORS = ["#4F46E5", "#7C3AED", "#EC4899", "#F59E0B", "#10B981"];

export default function Dashboard() {
  const { user } = useAuth();
  const { favoriteClubId, memberships } = useClubMembership();
  const { clubs } = useClubs();
  const { clubs: ledClubs } = useLedClubs();
  const { events } = useEvents();
  const { registrations, cancelRegistration } = useRegistrations();

  // Only registrations whose event is still populated (guards against a
  // deleted event leaving a dangling reference).
  const registeredEvents = useMemo(
    () => registrations.filter((r) => r.event),
    [registrations]
  );

  const attendedCount = registeredEvents.filter((r) => r.attended).length;
  const upcoming = registeredEvents
    .filter((r) => isUpcoming(r.event.date))
    .sort((a, b) => new Date(a.event.date) - new Date(b.event.date));

  // Events they attended but never rated: the organisers' only way to learn
  // how it went, so worth a nudge right on the dashboard.
  const needsRating = useMemo(
    () =>
      registeredEvents
        .filter((r) => r.attended && !r.rating)
        .sort((a, b) => new Date(b.event.date) - new Date(a.event.date)),
    [registeredEvents]
  );

  // Upcoming events hosted by clubs the student joined, that they haven't
  // signed up for yet -- the events they're most likely to care about.
  const fromMyClubs = useMemo(() => {
    const joinedIds = new Set(memberships.map((m) => m.club?._id).filter(Boolean));
    const registeredIds = new Set(registeredEvents.map((r) => r.event._id));
    return events
      .filter((e) => e.club && joinedIds.has(e.club._id || e.club) && isUpcoming(e.date) && !registeredIds.has(e._id))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [events, memberships, registeredEvents]);

  const favoriteClub = clubs.find((c) => c._id === favoriteClubId);

  const monthlyData = useMemo(() => {
    const buckets = {};
    registeredEvents.forEach((r) => {
      const month = new Date(r.event.date).toLocaleDateString("en-US", { month: "short" });
      buckets[month] = (buckets[month] || 0) + 1;
    });
    return Object.entries(buckets).map(([month, count]) => ({ month, count }));
  }, [registeredEvents]);

  const categoryData = useMemo(() => {
    const buckets = {};
    registeredEvents.forEach((r) => {
      const cat = r.event.category || "General";
      buckets[cat] = (buckets[cat] || 0) + 1;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [registeredEvents]);

  const handleUnregister = (eventId) => {
    cancelRegistration(eventId);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Here's a snapshot of your involvement at PCPS.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={FaCalendarCheck} label="Registered Events" value={registeredEvents.length} accent="primary" />
        <StatsCard icon={FaCheckDouble} label="Attended Events" value={attendedCount} accent="emerald" />
        <StatsCard icon={FaHeart} label="Favorite Club" value={favoriteClub?.name.replace("PCPS ", "") || "—"} accent="accent" />
        <StatsCard icon={FaClock} label="Upcoming Registrations" value={upcoming.length} accent="amber" />
      </div>

      {ledClubs.length > 0 && user?.role !== "admin" && (
        <div className="card-surface flex min-w-0 flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <FaUserTie className="shrink-0 text-amber-500" />
            <p className="min-w-0 text-sm text-slate-700 dark:text-slate-200">
              You lead <strong>{ledClubs.map((c) => c.name).join(", ")}</strong>. Create events, see registrations and check students in.
            </p>
          </div>
          <Link to="/admin/events" className="shrink-0 text-sm font-semibold text-primary-600 dark:text-primary-300">
            Manage events <FaArrowRight className="inline text-xs" />
          </Link>
        </div>
      )}

      {needsRating.length > 0 && (
        <div className="card-surface min-w-0 p-5">
          <div className="mb-3 flex items-center gap-2">
            <FaStar className="text-amber-400" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              How were the events you attended?
            </h2>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {needsRating.slice(0, 3).map((r) => (
              <li key={r._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-slate-700 dark:text-slate-200">{r.event.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(r.event.date)}</p>
                </div>
                <span className="flex shrink-0 items-center gap-3">
                  <Link
                    to={`/certificate/${r._id}`}
                    aria-label={`Certificate for ${r.event.title}`}
                    title="Attendance certificate"
                    className="text-slate-500 dark:text-slate-400 transition-colors hover:text-primary-500"
                  >
                    <FaCertificate />
                  </Link>
                  <Link to="/profile" className="text-xs font-semibold text-primary-600 dark:text-primary-300">
                    Rate
                  </Link>
                </span>
              </li>
            ))}
          </ul>
          {needsRating.length > 3 && (
            <Link to="/profile" className="mt-2 inline-block text-xs font-semibold text-primary-600 dark:text-primary-300">
              +{needsRating.length - 3} more in your profile
            </Link>
          )}
        </div>
      )}

      {fromMyClubs.length > 0 && (
        <div className="card-surface min-w-0 p-5">
          <div className="mb-3 flex items-center gap-2">
            <FaUsers className="text-primary-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">From your clubs</h2>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {fromMyClubs.slice(0, 3).map((e) => {
              const full = (e.registeredCount || 0) >= (e.capacity || 0);
              return (
                <li key={e._id}>
                  <Link
                    to={`/events/${e._id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-slate-700 dark:text-slate-200">{e.title}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {e.club?.name ? `${e.club.name} · ` : ""}
                        {formatDate(e.date)}
                      </p>
                    </div>
                    <span className={`badge shrink-0 ${full ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300"}`}>
                      {full ? "Full · join waitlist" : "Open"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {fromMyClubs.length > 3 && (
            <Link to="/events" className="mt-2 inline-block text-xs font-semibold text-primary-600 dark:text-primary-300">
              +{fromMyClubs.length - 3} more on the Events page
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card-surface p-6">
          <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
            Participation by Month
          </h2>
          <div className="mt-4 h-64">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                  />
                  <Bar dataKey="count" fill="#4F46E5" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>

        <div className="card-surface p-6">
          <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
            Events by Category
          </h2>
          <div className="mt-4 h-64">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={30} iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>
      </div>

      <div className="card-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
            Upcoming Registrations
          </h2>
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
            {upcoming.length > 0 && (
              <button
                onClick={() => downloadIcsAll(upcoming.map((r) => r.event))}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline dark:text-primary-300"
              >
                <FaCalendarPlus className="text-xs" /> Add all to calendar
              </button>
            )}
            <Link to="/events" className="flex items-center gap-1 text-sm font-semibold text-primary-600 dark:text-primary-300">
              Find more events <FaArrowRight className="text-xs" />
            </Link>
          </div>
        </div>

        {upcoming.length > 0 ? (
          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {upcoming.map((r) => (
              <div key={r._id} className="flex items-center justify-between gap-3 py-3">
                <Link
                  to={`/events/${r.event._id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg -mx-2 px-2 py-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <img src={resolveUploadUrl(r.event.image, 120)} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800 dark:text-slate-100">{r.event.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {relativeDay(r.event.date) && (
                        <span className="font-semibold text-accent-600 dark:text-accent-300">{relativeDay(r.event.date)} · </span>
                      )}
                      {formatDate(r.event.date)}
                    </p>
                  </div>
                </Link>
                <span className="badge shrink-0 bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                  {r.event.category}
                </span>
                <button
                  onClick={() => handleUnregister(r.event._id)}
                  aria-label={`Unregister from ${r.event.title}`}
                  title="Unregister"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            No upcoming registrations yet. Browse events to find something you like.
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
      No data yet — register for an event to see your stats.
    </div>
  );
}
