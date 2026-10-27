// A tiny in-memory cache with an expiry, for public responses that many people
// (or calendar apps polling on a timer) request over and over -- like the
// calendar feed. Without it every poll would run a database query. It lives in
// one server process, which is fine: the worst case after a restart is a single
// extra query. At most `max` keys are kept, so it can't grow without bound.
function createTtlCache({ ttlMs, max = 100, now = () => Date.now() }) {
  const store = new Map();
  return {
    get(key) {
      const hit = store.get(key);
      if (!hit) return undefined;
      if (hit.expires <= now()) {
        store.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key, value) {
      if (!store.has(key) && store.size >= max) store.delete(store.keys().next().value); // drop the oldest
      store.set(key, { value, expires: now() + ttlMs });
    },
    clear() {
      store.clear();
    },
  };
}

module.exports = { createTtlCache };
