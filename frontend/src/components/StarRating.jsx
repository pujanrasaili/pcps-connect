import { FaStar, FaRegStar } from "react-icons/fa";

// Read-only row of stars for showing an existing rating.
export function Stars({ value, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-amber-400 ${className}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (n <= value ? <FaStar key={n} /> : <FaRegStar key={n} className="text-slate-300 dark:text-slate-600" />))}
    </span>
  );
}

// Clickable 1-5 star picker.
export default function StarRating({ value, onChange, disabled }) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1 text-2xl">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          disabled={disabled}
          onClick={() => onChange(n)}
          className="text-amber-400 transition-transform hover:scale-110 disabled:opacity-50"
        >
          {n <= value ? <FaStar /> : <FaRegStar className="text-slate-300 dark:text-slate-600" />}
        </button>
      ))}
    </div>
  );
}
