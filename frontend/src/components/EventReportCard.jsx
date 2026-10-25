import { useState } from "react";
import { FaCopy } from "react-icons/fa";
import { useToast } from "../context/ToastContext";
import { eventReport, reportText } from "../utils/eventReport";

function Tile({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 text-center dark:bg-slate-800">
      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{value}</p>
      <p className="text-xs text-slate-600 dark:text-slate-300">{label}</p>
    </div>
  );
}

// A small summary of how the event went, with a "Copy summary" button for
// pasting into a club report or a post.
export default function EventReportCard({ title, registrations, waitlistCount }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const report = eventReport(registrations, waitlistCount);
  if (report.registered === 0) return null;
  const maxCount = Math.max(1, ...report.distribution.map((d) => d.count));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reportText(title, report));
      toast.success("Summary copied.");
    } catch {
      toast.error("Couldn't copy -- select the numbers and copy them by hand.");
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="text-sm font-semibold text-primary-600 hover:underline dark:text-primary-300"
        >
          {open ? "Hide event report" : "Event report"}
        </button>
        {open && (
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <FaCopy aria-hidden="true" /> Copy summary
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="Registered" value={report.registered} />
            <Tile label="Attended" value={report.attended} />
            <Tile label="Attendance" value={report.attendanceRate === null ? "-" : `${report.attendanceRate}%`} />
            <Tile label="Rating" value={report.averageRating === null ? "-" : `${report.averageRating}/5`} />
          </div>
          {report.ratingCount > 0 && (
            <ul className="mt-3 space-y-1" aria-label="Ratings breakdown">
              {report.distribution.map((d) => (
                <li key={d.stars} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span className="w-12 shrink-0">{d.stars} star{d.stars > 1 ? "s" : ""}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <span className="block h-full rounded-full bg-primary-500" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                  </span>
                  <span className="w-6 shrink-0 text-right">{d.count}</span>
                </li>
              ))}
            </ul>
          )}
          {report.waitlist > 0 && (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{report.waitlist} still on the waitlist.</p>
          )}
        </div>
      )}
    </div>
  );
}
