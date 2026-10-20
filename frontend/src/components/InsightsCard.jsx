import { pluralize } from "../utils/plural";

// Admin overview trends: registrations per month, most popular clubs and
// overall turnout. Plain CSS bars (no chart library) with a text summary for
// screen readers; renders nothing until the data has loaded.
export default function InsightsCard({ insights }) {
  if (!insights) return null;
  const { registrationsByMonth = [], topClubs = [], attendance } = insights;
  const maxMonth = Math.max(1, ...registrationsByMonth.map((m) => m.count));
  const maxMembers = Math.max(1, ...topClubs.map((c) => c.members));
  const totalRegs = registrationsByMonth.reduce((sum, m) => sum + m.count, 0);

  return (
    <div className="card-surface p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Insights</h2>
        {attendance?.rate != null && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Overall turnout at past events:{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-100">{attendance.rate}%</span>{" "}
            ({attendance.attended} of {attendance.registered})
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section aria-label="Registrations per month">
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">Registrations, last 6 months</h3>
          {totalRegs === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No registrations yet in this period.</p>
          ) : (
            <>
              <ol className="mt-4 flex h-36 items-end gap-3" aria-hidden="true">
                {registrationsByMonth.map((m) => (
                  <li key={m.month} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center">
                    <span className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">{m.count}</span>
                    <span
                      className="w-full rounded-t-md bg-primary-500 dark:bg-primary-400"
                      style={{ height: `${Math.max(m.count ? 4 : 0, (m.count / maxMonth) * 100)}%` }}
                    />
                    <span className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{m.label}</span>
                  </li>
                ))}
              </ol>
              <p className="sr-only">
                {registrationsByMonth.map((m) => `${m.label}: ${pluralize(m.count, "registration")}`).join(". ")}
              </p>
            </>
          )}
        </section>

        <section aria-label="Most popular clubs">
          <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">Most popular clubs</h3>
          {topClubs.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No one has joined a club yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {topClubs.map((c) => (
                <li key={c._id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">{c.name}</span>
                    <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{pluralize(c.members, "member")}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                    <div className="h-full rounded-full bg-accent-500 dark:bg-accent-400" style={{ width: `${(c.members / maxMembers) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
