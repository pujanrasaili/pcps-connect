import { api } from "../services/api";

// Called when someone logs out: this device stops receiving THEIR alerts.
// Without it a shared phone would keep showing the previous student's bell
// messages to whoever uses it next. The server is told while the student is
// still logged in (it only lets you remove your own device), then the browser
// forgets the subscription. Best-effort: logging out never waits on, or fails
// because of, this.
export async function forgetPushOnThisDevice() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await api.delete("/push/subscribe", { data: { endpoint } }).catch(() => {});
    await subscription.unsubscribe();
  } catch {
    // Nothing to do: the student is being logged out either way.
  }
}
