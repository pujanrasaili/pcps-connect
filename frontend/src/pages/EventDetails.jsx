import { useEffect, useMemo, useState } from "react";
import { eventJsonLd, jsonLdText } from "../utils/eventJsonLd";
import { eventMetaDescription } from "../utils/metaDescription";
import { useParams, Link, Navigate } from "react-router-dom";
import {
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUsers,
  FaTag,
  FaCheckCircle,
  FaArrowLeft,
  FaTimes,
  FaCalendarPlus,
  FaQrcode,
  FaShareAlt,
  FaPrint,
  FaBookmark,
  FaRegBookmark,
} from "react-icons/fa";
import { useEvents } from "../context/EventsContext";
import { useLang } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useLedClubs } from "../hooks/useLedClubs";
import EventQuestions from "../components/EventQuestions";
import EventVolunteers from "../components/EventVolunteers";
import EventJoinLink from "../components/EventJoinLink";
import EventPhotos from "../components/EventPhotos";
import { useRegistrations } from "../context/RegistrationContext";
import RegistrationForm from "../components/RegistrationForm";
import Modal from "../components/Modal";
import Button from "../components/Button";
import { formatDate, formatDateTime, formatDateTimeRange, isPastEvent } from "../utils/formatDate";
import { isRegistrationClosed, hasOpenDeadline } from "../utils/registrationDeadline";
import { api, getErrorMessage, resolveUploadUrl } from "../services/api";
import { useToast } from "../context/ToastContext";
import { downloadIcs, googleCalendarUrl } from "../utils/calendar";
import { shareEvent } from "../utils/share";
import { eventTitle } from "../utils/pageTitle";
import { Stars } from "../components/StarRating";
import CheckInQrModal from "../components/CheckInQrModal";
import EventCard from "../components/EventCard";
import { relatedEvents } from "../utils/relatedEvents";
import { useSavedEvents } from "../hooks/useSavedEvents";
import SafeImage from "../components/SafeImage";

