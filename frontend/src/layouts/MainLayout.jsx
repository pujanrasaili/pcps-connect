import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import MobileTabBar from "../components/MobileTabBar";
import PullToRefresh from "../components/PullToRefresh";
import SkipLink from "../components/SkipLink";
import Footer from "../components/Footer";
import ScrollToTop from "../components/ScrollToTop";
import SlowServerNotice from "../components/SlowServerNotice";
import OfflineTicketsBanner from "../components/OfflineTicketsBanner";
import SiteNoticeBanner from "../components/SiteNoticeBanner";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <ScrollToTop />
      <SkipLink />
      <Navbar />
      <OfflineTicketsBanner />
      <SlowServerNotice />
      <SiteNoticeBanner />
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-x-clip outline-none">
        <Outlet />
      </main>
      <Footer />
      <PullToRefresh />
      <MobileTabBar />
    </div>
  );
}
