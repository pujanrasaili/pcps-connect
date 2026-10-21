import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { buildMonthGrid, dayKey, shiftMonth, WEEKDAYS } from "../utils/monthGrid";
import { pluralize } from "../utils/plural";
import { isPastEvent } from "../utils/formatDate";

const monthTitle = (year, month) => new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
const timeOf = (date) => new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

// Month view of the events list: a day with events can be selected to see them
// underneath. `registeredIds` marks events the student already signed up for.
export default function EventCalendar({ events, registeredIds }) {
  const today = new Date();
  const [{ year, month }, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedKey, setSelectedKey] = useState(dayKey(today));

  const weeks = useMemo(() => buildMonthGrid(year, month, events), [year, month, events]);
  const selectedCell = weeks.flat().find((c) => c.key === selectedKey);
  const selectedEvents = selectedCell?.events || [];
  const monthCount = weeks.flat().filter((c) => c.inMonth).reduce((n, c) => n + c.events.length, 0);
  const todayKey = dayKey(today);

  const go = (offset) => {
    const next = shiftMonth(year, month, offset);
    setView(next);
    setSelectedKey(dayKey(new Date(next.year, next.month, 1)));
  };
  const goToday = () => {
    setView({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedKey(todayKey);
  };

  return (
    <div className="mx-auto mt-8 max-w-4xl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100" aria-live="polite">
          {monthTitle(year, month)}
          <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">{pluralize(monthCount, "event")}</span>
        </h2>
        <div className="flex items-center gap-1.5">
          <button onClick={goToday} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-primary-600 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-900/20">
            Today
          </button>
          <button onClick={() => go(-1)} aria-label="Previous month" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50">
            <FaChevronLeft className="text-xs" />
          </button>
          <button onClick={() => go(1)} aria-label="Next month" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50">
            <FaChevronRight className="text-xs" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, i) => (
          <div key={i} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0 dark:border-slate-800">
            {week.map((cell) => {
              const isToday = cell.key === todayKey;
              const selected = cell.key === selectedKey;
              return (
                <button
                  key={cell.key}
                  onClick={() => setSelectedKey(cell.key)}
                  aria-pressed={selected}
                  className={`flex min-h-[3.5rem] min-w-0 flex-col items-stretch gap-1 border-r border-slate-100 p-1 text-left last:border-r-0 sm:min-h-[6rem] sm:p-1.5 dark:border-slate-800 ${
                    selected ? "bg-primary-50 dark:bg-primary-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  } ${cell.inMonth ? "" : "bg-slate-50/70 dark:bg-slate-950/40"}`}
                >
                  <span className="sr-only">
                    {`${cell.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}, ${pluralize(cell.events.length, "event")}`}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      isToday ? "bg-primary-600 text-white" : cell.inMonth ? "text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {cell.day}
                  </span>
                  {/* Phones: one dot per event. Wider screens: the first two titles. */}
                  <span className="flex flex-wrap gap-0.5 sm:hidden" aria-hidden="true">
                    {cell.events.slice(0, 4).map((e) => (
                      <span key={e._id} className={`h-1.5 w-1.5 rounded-full ${chipDot(e, registeredIds)}`} />
                    ))}
                  </span>
                  <span className="hidden min-w-0 flex-col gap-0.5 sm:flex" aria-hidden="true">
                    {cell.events.slice(0, 2).map((e) => (
                      <span key={e._id} className={`truncate rounded px-1 py-0.5 text-[11px] font-medium ${chipClass(e, registeredIds)}`}>
                        {e.title}
                      </span>
                    ))}
                    {cell.events.length > 2 && (
                      <span className="px-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">+{cell.events.length - 2} more</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-5" aria-live="polite">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
          {selectedCell
            ? selectedCell.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
            : monthTitle(year, month)}
        </h3>
        {selectedEvents.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No events on this day.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {selectedEvents.map((e) => (
              <li key={e._id}>
                <Link to={`/events/${e._id}`} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800 dark:text-slate-100">{e.title}</span>
                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                      {timeOf(e.date)} · {e.location}
                      {e.club?.name ? ` · ${e.club.name}` : ""}
                    </span>
                  </span>
                  {registeredIds.has(e._id) ? (
                    <span className="shrink-0 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Registered</span>
                  ) : isPastEvent(e.date) ? (
                    <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">Past</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Registered = green, past = grey, upcoming = indigo.
function chipClass(event, registeredIds) {
  if (registeredIds.has(event._id)) return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200";
  if (isPastEvent(event.date)) return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  return "bg-primary-100 text-primary-900 dark:bg-primary-900/40 dark:text-primary-100";
}
function chipDot(event, registeredIds) {
  if (registeredIds.has(event._id)) return "bg-emerald-600";
  if (isPastEvent(event.date)) return "bg-slate-400";
  return "bg-primary-600";
}
