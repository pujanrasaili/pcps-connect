import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { FaPrint, FaArrowLeft } from "react-icons/fa";
import { useEvents } from "../context/EventsContext";
import { useLang } from "../context/LanguageContext";
import { formatDateTimeRange } from "../utils/formatDate";
import { resolveUploadUrl } from "../services/api";
import logo from "../assets/images/pcps-shield.webp";

// A printable A4 poster for an event, to stick on campus boards: the title,
// when and where, and a big QR code that opens the event page to register.
// Its own full-page route so "Print" gives only the poster, always dark on
// white since it is meant for paper.
export default function EventPoster() {
  const { id } = useParams();
  const { t } = useLang();
  const { getEventById } = useEvents();
  const [event, setEvent] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getEventById(id)
      .then((e) => {
        if (cancelled) return;
        // The lookup runs again when the events list arrives, so a miss that came first must not stick.
        setFailed(!e);
        if (e) setEvent(e);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [id, getEventById]);

  if (failed) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100">{t("Couldn't open this poster")}</h1>
        <Link to={`/events/${id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:underline dark:text-primary-300">
          <FaArrowLeft className="text-xs" /> {t("Back to the event")}
        </Link>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <h1 className="sr-only">{t("Loading the poster")}</h1>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </main>
    );
  }

  const eventUrl = `${window.location.origin}/events/${encodeURIComponent(event._id)}`;
  const image = event.image ? resolveUploadUrl(event.image, 900) : "";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 print:min-h-0 print:bg-white print:p-0">
      <style>{"@media print { @page { size: A4 portrait; margin: 0; } }"}</style>

      <div className="mx-auto mb-6 flex max-w-2xl items-center justify-between print:hidden">
        <Link to={`/events/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:underline">
          <FaArrowLeft className="text-xs" /> {t("Back to the event")}
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
        >
          <FaPrint /> {t("Print / Save as PDF")}
        </button>
      </div>

      <article className="mx-auto flex max-w-2xl flex-col items-center gap-6 bg-white p-8 text-center text-slate-800 shadow-lg print:m-0 print:min-h-[297mm] print:w-[210mm] print:max-w-none print:justify-between print:shadow-none">
        <header className="flex flex-col items-center">
          <img src={logo} alt="" className="h-14 w-14 object-contain" />
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-600">Patan College of Professional Studies</p>
          {event.club?.name && <p className="mt-1 text-sm font-semibold text-primary-700">{event.club.name}</p>}
        </header>

        {image && <img src={image} alt="" className="max-h-64 w-full rounded-xl object-cover" />}

        <div>
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">{event.title}</h1>
          <p className="mt-4 text-xl font-semibold">{formatDateTimeRange(event.date, event.endDate)}</p>
          {event.location && <p className="mt-1 text-lg text-slate-700">{event.location}</p>}
        </div>

        <div className="flex flex-col items-center">
          <QRCodeSVG value={eventUrl} size={176} level="M" title={t("QR code that opens this event's page")} />
          <p className="mt-3 text-lg font-semibold">{t("Scan to see details and register")}</p>
          <p className="mt-1 break-all text-xs text-slate-600">{eventUrl}</p>
        </div>
      </article>
    </main>
  );
}
