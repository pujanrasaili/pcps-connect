import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FaTimes, FaList, FaRegCalendarAlt } from "react-icons/fa";
import EventCard from "../components/EventCard";
import SearchBar from "../components/SearchBar";
import FilterButtons from "../components/FilterButtons";
import Reveal from "../components/Reveal";
import { useEvents } from "../context/EventsContext";
import { useAuth } from "../context/AuthContext";
import { useRegistrations } from "../context/RegistrationContext";
import { useDebounce } from "../hooks/useDebounce";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/Pagination";
import EventCalendar from "../components/EventCalendar";
import { isPastEvent } from "../utils/formatDate";
import { hasOpenSpots, readEventFilters, withEventFilters } from "../utils/eventFilters";

const PAGE_SIZE = 9;

export default function Events() {
  const { events, loading, error } = useEvents();
  const { isAuthenticated } = useAuth();
  const { registrations } = useRegistrations();
  const registeredIds = useMemo(
    () => new Set(isAuthenticated ? registrations.map((r) => r.event?._id).filter(Boolean) : []),
    [registrations, isAuthenticated]
  );
  // Every filter lives in the URL (?when=&category=&q=&open=&club=) so a
  // filtered list can be shared and the back button behaves.
  const [searchParams, setSearchParams] = useSearchParams();
  const { when, category, openOnly, club: clubFilter, query: urlQuery, view } = readEventFilters(searchParams, { isAuthenticated });
  const update = (patch) => setSearchParams((prev) => withEventFilters(prev, patch), { replace: true });
  const setWhen = (value) => update({ when: value });
  const setCategory = (value) => update({ category: value });

  // The search box types into local state (instant) and is copied into the URL
  // once typing pauses.
  const [query, setQuery] = useState(urlQuery);
  const debouncedQuery = useDebounce(query, 250);
  useEffect(() => {
    if (debouncedQuery !== urlQuery) update({ q: debouncedQuery });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const clubFilterName = useMemo(
    () => events.find((e) => e.club?._id === clubFilter)?.club?.name,
    [events, clubFilter]
  );
  const clearClubFilter = () => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete("club"); return n; }, { replace: true });

  const categories = useMemo(
    () => ["All", ...new Set(events.map((e) => e.category).filter(Boolean))],
    [events]
  );

  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => {
        const isPast = isPastEvent(event.date);
        // "mine" = everything the student registered for, past or upcoming.
        const matchesWhen = when === "mine" ? registeredIds.has(event._id) : when === "upcoming" ? !isPast : isPast;
        const matchesCategory = category === "All" || event.category === category;
        const matchesClub = !clubFilter || event.club?._id === clubFilter;
        const matchesSpots = !openOnly || hasOpenSpots(event);
        // Search the fields students actually think in: the event name, where
        // it is, and which club is hosting it.
        const needle = debouncedQuery.toLowerCase();
        const matchesQuery = [event.title, event.location, event.club?.name]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(needle));
        return matchesWhen && matchesCategory && matchesQuery && matchesClub && matchesSpots;
      })
      .sort((a, b) => {
        const pastA = isPastEvent(a.date);
        const pastB = isPastEvent(b.date);
        // "Registered" lists what's coming first (soonest first), then what's done (latest first).
        if (when === "mine" && pastA !== pastB) return pastA ? 1 : -1;
        const newestFirst = when === "past" || (when === "mine" && pastA);
        return newestFirst ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date);
      });
  }, [events, debouncedQuery, category, when, clubFilter, registeredIds, openOnly]);

  // The calendar shows every month, so it ignores the Upcoming/Past/Registered
  // tabs but keeps the category, search, club and spots-left filters.
  const calendarEvents = useMemo(() => {
    const needle = debouncedQuery.toLowerCase();
    return events.filter(
      (event) =>
        (category === "All" || event.category === category) &&
        (!clubFilter || event.club?._id === clubFilter) &&
        (!openOnly || hasOpenSpots(event)) &&
        [event.title, event.location, event.club?.name].filter(Boolean).some((field) => field.toLowerCase().includes(needle))
    );
  }, [events, debouncedQuery, category, clubFilter, openOnly]);

  const { page, setPage, totalPages, pageItems: pagedEvents } = usePagination(filteredEvents, PAGE_SIZE);

  return (
    <div className="section-y">
      <div className="container-page">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-accent-600 dark:text-accent-400">
            What's Happening
          </span>
          <h1 className="mt-1 font-display text-3xl font-bold text-slate-800 dark:text-slate-100 sm:text-4xl">
            Events
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-500 dark:text-slate-400">
            Workshops, contests, and seminars hosted by PCPS clubs — register
            in a couple of clicks.
          </p>
        </div>

        <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-3">
          {view === "list" && (
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {[
              ["upcoming", "Upcoming"],
              ["past", "Past"],
              ...(isAuthenticated ? [["mine", "Registered"]] : []),
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setWhen(value)}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                  when === value
                    ? "bg-white text-primary-600 shadow-sm dark:bg-slate-900 dark:text-primary-300"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          )}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="View">
            {[
              ["list", "List", FaList],
              ["calendar", "Calendar", FaRegCalendarAlt],
            ].map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => update({ view: value })}
                aria-pressed={view === value}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  view === value
                    ? "bg-white text-primary-600 shadow-sm dark:bg-slate-900 dark:text-primary-300"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <Icon className="text-xs" /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-5 flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="sm:w-80">
            <SearchBar value={query} onChange={setQuery} placeholder="Search by name, place or club..." />
          </div>
          <FilterButtons options={categories} active={category} onChange={setCategory} />
        </div>

        <div className="mx-auto mt-4 flex max-w-4xl">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(e) => update({ open: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            Only events with spots left
          </label>
        </div>

        {clubFilter && (
          <div className="mx-auto mt-4 flex max-w-4xl">
            <button
              onClick={clearClubFilter}
              className="flex items-center gap-2 rounded-full bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300"
            >
              Events from {clubFilterName || "this club"} <FaTimes className="text-xs" aria-label="Clear club filter" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="mt-16 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="mt-16 text-center text-rose-500">
            <p className="font-medium">Couldn't load events.</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{error}</p>
          </div>
        ) : view === "calendar" ? (
          <div className="mt-10">
            <EventCalendar events={calendarEvents} registeredIds={registeredIds} />
          </div>
        ) : filteredEvents.length > 0 ? (
          <>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pagedEvents.map((event, i) => (
                <Reveal key={event._id} delay={(i % 6) * 80}>
                  <EventCard event={event} />
                </Reveal>
              ))}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : (
          <div className="mt-16 text-center text-slate-500 dark:text-slate-400">
            <p className="text-lg font-medium">
              {when === "mine"
                ? "You haven't registered for any matching events."
                : when === "upcoming"
                  ? "No upcoming events match your search."
                  : "No past events match your search."}
            </p>
            <p className="mt-1 text-sm">Try a different name or category.</p>
            {(query || category !== "All" || openOnly) && (
              <button
                onClick={() => {
                  setQuery("");
                  update({ q: "", category: "All", open: false });
                }}
                className="mt-3 text-sm font-semibold text-primary-600 hover:underline dark:text-primary-300"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
