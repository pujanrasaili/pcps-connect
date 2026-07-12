import { Link } from "react-router-dom";
import { FaArrowRight, FaUsers, FaCalendarAlt, FaTrophy, FaHandshake, FaPlay, FaExpand } from "react-icons/fa";
import HeroSection from "../components/HeroSection";
import ClubCard from "../components/ClubCard";
import EventCard from "../components/EventCard";
import StatsCard from "../components/StatsCard";
import Modal from "../components/Modal";
import VideoLightbox from "../components/VideoLightbox";
import Reveal from "../components/Reveal";
import { useTilt } from "../hooks/useTilt";
import { useState } from "react";
import { clubs } from "../data/clubs";
import { events } from "../data/events";
import campusEvent from "../assets/images/campus-event.jpg";
import reelPoster from "../assets/images/campus-reel-poster.jpg";

export default function Home() {
  const [selectedClub, setSelectedClub] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const featuredClubs = clubs.slice(0, 3);
  const upcomingEvents = events.slice(0, 3);
  const photoTilt = useTilt({ max: 5, scale: 1.01 });
  const videoTilt = useTilt({ max: 5, scale: 1.01 });

  return (
    <div>
      <HeroSection />

      {/* Campus Life */}
      <section className="section-y">
        <div className="container-page">
          <Reveal className="text-center">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary-500">
              On Campus
            </span>
            <h2 className="mt-1 font-display text-3xl font-bold text-slate-800 dark:text-slate-100">
              Life at PCPS
            </h2>
          </Reveal>

          <div className="mt-8 grid gap-6 lg:grid-cols-2 items-stretch">
            <Reveal direction="left" className="h-full">
              <div
                ref={photoTilt.ref}
                onMouseMove={photoTilt.onMouseMove}
                onMouseLeave={photoTilt.onMouseLeave}
                style={photoTilt.style}
                className="card-surface flex h-full flex-col overflow-hidden"
              >
                <img
                  src={campusEvent}
                  alt="Students at a PCPS college event on campus"
                  className="h-72 w-full shrink-0 object-cover"
                />
                <div className="flex flex-1 flex-col justify-center p-5">
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    Fests, workshops, and open-air showcases
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Clubs bring the courtyard to life throughout the year —
                    from art showcases to tech demos.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal direction="right" delay={100} className="h-full">
              <div
                ref={videoTilt.ref}
                onMouseMove={videoTilt.onMouseMove}
                onMouseLeave={videoTilt.onMouseLeave}
                style={videoTilt.style}
                className="card-surface relative flex h-full flex-col overflow-hidden"
              >
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="group relative block h-72 w-full shrink-0 bg-slate-900"
                  aria-label="Watch the full PCPS campus reel"
                >
                  <video
                    src="/media/campus-reel.mp4"
                    poster={reelPoster}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="auto"
                    className="h-full w-full object-cover object-top opacity-90 transition-opacity group-hover:opacity-100"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-slate-950/10 transition-colors group-hover:bg-slate-950/30">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-primary-600 opacity-0 shadow-soft transition-all group-hover:scale-105 group-hover:opacity-100">
                      <FaExpand className="text-lg" />
                    </span>
                  </span>
                  <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <FaPlay className="text-[10px]" /> Playing
                  </span>
                </button>
                <div className="flex flex-1 flex-col justify-center p-5">
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    Watch: A day at PCPS
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Classes, clubs, and campus moments — click to watch in full.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <VideoLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        src="/media/campus-reel.mp4"
        poster={reelPoster}
      />

      {/* Stats */}
      <section className="section-y bg-white dark:bg-slate-900/40">
        <div className="container-page grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            [FaUsers, "Active Members", 571, "primary"],
            [FaCalendarAlt, "Events This Year", 32, "accent"],
            [FaTrophy, "Clubs on Campus", 5, "emerald"],
            [FaHandshake, "Partner Organizations", 12, "amber"],
          ].map(([Icon, label, value, accent], i) => (
            <Reveal key={label} delay={i * 80}>
              <StatsCard icon={Icon} label={label} value={value} accent={accent} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Featured Clubs */}
      <section className="section-y">
        <div className="container-page">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wide text-primary-500">
                Get Involved
              </span>
              <h2 className="mt-1 font-display text-3xl font-bold text-slate-800 dark:text-slate-100">
                Featured Clubs
              </h2>
            </div>
            <Link to="/clubs" className="flex items-center gap-1 font-semibold text-primary-600 dark:text-primary-400">
              View all clubs <FaArrowRight className="text-xs" />
            </Link>
          </Reveal>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredClubs.map((club, i) => (
              <Reveal key={club.id} delay={i * 100}>
                <ClubCard club={club} onView={setSelectedClub} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="section-y">
        <div className="container-page">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wide text-accent-500">
                Mark Your Calendar
              </span>
              <h2 className="mt-1 font-display text-3xl font-bold text-slate-800 dark:text-slate-100">
                Upcoming Events
              </h2>
            </div>
            <Link to="/events" className="flex items-center gap-1 font-semibold text-primary-600 dark:text-primary-400">
              View all events <FaArrowRight className="text-xs" />
            </Link>
          </Reveal>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event, i) => (
              <Reveal key={event.id} delay={i * 100}>
                <EventCard event={event} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-y">
        <div className="container-page">
          <Reveal direction="scale">
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-8 py-16 text-center text-white">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-600/90 via-slate-900 to-accent-700/80" />
              <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-400/20 blur-3xl" />
              <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-accent-400/20 blur-3xl" />
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full text-white/[0.04]"
                preserveAspectRatio="none"
              >
                <defs>
                  <pattern id="cta-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M40 0H0V40" fill="none" stroke="currentColor" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#cta-grid)" />
              </svg>

              <div className="relative">
                <h2 className="font-display text-3xl font-bold sm:text-4xl">
                  Ready to make your mark at PCPS?
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-white/80">
                  Join a club, register for an event, and start building the
                  college experience you'll remember.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-4">
                  <Link to="/register" className="btn-on-dark">
                    Create your account
                  </Link>
                  <Link to="/clubs" className="btn-outline-on-dark">
                    Browse clubs
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Modal isOpen={!!selectedClub} onClose={() => setSelectedClub(null)} title={selectedClub?.name}>
        {selectedClub && (
          <div>
            <img src={selectedClub.image} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" />
            <p className="text-sm text-slate-600 dark:text-slate-300">{selectedClub.longDescription}</p>
            <Link
              to="/clubs"
              onClick={() => setSelectedClub(null)}
              className="btn-primary mt-5 w-full"
            >
              See all clubs
            </Link>
          </div>
        )}
      </Modal>
    </div>
  );
}