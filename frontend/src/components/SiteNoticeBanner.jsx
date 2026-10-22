import { useEffect, useState } from "react";
import { FaBullhorn, FaTimes } from "react-icons/fa";
import { api } from "../services/api";
import { noticeId } from "../utils/siteNotice";

const DISMISSED_KEY = "pcps.dismissedNotice";

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) || "";
  } catch {
    return "";
  }
}

// The announcement an admin set (Admin -> Overview). Closing it hides that
// exact notice for the rest of the browser session; an edited one shows again.
export default function SiteNoticeBanner() {
  const [notice, setNotice] = useState(null);
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/notice")
      .then((res) => {
        if (!cancelled) setNotice(res.data.notice || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!notice || noticeId(notice) === dismissed) return null;

  const warning = notice.tone === "warning";
  const close = () => {
    const id = noticeId(notice);
    setDismissed(id);
    try {
      sessionStorage.setItem(DISMISSED_KEY, id);
    } catch {
      // Storage blocked: it just comes back on the next page load.
    }
  };

  return (
    <div
      role="status"
      className={`flex items-start gap-3 border-b px-4 py-2.5 text-sm ${
        warning
          ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200"
          : "border-primary-100 bg-primary-50 text-primary-800 dark:border-primary-900/50 dark:bg-primary-900/20 dark:text-primary-200"
      }`}
    >
      <FaBullhorn className="mt-0.5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 break-words">{notice.message}</p>
      <button type="button" onClick={close} aria-label="Dismiss announcement" className="shrink-0 rounded p-1 hover:bg-black/5 dark:hover:bg-white/10">
        <FaTimes />
      </button>
    </div>
  );
}