export default function EventDetails() {
  const { id } = useParams();
  const { t } = useLang();
  const { getEventById, events: allEvents, refreshEvents } = useEvents();
  const { isAuthenticated, user } = useAuth();
  const { clubs: ledClubs } = useLedClubs();
  const { registrations, isRegistered, isPending, cancelRegistration } = useRegistrations();
  const [event, setEvent] = useState(null);

  useEffect(() => {
    document.title = eventTitle(event?.title, t);
  }, [event?.title, t]);

  // The snippet search engines show under the title; the page's usual
  // description comes back when leaving.
  useEffect(() => {
    const text = eventMetaDescription(event);
    const tag = document.querySelector('meta[name="description"]');
    if (!text || !tag) return undefined;
    const original = tag.getAttribute("content");
    tag.setAttribute("content", text);
    return () => tag.setAttribute("content", original);
  }, [event]);

  // Event data for search engines, removed again when leaving the page.
  useEffect(() => {
    const data = eventJsonLd(event, window.location.origin);
    if (!data) return undefined;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = jsonLdText(data);
    document.head.appendChild(script);
    return () => script.remove();
  }, [event]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [unregistering, setUnregistering] = useState(false);
  const toast = useToast();
  // null = unknown/not loaded, otherwise { onWaitlist, position }
  const [waitlist, setWaitlist] = useState(null);
  const [waitlistBusy, setWaitlistBusy] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const { isSaved, toggle: toggleSaved } = useSavedEvents();
  const related = useMemo(() => relatedEvents(allEvents, event), [allEvents, event]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setLoadFailed(false);
    setWaitlist(null);
    getEventById(id)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setNotFound(true);
        } else {
          setEvent(result);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadFailed(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, getEventById, loadAttempt]);

  // The public events list leaves out the organiser's email (it's for logged-in
  // students only), so fetch the single event to get it.
  const organiserNeedsEmail = isAuthenticated && !!event?.createdBy && !event.createdBy.email;
  const eventIdForEmail = event?._id;
  useEffect(() => {
    if (!organiserNeedsEmail) return;
    let cancelled = false;
    api
      .get(`/events/${eventIdForEmail}`)
      .then((res) => {
        const email = res.data.event?.createdBy?.email;
        if (!cancelled && email) setEvent((prev) => (prev && prev._id === eventIdForEmail ? { ...prev, createdBy: { ...prev.createdBy, email } } : prev));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [organiserNeedsEmail, eventIdForEmail]);

  // A waitlist only matters for a full, upcoming event the student isn't
  // already registered for. `registeredHere` is a plain boolean so the
  // effect below only re-runs when it actually changes.
  const registeredHere = event ? isRegistered(event._id) : false;
  const eventKey = event?._id;
  const eventFull = event ? (event.capacity ?? 100) - (event.registeredCount ?? 0) <= 0 : false;
  const eventOver = event ? isPastEvent(event.date) : false;
  // Admins can answer on any event; a club leader only on their own club's.
  const eventClubId = event?.club?._id || event?.club || null;
  const canAnswerQuestions = user?.role === "admin" || (!!eventClubId && ledClubs.some((c) => c._id === eventClubId));
  const waitlistRelevant = isAuthenticated && eventFull && !registeredHere && !eventOver;

  useEffect(() => {
    if (!waitlistRelevant || !eventKey) return;
    let cancelled = false;
    api
      .get(`/waitlist/${eventKey}`)
      .then((res) => !cancelled && setWaitlist(res.data))
      .catch(() => !cancelled && setWaitlist(null));
    return () => {
      cancelled = true;
    };
  }, [waitlistRelevant, eventKey]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (loadFailed && !event) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center" role="alert">
        <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">{t("Couldn't load this event")}</h1>
        <p className="mt-2 max-w-md text-slate-500 dark:text-slate-400">
          {t("The server may be waking up or your connection dropped. The event is still there; give it a moment and try again.")}
        </p>
        <button type="button" onClick={() => setLoadAttempt((n) => n + 1)} className="btn-primary mt-5">
          {t("Try again")}
        </button>
      </div>
    );
  }

  if (notFound || !event) return <Navigate to="/404" replace />;

  const capacity = event.capacity ?? 100;
  const registeredCount = event.registeredCount ?? 0;
  const spotsLeft = capacity - registeredCount;
  const isFull = spotsLeft <= 0;
  const isPast = isPastEvent(event.date);
  const registrationClosed = isRegistrationClosed(event);
  const registered = isRegistered(event._id);
  const myRegistration = registrations.find((r) => r.event?._id === event._id);
  // "Registered" in the UI means confirmed: a request still waiting for the
  // organisers gets its own state (no QR code, no calendar links yet).
  const pendingHere = isPending(event._id);
  const showStickyRegister = !registered && !pendingHere && !isPast && !registrationClosed && !isFull;
  const confirmedHere = registered && !pendingHere;

  const handleJoinWaitlist = async () => {
    setWaitlistBusy(true);
    try {
      const res = await api.post(`/waitlist/${event._id}`);
      setWaitlist({ onWaitlist: true, position: res.data.position });
      toast.success(t("You're on the waitlist. We'll email you if a spot opens."));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't join the waitlist")));
    } finally {
      setWaitlistBusy(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    setWaitlistBusy(true);
    try {
      await api.delete(`/waitlist/${event._id}`);
      setWaitlist({ onWaitlist: false });
      toast.info(t("Removed from the waitlist."));
    } catch (err) {
      toast.error(getErrorMessage(err, t("Couldn't leave the waitlist")));
    } finally {
      setWaitlistBusy(false);
    }
  };

  const handleRegisterClick = () => {
    if (!isAuthenticated) return;
    setShowModal(true);
  };

  const handleShare = async () => {
    try {
      const result = await shareEvent(event);
      if (result === "copied") toast.success(t("Link copied to clipboard."));
    } catch {
      toast.error(t("Couldn't share this event. Copy the link from your address bar instead."));
    }
  };

  const handleUnregister = async () => {
    setUnregistering(true);
    await cancelRegistration(event._id);
    setUnregistering(false);
  };

  return (
    <div>
      <div className="relative h-64 bg-slate-800 sm:h-80">
        <SafeImage src={resolveUploadUrl(event.image, 1600)} alt={event.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/55 to-slate-900/15" />
        <div className="container-page absolute inset-x-0 bottom-6 text-white">
          <Link to="/events" className="hit-v mb-3 flex w-fit items-center gap-1.5 text-sm text-white hover:underline">
            <FaArrowLeft className="text-xs" /> {t("Back to events")}
          </Link>
          <div className="flex flex-wrap gap-2">
            {event.category && <span className="badge bg-white/20 backdrop-blur">{event.category}</span>}
            {event.club?.name && (
              <span className="badge max-w-full bg-white/20 backdrop-blur">{t("Hosted by {name}", { name: event.club.name })}</span>
            )}
            {isPast && <span className="badge bg-slate-700/60 backdrop-blur">{t("Past event")}</span>}
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{event.title}</h1>
        </div>
      </div>

      <div className={`container-page grid grid-cols-1 gap-8 py-10 lg:grid-cols-[1fr_340px] ${showStickyRegister ? "pb-24 lg:pb-10" : ""}`}>
        <div className="space-y-8">
          <div className="card-surface p-6">
            <h2 className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100">
              {t("About this event")}
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">{event.description}</p>
          </div>

          {event.createdBy && (
            <div className="card-surface p-6">
              <h2 className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100">
                {t("Organizer")}
              </h2>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full gradient-brand text-white font-semibold">
                  {event.createdBy.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{event.createdBy.name}</p>
                  {event.createdBy.email ? (
                    <a href={`mailto:${event.createdBy.email}`} className="text-sm text-primary-600 hover:underline dark:text-primary-300">
                      {event.createdBy.email}
                    </a>
                  ) : (
                    !isAuthenticated && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        <Link to="/login" state={{ from: `/events/${event._id}` }} className="font-semibold text-primary-600 hover:underline dark:text-primary-300">
                          {t("Log in")}
                        </Link>{" "}
                        {t("to see their contact email")}
                      </p>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          <EventPhotos key={event._id} eventId={event._id} title={event.title} initialPhotos={event.photos || []} canManage={canAnswerQuestions} onChange={refreshEvents} />

          <EventJoinLink eventId={event._id} registered={confirmedHere} canManage={canAnswerQuestions} eventOver={eventOver} />

          <EventVolunteers eventId={event._id} eventTitle={event.title} eventOver={eventOver} canManage={canAnswerQuestions} isAuthenticated={isAuthenticated} />

          <EventQuestions
            eventId={event._id}
            eventOver={eventOver}
            canAnswer={canAnswerQuestions}
            isAuthenticated={isAuthenticated}
          />
        </div>

        <aside className="h-fit space-y-4 max-lg:order-first lg:sticky lg:top-24">
          <div className="card-surface p-6">
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <FaCalendarAlt className="shrink-0 text-primary-500" />
                <span className="text-slate-600 dark:text-slate-300">{formatDateTimeRange(event.date, event.endDate)}</span>
              </li>
              <li className="flex items-center gap-3">
                <FaMapMarkerAlt className="shrink-0 text-primary-500" />
                <span className="text-slate-600 dark:text-slate-300">{event.location}</span>
              </li>
              <li className="flex items-center gap-3">
                <FaUsers className="shrink-0 text-primary-500" />
                <span className="text-slate-600 dark:text-slate-300">
                  {t("{count}/{capacity} registered", { count: registeredCount, capacity })}
                </span>
              </li>
              {event.averageRating != null && (
                <li className="flex items-center gap-3">
                  <Stars value={Math.round(event.averageRating)} />
                  <span className="text-slate-600 dark:text-slate-300">
                    {event.averageRating.toFixed(1)} · {t(event.ratingCount > 1 ? "{n} ratings" : "{n} rating", { n: event.ratingCount })}
                  </span>
                </li>
              )}
              <li className="flex items-center gap-3">
                <FaTag className="shrink-0 text-primary-500" />
                <span className="text-slate-600 dark:text-slate-300">{event.price ? t(event.price) : t("Free")}</span>
              </li>
            </ul>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full gradient-brand"
                style={{ width: `${Math.min((registeredCount / capacity) * 100, 100)}%` }}
              />
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50"
            >
              <FaShareAlt className="text-xs" /> {t("Share this event")}
            </button>
            {canAnswerQuestions && !isPast && (
              <Link
                to={`/events/${event._id}/poster`}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50"
              >
                <FaPrint className="text-xs" /> {t("Print a poster")}
              </Link>
            )}
            <button
              type="button"
              onClick={() => toggleSaved(event._id)}
              aria-pressed={isSaved(event._id)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50"
            >
              {isSaved(event._id) ? <FaBookmark className="text-xs" /> : <FaRegBookmark className="text-xs" />}
              {isSaved(event._id) ? t("Saved for later") : t("Save for later")}
            </button>

            {confirmedHere && isPast ? (
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <FaCheckCircle /> {myRegistration?.attended ? t("You attended this event") : t("You were registered for this event")}
              </div>
            ) : pendingHere ? (
              <div className="mt-5 space-y-2">
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  {t("Request sent -- waiting for the organisers. A seat is being held for you, and we'll email you when they decide.")}
                </div>
                <button
                  onClick={handleUnregister}
                  disabled={unregistering}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-rose-900/20"
                >
                  <FaTimes className="text-xs" /> {unregistering ? t("Withdrawing...") : t("Withdraw request")}
                </button>
              </div>
            ) : registered ? (
              <div className="mt-5 space-y-2">
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <FaCheckCircle /> {t("You're registered for this event")}
                </div>
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
                >
                  <FaQrcode /> {t("Show my check-in QR")}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={googleCalendarUrl(event)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50"
                  >
                    <FaCalendarPlus className="text-xs" /> {t("Google Calendar")}
                  </a>
                  <button
                    type="button"
                    onClick={() => downloadIcs(event)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50"
                  >
                    <FaCalendarPlus className="text-xs" /> {t("Download .ics")}
                  </button>
                </div>
                <button
                  onClick={handleUnregister}
                  disabled={unregistering}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-rose-900/20"
                >
                  <FaTimes className="text-xs" /> {unregistering ? t("Unregistering...") : t("Unregister")}
                </button>
              </div>
            ) : isPast ? (
              <Button className="mt-5 w-full" disabled variant="outline">
                {t("Event has ended")}
              </Button>
            ) : registrationClosed && !(isFull && isAuthenticated && waitlist?.onWaitlist) ? (
              <Button className="mt-5 w-full" disabled variant="outline">
                {t("Registration has closed")}
              </Button>
            ) : isFull && isAuthenticated && waitlist?.onWaitlist ? (
              <div className="mt-5 space-y-2">
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  {t("You're #{n} on the waitlist. We'll register you and email you if a spot opens.", { n: waitlist.position })}
                </div>
                <button
                  onClick={handleLeaveWaitlist}
                  disabled={waitlistBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-rose-900/20"
                >
                  <FaTimes className="text-xs" /> {waitlistBusy ? t("Leaving...") : t("Leave waitlist")}
                </button>
              </div>
            ) : isFull && isAuthenticated ? (
              <div className="mt-5 space-y-2">
                <p className="text-center text-sm text-slate-500 dark:text-slate-400">{t("This event is full.")}</p>
                <Button className="w-full" variant="outline" onClick={handleJoinWaitlist} disabled={waitlistBusy}>
                  {waitlistBusy ? t("Joining...") : t("Join the waitlist")}
                </Button>
              </div>
            ) : isFull ? (
              <Button className="mt-5 w-full" disabled variant="outline">
                {t("Registration full")}
              </Button>
            ) : isAuthenticated ? (
              <>
              {hasOpenDeadline(event) && (
                <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-300">
                  {t("Registration closes {when}", { when: formatDateTime(event.registrationDeadline) })}
                </p>
              )}
              <Button className="mt-5 w-full" onClick={handleRegisterClick}>
                {event.requiresApproval ? t("Request to join") : t("Register now")}
              </Button>
              </>
            ) : (
              <Link to="/login" state={{ from: `/events/${event._id}` }} className="btn-primary mt-5 w-full">
                {t("Log in to register")}
              </Link>
            )}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="container-page pb-16" aria-labelledby="related-events">
          <h2 id="related-events" className="font-display text-xl font-semibold text-slate-900 dark:text-white">
            {t("More events you may like")}
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((e) => (
              <EventCard key={e._id} event={e} />
            ))}
          </div>
        </section>
      )}

      {/* On a phone the Register card sits far down the page, so the main action is
          also pinned above the tab bar, like the buy button in a shopping app. It is a
          touch shortcut only (hidden from screen readers and the Tab key, which use the
          real button in the card) and never shows on a computer. */}
      {showStickyRegister && (
        <div aria-hidden="true" className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur dark:border-white/10 dark:bg-slate-950/95 lg:hidden print:hidden">
          {isAuthenticated ? (
            <button type="button" tabIndex={-1} onClick={handleRegisterClick} className="btn-primary w-full">
              {event.requiresApproval ? t("Request to join") : t("Register now")}
            </button>
          ) : (
            <Link to="/login" tabIndex={-1} state={{ from: `/events/${event._id}` }} className="btn-primary w-full">
              {t("Log in to register")}
            </Link>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={event.requiresApproval ? t("Request to join this event") : t("Register for this event")}>
        <RegistrationForm event={event} onSuccess={() => setShowModal(false)} />
      </Modal>

      <CheckInQrModal registration={qrOpen ? myRegistration : null} onClose={() => setQrOpen(false)} />
    </div>
  );
}
