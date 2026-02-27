const CACHE_NAME = 'v12-2';
const urlsToCache = ['./index.html'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { e.respondWith(fetch(e.request).then(r => { const rc = r.clone(); caches.open(CACHE_NAME).then(c => c.put(e.request, rc)); return r; }).catch(() => caches.match(e.request))); });
