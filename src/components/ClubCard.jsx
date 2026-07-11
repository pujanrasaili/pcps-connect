import { FaUsers, FaArrowRight } from "react-icons/fa";

export default function ClubCard({ club, onView }) {
  const Icon = club.icon;
  return (
    <div className="group card-surface overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
      <div className="relative h-40 overflow-hidden">
        <img
          src={club.image}
          alt={`${club.name} banner`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className={`absolute inset-0 bg-gradient-to-t ${club.color} opacity-60`} />
        <div className="absolute bottom-3 left-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 dark:bg-slate-900/90 text-primary-600 shadow-md">
          <Icon className="text-xl" />
        </div>
        <span className="badge absolute right-3 top-3 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200">
          {club.category}
        </span>
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
      </div>
    </div>
  );
}
