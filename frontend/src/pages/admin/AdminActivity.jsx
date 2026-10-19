import { useEffect, useMemo, useState } from "react";
import { FaHistory } from "react-icons/fa";
import { api, getErrorMessage } from "../../services/api";
import { actionLabel, actionTone, actionGroup } from "../../utils/auditLabels";
import SearchBar from "../../components/SearchBar";
import { useDebounce } from "../../hooks/useDebounce";
import Pagination from "../../components/Pagination";
import { usePagination } from "../../hooks/usePagination";

const PAGE_SIZE = 15;

const TONE_CLASS = {
  danger: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  good: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  info: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
};

const GROUPS = [
  ["all", "All"],
  ["user", "People"],
  ["event", "Events"],
  ["club", "Clubs"],
];

function formatWhen(iso) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminActivity() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [group, setGroup] = useState("all");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    api
      .get("/admin/audit")
      .then((res) => setEntries(res.data.entries))
      .catch((err) => setError(getErrorMessage(err, "Failed to load activity")))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (group === "all" || actionGroup(e.action) === group) &&
        (!q || e.summary.toLowerCase().includes(q) || (e.actorName || "").toLowerCase().includes(q))
    );
  }, [entries, group, debouncedQuery]);

  const { page, setPage, totalPages, pageItems } = usePagination(filtered, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">Activity</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Who approved, rejected, promoted or deleted what. Entries are kept for a year.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <SearchBar value={query} onChange={setQuery} placeholder="Search by person or detail..." />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by kind of action">
          {GROUPS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setGroup(value)}
              aria-pressed={group === value}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                group === value
                  ? "bg-primary-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-surface p-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : error ? (
          <p className="py-10 text-center text-sm text-rose-500">{error}</p>
        ) : entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            <FaHistory className="mx-auto mb-2 text-2xl text-slate-300" />
            No admin activity recorded yet.
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No activity matches your filter.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pageItems.map((entry) => (
              <div key={entry._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{entry.summary}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    by {entry.actorName} · {formatWhen(entry.createdAt)}
                  </p>
                </div>
                <span className={`badge shrink-0 ${TONE_CLASS[actionTone(entry.action)]}`}>
                  {actionLabel(entry.action)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
