// Minimal offline app-shell cache. No precache manifest, since Vite hashes
// asset filenames per build — instead:
//   - HTML navigations: network-first, falling back to cache only when
//     offline. Cache-first here would risk serving a stale index.html that
//     references hashed JS/CSS files a later deploy has already removed.
//   - Everything else (hashed JS/CSS, fonts, icons): cache-first, since a
//     hashed filename is content-addressed and safe to treat as immutable.
const CACHE_NAME = 'qrmesh-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  const isNavigation = req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
          return res;
        })
        .catch(async () => (await caches.open(CACHE_NAME)).match(req))
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
  );
});
