import { Link } from "react-router-dom";
import { FaHandsHelping } from "react-icons/fa";
import { formatDateAndTime } from "../utils/formatDate";
import { useLang } from "../context/LanguageContext";

// Dashboard card: the upcoming events the student signed up to help at, and
// their role. Renders nothing when there are none.
export default function VolunteeringCard({ items }) {
  const { t } = useLang();
  if (!items || items.length === 0) return null;
  return (
    <div className="card-surface min-w-0 p-5">
      <div className="mb-3 flex items-center gap-2">
        <FaHandsHelping className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t("You're helping at")}</h2>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map(({ event, role }) => (
          <li key={event._id}>
            <Link
              to={`/events/${event._id}`}
              className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <span className="min-w-0">
                <span className="block truncate text-slate-700 dark:text-slate-200">{event.title}</span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{formatDateAndTime(event.date)}</span>
              </span>
              {role && (
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                  {role}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
