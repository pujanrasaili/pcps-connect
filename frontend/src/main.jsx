import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { loadNe } from "./i18n/dictionary";

function savedLangIsNepali() {
  try {
    return localStorage.getItem("pcps_lang") === "ne";
  } catch {
    return false;
  }
}

function start() {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

// Someone who chose Nepali waits for the dictionary first, so the page never
// flashes English. Everyone else starts straight away.
if (savedLangIsNepali()) loadNe().catch(() => {}).finally(start);
else start();

// Lets the app open offline (for "My tickets"). Production only, so local
// development is never served stale files. See public/sw.js.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
