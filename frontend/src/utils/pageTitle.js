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
  "/dashboard": "Dashboard",
  "/profile": "Profile",
  "/settings": "Settings",
  "/board": "Notice board",
  "/admin": "Admin overview",
  "/admin/clubs": "Manage clubs",
  "/admin/events": "Manage events",
  "/admin/my-clubs": "My clubs",
  "/admin/users": "Manage users",
  "/admin/check-in": "Check-in",
  "/admin/activity": "Activity log",
  "/admin/messages": "Messages",
};

export const DEFAULT_TITLE = "PCPS Connect | Club & Event Management";

// Title for a path, or undefined when the page sets its own (event details,
// certificates) -- those must not be overwritten here.
// `t` is the translate function (the page name is looked up in Nepali when it is on).
export function titleForPath(pathname, t = (text) => text) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (!(path in TITLES)) {
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
