import { Stars } from "./StarRating";

// Turnout and ratings for the most recent past events (admins: everything;
// club leaders: only their own clubs -- the server decides). `report` is the
// /admin/attendance-report payload; renders nothing until there's data.
export default function AttendanceReportCard({ report }) {
  if (!report || report.events.length === 0) return null;
  return (
  <div className="card-surface p-5">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Attendance &amp; feedback</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Last {report.events.length} past event{report.events.length > 1 ? "s" : ""}
              </p>
            </div>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
              {report.totals.attendanceRate === null
                ? "No registrations yet."
                : `${report.totals.attended} of ${report.totals.registered} registered students showed up (${report.totals.attendanceRate}%)`}
              {report.totals.averageRating !== null && (
                <span className="ml-2 inline-flex items-center gap-1.5">
                  · <Stars value={Math.round(report.totals.averageRating)} className="text-xs" />
                  <span className="font-semibold">{report.totals.averageRating.toFixed(1)}</span>
                </span>
              )}
            </p>
            <ul className="space-y-3">
              {report.events.map((e) => (
                <li key={e._id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">{e.title}</span>
                    <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                      {e.attendanceRate === null ? "No registrations" : `${e.attended}/${e.registered} · ${e.attendanceRate}%`}
                      {e.averageRating !== null && ` · ★ ${e.averageRating.toFixed(1)}`}
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                    role="img"
                    aria-label={`${e.title}: ${e.attendanceRate ?? 0}% attended`}
                  >
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${e.attendanceRate ?? 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
  );
}
