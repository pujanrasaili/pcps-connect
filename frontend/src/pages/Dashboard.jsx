import LoadFailedBanner from "../components/LoadFailedBanner";
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
  FaBookmark,
  FaRegCircle,
  FaCheckCircle,
  FaQrcode,
} from "react-icons/fa";
import StatsCard from "../components/StatsCard";
import WaitlistCard from "../components/WaitlistCard";
import VolunteeringCard from "../components/VolunteeringCard";
import ClubNewsFeedCard from "../components/ClubNewsFeedCard";
import { useMyClubNews } from "../hooks/useMyClubNews";
import { useMyWaitlist } from "../hooks/useMyWaitlist";
import { useMyVolunteering } from "../hooks/useMyVolunteering";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { useLedClubs } from "../hooks/useLedClubs";
import { useRequestCounts } from "../hooks/useRequestCounts";
import { useClubMembership } from "../context/ClubMembershipContext";
import { useClubs } from "../context/ClubsContext";
import { useEvents } from "../context/EventsContext";
import { useRegistrations } from "../context/RegistrationContext";
import { formatDate, formatDateAndTime, isUpcoming, relativeDay } from "../utils/formatDate";
import { hostIds, hostNames } from "../utils/eventHosts";
import { resolveUploadUrl } from "../services/api";
import { downloadIcsAll } from "../utils/calendar";
import { useSavedEvents } from "../hooks/useSavedEvents";
import { savedUpcoming } from "../utils/savedEvents";
import { pendingGettingStarted } from "../utils/gettingStarted";
import InstallAppCard from "../components/InstallAppCard";
import { MonthBars, CategoryBars } from "../components/DashboardCharts";
import SafeImage from "../components/SafeImage";

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const { favoriteClubId, memberships, pendingClubIds, loaded: membershipsLoaded } = useClubMembership();
  const { clubs } = useClubs();
  const { clubs: ledClubs } = useLedClubs();
  const waitingClubs = clubs.filter((c) => pendingClubIds.includes(c._id));
  const { counts: clubRequestCounts } = useRequestCounts(ledClubs.length > 0 && user?.role !== "admin");
  const waitingOnMyClubs = ledClubs.reduce((sum, c) => sum + (clubRequestCounts[c._id] || 0), 0);
  const { events } = useEvents();
  const { registrations, cancelRegistration, loaded: registrationsLoaded, loadFailed, refreshRegistrations } = useRegistrations();

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
  // Requests the organisers haven't approved yet aren't in the calendar file.
  const upcomingConfirmed = upcoming.filter((r) => r.status !== "pending");

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
      .filter((e) => hostIds(e).some((id) => joinedIds.has(id)) && isUpcoming(e.date) && !registeredIds.has(e._id))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [events, memberships, registeredEvents]);

  const waitlist = useMyWaitlist();
  const volunteering = useMyVolunteering();
  const clubNews = useMyClubNews();
  const { savedIds } = useSavedEvents();
  const savedForLater = useMemo(() => {
    const joined = new Set(registeredEvents.map((r) => r.event._id));
    return savedUpcoming(events, savedIds, (id) => joined.has(id));
  }, [events, savedIds, registeredEvents]);

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

  // Only once both lists have really loaded: on a slow server an established
  // student would otherwise briefly (or for a minute) be told they've done nothing.
  const gettingStarted =
    membershipsLoaded && registrationsLoaded
      ? pendingGettingStarted({
          joinedClubs: memberships.length,
          favoriteClub: favoriteClubId,
          registrations: registeredEvents.length,
        })
      : null;

  const handleUnregister = (eventId) => {
    cancelRegistration(eventId);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
          {t("Welcome back, {name}", { name: user?.name?.split(" ")[0] })}
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          {t("Here's a snapshot of your involvement at PCPS.")}
        </p>
      </div>

      {loadFailed && <LoadFailedBanner what="your registrations" onRetry={refreshRegistrations} />}

      <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={FaCalendarCheck} label={t("Registered Events")} value={registeredEvents.length} accent="primary" />
        <StatsCard icon={FaCheckDouble} label={t("Attended Events")} value={attendedCount} accent="emerald" />
        <StatsCard icon={FaHeart} label={t("Favorite Club")} value={favoriteClub?.name.replace("PCPS ", "") || "—"} accent="accent" />
        <StatsCard icon={FaClock} label={t("Upcoming Registrations")} value={upcoming.length} accent="amber" />
      </div>

      {gettingStarted && (
        <div className="card-surface min-w-0 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t("Get started")}</h2>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("{done} of {total} done", { done: gettingStarted.done, total: gettingStarted.total })}
            </span>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {gettingStarted.steps.map((step) => (
              <li key={step.id}>
                {step.done ? (
                  <p className="flex items-center gap-3 py-2.5 text-sm text-slate-500 dark:text-slate-400">
                    <FaCheckCircle className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span className="line-through">{t(step.label)}</span>
                    <span className="sr-only">{t("(done)")}</span>
                  </p>
                ) : (
                  <Link
                    to={step.to}
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <FaRegCircle className="shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-slate-700 dark:text-slate-200">{t(step.label)}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{t(step.hint)}</span>
                    </span>
                    <FaArrowRight className="shrink-0 text-xs text-primary-600 dark:text-primary-300" aria-hidden="true" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {waitingClubs.length > 0 && (
        <div className="card-surface flex min-w-0 flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <FaClock className="shrink-0 text-amber-500" />
            <p className="min-w-0 text-sm text-slate-700 dark:text-slate-200">
              {t("Waiting for approval:")} <strong>{waitingClubs.map((c) => c.name).join(", ")}</strong>. {t("You will get a message when the club decides.")}
            </p>
          </div>
          <Link to="/clubs" className="shrink-0 text-sm font-semibold text-primary-600 dark:text-primary-300">
            {t("View clubs")} <FaArrowRight className="inline text-xs" />
          </Link>
        </div>
      )}

      {ledClubs.length > 0 && user?.role !== "admin" && (
        <div className="card-surface flex min-w-0 flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <FaUserTie className="shrink-0 text-amber-500" />
            <p className="min-w-0 text-sm text-slate-700 dark:text-slate-200">
              {t("You lead")} <strong>{ledClubs.map((c) => c.name).join(", ")}</strong>. {t("Create events, see registrations and check students in.")}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1">
            {waitingOnMyClubs > 0 && (
              <Link to="/admin/my-clubs" className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {t("{n} waiting to join", { n: waitingOnMyClubs })} <FaArrowRight className="inline text-xs" />
              </Link>
            )}
            <Link to="/admin/events" className="hit-v text-sm font-semibold text-primary-600 dark:text-primary-300">
              {t("Manage events")} <FaArrowRight className="inline text-xs" />
            </Link>
          </div>
        </div>
      )}

      {needsRating.length > 0 && (
        <div className="card-surface min-w-0 p-5">
          <div className="mb-3 flex items-center gap-2">
            <FaStar className="shrink-0 text-amber-400" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              {t("How were the events you attended?")}
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
                    aria-label={t("Certificate for {title}", { title: r.event.title })}
                    title={t("Attendance certificate")}
                    className="text-slate-500 dark:text-slate-400 transition-colors hover:text-primary-500"
                  >
                    <FaCertificate />
                  </Link>
                  <Link to="/profile" className="text-xs font-semibold text-primary-600 dark:text-primary-300">
                    {t("Rate")}
                  </Link>
                </span>
              </li>
            ))}
          </ul>
          {needsRating.length > 3 && (
            <Link to="/profile" className="mt-2 inline-block text-xs font-semibold text-primary-600 dark:text-primary-300">
              {t("+{n} more in your profile", { n: needsRating.length - 3 })}
            </Link>
          )}
        </div>
      )}

      {fromMyClubs.length > 0 && (
        <div className="card-surface min-w-0 p-5">
          <div className="mb-3 flex items-center gap-2">
            <FaUsers className="shrink-0 text-primary-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t("From your clubs")}</h2>
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
                        {e.club?.name ? `${hostNames(e).join(" + ")} · ` : ""}
                        {formatDateAndTime(e.date)}
                      </p>
                    </div>
                    <span className={`badge shrink-0 ${full ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300"}`}>
                      {full ? t("Full · join waitlist") : t("Open")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {fromMyClubs.length > 3 && (
            <Link to="/events" className="mt-2 inline-block text-xs font-semibold text-primary-600 dark:text-primary-300">
              {t("+{n} more on the Events page", { n: fromMyClubs.length - 3 })}
            </Link>
          )}
        </div>
      )}

      <WaitlistCard items={waitlist} />

      <VolunteeringCard items={volunteering} />

      <ClubNewsFeedCard posts={clubNews} />

      {savedForLater.length > 0 && (
        <div className="card-surface min-w-0 p-5">
          <div className="mb-3 flex items-center gap-2">
            <FaBookmark className="shrink-0 text-primary-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t("Saved for later")}</h2>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {savedForLater.slice(0, 3).map((e) => (
              <li key={e._id}>
                <Link
                  to={`/events/${e._id}`}
                  className="-mx-2 block rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <p className="truncate text-slate-700 dark:text-slate-200">{e.title}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {e.club?.name ? `${hostNames(e).join(" + ")} · ` : ""}
                    {formatDateAndTime(e.date)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {savedForLater.length > 3 && (
            <Link to="/events?when=saved" className="mt-2 inline-block text-xs font-semibold text-primary-600 dark:text-primary-300">
              {t("See all {n} saved events", { n: savedForLater.length })}
            </Link>
          )}
        </div>
      )}

      {monthlyData.length === 0 && categoryData.length === 0 && (
        <div className="card-surface p-6">
          <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
            {t("Your activity")}
          </h2>
          <EmptyChart />
        </div>
      )}

      {(monthlyData.length > 0 || categoryData.length > 0) && (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card-surface p-6">
          <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
            {t("Participation by Month")}
          </h2>
          <div className={`mt-4 ${monthlyData.length > 0 ? "h-64" : ""}`}>
            {monthlyData.length > 0 ? (
              <MonthBars data={monthlyData} />
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>

        <div className="card-surface p-6">
          <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
            {t("Events by Category")}
          </h2>
          <div className={`mt-4 ${categoryData.length > 0 ? "h-64" : ""}`}>
            {categoryData.length > 0 ? (
              <CategoryBars data={categoryData} />
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>
      </div>
      )}

      <div className="card-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
            {t("Upcoming Registrations")}
          </h2>
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
            {upcomingConfirmed.length > 0 && (
              <button
                onClick={() => downloadIcsAll(upcomingConfirmed.map((r) => r.event))}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline dark:text-primary-300"
              >
                <FaCalendarPlus className="text-xs" /> {t("Add all to calendar")}
              </button>
            )}
            {upcomingConfirmed.length > 0 && (
              <Link to="/tickets" className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline dark:text-primary-300">
                <FaQrcode className="text-xs" /> {t("My tickets (work offline)")}
              </Link>
            )}
            <Link to="/events" className="flex items-center gap-1 text-sm font-semibold text-primary-600 dark:text-primary-300">
              {t("Find more events")} <FaArrowRight className="text-xs" />
            </Link>
          </div>
        </div>

        <InstallAppCard className="mb-4" />

        {upcoming.length > 0 ? (
          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {upcoming.map((r) => (
              <div key={r._id} className="flex items-center justify-between gap-3 py-3">
                <Link
                  to={`/events/${r.event._id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg -mx-2 px-2 py-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <SafeImage src={resolveUploadUrl(r.event.image, 120)} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800 dark:text-slate-100">{r.event.title}</p>
                    {r.status === "pending" && (
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{t("Pending approval")}</p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {relativeDay(r.event.date) && (
                        <span className="font-semibold text-accent-600 dark:text-accent-300">{translateDay(relativeDay(r.event.date), t)} · </span>
                      )}
                      {formatDateAndTime(r.event.date)}
                    </p>
                  </div>
                </Link>
                {r.event.category && (
                  <span className="badge shrink-0 bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                    {r.event.category}
                  </span>
                )}
                <button
                  onClick={() => handleUnregister(r.event._id)}
                  aria-label={t("Unregister from {title}", { title: r.event.title })}
                  title={t("Unregister")}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            {t("No upcoming registrations yet. Browse events to find something you like.")}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyChart() {
  const { t } = useLang();
  return (
    <div className="flex items-center justify-center py-6 text-center text-sm text-slate-500 dark:text-slate-400">
      {t("No data yet — register for an event to see your stats.")}
    </div>
  );
}

// relativeDay() returns English ("Today", "Tomorrow", "In 3 days").
function translateDay(text, t) {
  const m = /^In (\d+) days$/.exec(text);
  return m ? t("In {n} days", { n: m[1] }) : t(text);
}
