import { useMemo, useState } from "react";
import EventCard from "../components/EventCard";
import SearchBar from "../components/SearchBar";
import FilterButtons from "../components/FilterButtons";
import Reveal from "../components/Reveal";
import { useEvents } from "../context/EventsContext";
import { useDebounce } from "../hooks/useDebounce";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 9;

export default function Events() {
  const { events, loading, error } = useEvents();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [when, setWhen] = useState("upcoming");
  const debouncedQuery = useDebounce(query, 250);

  const categories = useMemo(
    () => ["All", ...new Set(events.map((e) => e.category).filter(Boolean))],
    [events]
  );

  const filteredEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((event) => {
        const isPast = new Date(event.date) < now;
        const matchesWhen = when === "upcoming" ? !isPast : isPast;
        const matchesCategory = category === "All" || event.category === category;
        const matchesQuery = event.title
          .toLowerCase()
          .includes(debouncedQuery.toLowerCase());
        return matchesWhen && matchesCategory && matchesQuery;
      })
      .sort((a, b) =>
        when === "upcoming" ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date)
      );
  }, [events, debouncedQuery, category, when]);

  const { page, setPage, totalPages, pageItems: pagedEvents } = usePagination(filteredEvents, PAGE_SIZE);

  return (
    <div className="section-y">
      <div className="container-page">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-accent-500">
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

        <div className="mx-auto mt-8 flex max-w-4xl justify-center">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {[
              ["upcoming", "Upcoming"],
              ["past", "Past"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setWhen(value)}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                  when === value
                    ? "bg-white text-primary-600 shadow-sm dark:bg-slate-900 dark:text-primary-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-5 flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="sm:w-80">
            <SearchBar value={query} onChange={setQuery} placeholder="Search events..." />
          </div>
          <FilterButtons options={categories} active={category} onChange={setCategory} />
        </div>

        {loading ? (
          <div className="mt-16 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="mt-16 text-center text-rose-500">
            <p className="font-medium">Couldn't load events.</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{error}</p>
          </div>
        ) : filteredEvents.length > 0 ? (
          <>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              {when === "upcoming" ? "No upcoming events match your search." : "No past events match your search."}
            </p>
            <p className="mt-1 text-sm">Try a different name or category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
