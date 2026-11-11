import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FaHome,
  FaCalendarAlt,
  FaUsers,
  FaClipboardList,
  FaUserCircle,
  FaSignInAlt,
  FaEnvelope,
  FaCog,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { useLedClubs } from "../hooks/useLedClubs";

// Pages that belong under the "Dashboard" tab, so it stays lit on them.
const ME_PREFIXES = ["/dashboard", "/profile", "/settings", "/record"];

// The phone's bottom tab bar, like the ones in a native app: the five places
// people go most are one thumb-tap away. On bigger screens the top bar already
// does this job, so it is hidden from 768px up (md). Club leaders and admins get
// a Manage tab in place of the notice board; the board is still one tap away
// in the Dashboard menu.
export default function MobileTabBar() {
  const { isAuthenticated, user } = useAuth();
  const { clubs: ledClubs } = useLedClubs();
  const { t } = useLang();
  const { pathname } = useLocation();
  const [typing, setTyping] = useState(false);

  // Hide the bar while the on-screen keyboard is up, so it never sits on top of
  // the field being typed into (apps do the same).
  useEffect(() => {
    const isField = (el) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    // The bar comes back a moment AFTER the field loses focus, not at once: tapping
    // a button (Send, Save) blurs the field first, and a bar that popped up in that
    // instant could land on top of the button and swallow the tap.
    let timer;
    const onIn = (e) => {
      if (!isField(e.target)) return;
      clearTimeout(timer);
      setTyping(true);
    };
    const onOut = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setTyping(false), 300);
    };
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);

  const isAdmin = user?.role === "admin";
  const canManage = isAdmin || ledClubs.length > 0;
  const tabs = [
    { to: "/", label: "Home", icon: FaHome, end: true },
    { to: "/events", label: "Events", icon: FaCalendarAlt },
    { to: "/clubs", label: "Clubs", icon: FaUsers },
  ];
  if (!isAuthenticated) {
    tabs.push({ to: "/contact", label: "Contact", icon: FaEnvelope });
    tabs.push({ to: "/login", label: "Log in", icon: FaSignInAlt });
  } else {
    tabs.push(
      canManage
        ? { to: isAdmin ? "/admin" : "/admin/events", label: "Manage", icon: FaCog, active: pathname.startsWith("/admin") }
        : { to: "/board", label: "Notice board", icon: FaClipboardList },
    );
    tabs.push({
      to: "/dashboard",
      label: "Dashboard",
      icon: FaUserCircle,
      active: ME_PREFIXES.some((p) => pathname.startsWith(p)),
    });
  }

  return (
    <nav
      aria-label={t("Quick menu")}
      hidden={typing}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-slate-950/95 md:hidden print:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {tabs.map(({ to, label, icon: Icon, end, active }) => (
          <li key={to} className="min-w-0 flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) => {
                const on = active ?? isActive;
                return `flex h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors active:bg-slate-100 dark:active:bg-slate-800 ${
                  on ? "text-primary-600 dark:text-primary-300" : "text-slate-600 dark:text-slate-400"
                }`;
              }}
            >
              {({ isActive }) => {
                const on = active ?? isActive;
                return (
                  <>
                    <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${on ? "bg-primary-50 dark:bg-primary-900/40" : ""}`}>
                      <Icon className="text-lg" aria-hidden="true" />
                    </span>
                    <span className="max-w-full truncate leading-none">{t(label)}</span>
                  </>
                );
              }}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
