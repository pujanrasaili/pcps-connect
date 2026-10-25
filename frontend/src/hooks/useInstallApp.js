import { useCallback, useEffect, useState } from "react";
import { detectIos, installMode } from "../utils/installApp";

// Wraps the browser's "install app" prompt (see utils/installApp.js).
export function useInstallApp() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault(); // keep it for our own button instead of the browser's automatic banner
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const isStandalone =
    installed ||
    (typeof window !== "undefined" &&
      (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true));
  const isIos = typeof navigator !== "undefined" && detectIos(navigator.userAgent, navigator.maxTouchPoints);

  const install = useCallback(async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null); // a prompt can only be used once
  }, [deferred]);

  return { mode: installMode({ canPrompt: !!deferred, isStandalone, isIos }), install };
}
