import { useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useScrollActiveIntoView } from "../hooks/useScrollActiveIntoView";
import {
  FaTachometerAlt,
  FaUserCircle,
  FaCog,
  FaCalendarAlt,
  FaUsers,
  FaClipboardList,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import Avatar from "./Avatar";

const LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: FaTachometerAlt },
  { to: "/profile", label: "Profile", icon: FaUserCircle },
  { to: "/events", label: "Events", icon: FaCalendarAlt },
  { to: "/clubs", label: "Clubs", icon: FaUsers },
  { to: "/board", label: "Notice board", icon: FaClipboardList },
  { to: "/settings", label: "Settings", icon: FaCog },
];

export default function Sidebar({ className = "" }) {
  const { user } = useAuth();
  const { t } = useLang();
  const menuRef = useRef(null);
  const { pathname } = useLocation();
  useScrollActiveIntoView(menuRef, pathname);

  // On a phone this is just a row of swipeable buttons under the top bar (no card,
  // no avatar: the tab bar and the page itself already say who and where you are).
  return (
    <aside className={`card-surface flex min-w-0 flex-col gap-3 p-4 max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none dark:max-lg:bg-transparent lg:gap-6 lg:p-5 ${className}`}>
      <div className="flex items-center gap-3 max-lg:hidden">
        <Avatar user={user} className="h-11 w-11" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
            {user?.name}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {user?.studentId}
          </p>
        </div>
      </div>

      <nav ref={menuRef} aria-label={t("Dashboard menu")} className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
        {LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors lg:gap-3 lg:py-2.5 ${
                isActive
                  ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300 max-lg:bg-primary-500 max-lg:text-white dark:max-lg:bg-primary-500 dark:max-lg:text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 max-lg:bg-white max-lg:shadow-card dark:max-lg:bg-slate-900"
              }`
            }
          >
            <Icon className="text-base" /> {t(label)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
