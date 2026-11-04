import { FaStar, FaRegStar } from "react-icons/fa";
import { useLang } from "../context/LanguageContext";

// Read-only row of stars for showing an existing rating.
export function Stars({ value, className = "" }) {
  const { t } = useLang();
  return (
    <span role="img" className={`inline-flex items-center gap-0.5 text-amber-400 ${className}`} aria-label={t("{n} out of 5 stars", { n: value })}>
      {[1, 2, 3, 4, 5].map((n) => (n <= value ? <FaStar key={n} /> : <FaRegStar key={n} className="text-slate-300 dark:text-slate-600" />))}
    </span>
  );
}

// Clickable 1-5 star picker.
export default function StarRating({ value, onChange, disabled }) {
  const { t } = useLang();
  return (
    <div role="radiogroup" aria-label={t("Rating")} className="flex items-center gap-1 text-2xl">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={t(n > 1 ? "{n} stars" : "{n} star", { n })}
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
