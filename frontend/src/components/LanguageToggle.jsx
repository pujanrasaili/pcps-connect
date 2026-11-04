import { useLang } from "../context/LanguageContext";

// Switches the interface between English and Nepali. The button shows the
// language you would switch TO, written in that language. Its accessible name
// is that same visible word (screen readers read it in the right language
// because of the lang attribute); the longer sentence is the hover tooltip.
export default function LanguageToggle({ className = "" }) {
  const { lang, setLang, t } = useLang();
  const next = lang === "ne" ? "en" : "ne";
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      lang={next}
      title={next === "ne" ? "Switch to Nepali" : t("Switch to English")}
      className={`rounded-full px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 ${className}`}
    >
      {next === "ne" ? "नेपाली" : "English"}
    </button>
  );
}
