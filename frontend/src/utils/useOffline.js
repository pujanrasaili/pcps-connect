import { useSyncExternalStore } from "react";

function subscribe(callback) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

const isOffline = () => !navigator.onLine;

// True while the browser reports no internet connection, and updates by itself
// when it comes back. Server-rendered or test environments count as online.
export default function useOffline() {
  return useSyncExternalStore(subscribe, isOffline, () => false);
}
