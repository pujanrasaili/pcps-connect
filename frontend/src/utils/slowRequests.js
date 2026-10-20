// Tracks in-flight requests and reports when any of them has been waiting
// longer than `thresholdMs`. Used to show a "the server is waking up" notice:
// on free hosting the first request after a quiet spell can take a minute, and
// without a hint students think the site is broken.
//
// Timers are injectable so the behaviour can be unit-tested without waiting.
export function createSlowTracker({ thresholdMs = 4000, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const timers = new Map(); // id -> timer handle, for requests still under the threshold
  const slow = new Set(); // ids that have crossed it
  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => fn());

  return {
    start(id) {
      if (timers.has(id) || slow.has(id)) return;
      timers.set(
        id,
        setTimer(() => {
          timers.delete(id);
          slow.add(id);
          notify();
        }, thresholdMs)
      );
    },
    end(id) {
      if (timers.has(id)) {
        clearTimer(timers.get(id));
        timers.delete(id);
      }
      if (slow.delete(id)) notify();
    },
    isSlow: () => slow.size > 0,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

// The app-wide instance, fed by the axios interceptors in services/api.js.
export const slowRequests = createSlowTracker();
