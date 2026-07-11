import { Link } from "react-router-dom";
import { FaHome, FaCompass } from "react-icons/fa";
import shield from "../assets/images/pcps-shield.png";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <img src={shield} alt="" className="h-24 w-auto opacity-80 animate-float" />
      <h1 className="mt-6 font-display text-6xl font-extrabold text-gradient-brand">404</h1>
      <h2 className="mt-2 font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">
        Page not found
      </h2>
      <p className="mt-2 max-w-md text-slate-500 dark:text-slate-400">
        The page you're looking for doesn't exist or may have been moved.
        Let's get you back on track.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-4">
        <Link to="/" className="btn-primary">
          <FaHome /> Back to home
        </Link>
        <Link to="/events" className="btn-outline">
          <FaCompass /> Browse events
        </Link>
      </div>
    </div>
  );
}
