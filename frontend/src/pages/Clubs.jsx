import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FaEnvelope, FaCalendarAlt, FaHeart, FaRegHeart, FaCheck, FaPlus, FaArrowRight, FaShareAlt, FaUsers } from "react-icons/fa";
import ClubCard from "../components/ClubCard";
import SearchBar from "../components/SearchBar";
import FilterButtons from "../components/FilterButtons";
import Modal from "../components/Modal";
import Reveal from "../components/Reveal";
import { useClubs } from "../context/ClubsContext";
import { useEvents } from "../context/EventsContext";
import { formatDate, isUpcoming } from "../utils/formatDate";
import { useDebounce } from "../hooks/useDebounce";
import { useClubMembership } from "../context/ClubMembershipContext";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { resolveUploadUrl } from "../services/api";
import { usePagination } from "../hooks/usePagination";
import { pluralize } from "../utils/plural";
import Pagination from "../components/Pagination";
import { useToast } from "../context/ToastContext";
import { shareClub } from "../utils/share";
import { CLUB_SORTS, filterClubs, sortClubs } from "../utils/clubFilters";
import { useAuth } from "../context/AuthContext";
import { useLedClubs } from "../hooks/useLedClubs";
import ClubNews from "../components/ClubNews";

const PAGE_SIZE = 9;

