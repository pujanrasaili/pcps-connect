import { useEffect, useRef, useState } from "react";
import { FaSyncAlt } from "react-icons/fa";
import { useEvents } from "../context/EventsContext";
import { useClubs } from "../context/ClubsContext";
import { useRegistrations } from "../context/RegistrationContext";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";

const TRIGGER = 70; // how far (after the finger's drag is eased) counts as "pull to refresh"
const MAX = 110;

// Pull the page down from the very top on a phone to reload the events, clubs and
// the student's registrations, like in a phone app. It matters most when the site
// is installed on the home screen, where there is no browser reload button. It
// only starts at the top of the page, never while a pop-up is open, and ignores
// mostly sideways swipes (such as the menu row).
export default function PullToRefresh() {
  const { refreshEvents } = useEvents();
  const { refreshClubs } = useClubs();
  const { refreshRegistrations } = useRegistrations();
  const { isAuthenticated } = useAuth();
  const { t } = useLang();
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const state = useRef({ x: 0, y: 0, active: false, pull: 0 });
  const latest = useRef({});
  useEffect(() => {
    latest.current = { refreshEvents, refreshClubs, refreshRegistrations, isAuthenticated, busy };
  });

  useEffect(() => {
    const phone = () => window.matchMedia("(max-width: 767px)").matches;
    const start = (e) => {
      const s = state.current;
      s.active = phone() && window.scrollY <= 0 && !latest.current.busy && !document.querySelector("[role='dialog']") && e.touches.length === 1;
      s.pull = 0;
      s.x = e.touches[0].clientX;
      s.y = e.touches[0].clientY;
    };
    const move = (e) => {
      const s = state.current;
      if (!s.active) return;
      const dx = e.touches[0].clientX - s.x;
      const dy = e.touches[0].clientY - s.y;
      if (dy <= 0 || Math.abs(dx) > dy || window.scrollY > 0) {
        if (s.pull) setPull(0);
        s.pull = 0;
        if (dy <= 0) s.active = false;
        return;
      }
      s.pull = Math.min(MAX, dy * 0.5);
      setPull(s.pull);
    };
    const end = async () => {
      const s = state.current;
      const reached = s.active && s.pull >= TRIGGER;
      s.active = false;
      s.pull = 0;
      if (!reached) {
        setPull(0);
        return;
      }
      setBusy(true);
      setPull(TRIGGER);
      const { refreshEvents: ev, refreshClubs: cl, refreshRegistrations: rg, isAuthenticated: authed } = latest.current;
      await Promise.allSettled([ev(), cl(), authed ? rg() : null, new Promise((r) => setTimeout(r, 600))]);
      setBusy(false);
      setPull(0);
    };
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: true });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", end);
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", end);
    };
  }, []);

  const visible = pull > 8 || busy;
  return (
    <>
      {busy && <span role="status" className="sr-only">{t("Refreshing...")}</span>}
      {visible && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-1/2 top-20 z-30 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-white text-primary-600 shadow-soft dark:bg-slate-800 dark:text-primary-300 md:hidden"
          style={{ transform: `translate(-50%, ${Math.round(pull * 0.6)}px)`, opacity: Math.min(1, pull / 40) }}
        >
          <FaSyncAlt className={busy ? "motion-safe:animate-spin" : ""} style={busy ? undefined : { transform: `rotate(${pull * 3}deg)` }} />
        </div>
      )}
    </>
  );
}
