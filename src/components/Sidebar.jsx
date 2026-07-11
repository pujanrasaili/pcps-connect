import { NavLink } from "react-router-dom";
import {
  FaTachometerAlt,
  FaUserCircle,
  FaCog,
  FaCalendarAlt,
  FaUsers,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: FaTachometerAlt },
  { to: "/profile", label: "Profile", icon: FaUserCircle },
  { to: "/events", label: "Events", icon: FaCalendarAlt },
  { to: "/clubs", label: "Clubs", icon: FaUsers },
  { to: "/settings", label: "Settings", icon: FaCog },
];

export default function Sidebar({ className = "" }) {
  const { user } = useAuth();

  return (
    <aside className={`card-surface flex flex-col gap-6 p-5 ${className}`}>
      <div className="flex items-center gap-3">
        <img src={user?.avatar} alt="" className="h-11 w-11 rounded-full" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
            {user?.name}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {user?.studentId}
          </p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`
            }
          >
            <Icon className="text-base" /> {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
