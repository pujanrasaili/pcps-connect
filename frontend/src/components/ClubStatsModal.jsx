import { useEffect, useState } from "react";
import { api, getErrorMessage } from "../services/api";
import { useLang } from "../context/LanguageContext";
import { formatDate } from "../utils/formatDate";
import Modal from "./Modal";

const dash = (v, suffix = "") => (v === null || v === undefined ? "—" : `${v}${suffix}`);

function Tile({ label, value, note }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-xs text-slate-600 dark:text-slate-300">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
      {note && <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{note}</p>}
    </div>
  );
}

// A one-club summary for its leaders (and admins): members and new joiners,
// events, how many registered students showed up, and the ratings. Counts
// only. Pass the club to open it, null to close.
export default function ClubStatsModal({ club, onClose }) {
  const { t } = useLang();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!club) return undefined;
    let cancelled = false;
    setStats(null);
    setError("");
    api
      .get(`/leader/clubs/${club._id}/stats`)
      .then((res) => !cancelled && setStats(res.data.stats))
      .catch((err) => !cancelled && setError(getErrorMessage(err, t("Couldn't load the club stats"))));
    return () => {
      cancelled = true;
    };
  }, [club]);

  const joined = stats?.newMembers;
  const diff = joined ? joined.current - joined.previous : 0;

  return (
    <Modal isOpen={!!club} onClose={onClose} title={t("Stats — {name}", { name: club?.name || "" })} size="lg">
      {error ? (
        <p role="alert" className="font-medium text-rose-700 dark:text-rose-400">{error}</p>
      ) : !stats ? (
        <div className="flex justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Tile label={t("Members")} value={stats.members} />
            <Tile
              label={t("Joined in the last 30 days")}
              value={joined.current}
              note={diff === 0 ? t("same as the 30 days before") : diff > 0 ? t("{n} more than the 30 days before", { n: diff }) : t("{n} fewer than the 30 days before", { n: -diff })}
            />
            <Tile label={t("Upcoming events")} value={stats.upcomingEvents} />
            <Tile label={t("Events held")} value={stats.pastEvents} />
            <Tile label={t("Turnout")} value={dash(stats.attendance.attendanceRate, "%")} note={t("{a} of {r} registered students showed up", { a: stats.attendance.attended, r: stats.attendance.registered })} />
            <Tile label={t("Average rating")} value={stats.attendance.averageRating ? `${stats.attendance.averageRating} / 5` : "—"} note={stats.attendance.ratingCount ? t("{n} ratings", { n: stats.attendance.ratingCount }) : t("No ratings yet")} />
          </div>

          {stats.recent.length > 0 && (
            <section aria-labelledby="club-stats-recent">
              <h3 id="club-stats-recent" className="mb-2 font-display text-base font-semibold text-slate-800 dark:text-slate-100">{t("Latest events")}</h3>
              <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {stats.recent.map((e) => (
                  <li key={e._id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="min-w-0 break-words font-medium text-slate-800 dark:text-slate-100">{e.title}</span>
                    <span className="shrink-0 text-slate-600 dark:text-slate-300">
                      {formatDate(e.date)} · {dash(e.attendanceRate, "%")} · {e.attended}/{e.registered}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
