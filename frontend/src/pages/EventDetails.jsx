import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import {
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUsers,
  FaTag,
  FaCheckCircle,
  FaArrowLeft,
  FaTimes,
} from "react-icons/fa";
import { useEvents } from "../context/EventsContext";
import { useAuth } from "../context/AuthContext";
import { useRegistrations } from "../context/RegistrationContext";
import RegistrationForm from "../components/RegistrationForm";
import Modal from "../components/Modal";
import Button from "../components/Button";
import { formatDate } from "../utils/formatDate";
import { resolveUploadUrl } from "../services/api";

export default function EventDetails() {
  const { id } = useParams();
  const { getEventById } = useEvents();
  const { isAuthenticated } = useAuth();
  const { isRegistered, cancelRegistration } = useRegistrations();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [unregistering, setUnregistering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
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
  const isPast = new Date(event.date) < new Date();
  const registered = isRegistered(event._id);

  const handleRegisterClick = () => {
    if (!isAuthenticated) return;
    setShowModal(true);
  };

  const handleUnregister = async () => {
    setUnregistering(true);
    await cancelRegistration(event._id);
    setUnregistering(false);
  };

  return (
    <div>
      <div className="relative h-64 sm:h-80">
        <img src={resolveUploadUrl(event.image)} alt={event.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent" />
        <div className="container-page absolute inset-x-0 bottom-6 text-white">
          <Link to="/events" className="mb-3 inline-flex items-center gap-1.5 text-sm text-white/85 hover:text-white">
            <FaArrowLeft className="text-xs" /> Back to events
          </Link>
          <span className="badge bg-white/20 backdrop-blur">{event.category}</span>
          {isPast && (
            <span className="badge ml-2 bg-slate-700/60 backdrop-blur">Past event</span>
          )}
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{event.title}</h1>
        </div>
      </div>

      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_340px]">
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
                  <p className="text-sm text-primary-600 dark:text-primary-400">{event.createdBy.email}</p>
                </div>
              </div>
            </div>
          )}
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

            {registered && isPast ? (
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <FaCheckCircle /> You attended this event
              </div>
            ) : registered ? (
              <div className="mt-5 space-y-2">
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <FaCheckCircle /> You're registered for this event
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
            ) : isFull ? (
              <Button className="mt-5 w-full" disabled variant="outline">
                Registration full
              </Button>
            ) : isAuthenticated ? (
              <Button className="mt-5 w-full" onClick={handleRegisterClick}>
                Register now
              </Button>
            ) : (
              <Link to="/login" state={{ from: `/events/${event._id}` }} className="btn-primary mt-5 w-full">
                Log in to register
              </Link>
            )}
          </div>
        </aside>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Register for this event">
        <RegistrationForm event={event} onSuccess={() => setShowModal(false)} />
      </Modal>
    </div>
  );
}
