import axios from "axios";
import { optimizeImageUrl } from "../utils/imageUrl";
import { slowRequests } from "../utils/slowRequests";
import { errorText } from "../utils/errorText";
import { isUnexpectedReply, BAD_REPLY_CODE } from "../utils/apiReply";
import { isSessionExpired, SESSION_EXPIRED_EVENT } from "../utils/sessionExpiry";

// Centralized axios instance. Every request automatically includes the
// httpOnly auth cookie (withCredentials) -- the backend uses a cookie, not
// a Bearer token, so this is required on every single call, not just the
// obviously "protected" ones.
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  // Without a limit a request can spin forever. 60 s covers a sleeping free-tier
  // server waking up; uploads get longer (see the interceptor below).
  timeout: 60000,
  // Paired with backend/middleware/csrf.js. A plain HTML form (the classic
  // no-JavaScript CSRF vector) can never set a custom header, so this marks
  // every request from this app as genuinely coming from our own frontend
  // code rather than a forged cross-site form submission.
  headers: {
    "X-Requested-With": "XMLHttpRequest",
  },
});

// Feeds the "server is waking up" notice. File uploads are skipped: they are
// legitimately slow and must not be blamed on the server.
let nextRequestId = 0;
api.interceptors.request.use((config) => {
  if (typeof FormData !== "undefined" && config.data instanceof FormData) config.timeout = 180000;
  // `quiet` requests (the bell's background refresh) never trigger the
  // "server is waking up" notice.
  if (!config.quiet && !(typeof FormData !== "undefined" && config.data instanceof FormData)) {
    config.slowId = ++nextRequestId;
    slowRequests.start(config.slowId);
  }
  return config;
});
api.interceptors.response.use(
  (response) => {
    slowRequests.end(response.config.slowId);
    if (isUnexpectedReply(response)) {
      const err = new Error("The server sent an unexpected reply");
      err.code = BAD_REPLY_CODE;
      err.config = response.config;
      return Promise.reject(err);
    }
    return response;
  },
  (error) => {
    slowRequests.end(error.config?.slowId);
    if (isSessionExpired(error) && typeof window !== "undefined") {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

// Prefix an uploaded file's relative path (e.g. "/uploads/xyz.jpg") with the
// backend's origin, so <img src="..."> resolves correctly. The API base
// already ends in "/api", so strip that off to get the bare origin.
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
// `width` (optional) asks Cloudinary for a smaller, modern-format copy -- pass
// roughly the largest size the image is displayed at, in CSS pixels x2 for sharp screens.
export function resolveUploadUrl(path, width) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return optimizeImageUrl(path, width);
  return `${API_ORIGIN}${path}`;
}

// Normalizes axios errors into a plain message string (see utils/errorText.js).
export function getErrorMessage(err, fallback) {
  return errorText(err, fallback);
}
