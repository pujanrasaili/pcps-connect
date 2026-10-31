import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FaBell } from "react-icons/fa";
import { useNotifications } from "../hooks/useNotifications";
import { timeAgo } from "../utils/timeAgo";

// The bell in the top bar: a badge with the number of unseen messages and a
// small list ("You got a seat: Hack Night"). Opening it shows the newest
// messages and marks them as seen; the ones that were new stay highlighted
// until it is closed.
export default function NotificationBell({ className = "" }) {
  const { items, unread, load, markAllRead } = useNotifications(true);
  const [open, setOpen] = useState(false);
  const [newIds, setNewIds] = useState(() => new Set());
  const boxRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      // Keyboard users were inside the panel, which is about to disappear: put them back on the bell.
      buttonRef.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    const list = await load();
    const fresh = new Set((list || items).filter((n) => !n.read).map((n) => n._id));
    setNewIds(fresh);
    if (fresh.size > 0) markAllRead();
  };

  return (
    <div className={`relative ${className}`} ref={boxRef}>
      <button
        type="button"
        ref={buttonRef}
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <FaBell />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="region"
          aria-label="Notifications"
          className="card-surface fixed inset-x-3 top-16 z-50 animate-fade-in p-2 md:absolute md:inset-x-auto md:right-0 md:top-auto md:mt-2 md:w-96"
        >
          <p className="px-3 pb-1 pt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Notifications</p>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Nothing yet. You'll see waitlist spots, join decisions and event changes here.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {items.map((n) => {
                const body = (
                  <>
                    <span className="flex items-start gap-2">
                      {newIds.has(n._id) && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" aria-label="New" />}
                      <span className="min-w-0 text-sm text-slate-700 dark:text-slate-200">{n.title}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{timeAgo(n.createdAt)}</span>
                  </>
                );
                return (
                  <li key={n._id}>
                    {n.link ? (
                      <Link
                        to={n.link}
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="px-3 py-2.5">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
