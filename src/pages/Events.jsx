import { useMemo, useState } from "react";
import EventCard from "../components/EventCard";
import SearchBar from "../components/SearchBar";
import FilterButtons from "../components/FilterButtons";
import Reveal from "../components/Reveal";
import { events, eventCategories } from "../data/events";
import { useDebounce } from "../hooks/useDebounce";

export default function Events() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const debouncedQuery = useDebounce(query, 250);

  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => {
        const matchesCategory = category === "All" || event.category === category;
        const matchesQuery = event.title
          .toLowerCase()
          .includes(debouncedQuery.toLowerCase());
        return matchesCategory && matchesQuery;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [debouncedQuery, category]);

  return (
    <div className="section-y">
      <div className="container-page">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-accent-500">
            What's Happening
          </span>
          <h1 className="mt-1 font-display text-3xl font-bold text-slate-800 dark:text-slate-100 sm:text-4xl">
            Upcoming Events
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-500 dark:text-slate-400">
            Workshops, contests, and seminars hosted by PCPS clubs — register
            in a couple of clicks.
          </p>
        </div>

        <div className="mx-auto mt-8 flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="sm:w-80">
            <SearchBar value={query} onChange={setQuery} placeholder="Search events..." />
          </div>
          <FilterButtons options={eventCategories} active={category} onChange={setCategory} />
        </div>

        {filteredEvents.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event, i) => (
              <Reveal key={event.id} delay={(i % 6) * 80}>
                <EventCard event={event} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-16 text-center text-slate-500 dark:text-slate-400">
            <p className="text-lg font-medium">No events match your search.</p>
            <p className="mt-1 text-sm">Try a different name or category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
