const SITE = "PCPS Connect";

export const TITLES = {
  "/": null, // the home page keeps the full default title from index.html
  "/clubs": "Clubs",
  "/events": "Events",
  "/contact": "Contact",
  "/login": "Log in",
  "/register": "Create account",
  "/forgot-password": "Forgot password",
  "/reset-password": "Reset password",
  "/verify-email": "Verify email",
  "/terms": "Terms of Use",
  "/privacy": "Privacy Policy",
  "/help": "Help",
  "/poster": "Poster",
  "/dashboard": "Dashboard",
  "/profile": "Profile",
  "/settings": "Settings",
  "/board": "Notice board",
  "/record": "Activity record",
  "/admin": "Admin overview",
  "/admin/clubs": "Manage clubs",
  "/admin/events": "Manage events",
  "/admin/my-clubs": "My clubs",
  "/admin/users": "Manage users",
  "/admin/check-in": "Check-in",
  "/admin/activity": "Activity log",
  "/admin/messages": "Messages",
  "/admin/venues": "Campus venues",
};

export const DEFAULT_TITLE = "PCPS Connect | Club & Event Management";

// Title for a path, or undefined when the page sets its own (event details,
// certificates) -- those must not be overwritten here.
// `t` is the translate function (the page name is looked up in Nepali when it is on).
export function titleForPath(pathname, t = (text) => text) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (!(path in TITLES)) {
    if (/^\/clubs\/[^/]+\/poster$/.test(path)) return `${t("Club poster")} | ${SITE}`;
    if (path.startsWith("/events/") || path.startsWith("/certificate/") || path.startsWith("/volunteer-certificate/") || path.startsWith("/verify/")) return undefined;
    return `${t("Page not found")} | ${SITE}`;
  }
  const name = TITLES[path];
  return name ? `${t(name)} | ${SITE}` : t(DEFAULT_TITLE);
}

export function eventTitle(name, t = (text) => text) {
  return name ? `${name} | ${SITE}` : `${t("Event")} | ${SITE}`;
}

export const SITE_ORIGIN = "https://pcps-connect.vercel.app";

// The address search engines should treat as "this page" -- the path without a
// trailing slash, query string or fragment. Without this every page would
// claim the home page as its canonical address (the static tag in index.html).
export function canonicalForPath(pathname) {
  const path = String(pathname || "/").split(/[?#]/)[0].replace(/\/+$/, "");
  return `${SITE_ORIGIN}${path || "/"}`;
}

// Short search-result descriptions for the public pages; other pages keep the
// site-wide one from index.html.
export const DEFAULT_DESCRIPTION =
  "PCPS Club & Event Management System — explore clubs, discover events, and manage your participation at Patan College of Professional Studies.";
export const DESCRIPTIONS = {
  "/clubs": "Browse the student clubs at Patan College of Professional Studies, see what each one does and join the ones you like.",
  "/events": "Upcoming and past events from the clubs at Patan College of Professional Studies. Find something to join and register in a tap.",
  "/contact": "Send a message to the PCPS Connect team at Patan College of Professional Studies.",
  "/terms": "The rules for using PCPS Connect: accounts, acceptable use, event registrations and what we expect from everyone on the site.",
  "/privacy": "What PCPS Connect collects, why, how long it is kept and how you can download or delete your data.",
  "/help": "Answers to common questions about clubs, events, tickets, certificates and polls on PCPS Connect.",
};

const normalPath = (pathname) => {
  const path = String(pathname || "/").split(/[?#]/)[0];
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
};

const PAGE_OWNS_META = (path) => path.startsWith("/events/");

// The description for a path, or undefined when the page sets its own.
export function descriptionForPath(pathname, t = (text) => text) {
  const path = normalPath(pathname);
  if (PAGE_OWNS_META(path)) return undefined;
  return t(DESCRIPTIONS[path] || DEFAULT_DESCRIPTION);
}

// Pages search engines should not list: sign-in and account pages, the admin
// area, personal records, certificate links and addresses that do not exist.
// (robots.txt alone only stops crawling; "noindex" stops listing.)
const PUBLIC_PATHS = new Set(["/", "/clubs", "/events", "/contact", "/terms", "/privacy", "/help"]);
export function isNoIndexPath(pathname) {
  const path = normalPath(pathname);
  if (PUBLIC_PATHS.has(path) || PAGE_OWNS_META(path)) return false;
  return true;
}
