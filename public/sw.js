const CACHE_NAME = "vault-shell-v25-6";
const OFFLINE_URL = "/vault-offline-fallback.html";
// M103 P1: atualiza o service worker e revalida o fallback offline sem limpar o cache de navegacao.
// O fallback autonomo tem destino diferente da rota Next /offline em ambos os exports.
const OPTIONAL_SHELL = ["/manifest.json", "/icon-v2-192x192.png", "/icon-v2-512x512.png", "/icon-maskable-v2-1024x1024.png", "/apple-icon.png?v=2"];
const AUTH_PARAMS = new Set(["code", "access_token", "refresh_token", "id_token", "token", "token_hash", "code_verifier", "error_description", "error_code", "state", "provider_token", "provider_refresh_token"]);

function sensitiveRequest(request) {
  const url = new URL(request.url);
  let pathname = url.pathname;
  try { pathname = decodeURIComponent(pathname); } catch { return true; }
  pathname = pathname.toLowerCase().replace(/\/+$/, "");
  if (/^\/auth\/callback(?:\/|\.|$)/.test(pathname)) return true;
  if (request.headers.has("authorization")) return true;
  return [...url.searchParams.keys()].some(key => AUTH_PARAMS.has(key.toLowerCase()));
}

function cacheable(response) {
  return response.ok && !/\b(?:no-store|private|no-cache)\b/i.test(response.headers.get("cache-control") || "");
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // O fallback é obrigatório. Se ele falhar, o worker antigo permanece ativo.
    await cache.add(new Request(new URL(OFFLINE_URL, self.location.origin), { cache: "reload" }));
    await Promise.allSettled(OPTIONAL_SHELL.map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Remover apenas chaves de autenticação dos caches de shell do VAULT, inclusive legados.
    // Não apagar caches de terceiros nem o cache de navegação / IndexedDB do proprietário.
    const keys = await caches.keys();
    for (const key of keys.filter(key => /^vault-shell-v\d+(?:-\d+)*$/.test(key))) {
      const cache = await caches.open(key);
      for (const request of await cache.keys()) {
        if (new URL(request.url).origin === self.location.origin && sensitiveRequest(request)) await cache.delete(request);
      }
    }
    await self.clients.claim();
  })());
});

async function storeResponse(cache, request, response) {
  // Falha de quota ou de Cache API não transforma resposta de rede válida em offline.
  try {
    if (cacheable(response)) await cache.put(request, response.clone());
    else await cache.delete(request);
  } catch { /* cache oportunista */ }
}

async function cachedNavigation(cache, request) {
  const response = (await cache.match(request)) || (await cache.match("/")) || (await cache.match(OFFLINE_URL));
  // Vercel cleanUrls pode redirecionar .html. Uma resposta redirecionada do
  // Cache Storage não pode ser usada para navegação com redirect mode manual.
  return response?.redirected
    ? new Response(await response.arrayBuffer(), { status: response.status, statusText: response.statusText, headers: response.headers })
    : response;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  let response;
  try { response = await fetch(request); }
  catch {
    return cachedNavigation(cache, request);
  }
  await storeResponse(cache, request, response);
  return response;
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  await storeResponse(cache, request, response);
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // PKCE, links com credenciais e callback RSC jamais entram no Cache Storage,
  // nem consultam respostas antigas quando a rede falha.
  if (sensitiveRequest(request)) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || OPTIONAL_SHELL.includes(url.pathname) || url.pathname === OFFLINE_URL) {
    event.respondWith(cacheFirstAsset(request));
  }
});
