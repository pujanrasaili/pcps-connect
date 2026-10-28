import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { FaCalendarAlt, FaMapMarkerAlt, FaWifi } from "react-icons/fa";
import { browserStorage, readTickets, ticketUrl, visibleTickets } from "../utils/offlineTickets";
import { formatDateAndTime } from "../utils/formatDate";

// "My tickets": the check-in QR codes saved on this phone (see
// utils/offlineTickets.js). Everything here is read from the phone itself, so
// the page works with no internet -- the point is the door of an event where
// the wifi or mobile data is bad. This page deliberately does not wait for the
// login check, which can't finish offline.
export default function OfflineTickets() {
  const [tickets] = useState(() => visibleTickets(readTickets(browserStorage())));
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">My tickets</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Your check-in codes for upcoming events, saved on this phone so they open even without internet.
      </p>

      {!online && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <FaWifi aria-hidden="true" /> You're offline. These saved tickets still work.
        </p>
      )}

      {tickets.length === 0 ? (
        <div className="card-surface mt-6 p-6 text-center">
          <p className="font-medium text-slate-800 dark:text-slate-100">No saved tickets yet</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Register for an event and open the site once while you're online. Your ticket is saved here
            automatically, and it is removed when you log out.
          </p>
          <Link to="/dashboard" className="btn-primary mt-4 inline-flex">Go to my dashboard</Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {tickets.map((t) => (
            <li key={t.id} className="card-surface flex flex-col items-center gap-3 p-5 text-center">
              <h2 className="font-display text-base font-semibold text-slate-800 dark:text-slate-100">{t.title}</h2>
              <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <FaCalendarAlt aria-hidden="true" /> {formatDateAndTime(t.date)}
              </p>
              {t.location && (
                <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <FaMapMarkerAlt aria-hidden="true" /> {t.location}
                </p>
              )}
              {/* Always dark-on-white, even in dark mode: scanners need the contrast. */}
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <QRCodeSVG value={ticketUrl(window.location.origin, t.code)} size={176} level="M" title={`Check-in code for ${t.title}`} />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">Personal to you. Don't share a screenshot of it.</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
