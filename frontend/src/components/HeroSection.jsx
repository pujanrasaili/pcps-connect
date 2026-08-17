import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import { FaArrowRight, FaCalendarCheck } from "react-icons/fa";
import campusBuilding from "../assets/images/campus-building.jpg";

export default function HeroSection() {
  const imgRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const offset = Math.min(window.scrollY * 0.25, 120);
        if (imgRef.current) {
          imgRef.current.style.transform = `translateY(${offset}px) scale(1.1)`;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* Brand ribbon */}
      <div className="h-1.5 w-full bg-gradient-to-r from-pcps-red via-primary-500 to-pcps-blue" />

      <div className="relative h-[560px] sm:h-[600px] overflow-hidden">
        <img
          ref={imgRef}
          src={campusBuilding}
          alt="PCPS College campus building"
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
          style={{ transform: "scale(1.1)" }}
        />
        {/* Scrim for text legibility — darker on the left where the copy sits */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

        <div className="container-page relative flex h-full items-center">
          <div className="max-w-xl text-white animate-slide-up">
            <span className="badge border border-white/20 bg-white/10 text-white/90 backdrop-blur">
              Patan College of Professional Studies
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight sm:text-5xl">
              Where PCPS students <br className="hidden sm:block" />
              <span className="text-gradient-brand-light">learn, lead,</span> and belong.
            </h1>
            <p className="mt-5 max-w-lg text-slate-200">
              Discover clubs that match your passion, register for events in
              seconds, and track every step of your campus journey — all in
              one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/clubs" className="btn-on-dark">
                Explore Clubs <FaArrowRight />
              </Link>
              <Link to="/events" className="btn-outline-on-dark">
                <FaCalendarCheck /> Browse Events
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-8 border-t border-white/15 pt-6">
              {[
                ["5", "Active Clubs"],
                ["500+", "Members"],
                ["30+", "Events / Year"],
              ].map(([num, label]) => (
                <div key={label}>
                  <p className="font-display text-2xl font-bold">{num}</p>
                  <p className="text-sm text-slate-300">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
