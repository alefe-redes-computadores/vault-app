const CACHE_NAME="vault-shell-v4";
const OFFLINE_URL="/offline.html";
const PRECACHE=[OFFLINE_URL,"/manifest.json","/icon-192x192.png","/icon-512x512.png"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>Promise.allSettled(PRECACHE.map(url=>cache.add(url)))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{const req=event.request;if(req.method!=="GET")return;const url=new URL(req.url);if(url.origin!==self.location.origin)return;if(req.mode==="navigate"){event.respondWith(fetch(req).catch(()=>caches.match(OFFLINE_URL)));return}if(url.pathname.startsWith("/_next/static/")||PRECACHE.includes(url.pathname)){event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{if(response.ok){const copy=response.clone();void caches.open(CACHE_NAME).then(cache=>cache.put(req,copy))}return response})));}});
