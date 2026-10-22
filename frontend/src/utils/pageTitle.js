const SITE = "PCPS Connect";

const TITLES = {
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
  "/admin": "Admin overview",
  "/admin/clubs": "Manage clubs",
  "/admin/events": "Manage events",
  "/admin/my-clubs": "My clubs",
  "/admin/users": "Manage users",
  "/admin/check-in": "Check-in",
  "/admin/activity": "Activity log",
};

export const DEFAULT_TITLE = "PCPS Connect | Club & Event Management";

// Title for a path, or undefined when the page sets its own (event details,
// certificates) -- those must not be overwritten here.
export function titleForPath(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (!(path in TITLES)) {
    if (path.startsWith("/events/") || path.startsWith("/certificate/") || path.startsWith("/verify/")) return undefined;
    return `Page not found | ${SITE}`;
  }
  const t = TITLES[path];
  return t ? `${t} | ${SITE}` : DEFAULT_TITLE;
}

export function eventTitle(name) {
  return name ? `${name} | ${SITE}` : `Event | ${SITE}`;
}
