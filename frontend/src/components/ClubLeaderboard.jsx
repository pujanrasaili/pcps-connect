import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaTrophy } from "react-icons/fa";
import { api } from "../services/api";
import { sharedRequest } from "../utils/sharedRequest";
import { useLang } from "../context/LanguageContext";

const MEDAL = ["bg-amber-100 text-amber-800", "bg-slate-200 text-slate-800", "bg-orange-100 text-orange-800"];

// The five most active clubs of the last 90 days. A club that opens from here goes to
// /clubs?club=<id>, the same link the club cards use. Shows nothing until there is
// something to rank, or if the request fails.
export default function ClubLeaderboard() {
  const { t } = useLang();
  const [data, setData] = useState(null);

  useEffect(() => {
    let live = true;
    sharedRequest("club-leaderboard", () => api.get("/stats/clubs"))
      .then((res) => live && setData(res.data))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const rows = data?.leaderboard || [];
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="club-leaderboard-title" className="card-surface mx-auto mt-14 max-w-2xl p-6">
      <div className="flex items-center gap-2">
        <FaTrophy aria-hidden="true" className="text-amber-500" />
        <h2 id="club-leaderboard-title" className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
          {t("Most active clubs")}
        </h2>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("Ranked by events held in the last {days} days.", { days: data.days })}</p>
      <ol className="mt-4 space-y-1">
        {rows.map((club, index) => (
          <li key={club._id}>
            <Link
              to={`/clubs?club=${club._id}`}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${MEDAL[index] || "bg-slate-100 text-slate-600"}`}>
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-800 dark:text-slate-100">{club.name}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {club.eventsHeld === 1 ? t("{n} event", { n: 1 }) : t("{n} events", { n: club.eventsHeld })}
                  {" · "}
                  {club.members === 1 ? t("{n} member", { n: 1 }) : t("{n} members", { n: club.members })}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
