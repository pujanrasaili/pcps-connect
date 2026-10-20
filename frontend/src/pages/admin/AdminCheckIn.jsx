import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FaCheckCircle, FaExclamationCircle, FaQrcode } from "react-icons/fa";
import { api, getErrorMessage } from "../../services/api";
import { formatDate } from "../../utils/formatDate";

// Landing page for the QR a student shows at the door. The admin scans it with
// their phone's camera, which opens /admin/check-in?code=..., and the student
// is marked as attended straight away. A pasted code works too, for when
// scanning isn't possible.
export default function AdminCheckIn() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCode = searchParams.get("code");
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lastSubmitted = useRef(null);

  const checkIn = async (code) => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post("/admin/check-in", { code });
      setResult(res.data);
    } catch (err) {
      setError(getErrorMessage(err, "Check-in failed"));
    } finally {
      setBusy(false);
    }
  };

  // Scanning a QR opens this page with the code in the address.
  useEffect(() => {
    if (urlCode && lastSubmitted.current !== urlCode) {
      lastSubmitted.current = urlCode;
      checkIn(urlCode);
    }
  }, [urlCode]);

  const handleManual = (e) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    setSearchParams({}, { replace: true });
    lastSubmitted.current = code;
    checkIn(code);
    setManualCode("");
  };

  return (
    <div className="mx-auto max-w-md space-y-6 py-6">
      <div className="text-center">
        <FaQrcode className="mx-auto text-3xl text-primary-500" />
        <h1 className="mt-2 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">Check-in</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Scan a student's QR code with your phone camera to mark them as attended.
        </p>
      </div>

      {busy && (
        <div className="flex justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      )}

      {result && (
        <div
          className={`card-surface p-6 text-center ${
            result.alreadyCheckedIn ? "ring-2 ring-amber-300" : "ring-2 ring-emerald-300"
          }`}
          role="status"
        >
          <FaCheckCircle
            className={`mx-auto text-4xl ${result.alreadyCheckedIn ? "text-amber-500" : "text-emerald-500"}`}
          />
          <p className="mt-3 text-xl font-bold text-slate-800 dark:text-slate-100">{result.student.name}</p>
          {result.student.studentId && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{result.student.studentId}</p>
          )}
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {result.event.title} · {formatDate(result.event.date)}
          </p>
          <p
            className={`mt-3 text-sm font-semibold ${
              result.alreadyCheckedIn ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {result.alreadyCheckedIn ? "Already checked in earlier" : "Checked in"}
          </p>
        </div>
      )}

      {error && (
        <div className="card-surface p-6 text-center ring-2 ring-rose-300" role="alert">
          <FaExclamationCircle className="mx-auto text-4xl text-rose-500" />
          <p className="mt-3 font-medium text-slate-800 dark:text-slate-100">{error}</p>
        </div>
      )}

      <form onSubmit={handleManual} className="card-surface space-y-3 p-5">
        <label className="label-field" htmlFor="manual-code">Or paste a code</label>
        <input
          id="manual-code"
          className="input-field"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Paste the code or the scanned link's code"
        />
        <button
          type="submit"
          disabled={busy || !manualCode.trim()}
          className="w-full rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
        >
          Check in
        </button>
      </form>
    </div>
  );
}
