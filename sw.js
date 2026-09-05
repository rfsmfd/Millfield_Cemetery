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
const BUILD = 36;
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

  // the app shell - always try the network so a new build is picked up
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(APP).then(c => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./').then(r => r || caches.match('./index.html')))
    );
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
