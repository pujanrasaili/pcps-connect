import { pluralize } from "../utils/plural";
import { changeLabel } from "../utils/weekSummary";

// Admin overview: what happened in the last 7 days compared with the week
// before. Renders nothing until the data has loaded (or if it fails).
export default function WeekSummaryCard({ week }) {
  if (!week?.newStudents || !week.registrations) return null;
  const items = [
    { label: "New students", value: week.newStudents.current, note: changeLabel(week.newStudents) },
    { label: "New registrations", value: week.registrations.current, note: changeLabel(week.registrations) },
    {
      label: "Events in the next 7 days",
      value: week.upcomingEvents,
      note: week.upcomingEvents === 0 ? "Nothing scheduled" : pluralize(week.upcomingEvents, "event") + " coming up",
    },
  ];
  return (
    <section className="card-surface p-5" aria-label="Last 7 days">
      <h2 className="font-semibold text-slate-800 dark:text-slate-100">Last 7 days</h2>
      <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map((it) => (
          <div key={it.label}>
            <dt className="text-sm text-slate-500 dark:text-slate-400">{it.label}</dt>
            <dd className="mt-0.5 text-2xl font-bold text-slate-800 dark:text-slate-100">{it.value}</dd>
            <dd className="text-xs text-slate-500 dark:text-slate-400">{it.note}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
