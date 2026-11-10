import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaPrint, FaArrowLeft } from "react-icons/fa";
import { api, getErrorMessage } from "../services/api";
import { formatDate } from "../utils/formatDate";
import logo from "../assets/images/pcps-shield.webp";
import { useLang } from "../context/LanguageContext";

// A printable record of what the student has done through PCPS Connect: events
// attended and helped at (only what organisers confirmed) and clubs joined.
// Its own full-page route so "Print" gives just the record, always dark on
// white since it is meant for paper.
export default function ActivityRecord() {
  const { t } = useLang();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get("/registrations/record")
      .then((res) => !cancelled && setRecord(res.data.record))
      .catch((err) => !cancelled && setError(getErrorMessage(err, t("Couldn't load your activity record"))));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100">{t("Couldn't open your activity record")}</h1>
        <p role="alert" className="mt-2 font-medium text-rose-700 dark:text-rose-400">{error}</p>
        <Link to="/profile" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:underline dark:text-primary-300">
          <FaArrowLeft className="text-xs" /> {t("Back to profile")}
        </Link>
      </main>
    );
  }

  if (!record) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <h1 className="sr-only">{t("Loading your activity record")}</h1>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </main>
    );
  }

  const empty = record.attended.length === 0 && record.helped.length === 0 && record.clubs.length === 0;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 print:min-h-0 print:bg-white print:p-0">
      <style>{"@media print { @page { size: A4 portrait; margin: 14mm; } }"}</style>

      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between print:hidden">
        <Link to="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:underline">
          <FaArrowLeft className="text-xs" /> {t("Back to profile")}
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
        >
          <FaPrint /> {t("Print / Save as PDF")}
        </button>
      </div>

      <article className="mx-auto max-w-3xl bg-white p-8 text-slate-800 shadow-lg print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-center gap-4 border-b border-slate-300 pb-4">
          <img src={logo} alt="" className="h-14 w-14 object-contain" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-600">Patan College of Professional Studies</p>
            <h1 className="font-display text-2xl font-bold">{t("Activity record")}</h1>
          </div>
        </header>

        <p className="mt-4 text-lg font-semibold">{record.studentName}</p>
        {(record.program || record.studentId) && (
          <p className="text-sm text-slate-600">
            {[record.program, record.studentId && `ID ${record.studentId}`].filter(Boolean).join(" · ")}
          </p>
        )}

        {empty && <p className="mt-6 text-sm text-slate-600">{t("Nothing to show yet. Events you attend and clubs you join will appear here.")}</p>}

        {record.attended.length > 0 && (
          <section className="mt-6" aria-labelledby="rec-attended">
            <h2 id="rec-attended" className="font-display text-lg font-semibold">{t("Events attended ({n})", { n: record.attended.length })}</h2>
            <ul className="mt-2 divide-y divide-slate-200 text-sm">
              {record.attended.map((e, i) => (
                <li key={i} className="flex justify-between gap-4 py-1.5">
                  <span className="min-w-0 break-words">{e.title}{e.club ? ` · ${e.club}` : ""}</span>
                  <span className="shrink-0 text-slate-600">{formatDate(e.date)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {record.helped.length > 0 && (
          <section className="mt-6" aria-labelledby="rec-helped">
            <h2 id="rec-helped" className="font-display text-lg font-semibold">{t("Events helped at ({n})", { n: record.helped.length })}</h2>
            <ul className="mt-2 divide-y divide-slate-200 text-sm">
              {record.helped.map((e, i) => (
                <li key={i} className="flex justify-between gap-4 py-1.5">
                  <span className="min-w-0 break-words">{e.title}{e.role ? ` · ${e.role}` : ""}</span>
                  <span className="shrink-0 text-slate-600">{formatDate(e.date)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {record.clubs.length > 0 && (
          <section className="mt-6" aria-labelledby="rec-clubs">
            <h2 id="rec-clubs" className="font-display text-lg font-semibold">{t("Clubs ({n})", { n: record.clubs.length })}</h2>
            <p className="mt-2 text-sm">{record.clubs.join(", ")}</p>
          </section>
        )}

        <footer className="mt-8 border-t border-slate-300 pt-3 text-xs text-slate-600">
          {t("Printed {date} from PCPS Connect. Attendance is as confirmed by event organisers; each attended event has its own certificate with a code anyone can verify.", { date: formatDate(new Date().toISOString()) })}
        </footer>
      </article>
    </main>
  );
}
