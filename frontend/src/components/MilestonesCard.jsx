import { FaCheck, FaLock } from "react-icons/fa";
import { buildMilestones } from "../utils/milestones";

// A friendly row of goals on the profile. Earned ones are highlighted; the
// rest show progress ("2 of 5") so there is always a clear next step. State is
// written in words as well as colour, so it doesn't rely on colour alone.
export default function MilestonesCard({ registrations, clubCount }) {
  const milestones = buildMilestones(registrations, clubCount);
  const earned = milestones.filter((m) => m.earned).length;

  return (
    <div className="card-surface p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">Milestones</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {earned} of {milestones.length} earned
        </p>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {milestones.map((m) => (
          <li
            key={m.id}
            className={`flex items-start gap-3 rounded-xl border p-3 ${
              m.earned
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"
            }`}
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                m.earned
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
              }`}
            >
              {m.earned ? <FaCheck /> : <FaLock />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{m.title}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">{m.description}</p>
              <p
                className={`mt-1 text-xs font-medium ${
                  m.earned ? "text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-300"
                }`}
              >
                {m.earned ? "Earned" : `${m.current} of ${m.target}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
