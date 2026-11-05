import { useLang } from "../context/LanguageContext";

// Admin overview: what happened in the last 7 days compared with the week
// before. Renders nothing until the data has loaded (or if it fails).
export default function WeekSummaryCard({ week }) {
  const { t } = useLang();
  if (!week?.newStudents || !week.registrations) return null;
  // Same wording as utils/weekSummary.changeLabel, in the chosen language.
  const change = (x) => {
    if (x.change == null) return x.current > 0 ? t("None the week before") : t("None in either week");
    if (x.change === 0) return t("Same as the week before");
    return t(x.change > 0 ? "Up {pct}% from {prev} the week before" : "Down {pct}% from {prev} the week before", { pct: Math.abs(x.change), prev: x.previous });
  };
  const items = [
    { label: t("New students"), value: week.newStudents.current, note: change(week.newStudents) },
    { label: t("New registrations"), value: week.registrations.current, note: change(week.registrations) },
    {
      label: t("Events in the next 7 days"),
      value: week.upcomingEvents,
      note: week.upcomingEvents === 0 ? t("Nothing scheduled") : t(week.upcomingEvents === 1 ? "{n} event coming up" : "{n} events coming up", { n: week.upcomingEvents }),
    },
  ];
  return (
    <section className="card-surface p-5" aria-label={t("Last 7 days")}>
      <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t("Last 7 days")}</h2>
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
