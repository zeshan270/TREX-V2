// ═══════════════════════════════════════════════════════════════
//  IPTV TREX — Netflix-grade Service Worker
//  Strategy: aggressive device caching, up to 300MB+
//  • App shell:   Cache-first, permanent (content-hashed)
//  • Images:      Cache-first, 200MB / 7 days
//  • API JSON:    Stale-while-revalidate, 500 items / 24h
//  • Streams:     Network-only (real-time video)
// ═══════════════════════════════════════════════════════════════

const V = 'trex-v5';
const SHELL  = `${V}-shell`;
const IMAGES = `${V}-images`;
const API    = `${V}-api`;
const ALL_CACHES = [SHELL, IMAGES, API];

// Limits
const IMG_MAX_ITEMS  = 3000;
const IMG_TTL        = 7  * 86400 * 1000; // 7 days
const API_MAX_ITEMS  = 600;
const API_TTL        = 24 * 3600  * 1000; // 24h

// App shell pages to pre-cache on install
const SHELL_PAGES = ['/', '/login', '/live', '/movies', '/series', '/favorites', '/settings', '/search', '/epg'];

// ── Install: pre-cache shell ─────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL).then((c) =>
      Promise.allSettled(SHELL_PAGES.map((url) => c.add(url).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

// ── Activate: purge old caches ───────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !ALL_CACHES.includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Helpers ──────────────────────────────────────────────────

/** Store response with timestamp header for TTL checks */
async function storeWithTimestamp(cacheName, request, response) {
  const cache = await caches.open(cacheName);
  const stamped = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers({
      ...Object.fromEntries(response.headers.entries()),
      'sw-cached-at': Date.now().toString(),
    }),
  });
  await cache.put(request, stamped);
}

/** Check if a cached response is still fresh within TTL */
function isFresh(response, ttl) {
  const cachedAt = response?.headers?.get('sw-cached-at');
  if (!cachedAt) return false;
  return (Date.now() - Number(cachedAt)) < ttl;
}

/** Evict oldest entries when cache exceeds maxItems */
async function evictOldest(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys  = await cache.keys();
  if (keys.length <= maxItems) return;
  const toDelete = keys.slice(0, keys.length - maxItems);
  await Promise.all(toDelete.map((k) => cache.delete(k)));
}

// ── Fetch handler ────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // 1. Only handle GET
  if (req.method !== 'GET') return;

  // 2. Stream proxy & video — always network-only
  if (url.pathname.startsWith('/api/proxy')) return;

  // 3. Xtream API calls (/api/...) — stale-while-revalidate
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(apiStrategy(req));
    return;
  }

  // 4. External images (channel logos, movie covers from IPTV servers)
  const isExternalImage = (
    req.destination === 'image' ||
    /\.(jpg|jpeg|png|webp|gif|avif|ico|svg)(\?|$)/i.test(url.pathname)
  ) && url.origin !== self.location.origin;

  if (isExternalImage) {
    e.respondWith(imageStrategy(req));
    return;
  }

  // 5. Next.js static assets (_next/static) — permanent cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetchAndCache(SHELL, req))
    );
    return;
  }

  // 6. Navigation / app shell — network-first with offline fallback
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { storeWithTimestamp(SHELL, req, res.clone()); return res; })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/')))
    );
    return;
  }

  // 7. Same-origin images/icons — cache-first
  if (req.destination === 'image') {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetchAndCache(SHELL, req))
    );
    return;
  }

  // 8. Everything else — network first
  e.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});

async function fetchAndCache(cacheName, req) {
  const res = await fetch(req);
  if (res.ok) {
    const cache = await caches.open(cacheName);
    cache.put(req, res.clone());
  }
  return res;
}

/** Stale-while-revalidate for internal API JSON */
async function apiStrategy(req) {
  const cache   = await caches.open(API);
  const cached  = await cache.match(req);

  if (cached && isFresh(cached, API_TTL)) {
    return cached;
  }

  // Serve stale immediately, refresh in background
  const fetchPromise = fetch(req).then(async (res) => {
    if (res.ok) {
      await storeWithTimestamp(API, req, res.clone());
      await evictOldest(API, API_MAX_ITEMS);
    }
    return res;
  }).catch(() => cached);

  return cached ? cached : fetchPromise;
}

/** Cache-first for external images (logos, covers) */
async function imageStrategy(req) {
  const cache  = await caches.open(IMAGES);
  const cached = await cache.match(req);

  if (cached && isFresh(cached, IMG_TTL)) {
    return cached;
  }

  try {
    // Fetch without CORS credentials to maximise compatibility
    const res = await fetch(req, { mode: 'no-cors' });
    // no-cors gives opaque response (status 0) — still cacheable and displayable
    if (res.type === 'opaque' || res.ok) {
      await storeWithTimestamp(IMAGES, req, res.clone());
      evictOldest(IMAGES, IMG_MAX_ITEMS); // fire-and-forget
    }
    return res;
  } catch {
    return cached || new Response('', { status: 408 });
  }
}

// ── Background message handler ───────────────────────────────
// Pages can send { type: 'PREFETCH_IMAGES', urls: [...] } to warm the image cache
self.addEventListener('message', (e) => {
  if (e.data?.type === 'PREFETCH_IMAGES') {
    const urls = (e.data.urls || []).slice(0, 100); // max 100 at once
    e.waitUntil(
      Promise.allSettled(
        urls.map((url) =>
          imageStrategy(new Request(url, { mode: 'no-cors' })).catch(() => null)
        )
      ).then(() => evictOldest(IMAGES, IMG_MAX_ITEMS))
    );
  }

  if (e.data?.type === 'CLEAR_API_CACHE') {
    e.waitUntil(caches.delete(API));
  }

  if (e.data?.type === 'GET_CACHE_SIZE') {
    e.waitUntil(
      Promise.all(ALL_CACHES.map((name) =>
        caches.open(name).then((c) => c.keys().then((k) => ({ name, count: k.length })))
      )).then((stats) => {
        e.source?.postMessage({ type: 'CACHE_SIZE', stats });
      })
    );
  }
});
