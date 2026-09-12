const CACHE_NAME = "vault-shell-v6-1";
const OFFLINE_URL = "/offline.html";
const OPTIONAL_SHELL = ["/manifest.json", "/icon-192x192.png", "/icon-512x512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // O fallback é obrigatório. Se ele falhar, o worker antigo permanece ativo.
    await cache.add(OFFLINE_URL);
    await Promise.allSettled(OPTIONAL_SHELL.map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      const url = new URL(request.url);
      if (url.pathname === "/") await cache.put("/", response.clone());
    }
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match("/")) || (await cache.match(OFFLINE_URL));
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || OPTIONAL_SHELL.includes(url.pathname) || url.pathname === OFFLINE_URL) {
    event.respondWith(cacheFirstAsset(request));
  }
});
