import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import SkipLink from "../components/SkipLink";
import Footer from "../components/Footer";
import ScrollToTop from "../components/ScrollToTop";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <SkipLink />
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
