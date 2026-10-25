import { useSyncExternalStore } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaQrcode } from "react-icons/fa";
import { browserStorage, readTickets, visibleTickets } from "../utils/offlineTickets";

function subscribe(callback) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}
const isOffline = () => !navigator.onLine;

// When the phone has no internet and holds saved tickets, point straight at
// them from any page: at the door of an event is exactly when this is needed,
// and the rest of the site can't load without a connection.
export default function OfflineTicketsBanner() {
  const offline = useSyncExternalStore(subscribe, isOffline, () => false);
  const { pathname } = useLocation();
  if (!offline || pathname === "/tickets") return null;
  if (visibleTickets(readTickets(browserStorage())).length === 0) return null;
  return (
    <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
      <FaQrcode className="mr-2 inline align-[-2px]" aria-hidden="true" />
      You're offline.{" "}
      <Link to="/tickets" className="font-semibold underline">
        Open your saved tickets
      </Link>
    </div>
  );
}
