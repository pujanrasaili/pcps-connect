import { useEffect, useState } from "react";
import { FaHistory } from "react-icons/fa";
import { api, getErrorMessage } from "../../services/api";
import Pagination from "../../components/Pagination";
import { usePagination } from "../../hooks/usePagination";

const PAGE_SIZE = 15;

// Colour by kind of action so destructive ones stand out when scanning.
function badgeClass(action) {
  if (action.endsWith(".deleted") || action.endsWith(".rejected")) {
    return "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400";
  }
  if (action.endsWith(".approved")) {
    return "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400";
  }
  return "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
}

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

  useEffect(() => {
    api
      .get("/admin/audit")
      .then((res) => setEntries(res.data.entries))
      .catch((err) => setError(getErrorMessage(err, "Failed to load activity")))
      .finally(() => setLoading(false));
  }, []);

  const { page, setPage, totalPages, pageItems } = usePagination(entries, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">Activity</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Who approved, rejected, promoted or deleted what. Entries are kept for a year.
        </p>
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
                <span className={`badge shrink-0 ${badgeClass(entry.action)}`}>
                  {entry.action.replace(".", " ").replace("_", " ")}
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
