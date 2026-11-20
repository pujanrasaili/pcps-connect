import { startsLabel } from "../utils/startsLabel";
import { useLang } from "../context/LanguageContext";

// "Starts today" / "Starts tomorrow" / "Starts in 3 days",
// shown beside an event's date so students see how soon it is at a glance.
export default function StartsLabel({ event, className = "" }) {
  const { t } = useLang();
  const label = startsLabel(event);
  if (!label) return null;
  return (
    <span className={`font-semibold text-primary-700 dark:text-primary-300 ${className}`}>
      {t(label.key, { n: label.n })}
    </span>
  );
}
