import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { FaPrint, FaArrowLeft } from "react-icons/fa";
import { useLang } from "../context/LanguageContext";
import logo from "../assets/images/pcps-shield.webp";

const POINTS = [
  "Join the clubs you like",
  "Register for events and keep your ticket on your phone",
  "Get reminders, and a certificate when you attend",
];

// A printable A4 poster that tells students PCPS Connect exists and how to open it,
// for notice boards, classrooms and club tables. Its own full-page route, like the
// club and event posters, so "Print" gives only the poster.
export default function AppPoster() {
  const { t } = useLang();
  const siteUrl = window.location.origin;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 print:min-h-0 print:bg-white print:p-0">
      <style>{"@media print { @page { size: A4 portrait; margin: 0; } }"}</style>

      <div className="mx-auto mb-6 flex max-w-2xl items-center justify-between print:hidden">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:underline">
          <FaArrowLeft className="text-xs" /> {t("Back to home")}
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          <FaPrint /> {t("Print / Save as PDF")}
        </button>
      </div>

      <article className="mx-auto flex max-w-2xl flex-col items-center gap-8 bg-white p-8 text-center text-slate-800 shadow-lg print:m-0 print:min-h-[297mm] print:w-[210mm] print:max-w-none print:justify-between print:shadow-none">
        <header className="flex flex-col items-center">
          <img src={logo} alt="" className="h-16 w-16 object-contain" />
          <p className="mt-2 text-sm font-semibold text-slate-600">Patan College of Professional Studies</p>
        </header>

        <div>
          <h1 className="font-display text-5xl font-extrabold leading-tight text-primary-700 sm:text-6xl">PCPS Connect</h1>
          <p className="mx-auto mt-4 max-w-md text-xl text-slate-700">{t("Every club and event at PCPS, in one place")}</p>
        </div>

        <ul className="max-w-md space-y-3 text-left text-lg text-slate-800">
          {POINTS.map((point) => (
            <li key={point} className="border-l-4 border-accent-500 pl-4">
              {t(point)}
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center">
          <QRCodeSVG value={siteUrl} size={192} level="M" title={t("QR code that opens PCPS Connect")} />
          <p className="mt-3 text-lg font-semibold">{t("Scan to open PCPS Connect")}</p>
          <p className="mt-1 break-all text-sm text-slate-600">{siteUrl}</p>
        </div>
      </article>
    </main>
  );
}
