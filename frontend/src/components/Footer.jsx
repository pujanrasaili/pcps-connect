import { Link } from "react-router-dom";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
} from "react-icons/fa";
import logo from "../assets/images/pcps-logo.png";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <img src={logo} alt="PCPS College" className="h-10 w-auto" />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Empowering students of Patan College of Professional Studies to
            learn, lead, and grow through clubs and events.
          </p>
          <div className="mt-5 flex gap-3">
            {[FaFacebook, FaInstagram, FaLinkedin, FaYoutube].map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="Social media link"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-primary-500 hover:text-white dark:bg-slate-800 dark:text-slate-400"
              >
                <Icon className="text-sm" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-display font-semibold text-slate-800 dark:text-slate-100">
            Quick Links
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
            {[
              ["Home", "/"],
              ["Clubs", "/clubs"],
              ["Events", "/events"],
              ["Dashboard", "/dashboard"],
              ["Contact", "/contact"],
            ].map(([label, to]) => (
              <li key={to}>
                <Link to={to} className="hover:text-primary-500 transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display font-semibold text-slate-800 dark:text-slate-100">
            Account
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
            {[
              ["Login", "/login"],
              ["Register", "/register"],
              ["Forgot Password", "/forgot-password"],
              ["Profile", "/profile"],
              ["Settings", "/settings"],
              ["Terms of Use", "/terms"],
              ["Privacy Policy", "/privacy"],
            ].map(([label, to]) => (
              <li key={to}>
                <Link to={to} className="hover:text-primary-500 transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display font-semibold text-slate-800 dark:text-slate-100">
            Contact
          </h4>
          <ul className="mt-4 space-y-3 text-sm text-slate-500 dark:text-slate-400">
            <li className="flex items-start gap-2.5">
              <FaMapMarkerAlt className="mt-0.5 shrink-0 text-primary-500" />
              Patan College for Professional Studies, Lalitpur, Nepal
            </li>
            <li className="flex items-center gap-2.5">
              <FaPhoneAlt className="shrink-0 text-primary-500" /> +977 1-5000000
            </li>
            <li className="flex items-center gap-2.5">
              <FaEnvelope className="shrink-0 text-primary-500" /> info@patancollege.edu.np
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-400 dark:border-slate-800">
        © {year} Patan College of Professional Studies. PCPS Connect — Club & Event Management System.
      </div>
    </footer>
  );
}
