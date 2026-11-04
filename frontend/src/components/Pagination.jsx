import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useLang } from "../context/LanguageContext";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const { t } = useLang();
  if (totalPages <= 1) return null;

  return (
    <div className="mt-8 flex items-center justify-center gap-3">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label={t("Previous page")}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <FaChevronLeft className="text-sm" />
      </button>
      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
        {t("Page {current} of {total}", { current: currentPage, total: totalPages })}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label={t("Next page")}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <FaChevronRight className="text-sm" />
      </button>
    </div>
  );
}