export default function Clubs() {
  const { clubs, loading, error } = useClubs();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  // The open club lives in the URL (?club=<id>) so a club can be linked to and
  // shared, and the browser's Back button closes the window.
  const clubId = params.get("club");
  const selectedClub = useMemo(() => clubs.find((c) => c._id === clubId) || null, [clubs, clubId]);
  const setSelectedClub = (club) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (club) next.set("club", club._id);
      else next.delete("club");
      return next;
    });

  useEffect(() => {
    if (!selectedClub) return;
    const previous = document.title;
    document.title = `${selectedClub.name} | PCPS Connect`;
    return () => {
      document.title = previous.startsWith(selectedClub.name) ? "Clubs | PCPS Connect" : previous;
    };
  }, [selectedClub]);

  const handleShare = async () => {
    try {
      const result = await shareClub(selectedClub);
      if (result === "copied") toast.success("Link copied to clipboard.");
    } catch {
      toast.error("Couldn't share this club. Copy the link from your address bar instead.");
    }
  };
  const { events } = useEvents();
  // The next few events this club is hosting, shown in its details window.
  const clubEvents = useMemo(
    () =>
      selectedClub
        ? events
            .filter((e) => (e.club?._id || e.club) === selectedClub._id && isUpcoming(e.date))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
        : [],
    [events, selectedClub]
  );
  // Search and category live in the URL too (?q=&category=) so a filtered list
  // can be shared. The club window (?club=) is kept when they change.
  const category = params.get("category") || "All";
  const urlQuery = params.get("q") || "";
  const setFilter = (key, value, fallback = "") =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value || value === fallback) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true }
    );
  const setCategory = (value) => setFilter("category", value, "All");
  const { isAuthenticated, user } = useAuth();
  // Admins can post on any club; a leader only on the clubs they lead.
  const { clubs: ledClubs } = useLedClubs();
  const canPostNews = (id) => user?.role === "admin" || ledClubs.some((c) => c._id === id);
  // "Only my clubs" needs a login, so the link is ignored for visitors.
  const mineOnly = isAuthenticated && params.get("mine") === "1";
  const sortParam = params.get("sort");
  const sort = CLUB_SORTS.some(([value]) => value === sortParam) ? sortParam : "default";
  const [query, setQuery] = useState(urlQuery);
  const debouncedQuery = useDebounce(query, 250);
  useEffect(() => {
    if (debouncedQuery !== urlQuery) setFilter("q", debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);
  const clearFilters = () => {
    setQuery("");
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("q");
      next.delete("category");
      next.delete("mine");
      return next;
    }, { replace: true });
  };
  const { isJoined, isFavorite, toggleJoin, toggleFavorite } = useClubMembership();
  const requireAuth = useRequireAuth();

  const categories = useMemo(
    () => ["All", ...new Set(clubs.map((c) => c.category).filter(Boolean))],
    [clubs]
  );

  const filteredClubs = useMemo(
    () => sortClubs(filterClubs(clubs, { category, query: debouncedQuery, mineOnly, isJoined }), sort),
    [clubs, debouncedQuery, category, mineOnly, isJoined, sort]
  );

  const { page, setPage, totalPages, pageItems: pagedClubs } = usePagination(filteredClubs, PAGE_SIZE);

  return (
    <div className="section-y">
      <div className="container-page">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-300">
            Student Life
          </span>
          <h1 className="mt-1 font-display text-3xl font-bold text-slate-800 dark:text-slate-100 sm:text-4xl">
            Explore PCPS Clubs
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-500 dark:text-slate-400">
            Find your community — from coding sprints to sports leagues and
            creative pursuits.
          </p>
        </div>

        <div className="mx-auto mt-8 flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="sm:w-80">
            <SearchBar value={query} onChange={setQuery} placeholder="Search by name, topic or category..." />
          </div>
          <FilterButtons options={categories} active={category} onChange={setCategory} />
        </div>

        <div className="mx-auto mt-4 flex max-w-4xl flex-wrap items-center justify-between gap-3">
          {isAuthenticated ? (
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={mineOnly}
                onChange={(e) => setFilter("mine", e.target.checked ? "1" : "")}
                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              Only clubs I've joined
            </label>
          ) : (
            <span />
          )}
          <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            Sort by
            <select
              value={sort}
              onChange={(e) => setFilter("sort", e.target.value, "default")}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {CLUB_SORTS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="mt-16 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="mt-16 text-center text-rose-700 dark:text-rose-400">
            <p className="font-medium">Couldn't load clubs.</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{error}</p>
          </div>
        ) : filteredClubs.length > 0 ? (
          <>
            <h2 className="sr-only">Club list</h2>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pagedClubs.map((club, i) => (
                <Reveal key={club._id} delay={(i % 6) * 80}>
                  <ClubCard club={club} onView={setSelectedClub} />
                </Reveal>
              ))}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : (
          <div className="mt-16 text-center text-slate-500 dark:text-slate-400">
            <p className="text-lg font-medium">
              {mineOnly && !query && category === "All" ? "You haven't joined any clubs yet." : "No clubs match your search."}
            </p>
            <p className="mt-1 text-sm">
              {mineOnly && !query && category === "All" ? "Untick the box to browse every club." : "Try a different name or category."}
            </p>
            {(query || category !== "All" || mineOnly) && (
              <button onClick={clearFilters} className="mt-3 text-sm font-semibold text-primary-600 hover:underline dark:text-primary-300">
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={!!selectedClub} onClose={() => setSelectedClub(null)} title={selectedClub?.name} size="lg">
        {selectedClub && (
          <div>
            <img src={resolveUploadUrl(selectedClub.image, 900)} alt="" className="mb-4 h-48 w-full rounded-xl object-cover" />
            <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
              {typeof selectedClub.memberCount === "number" && (
                <span className="flex items-center gap-1.5">
                  <FaUsers className="text-primary-500" /> {pluralize(selectedClub.memberCount, "member")}
                </span>
              )}
              {selectedClub.foundedYear && (
                <span className="flex items-center gap-1.5">
                  <FaCalendarAlt className="text-primary-500" /> Founded {selectedClub.foundedYear}
                </span>
              )}
              {selectedClub.email && (
                <span className="flex items-center gap-1.5">
                  <FaEnvelope className="text-primary-500" /> {selectedClub.email}
                </span>
              )}
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
              {selectedClub.longDescription || selectedClub.description}
            </p>
            {selectedClub.activities?.length > 0 && (
              <>
                <h3 className="mt-5 font-semibold text-slate-800 dark:text-slate-100">
                  Club activities
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {selectedClub.activities.map((activity) => (
                    <li key={activity} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                      {activity}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {clubEvents.length > 0 && (
              <>
                <h3 className="mt-5 font-semibold text-slate-800 dark:text-slate-100">Upcoming events</h3>
                <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                  {clubEvents.slice(0, 3).map((e) => (
                    <li key={e._id}>
                      <Link
                        to={`/events/${e._id}`}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">{e.title}</span>
                        <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{formatDate(e.date)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <ClubNews clubId={selectedClub._id} canPost={canPostNews(selectedClub._id)} />

            <Link
              to={`/events?club=${selectedClub._id}`}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:underline dark:text-primary-300"
            >
              {clubEvents.length > 3 ? `See all ${clubEvents.length} upcoming events` : "View events from this club"}{" "}
              <FaArrowRight className="text-xs" />
            </Link>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4">
              <div className="text-sm">
                {selectedClub.leadName && (
                  <>
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      {selectedClub.leadName}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">{selectedClub.leadRole}</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShare}
                  aria-label="Share this club"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-300 shadow-sm transition-transform hover:scale-110"
                >
                  <FaShareAlt />
                </button>
                <button
                  onClick={() => requireAuth(() => toggleFavorite(selectedClub._id))}
                  aria-pressed={isFavorite(selectedClub._id)}
                  aria-label="Toggle favorite club"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 text-rose-500 shadow-sm transition-transform hover:scale-110"
                >
                  {isFavorite(selectedClub._id) ? <FaHeart /> : <FaRegHeart />}
                </button>
                <button
                  onClick={() => requireAuth(() => toggleJoin(selectedClub._id))}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    isJoined(selectedClub._id)
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-primary-500 text-white hover:bg-primary-600"
                  }`}
                >
                  {isJoined(selectedClub._id) ? (
                    <>
                      <FaCheck className="text-xs" /> Joined
                    </>
                  ) : (
                    <>
                      <FaPlus className="text-xs" /> Join Club
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
