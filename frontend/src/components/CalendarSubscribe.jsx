import { useState } from "react";
import { FaCalendarPlus, FaCopy } from "react-icons/fa";
import { API_BASE_URL } from "../services/api";
import { useToast } from "../context/ToastContext";
import { feedUrl, webcalUrl, googleSubscribeUrl, isPublicUrl } from "../utils/calendarFeed";

// "Subscribe in your calendar": a small disclosure on the Events page. Pass a
// club id to subscribe to that club's events only.
export default function CalendarSubscribe({ clubId = "", clubName = "" }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const url = feedUrl(API_BASE_URL, clubId);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Calendar link copied.");
    } catch {
      toast.error("Couldn't copy -- select the link and copy it by hand.");
    }
  };

  return (
    <div className="mx-auto mt-4 max-w-4xl text-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline dark:text-primary-300"
      >
        <FaCalendarPlus aria-hidden="true" /> {open ? "Hide calendar subscription" : `Subscribe ${clubName ? `to ${clubName}` : "in your calendar"}`}
      </button>
      {open && (
        <div className="card-surface mx-auto mt-3 max-w-xl space-y-3 p-4 text-left">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Add {clubName ? `${clubName}'s` : "all PCPS"} events to your own calendar once. New and changed events then appear there by themselves.
          </p>
          <div className="flex flex-wrap gap-2">
            {isPublicUrl(url) && (
              <a href={googleSubscribeUrl(url)} target="_blank" rel="noopener noreferrer" className="btn-outline px-4 py-2 text-sm">
                Google Calendar
              </a>
            )}
            <a href={webcalUrl(url)} className="btn-outline px-4 py-2 text-sm">
              Apple / Outlook
            </a>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <FaCopy aria-hidden="true" /> Copy link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
