import { Link } from "react-router-dom";
import { FaRegEdit } from "react-icons/fa";
import { formatDateAndTime } from "../utils/formatDate";
import { useLang } from "../context/LanguageContext";

// Dashboard card: upcoming events where the organisers added a required
// question after the student signed up. Renders nothing when none are waiting.
export default function AnswersNeededCard({ events }) {
  const { t } = useLang();
  if (!events || events.length === 0) return null;
  return (
    <div className="card-surface min-w-0 p-5" data-testid="answers-needed">
      <div className="mb-1 flex items-center gap-2">
        <FaRegEdit className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t("Answers needed")}</h2>
      </div>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        {t("The organisers added a question after you signed up. Open the event to answer it.")}
      </p>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {events.map((event) => (
          <li key={event._id}>
            <Link
              to={`/events/${event._id}`}
              className="-mx-2 block rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <span className="block truncate text-slate-700 dark:text-slate-200">{event.title}</span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{formatDateAndTime(event.date)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
