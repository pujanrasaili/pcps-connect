import { pluralize } from "../utils/plural";

// Plain CSS bars for the student dashboard (no chart library, so the page
// loads fast on mobile data). Each chart carries a text summary for screen
// readers.

const COLORS = ["bg-primary-500", "bg-violet-500", "bg-pink-500", "bg-amber-500", "bg-emerald-500"];

// Vertical columns, one per month: [{ month, count }].
export function MonthBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <>
      <ol className="flex h-full items-end gap-3 pt-2" aria-hidden="true">
        {data.map((d) => (
          <li key={d.month} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center">
            <span className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">{d.count}</span>
            <span
              className="w-full rounded-t-md bg-primary-500 dark:bg-primary-400"
              style={{ height: `${Math.max(4, (d.count / max) * 80)}%` }}
            />
            <span className="mt-1.5 truncate text-xs text-slate-500 dark:text-slate-400">{d.month}</span>
          </li>
        ))}
      </ol>
      <p className="sr-only">{data.map((d) => `${d.month}: ${pluralize(d.count, "event")}`).join(". ")}</p>
    </>
  );
}

// Horizontal bars, one per category: [{ name, value }].
export function CategoryBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="flex h-full flex-col justify-center gap-3 overflow-y-auto">
      {data.map((d, i) => (
        <li key={d.name}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">{d.name}</span>
            <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{pluralize(d.value, "event")}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
            <div className={`h-full rounded-full ${COLORS[i % COLORS.length]}`} style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
