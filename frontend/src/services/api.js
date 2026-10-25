import axios from "axios";
import { optimizeImageUrl } from "../utils/imageUrl";
import { slowRequests } from "../utils/slowRequests";
import { errorText } from "../utils/errorText";

// Centralized axios instance. Every request automatically includes the
// httpOnly auth cookie (withCredentials) -- the backend uses a cookie, not
// a Bearer token, so this is required on every single call, not just the
// obviously "protected" ones.
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
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
  if (!(typeof FormData !== "undefined" && config.data instanceof FormData)) {
    config.slowId = ++nextRequestId;
    slowRequests.start(config.slowId);
  }
  return config;
});
api.interceptors.response.use(
  (response) => {
    slowRequests.end(response.config.slowId);
    return response;
  },
  (error) => {
    slowRequests.end(error.config?.slowId);
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
