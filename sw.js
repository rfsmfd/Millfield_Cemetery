/* Millfield Cemetery - offline support.
   Once the map has been opened on wifi, it keeps working at the cemetery with
   no signal: the app, the data and any satellite tiles already viewed are all
   served from cache.

   Strategy:
     - the app itself : NETWORK FIRST, cache as fallback (never a stale build)
     - data + libs    : CACHE FIRST  (they change only when re-exported)
     - map tiles      : CACHE FIRST with a rolling cap
   Bump BUILD to match index.html when you ship. */
// Bump on EVERY change - the number names the caches, so a stale build and a
// stale data/*.geojson both survive a refresh until it changes.
const BUILD = 44;
const APP   = 'mc-app-v' + BUILD;
const DATA  = 'mc-data-v' + BUILD;
const LIB   = 'mc-lib-v1';
const TILES = 'mc-tiles-v1';
const MAX_TILES = 1500;

const SHELL = ['./', './index.html'];
// gstatic serves the Firebase libraries; unpkg the rotated-image overlay.
// Firestore's own traffic (firestore.googleapis.com) is left alone - it has
// its own offline store and must never be served from a cache.
const LIB_HOSTS  = ['cdnjs.cloudflare.com', 'www.gstatic.com', 'unpkg.com'];
const TILE_HOSTS = ['server.arcgisonline.com', 'tile.openstreetmap.org', 'vginmaps.vdem.virginia.gov'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(APP).then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => /^mc-(app|data)-/.test(k) && k !== APP && k !== DATA)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never touch the worker itself. The app fetches this file to read the
  // current build number, so it must always come from the network - and
  // caching each check would pile up an entry every half hour forever.
  if (url.origin === location.origin && url.pathname.endsWith('sw.js')) return;

  /* What counts as "the app itself".

     This used to be only mode === 'navigate' or a path ending in .html, and that
     left a hole big enough to strand an installed copy permanently. A home screen
     icon opens the bare directory URL - ending in a slash, not in .html - and when
     that request does not arrive flagged as a navigation it fell through to the
     cache-first rule at the bottom and was answered from cache forever.

     This is not hypothetical: it happened to History Scout between its BUILD 4 and
     BUILD 5. Safari showed the new build, the home screen icon sat on the old one,
     and reopening it could never help. Reproduced here on 2026-09-05 before fixing:
     fetch('./') returned BUILD 41 while fetch('./index.html') returned 42. */
  const isAppItself =
    req.mode === 'navigate' ||
    req.destination === 'document' ||
    (url.origin === location.origin &&
      (url.pathname.endsWith('.html') || url.pathname.endsWith('/')));

  if (isAppItself) {
    e.respondWith(shellResponse(req));
    return;
  }

  // the cemetery data
  if (url.origin === location.origin && url.pathname.includes('/data/')) {
    e.respondWith(cacheFirst(req, DATA));
    return;
  }

  if (LIB_HOSTS.includes(url.hostname))  { e.respondWith(cacheFirst(req, LIB)); return; }
  if (TILE_HOSTS.includes(url.hostname)) { e.respondWith(cacheFirst(req, TILES, MAX_TILES)); return; }
  if (url.origin === location.origin)    { e.respondWith(cacheFirst(req, APP)); }
});

/* The app itself: try the network, but do not wait forever for it.

   Straight network-first hangs on marginal signal — a bar or two is enough to keep
   the connection trying and never complete, and the app simply never opens. That is
   a real field failure, not a theoretical one: it is why Outdoor Companion grew this
   same 2-second rule, and it is copied from there.

   With signal: the network almost always wins the race, so a new build appears at
   once. Without it, or on one bar: the saved copy is served immediately and the app
   opens. Either way the network fetch, whenever it finally finishes, still refreshes
   the cache for next time. */
const SHELL_TIMEOUT = 2000;

function shellResponse(req) {
  return caches.match('./')
    .then(hit => hit || caches.match('./index.html'))
    .then(cached => {
      const network = fetch(req, { cache: 'no-store' })
        .then(res => {
          if (res && res.ok) {
            const a = res.clone(), b = res.clone();
            caches.open(APP).then(c => { c.put('./', a); c.put('./index.html', b); });
            return res;
          }
          // a 404 or a 500 is not worth replacing a good saved copy with
          return cached ? null : res;
        })
        .catch(() => null);

      // nothing saved yet — the network is the only option, however long it takes
      if (!cached) {
        return network.then(res => res || fetch(req)
          .catch(() => new Response('The cemetery map is offline and has nothing saved yet.',
            { status: 503, headers: { 'Content-Type': 'text/plain' } })));
      }

      return Promise.race([
        network,
        new Promise(r => setTimeout(() => r(null), SHELL_TIMEOUT))
      ]).then(res => res || cached);
    });
}

function cacheFirst(req, cacheName, cap) {
  return caches.match(req).then(hit => {
    if (hit) return hit;
    return fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(cacheName).then(c => {
          c.put(req, copy);
          if (cap) trim(c, cap);
        });
      }
      return res;
    }).catch(() => hit);
  });
}

function trim(cache, max) {
  cache.keys().then(keys => {
    if (keys.length <= max) return;
    for (let i = 0; i < keys.length - max; i++) cache.delete(keys[i]);
  });
}
