import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api, getErrorMessage } from "../services/api";
import Modal from "./Modal";
import { browserStorage, readTickets, ticketUrl } from "../utils/offlineTickets";

// Shows a student's personal check-in QR. The code is fetched fresh each time
// (it's just an HMAC of the registration id -- nothing is stored), and the QR
// encodes a link to the admin check-in page, so an admin can scan it with
// their phone's normal camera app: it opens the page, which marks the student
// as attended. No scanner library needed on either side.
export default function CheckInQrModal({ registration, onClose }) {
  const [code, setCode] = useState(null);
  const [error, setError] = useState("");
  const registrationId = registration?._id;

  useEffect(() => {
    if (!registrationId) return;
    let cancelled = false;
    setCode(null);
    setError("");
    api
      .get(`/registrations/${registrationId}/check-in-code`)
      .then((res) => !cancelled && setCode(res.data.code))
      .catch((err) => {
        if (cancelled) return;
        // Offline (no answer from the server at all): use the copy saved on this phone.
        const saved = !err?.response && readTickets(browserStorage()).find((t) => t.id === registrationId);
        if (saved) setCode(saved.code);
        else setError(getErrorMessage(err, "Couldn't create your check-in code"));
      });
    return () => {
      cancelled = true;
    };
  }, [registrationId]);

  const url = code ? ticketUrl(window.location.origin, code) : "";

  return (
    <Modal isOpen={!!registration} onClose={onClose} title="Your check-in code" size="sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">{registration?.event?.title}</p>
        {error ? (
          <p className="py-8 text-sm text-rose-700 dark:text-rose-400">{error}</p>
        ) : !code ? (
          <div className="py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : (
          // Always dark-on-white, even in dark mode -- scanners need the contrast.
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <QRCodeSVG value={url} size={208} level="M" />
          </div>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Show this to an organiser at the door. It's personal to you, so don't share a screenshot of it.
        </p>
      </div>
    </Modal>
  );
}
