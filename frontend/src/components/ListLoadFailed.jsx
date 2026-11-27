import { FaRedo } from "react-icons/fa";
import { useLang } from "../context/LanguageContext";

// Shown in place of a list when the server could not be reached. It says what
// failed and offers a retry, so it is never mistaken for "there is nothing here".
export default function ListLoadFailed({ title, onRetry }) {
  const { t } = useLang();
  return (
    <div role="alert" className="mt-14 flex flex-col items-center text-center">
      <p className="text-lg font-medium text-rose-700 dark:text-rose-400">{t(title)}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {t("Check your connection and try again. If the server was asleep it can take up to a minute to wake up.")}
      </p>
      <button type="button" onClick={onRetry} className="btn-outline mt-4 text-sm">
        <FaRedo aria-hidden="true" /> {t("Try again")}
      </button>
    </div>
  );
}
