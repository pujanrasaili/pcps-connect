// Lightweight CSRF defense for the cookie-based auth session.
//
// The frontend (Vercel) and backend (Render) are different sites, so the
// auth cookie must be sameSite: "none" in production -- which means the
// browser attaches it on cross-site requests too, not just same-site ones.
// For JSON requests this is already covered: axios sends
// "Content-Type: application/json", which forces the browser to run a CORS
// preflight first, and our CORS config only allows CLIENT_ORIGIN -- so a
// request from any other site never gets past that preflight.
//
// multipart/form-data (used by the event image-upload routes) is
// different: browsers treat it as a CORS-"simple" content type, so a
// cross-site request using it SKIPS the preflight entirely. A malicious
// page could point a plain, JS-free HTML form
// (<form method="POST" enctype="multipart/form-data">) at one of those
// routes, and a logged-in admin's browser would attach the session cookie
// and submit it -- forging an admin action with no JavaScript needed.
//
// The fix: require a custom header on every state-changing request. A
// plain HTML form can never set a custom header (only JavaScript can), and
// JavaScript from another origin trying to add one forces a real CORS
// preflight -- which the existing origin restriction already blocks. This
// runs on every mutating request (not just the multipart routes) so the
// protection is consistent and doesn't depend on remembering which routes
// use multer today or in the future.
function requireCsrfHeader(req, res, next) {
  const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  if (isMutating && req.headers["x-requested-with"] !== "XMLHttpRequest") {
    return res.status(403).json({ message: "Invalid request" });
  }
  next();
}

module.exports = { requireCsrfHeader };
