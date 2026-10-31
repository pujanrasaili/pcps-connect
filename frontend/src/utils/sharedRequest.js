// Lets several components that ask for the same thing at about the same time
// (the Home page and its banner both want the site stats; the navbar and the
// page both want the clubs you lead) share ONE request instead of each making
// their own. An answer is reused for `ttlMs`; a failed request is forgotten at
// once so the next caller tries again.
const cache = new Map();

export function sharedRequest(key, load, ttlMs = 3000, now = Date.now) {
  const hit = cache.get(key);
  if (hit && now() - hit.at < ttlMs) return hit.promise;
  const promise = Promise.resolve().then(load);
  cache.set(key, { at: now(), promise });
  promise.catch(() => {
    if (cache.get(key)?.promise === promise) cache.delete(key);
  });
  return promise;
}

export function clearSharedRequests() {
  cache.clear();
}
