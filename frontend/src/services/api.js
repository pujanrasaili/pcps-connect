import axios from "axios";

// Centralized axios instance. Every request automatically includes the
// httpOnly auth cookie (withCredentials) -- the backend uses a cookie, not
// a Bearer token, so this is required on every single call, not just the
// obviously "protected" ones.
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Prefix an uploaded file's relative path (e.g. "/uploads/xyz.jpg") with the
// backend's origin, so <img src="..."> resolves correctly. The API base
// already ends in "/api", so strip that off to get the bare origin.
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
export function resolveUploadUrl(path) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_ORIGIN}${path}`;
}

// Normalizes axios errors into a plain message string, since every
// controller on the backend responds with { message: "..." } on failure.
export function getErrorMessage(err, fallback = "Something went wrong. Please try again.") {
  return err?.response?.data?.message || err?.message || fallback;
}