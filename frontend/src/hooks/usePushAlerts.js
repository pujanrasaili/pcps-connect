import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { urlBase64ToUint8Array } from "../utils/pushKey";

// Phone/browser alerts for this device. `available` is true only when the
// browser can do it AND the server has alerts switched on, so the Settings
// switch never shows for something that can't work.
// `turnOn` resolves to "on", "blocked" (the browser's permission was refused)
// or "error"; `turnOff` to "off" or "error".
export function usePushAlerts() {
  const [available, setAvailable] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;
        const { data } = await api.get("/push/key");
        if (cancelled || !data?.enabled) return;
        const existing = await registration.pushManager.getSubscription();
        if (cancelled) return;
        setKey(data.key);
        setOn(!!existing && Notification.permission === "granted");
        setAvailable(true);
      } catch {
        // Not available: the switch just doesn't appear.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const turnOn = useCallback(async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return "blocked";
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
      await api.post("/push/subscribe", { subscription: subscription.toJSON() });
      setOn(true);
      return "on";
    } catch {
      return "error";
    } finally {
      setBusy(false);
    }
  }, [key]);

  const turnOff = useCallback(async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await api.delete("/push/subscribe", { data: { endpoint } });
      }
      setOn(false);
      return "off";
    } catch {
      return "error";
    } finally {
      setBusy(false);
    }
  }, []);

  return { available, on, busy, turnOn, turnOff };
}
