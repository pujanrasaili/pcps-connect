import { useState } from "react";
import { Link } from "react-router-dom";
import { FaSearch, FaUsers, FaCalendarAlt } from "react-icons/fa";
import Modal from "./Modal";
import { useEvents } from "../context/EventsContext";
import { useClubs } from "../context/ClubsContext";
import { searchSite } from "../utils/siteSearch";
import { formatDate } from "../utils/formatDate";

// One search box for the whole site: clubs and events that match what you type.
export default function SearchDialog({ isOpen, onClose }) {
  const { events } = useEvents();
  const { clubs } = useClubs();
  const [query, setQuery] = useState("");
  const results = searchSite(events, clubs, query);
  const hasQuery = query.trim().length > 0;
  const nothing = hasQuery && results.clubs.length === 0 && results.events.length === 0;

  const close = () => {
    setQuery("");
    onClose();
  };

  const linkClass =
    "-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50";

  return (
    <Modal isOpen={isOpen} onClose={close} title="Search clubs and events">
      <label className="label-field" htmlFor="site-search">What are you looking for?</label>
      <div className="relative">
        <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" aria-hidden="true" />
        <input
          data-autofocus
          id="site-search"
          type="search"
          autoComplete="off"
          className="input-field"
          style={{ paddingLeft: "2.75rem" }}
          placeholder="A club, event, place or topic"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div aria-live="polite" className="mt-4">
        {!hasQuery && <p className="text-sm text-slate-500 dark:text-slate-400">Type to search every club and event.</p>}
        {nothing && <p className="text-sm text-slate-500 dark:text-slate-400">Nothing matches &ldquo;{query.trim()}&rdquo;. Try a shorter word.</p>}

        {results.clubs.length > 0 && (
          <section aria-label="Clubs">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Clubs</h3>
            <ul>
              {results.clubs.map((club) => (
                <li key={club._id}>
                  <Link to={`/clubs?club=${club._id}`} onClick={close} className={linkClass}>
                    <FaUsers className="shrink-0 text-primary-500" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800 dark:text-slate-100">{club.name}</span>
                      {club.category && <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{club.category}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {results.events.length > 0 && (
          <section aria-label="Events" className={results.clubs.length > 0 ? "mt-4" : ""}>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Events</h3>
            <ul>
              {results.events.map((event) => (
                <li key={event._id}>
                  <Link to={`/events/${event._id}`} onClick={close} className={linkClass}>
                    <FaCalendarAlt className="shrink-0 text-primary-500" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800 dark:text-slate-100">{event.title}</span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(event.date)}
                        {event.club?.name ? ` · ${event.club.name}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
}
