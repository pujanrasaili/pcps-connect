import { NavLink } from "react-router-dom";
import {
  FaTachometerAlt,
  FaUserCircle,
  FaCog,
  FaCalendarAlt,
  FaUsers,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import Avatar from "./Avatar";

const LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: FaTachometerAlt },
  { to: "/profile", label: "Profile", icon: FaUserCircle },
  { to: "/events", label: "Events", icon: FaCalendarAlt },
  { to: "/clubs", label: "Clubs", icon: FaUsers },
  { to: "/settings", label: "Settings", icon: FaCog },
];

export default function Sidebar({ className = "" }) {
  const { user } = useAuth();
  const { t } = useLang();

  return (
    <aside className={`card-surface flex min-w-0 flex-col gap-3 p-4 lg:gap-6 lg:p-5 ${className}`}>
      <div className="flex items-center gap-3">
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

      <nav aria-label={t("Dashboard menu")} className="flex flex-wrap gap-1 lg:flex-col">
        {LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors lg:gap-3 lg:py-2.5 ${
                isActive
                  ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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
