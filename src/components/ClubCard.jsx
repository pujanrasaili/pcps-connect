import { FaUsers, FaArrowRight, FaHeart, FaRegHeart, FaCheck, FaPlus } from "react-icons/fa";
import { useClubMembership } from "../context/ClubMembershipContext";
import { useTilt } from "../hooks/useTilt";
import { useRequireAuth } from "../hooks/useRequireAuth";

export default function ClubCard({ club, onView }) {
  const Icon = club.icon;
  const { isJoined, isFavorite, toggleJoin, toggleFavorite } = useClubMembership();
  const requireAuth = useRequireAuth();
  const tilt = useTilt({ max: 6, scale: 1.015 });
  const joined = isJoined(club.id);
  const favorite = isFavorite(club.id);

  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      style={tilt.style}
      className="group card-surface overflow-hidden transition-shadow duration-300 hover:shadow-soft"
    >
      <div className="relative h-40 overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={club.image}
          alt={`${club.name} banner`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Bottom scrim only -- keeps the photo true-color while still
            giving the icon badge a legible background */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/55 via-slate-900/0 to-transparent" />
        <div className="absolute bottom-3 left-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 dark:bg-slate-900/95 text-primary-600 shadow-md">
          <Icon className="text-xl" />
        </div>
        <span className="badge absolute left-3 top-3 bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200">
          {club.category}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            requireAuth(() => toggleFavorite(club.id));
          }}
          aria-label={favorite ? "Remove from favorite club" : "Set as favorite club"}
          aria-pressed={favorite}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 dark:bg-slate-900/95 text-rose-500 shadow-md transition-transform hover:scale-110"
        >
          {favorite ? <FaHeart /> : <FaRegHeart />}
        </button>
      </div>
      <div className="p-5">
        <h3 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
          {club.name}
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
          {club.description}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <FaUsers className="text-primary-500" /> {club.members} members
          </span>
          <button
            onClick={() => onView?.(club)}
            className="flex items-center gap-1 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:gap-2 transition-all"
          >
            View <FaArrowRight className="text-xs" />
          </button>
        </div>
        <button
          onClick={() => requireAuth(() => toggleJoin(club.id))}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            joined
              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300"
          }`}
        >
          {joined ? (
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
  );
}
