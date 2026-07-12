import { Link } from "react-router-dom";
import { FaMapMarkerAlt, FaUsers } from "react-icons/fa";
import { formatDay, formatMonth } from "../utils/formatDate";
import { useTilt } from "../hooks/useTilt";

export default function EventCard({ event }) {
  const spotsLeft = event.capacity - event.registered;
  const isFillingUp = spotsLeft <= 15 && spotsLeft > 0;
  const isFull = spotsLeft <= 0;
  const tilt = useTilt({ max: 6, scale: 1.015 });

  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      style={tilt.style}
      className="group card-surface overflow-hidden transition-shadow duration-300 hover:shadow-soft"
    >
      <div className="relative h-44 overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent" />
        <div className="absolute left-3 top-3 flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-white dark:bg-slate-900 shadow-md">
          <span className="text-xs font-bold text-accent-500">
            {formatMonth(event.date)}
          </span>
          <span className="text-lg font-bold leading-none text-slate-800 dark:text-slate-100">
            {formatDay(event.date)}
          </span>
        </div>
        <span className="badge absolute right-3 top-3 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200">
          {event.category}
        </span>
        <div className="absolute bottom-3 left-4 right-4 text-white">
          <p className="text-xs font-medium opacity-90">{event.club}</p>
          <h3 className="font-display text-lg font-semibold leading-tight">
            {event.title}
          </h3>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <FaMapMarkerAlt className="text-primary-500 shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <FaUsers className="text-primary-500 shrink-0" />
          {isFull ? (
            <span className="font-medium text-rose-500">Fully booked</span>
          ) : isFillingUp ? (
            <span className="font-medium text-amber-500">{spotsLeft} spots left</span>
          ) : (
            <span>{event.registered}/{event.capacity} registered</span>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
            {event.price}
          </span>
          <Link to={`/events/${event.id}`} className="btn-outline !px-4 !py-2 text-sm">
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}
