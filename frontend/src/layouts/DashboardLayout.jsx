import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";
import ScrollToTop from "../components/ScrollToTop";

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1 bg-slate-50 dark:bg-slate-950">
        <div className="container-page grid gap-6 py-8 lg:grid-cols-[260px_1fr]">
          <Sidebar className="lg:sticky lg:top-24 lg:h-fit" />
          <div>
            <Outlet />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
