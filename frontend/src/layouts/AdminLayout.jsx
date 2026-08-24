import { NavLink, Outlet } from "react-router-dom";
import { FaChartPie, FaUsers, FaCalendarAlt, FaUserShield } from "react-icons/fa";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ScrollToTop from "../components/ScrollToTop";

const ADMIN_LINKS = [
  { to: "/admin", label: "Overview", icon: FaChartPie, end: true },
  { to: "/admin/clubs", label: "Clubs", icon: FaUsers },
  { to: "/admin/events", label: "Events", icon: FaCalendarAlt },
  { to: "/admin/users", label: "Users", icon: FaUserShield },
];

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1 bg-slate-50 dark:bg-slate-950">
        <div className="container-page grid gap-6 py-8 lg:grid-cols-[220px_1fr]">
          <aside className="card-surface h-fit p-4 lg:sticky lg:top-24">
            <p className="px-2 pb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Admin Panel
            </p>
            <nav className="flex flex-col gap-1">
              {ADMIN_LINKS.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
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
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
