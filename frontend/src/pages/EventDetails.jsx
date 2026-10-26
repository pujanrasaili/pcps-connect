import { useEffect, useMemo, useState } from "react";
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
  FaBookmark,
  FaRegBookmark,
} from "react-icons/fa";
import { useEvents } from "../context/EventsContext";
import { useAuth } from "../context/AuthContext";
import { useLedClubs } from "../hooks/useLedClubs";
import EventQuestions from "../components/EventQuestions";
import { useRegistrations } from "../context/RegistrationContext";
import RegistrationForm from "../components/RegistrationForm";
import Modal from "../components/Modal";
import Button from "../components/Button";
import { formatDate, formatDateTime, isPastEvent } from "../utils/formatDate";
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

export default function EventDetails() {
  const { id } = useParams();
  const { getEventById, events: allEvents } = useEvents();
  const { isAuthenticated, user } = useAuth();
  const { clubs: ledClubs } = useLedClubs();
  const { registrations, isRegistered, isPending, cancelRegistration } = useRegistrations();
  const [event, setEvent] = useState(null);

  useEffect(() => {
    document.title = eventTitle(event?.title);
  }, [event?.title]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
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
    setWaitlist(null);
    getEventById(id).then((result) => {
      if (cancelled) return;
      if (!result) {
        setNotFound(true);
      } else {
        setEvent(result);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id, getEventById]);

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
  const confirmedHere = registered && !pendingHere;

  const handleJoinWaitlist = async () => {
    setWaitlistBusy(true);
    try {
      const res = await api.post(`/waitlist/${event._id}`);
      setWaitlist({ onWaitlist: true, position: res.data.position });
      toast.success("You're on the waitlist. We'll email you if a spot opens.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't join the waitlist"));
    } finally {
      setWaitlistBusy(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    setWaitlistBusy(true);
    try {
      await api.delete(`/waitlist/${event._id}`);
      setWaitlist({ onWaitlist: false });
      toast.info("Removed from the waitlist.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't leave the waitlist"));
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
      if (result === "copied") toast.success("Link copied to clipboard.");
    } catch {
      toast.error("Couldn't share this event. Copy the link from your address bar instead.");
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
        <img src={resolveUploadUrl(event.image, 1600)} alt={event.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/55 to-slate-900/15" />
        <div className="container-page absolute inset-x-0 bottom-6 text-white">
          <Link to="/events" className="mb-3 inline-flex items-center gap-1.5 text-sm text-white hover:underline">
            <FaArrowLeft className="text-xs" /> Back to events
          </Link>
          <span className="badge bg-white/20 backdrop-blur">{event.category}</span>
          {event.club?.name && (
            <span className="badge ml-2 bg-white/20 backdrop-blur">Hosted by {event.club.name}</span>
          )}
          {isPast && (
            <span className="badge ml-2 bg-slate-700/60 backdrop-blur">Past event</span>
          )}
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{event.title}</h1>
        </div>
      </div>

      <div className="container-page grid grid-cols-1 gap-8 py-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <div className="card-surface p-6">
            <h2 className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100">
              About this event
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">{event.description}</p>
          </div>

          {event.createdBy && (
            <div className="card-surface p-6">
              <h2 className="font-display text-xl font-semibold text-slate-800 dark:text-slate-100">
                Organizer
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
                          Log in
                        </Link>{" "}
                        to see their contact email
                      </p>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          <EventQuestions
            eventId={event._id}
            eventOver={eventOver}
            canAnswer={canAnswerQuestions}
            isAuthenticated={isAuthenticated}
          />
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="card-surface p-6">
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <FaCalendarAlt className="text-primary-500" />
                <span className="text-slate-600 dark:text-slate-300">{formatDate(event.date)}</span>
              </li>
              <li className="flex items-center gap-3">
                <FaMapMarkerAlt className="text-primary-500" />
                <span className="text-slate-600 dark:text-slate-300">{event.location}</span>
              </li>
              <li className="flex items-center gap-3">
                <FaUsers className="text-primary-500" />
                <span className="text-slate-600 dark:text-slate-300">
                  {registeredCount}/{capacity} registered
                </span>
              </li>
              {event.averageRating != null && (
                <li className="flex items-center gap-3">
                  <Stars value={Math.round(event.averageRating)} />
                  <span className="text-slate-600 dark:text-slate-300">
                    {event.averageRating.toFixed(1)} · {event.ratingCount} rating{event.ratingCount > 1 ? "s" : ""}
                  </span>
                </li>
              )}
              <li className="flex items-center gap-3">
                <FaTag className="text-primary-500" />
                <span className="text-slate-600 dark:text-slate-300">{event.price || "Free"}</span>
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
              <FaShareAlt className="text-xs" /> Share this event
            </button>
            <button
              type="button"
              onClick={() => toggleSaved(event._id)}
              aria-pressed={isSaved(event._id)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50"
            >
              {isSaved(event._id) ? <FaBookmark className="text-xs" /> : <FaRegBookmark className="text-xs" />}
              {isSaved(event._id) ? "Saved for later" : "Save for later"}
            </button>

            {confirmedHere && isPast ? (
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <FaCheckCircle /> {myRegistration?.attended ? "You attended this event" : "You were registered for this event"}
              </div>
            ) : pendingHere ? (
              <div className="mt-5 space-y-2">
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  Request sent -- waiting for the organisers. A seat is being held for you, and we'll email you when they decide.
                </div>
                <button
                  onClick={handleUnregister}
                  disabled={unregistering}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-rose-900/20"
                >
                  <FaTimes className="text-xs" /> {unregistering ? "Withdrawing..." : "Withdraw request"}
                </button>
              </div>
            ) : registered ? (
              <div className="mt-5 space-y-2">
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <FaCheckCircle /> You're registered for this event
                </div>
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
                >
                  <FaQrcode /> Show my check-in QR
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={googleCalendarUrl(event)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50"
                  >
                    <FaCalendarPlus className="text-xs" /> Google Calendar
                  </a>
                  <button
                    type="button"
                    onClick={() => downloadIcs(event)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50"
                  >
                    <FaCalendarPlus className="text-xs" /> Download .ics
                  </button>
                </div>
                <button
                  onClick={handleUnregister}
                  disabled={unregistering}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-rose-900/20"
                >
                  <FaTimes className="text-xs" /> {unregistering ? "Unregistering..." : "Unregister"}
                </button>
              </div>
            ) : isPast ? (
              <Button className="mt-5 w-full" disabled variant="outline">
                Event has ended
              </Button>
            ) : registrationClosed && !(isFull && isAuthenticated && waitlist?.onWaitlist) ? (
              <Button className="mt-5 w-full" disabled variant="outline">
                Registration has closed
              </Button>
            ) : isFull && isAuthenticated && waitlist?.onWaitlist ? (
              <div className="mt-5 space-y-2">
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  You're #{waitlist.position} on the waitlist. We'll register you and email you if a spot opens.
                </div>
                <button
                  onClick={handleLeaveWaitlist}
                  disabled={waitlistBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-rose-900/20"
                >
                  <FaTimes className="text-xs" /> {waitlistBusy ? "Leaving..." : "Leave waitlist"}
                </button>
              </div>
            ) : isFull && isAuthenticated ? (
              <div className="mt-5 space-y-2">
                <p className="text-center text-sm text-slate-500 dark:text-slate-400">This event is full.</p>
                <Button className="w-full" variant="outline" onClick={handleJoinWaitlist} disabled={waitlistBusy}>
                  {waitlistBusy ? "Joining..." : "Join the waitlist"}
                </Button>
              </div>
            ) : isFull ? (
              <Button className="mt-5 w-full" disabled variant="outline">
                Registration full
              </Button>
            ) : isAuthenticated ? (
              <>
              {hasOpenDeadline(event) && (
                <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-300">
                  Registration closes {formatDateTime(event.registrationDeadline)}
                </p>
              )}
              <Button className="mt-5 w-full" onClick={handleRegisterClick}>
                {event.requiresApproval ? "Request to join" : "Register now"}
              </Button>
              </>
            ) : (
              <Link to="/login" state={{ from: `/events/${event._id}` }} className="btn-primary mt-5 w-full">
                Log in to register
              </Link>
            )}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="container-page pb-16" aria-labelledby="related-events">
          <h2 id="related-events" className="font-display text-xl font-semibold text-slate-900 dark:text-white">
            More events you may like
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((e) => (
              <EventCard key={e._id} event={e} />
            ))}
          </div>
        </section>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={event.requiresApproval ? "Request to join this event" : "Register for this event"}>
        <RegistrationForm event={event} onSuccess={() => setShowModal(false)} />
      </Modal>

      <CheckInQrModal registration={qrOpen ? myRegistration : null} onClose={() => setQrOpen(false)} />
    </div>
  );
}
