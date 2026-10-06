import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { FaChartPie, FaUsers, FaCalendarAlt, FaUserShield } from "react-icons/fa";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ScrollToTop from "../components/ScrollToTop";
import { api } from "../services/api";

const ADMIN_LINKS = [
  { to: "/admin", label: "Overview", icon: FaChartPie, end: true },
  { to: "/admin/clubs", label: "Clubs", icon: FaUsers },
  { to: "/admin/events", label: "Events", icon: FaCalendarAlt },
  { to: "/admin/users", label: "Users", icon: FaUserShield, badgeKey: "pending" },
];

export default function AdminLayout() {
  // So an admin can see "someone's waiting for approval" from any admin
  // page via the sidebar, not just after clicking into Users. This layout
  // stays mounted across admin nav (only the Outlet content swaps), so
  // re-fetching on every pathname change keeps the badge from going stale
  // right after an admin approves/rejects someone and clicks elsewhere.
  const [pendingCount, setPendingCount] = useState(0);
  const { pathname } = useLocation();

  useEffect(() => {
    api
      .get("/admin/users")
      .then((res) => {
        const count = res.data.users.filter((u) => u.approvalStatus === "pending").length;
        setPendingCount(count);
      })
      .catch(() => {});
  }, [pathname]);

  const badges = { pending: pendingCount };

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
              {ADMIN_LINKS.map(({ to, label, icon: Icon, end, badgeKey }) => {
                const badgeCount = badgeKey ? badges[badgeKey] : 0; 
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`
                    }
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="text-base" /> {label}
                    </span>
                    {badgeCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white">
                        {badgeCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
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
