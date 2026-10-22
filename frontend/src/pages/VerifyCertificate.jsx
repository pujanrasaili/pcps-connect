import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import { formatDate } from "../utils/formatDate";

// Public page behind the QR printed on every certificate. No login needed:
// the point is that anyone handed a certificate can check it.
export default function VerifyCertificate() {
  const { code } = useParams();
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/certificates/verify/${encodeURIComponent(code)}`)
      .then((res) => !cancelled && setState({ status: "valid", data: res.data }))
      .catch((err) => {
        if (cancelled) return;
        // The API answers 404 {valid:false} for anything it can't vouch for.
        if (err.response?.status === 404) setState({ status: "invalid" });
        else setState({ status: "error", message: getErrorMessage(err, "Couldn't check this certificate right now") });
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className="section-y">
      <div className="container-page">
        <div className="mx-auto max-w-md text-center">
          {state.status === "loading" && (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
          )}

          {state.status === "valid" && (
            <div className="card-surface p-8 ring-2 ring-emerald-300" role="status">
              <FaCheckCircle className="mx-auto text-5xl text-emerald-500" />
              <h1 className="mt-4 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
                Genuine certificate
              </h1>
              <p className="mt-4 text-xl font-semibold text-slate-800 dark:text-slate-100">{state.data.student.name}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">attended</p>
              <p className="mt-1 font-medium text-slate-700 dark:text-slate-200">{state.data.event.title}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(state.data.event.date)}</p>
            </div>
          )}

          {state.status === "invalid" && (
            <div className="card-surface p-8 ring-2 ring-rose-300" role="alert">
              <FaTimesCircle className="mx-auto text-5xl text-rose-500" />
              <h1 className="mt-4 font-display text-2xl font-bold text-slate-800 dark:text-slate-100">
                Couldn't verify this certificate
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                This code isn't one PCPS Connect issued, or the attendance it refers to was never recorded. If you were
                given this certificate, treat it as unverified.
              </p>
            </div>
          )}

          {state.status === "error" && <p className="py-10 text-rose-600 dark:text-rose-400">{state.message}</p>}

          <Link to="/" className="mt-6 inline-block text-sm font-semibold text-primary-600 hover:underline dark:text-primary-300">
            Go to PCPS Connect
          </Link>
        </div>
      </div>
    </div>
  );
}
