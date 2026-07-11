export default function FilterButtons({ options, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter options">
      {options.map((option) => {
        const isActive = active === option;
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            aria-pressed={isActive}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
              isActive
                ? "gradient-brand text-white shadow-soft"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-primary-300"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
