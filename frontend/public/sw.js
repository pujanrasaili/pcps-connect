// A deliberately small service worker. Its only job is to let the app open
// without internet so a student can reach "My tickets" (their saved check-in
// QR codes) at an event with bad wifi. It never touches the API or anything on
// another site, so data is always live when online.
//
//  * Page loads: network first (so a new deploy shows up immediately); the
//    last good copy of the app shell is kept and used only if the network fails.
//  * /assets/*: file names contain a content hash, so a cached copy is always
//    the right one -- cache first. Only the newest 200 are kept.
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

// Each deploy has new hashed file names, and old ones would pile up on a
// student's phone forever. Keep the newest MAX_ASSETS (a deploy is far fewer);
// the cache lists files oldest first. Tidying must never break loading a file.
const MAX_ASSETS = 200;
async function trimAssets(cache) {
  try {
    const assets = (await cache.keys()).filter((r) => new URL(r.url).pathname.startsWith("/assets/"));
    for (const old of assets.slice(0, Math.max(0, assets.length - MAX_ASSETS))) await cache.delete(old);
  } catch {
    // Leave the cache as it is.
  }
}

async function hashedAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
    await trimAssets(cache);
  }
  return response;
}

// Alerts for bell messages (see backend/utils/webPush.js). The server sends
// { title, url }; tapping the alert opens that page of the site.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = typeof data.title === "string" && data.title ? data.title : "PCPS Connect";
  const url = typeof data.url === "string" && data.url.startsWith("/") && !data.url.startsWith("//") ? data.url : "/";
  event.waitUntil(self.registration.showNotification(title, { icon: "/icon-192.png", badge: "/icon-192.png", data: { url } }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});

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
