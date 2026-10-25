// A deliberately small service worker. Its only job is to let the app open
// without internet so a student can reach "My tickets" (their saved check-in
// QR codes) at an event with bad wifi. It never touches the API or anything on
// another site, so data is always live when online.
//
//  * Page loads: network first (so a new deploy shows up immediately); the
//    last good copy of the app shell is kept and used only if the network fails.
//  * /assets/*: file names contain a content hash, so a cached copy is always
//    the right one -- cache first.
//  * Everything else (the API, fonts and images on other sites, ...): untouched.
const CACHE = "pcps-shell-v1";
const SHELL = "/index.html";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })()
  );
});

async function pageLoad(request) {
  try {
    const response = await fetch(request);
    const isHtml = (response.headers.get("content-type") || "").includes("text/html");
    if (response.ok && isHtml) {
      const cache = await caches.open(CACHE);
      await cache.put(SHELL, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(SHELL);
    return cached || new Response("You're offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

async function hashedAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(pageLoad(request));
  } else if (url.pathname.startsWith("/assets/")) {
    event.respondWith(hashedAsset(request));
  }
});
