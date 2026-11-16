// The "nothing here" block used when a list has no matches: a soft round icon,
// a headline, a hint, and optionally a button. Kept in one place so every list
// looks the same.
export default function EmptyState({ icon: Icon, title, hint, actionLabel, onAction }) {
  return (
    <div className="mt-14 flex flex-col items-center text-center">
      <span
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-xl text-primary-600 dark:bg-primary-900/30 dark:text-primary-300"
      >
        <Icon />
      </span>
      <p className="mt-4 text-lg font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
      {actionLabel && (
        <button type="button" onClick={onAction} className="btn-secondary mt-4 text-sm">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
