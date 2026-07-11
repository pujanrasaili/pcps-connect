import { Link } from "react-router-dom";
import { FaArrowRight, FaUsers, FaCalendarAlt, FaTrophy, FaHandshake, FaPlay } from "react-icons/fa";
import HeroSection from "../components/HeroSection";
import ClubCard from "../components/ClubCard";
import EventCard from "../components/EventCard";
import StatsCard from "../components/StatsCard";
import Modal from "../components/Modal";
import { useRef, useState } from "react";
import { clubs } from "../data/clubs";
import { events } from "../data/events";
import campusEvent from "../assets/images/campus-event.jpg";
import reelPoster from "../assets/images/campus-reel-poster.jpg";

export default function Home() {
  const [selectedClub, setSelectedClub] = useState(null);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);
  const featuredClubs = clubs.slice(0, 3);
  const upcomingEvents = events.slice(0, 3);

  const handlePlay = () => {
    setPlaying(true);
    requestAnimationFrame(() => videoRef.current?.play());
  };

  return (
    <div>
      <HeroSection />

      {/* Campus Life */}
      <section className="section-y">
        <div className="container-page">
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary-500">
              On Campus
            </span>
            <h2 className="mt-1 font-display text-3xl font-bold text-slate-800 dark:text-slate-100">
              Life at PCPS
            </h2>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="card-surface overflow-hidden">
              <img
                src={campusEvent}
                alt="Students at a PCPS college event on campus"
                className="h-72 w-full object-cover"
              />
              <div className="p-5">
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  Fests, workshops, and open-air showcases
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Clubs bring the courtyard to life throughout the year —
                  from art showcases to tech demos.
                </p>
              </div>
            </div>

            <div className="card-surface relative overflow-hidden">
              <div className="relative h-72 w-full bg-slate-900">
                {playing ? (
                  <video
                    ref={videoRef}
                    src="/media/campus-reel.mp4"
                    poster={reelPoster}
                    controls
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <button
                    onClick={handlePlay}
                    className="group relative h-full w-full"
                    aria-label="Play PCPS campus reel"
                  >
                    <img
                      src={reelPoster}
                      alt="PCPS campus reel preview"
                      className="h-full w-full object-cover object-top opacity-80 transition-opacity group-hover:opacity-100"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-slate-950/30">
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-primary-600 shadow-soft transition-transform group-hover:scale-105">
                        <FaPlay className="ml-1 text-xl" />
                      </span>
                    </span>
                  </button>
                )}
              </div>
              <div className="p-5">
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  Watch: A day at PCPS
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Classes, clubs, and campus moments — straight from students.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="section-y bg-white dark:bg-slate-900/40">
        <div className="container-page grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatsCard icon={FaUsers} label="Active Members" value={571} accent="primary" />
          <StatsCard icon={FaCalendarAlt} label="Events This Year" value={32} accent="accent" />
          <StatsCard icon={FaTrophy} label="Clubs on Campus" value={5} accent="emerald" />
          <StatsCard icon={FaHandshake} label="Partner Organizations" value={12} accent="amber" />
        </div>
      </section>

      {/* Featured Clubs */}
      <section className="section-y">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
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
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredClubs.map((club) => (
              <ClubCard key={club.id} club={club} onView={setSelectedClub} />
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="section-y">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
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
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-y">
        <div className="container-page">
          <div className="gradient-brand relative overflow-hidden rounded-2xl px-8 py-14 text-center text-white">
            <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Ready to make your mark at PCPS?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">
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
