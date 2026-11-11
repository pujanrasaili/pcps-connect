import { useLang } from "../context/LanguageContext";

// Grey placeholder cards shown while events or clubs load, like the shapes a native
// app draws before its content arrives. They hold the same grid as the real cards,
// so the page does not jump when the data comes in, and they feel faster than a
// lone spinner (the first load can be slow while the server wakes up).
export default function CardSkeletons({ label, count = 6 }) {
  const { t } = useLang();
  return (
    <div role="status" aria-busy="true" className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">{t(label)}</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden="true" className="card-surface overflow-hidden motion-safe:animate-pulse">
          <div className="h-44 bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800/70" />
            <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800/70" />
            <div className="h-9 w-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
