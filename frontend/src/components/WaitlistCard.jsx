import { Link } from "react-router-dom";
import { FaHourglassHalf } from "react-icons/fa";
import { formatDateAndTime } from "../utils/formatDate";
import { queueLabel } from "../utils/waitlistLabel";

// Dashboard card: the full events the student is queued for, and where they
// stand. Renders nothing when they're on no waitlists. If a seat opens, the
// next student in line is registered automatically and emailed.
export default function WaitlistCard({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="card-surface min-w-0 p-5">
      <div className="mb-1 flex items-center gap-2">
        <FaHourglassHalf className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">On the waitlist</h2>
      </div>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        If a seat opens up you're registered automatically, and we email you.
      </p>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map(({ event, position }) => (
          <li key={event._id}>
            <Link
              to={`/events/${event._id}`}
              className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <span className="min-w-0">
                <span className="block truncate text-slate-700 dark:text-slate-200">{event.title}</span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{formatDateAndTime(event.date)}</span>
              </span>
              <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                {queueLabel(position)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
