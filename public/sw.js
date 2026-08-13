const CACHE_NAME = "cholo-shikhi-static-v1";

const PRECACHE_URLS = ["/", "/manifest.webmanifest"];

const STATIC_EXTENSIONS = new Set([
  ".js",
  ".css",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".json",
  ".webp",
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    STATIC_EXTENSIONS.has(pathnameExtension(url.pathname));

  if (!isStaticAsset && req.mode !== "same-origin") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});

function pathnameExtension(pathname) {
  const idx = pathname.lastIndexOf(".");
  if (idx === -1) return "";
  return pathname.slice(idx).toLowerCase();
}
