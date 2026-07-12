import { useMemo, useState } from "react";
import { FaUsers, FaEnvelope, FaCalendarAlt, FaHeart, FaRegHeart, FaCheck, FaPlus } from "react-icons/fa";
import ClubCard from "../components/ClubCard";
import SearchBar from "../components/SearchBar";
import FilterButtons from "../components/FilterButtons";
import Modal from "../components/Modal";
import Reveal from "../components/Reveal";
import { clubs, clubCategories } from "../data/clubs";
import { useDebounce } from "../hooks/useDebounce";
import { useClubMembership } from "../context/ClubMembershipContext";
import { useRequireAuth } from "../hooks/useRequireAuth";

export default function Clubs() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedClub, setSelectedClub] = useState(null);
  const debouncedQuery = useDebounce(query, 250);
  const { isJoined, isFavorite, toggleJoin, toggleFavorite } = useClubMembership();
  const requireAuth = useRequireAuth();

  const filteredClubs = useMemo(() => {
    return clubs.filter((club) => {
      const matchesCategory = category === "All" || club.category === category;
      const matchesQuery = club.name
        .toLowerCase()
        .includes(debouncedQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [debouncedQuery, category]);

  return (
    <div className="section-y">
      <div className="container-page">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-primary-500">
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
            <SearchBar value={query} onChange={setQuery} placeholder="Search clubs..." />
          </div>
          <FilterButtons options={clubCategories} active={category} onChange={setCategory} />
        </div>

        {filteredClubs.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClubs.map((club, i) => (
              <Reveal key={club.id} delay={(i % 6) * 80}>
                <ClubCard club={club} onView={setSelectedClub} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-16 text-center text-slate-500 dark:text-slate-400">
            <p className="text-lg font-medium">No clubs match your search.</p>
            <p className="mt-1 text-sm">Try a different name or category.</p>
          </div>
        )}
      </div>

      <Modal isOpen={!!selectedClub} onClose={() => setSelectedClub(null)} title={selectedClub?.name} size="lg">
        {selectedClub && (
          <div>
            <img src={selectedClub.image} alt="" className="mb-4 h-48 w-full rounded-xl object-cover" />
            <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <FaUsers className="text-primary-500" /> {selectedClub.members} members
              </span>
              <span className="flex items-center gap-1.5">
                <FaCalendarAlt className="text-primary-500" /> Founded {selectedClub.founded}
              </span>
              <span className="flex items-center gap-1.5">
                <FaEnvelope className="text-primary-500" /> {selectedClub.email}
              </span>
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
              {selectedClub.longDescription}
            </p>
            <h4 className="mt-5 font-semibold text-slate-800 dark:text-slate-100">
              Club activities
            </h4>
            <ul className="mt-2 space-y-1.5">
              {selectedClub.activities.map((activity) => (
                <li key={activity} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                  {activity}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4">
              <div className="text-sm">
                <p className="font-medium text-slate-700 dark:text-slate-200">
                  {selectedClub.lead.name}
                </p>
                <p className="text-slate-500 dark:text-slate-400">{selectedClub.lead.role}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => requireAuth(() => toggleFavorite(selectedClub.id))}
                  aria-pressed={isFavorite(selectedClub.id)}
                  aria-label="Toggle favorite club"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 text-rose-500 shadow-sm transition-transform hover:scale-110"
                >
                  {isFavorite(selectedClub.id) ? <FaHeart /> : <FaRegHeart />}
                </button>
                <button
                  onClick={() => requireAuth(() => toggleJoin(selectedClub.id))}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    isJoined(selectedClub.id)
                      ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-primary-500 text-white hover:bg-primary-600"
                  }`}
                >
                  {isJoined(selectedClub.id) ? (
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
