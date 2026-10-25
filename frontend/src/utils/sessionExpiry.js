// Detects "your login stopped working while you were using the site": the
// session cookie expired, or the password was changed on another device. The
// API answers 401 "Not logged in" to the next protected request, but until now
// the page still believed you were logged in and just showed an error toast on
// every click.
//
// Requests that are EXPECTED to be answered 401 by a logged-out visitor (the
// first "am I logged in?" check, a wrong password at login) must not count.
const EXPECTED_401 = ["/auth/me", "/auth/login", "/auth/logout", "/auth/register"];
export const SESSION_EXPIRED_EVENT = "pcps:session-expired";

export function isSessionExpired(error) {
  if (error?.response?.status !== 401) return false;
  const url = String(error.config?.url || "");
  return !EXPECTED_401.some((path) => url.endsWith(path));
}
