import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { FaPrint, FaArrowLeft } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import { formatDate } from "../utils/formatDate";
import logo from "../assets/images/pcps-shield.webp";

// A printable certificate of attendance. Deliberately its own full-page route
// (no site navbar/footer) so "Print" gives just the certificate, and always
// light-on-white regardless of the dark-mode setting, since it's meant for
// paper. The QR points at the public verify page, so anyone holding a printout
// can confirm it's genuine.
export default function Certificate() {
  const { id } = useParams();
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/registrations/${id}/certificate`)
      .then((res) => !cancelled && setCertificate(res.data.certificate))
      .catch((err) => !cancelled && setError(getErrorMessage(err, "Couldn't load this certificate")));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100">Couldn't open this certificate</h1>
        <p className="mt-2 font-medium text-rose-700 dark:text-rose-400">{error}</p>
        <Link to="/profile" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:underline dark:text-primary-300">
          <FaArrowLeft className="text-xs" /> Back to profile
        </Link>
      </main>
    );
  }

  if (!certificate) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <h1 className="sr-only">Loading certificate</h1>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </main>
    );
  }

  const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(certificate.code)}`;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 print:min-h-0 print:bg-white print:p-0">
      {/* Landscape A4, no browser margins -- only applies while printing */}
      <style>{"@media print { @page { size: A4 landscape; margin: 0; } }"}</style>

      <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between print:hidden">
        <Link to="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:underline">
          <FaArrowLeft className="text-xs" /> Back to profile
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
        >
          <FaPrint /> Print / Save as PDF
        </button>
      </div>

      <div
        // A4-landscape proportions on screens wide enough to hold the content
        // (and always when printing); on a phone the card just grows to fit.
        className="mx-auto flex max-w-4xl flex-col items-center bg-white p-3 text-slate-800 shadow-lg sm:[aspect-ratio:297/210] print:m-0 print:h-[209mm] print:w-[297mm] print:max-w-none print:overflow-hidden print:shadow-none"
      >
        <div className="flex min-h-full w-full flex-col items-center justify-between gap-6 border-4 border-double border-primary-500 px-8 py-8 text-center sm:px-14">
          <div className="flex flex-col items-center">
            <img src={logo} alt="" className="h-16 w-16 object-contain" />
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Patan College of Professional Studies
            </p>
          </div>

          <div>
            <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-primary-600 sm:text-5xl">
              Certificate of Attendance
            </h1>
            <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">This is to certify that</p>
            <p className="mt-2 border-b border-slate-300 px-6 pb-2 font-display text-3xl font-bold sm:text-4xl">
              {certificate.studentName}
            </p>
            {(certificate.studentId || certificate.program) && (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {[certificate.program, certificate.studentId && `ID ${certificate.studentId}`].filter(Boolean).join(" · ")}
              </p>
            )}
            <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">attended</p>
            <p className="mt-1 text-xl font-semibold sm:text-2xl">{certificate.eventTitle}</p>
            <p className="mt-1 text-sm text-slate-600">
              {formatDate(certificate.eventDate)}
              {certificate.eventLocation ? ` · ${certificate.eventLocation}` : ""}
              {certificate.clubName ? ` · hosted by ${certificate.clubName}` : ""}
            </p>
          </div>

          <div className="flex w-full items-end justify-between gap-4 text-left">
            <p className="max-w-[16rem] text-[10px] leading-snug text-slate-500 dark:text-slate-400">
              Issued by PCPS Connect. Scan the code to confirm this certificate is genuine.
            </p>
            <div className="flex flex-col items-center">
              <QRCodeSVG value={verifyUrl} size={72} level="M" />
              <p className="mt-1 text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Verify</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
