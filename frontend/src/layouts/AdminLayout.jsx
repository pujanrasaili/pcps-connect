import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { FaChartPie, FaUsers, FaCalendarAlt, FaUserShield, FaHistory, FaQrcode, FaEnvelope } from "react-icons/fa";
import Navbar from "../components/Navbar";
import MobileTabBar from "../components/MobileTabBar";
import SlowServerNotice from "../components/SlowServerNotice";
import SkipLink from "../components/SkipLink";
import Footer from "../components/Footer";
import ScrollToTop from "../components/ScrollToTop";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { useScrollActiveIntoView } from "../hooks/useScrollActiveIntoView";

const ADMIN_LINKS = [
  { to: "/admin", label: "Overview", icon: FaChartPie, end: true },
  { to: "/admin/clubs", label: "Clubs", icon: FaUsers },
  { to: "/admin/events", label: "Events", icon: FaCalendarAlt },
  { to: "/admin/check-in", label: "Check-in", icon: FaQrcode },
  { to: "/admin/users", label: "Users", icon: FaUserShield, badgeKey: "pending" },
  { to: "/admin/messages", label: "Messages", icon: FaEnvelope, badgeKey: "messages" },
  { to: "/admin/activity", label: "Activity", icon: FaHistory },
];

// Club leaders (non-admins) only get the pages they can actually use.
const LEADER_LINKS = [
  { to: "/admin/events", label: "My events", icon: FaCalendarAlt },
  { to: "/admin/my-clubs", label: "My clubs", icon: FaUsers },
  { to: "/admin/check-in", label: "Check-in", icon: FaQrcode },
];

export default function AdminLayout() {
  // So an admin can see "someone's waiting for approval" from any admin
  // page via the sidebar, not just after clicking into Users. This layout
  // stays mounted across admin nav (only the Outlet content swaps), so
  // re-fetching on every pathname change keeps the badge from going stale
  // right after an admin approves/rejects someone and clicks elsewhere.
  const [pendingCount, setPendingCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const { pathname } = useLocation();
  const menuRef = useRef(null);
  const { user } = useAuth();
  const { t } = useLang();
  const isAdmin = user?.role === "admin";
  const links = isAdmin ? ADMIN_LINKS : LEADER_LINKS;
  // Re-run when the role arrives and the menu gets longer, not just on a page change.
  useScrollActiveIntoView(menuRef, `${pathname}|${links.length}`);

  useEffect(() => {
    if (!isAdmin) return;
    api
      .get("/admin/users")
      .then((res) => {
        const count = res.data.users.filter((u) => u.approvalStatus === "pending").length;
        setPendingCount(count);
      })
      .catch(() => {});
  }, [pathname, isAdmin]);

  // Unanswered Contact-form messages. The Messages page announces its own
  // changes so this badge doesn't wait for the next navigation.
  useEffect(() => {
    if (!isAdmin) return undefined;
    const load = () =>
      api
        .get("/admin/messages")
        .then((res) => setMessageCount(res.data.unhandled || 0))
        .catch(() => {});
    load();
    window.addEventListener("pcps:messages-changed", load);
    return () => window.removeEventListener("pcps:messages-changed", load);
  }, [pathname, isAdmin]);

  const badges = { pending: pendingCount, messages: messageCount };

  return (
    <div className="flex min-h-screen flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <ScrollToTop />
      <SkipLink />
      <Navbar />
      <SlowServerNotice />
      <main id="main-content" tabIndex={-1} className="flex-1 bg-slate-50 dark:bg-slate-950 outline-none">
        <div className="container-page grid grid-cols-1 gap-6 py-8 lg:grid-cols-[220px_1fr]">
          <aside className="card-surface h-fit p-4 max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none dark:max-lg:bg-transparent lg:sticky lg:top-24">
            <p className="px-2 pb-2 text-xs max-lg:sr-only lg:pb-3 font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {isAdmin ? t("Admin Panel") : t("Club Leader")}
            </p>
            <nav ref={menuRef} aria-label={t("Admin menu")} className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
              {links.map(({ to, label, icon: Icon, end, badgeKey }) => {
                const badgeCount = badgeKey ? badges[badgeKey] : 0; 
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors lg:gap-3 lg:py-2.5 ${
                        isActive
                          ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300 max-lg:bg-primary-500 max-lg:text-white dark:max-lg:bg-primary-500 dark:max-lg:text-white"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 max-lg:bg-white max-lg:shadow-card dark:max-lg:bg-slate-900"
                      }`
                    }
                  >
                    <span className="flex items-center gap-2 lg:gap-3">
                      <Icon className="shrink-0 text-base" /> {t(label)}
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
      <MobileTabBar />
    </div>
  );
}
