import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import SkipLink from "../components/SkipLink";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";
import ScrollToTop from "../components/ScrollToTop";
import { useAuth } from "../context/AuthContext";

export default function DashboardLayout() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <SkipLink />
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 bg-slate-50 dark:bg-slate-950 outline-none">
        <div className={`container-page grid grid-cols-1 gap-6 py-8 ${isAuthenticated ? "lg:grid-cols-[260px_1fr]" : ""}`}>
          {/* No menu for someone who is not (or not yet known to be) logged in. */}
          {isAuthenticated && <Sidebar className="lg:sticky lg:top-24 lg:h-fit" />}
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
