/* Yuujin Circle minimal service worker.
 * Strategy:
 *  - never cache POST/segmented or non-GET traffic
 *  - network-first for navigations & API (freshness first, offline fallback)
 *  - cache-first for built static assets (hashed filenames) & fonts
 *  - NEVER cache Supabase storage images (profile photos change)
 */
const VERSION = 'yuujin-v1'; /* bump also clears old caches */
const ASSET_CACHE = `${VERSION}-assets`;
const PAGE_CACHE = `${VERSION}-pages`;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Profile photos & all dynamic APIs: straight network, no cache.
  if (url.pathname.startsWith('/storage/') || url.hostname.endsWith('supabase.co')) return;

  // Built assets & fonts: cache-first (they're content-hashed or immutable).
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname === '/manifest.webmanifest' ||
      /\.(png|svg|ico|woff2?)$/.test(url.pathname))
  ) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // Navigations & everything else: network-first with offline fallback.
  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        if (req.mode === 'navigate' && res.ok) {
          const cache = await caches.open(PAGE_CACHE);
          cache.put('/', res.clone());
        }
        return res;
      } catch {
        if (req.mode === 'navigate') {
          const cache = await caches.open(PAGE_CACHE);
          const offline = (await cache.match('/')) || (await cache.match('/meet'));
          if (offline) return offline;
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});
