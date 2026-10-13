// Offline shell for FAST. Serves from cache first and refreshes the cache in
// the background, so an update shows up the second time the app is opened.
const CACHE = 'fast-v3';
const SHELL = [
  './', 'index.html', 'style.css', 'content.js', 'core.js', 'app.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); })); }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(e.request, { ignoreSearch: true }).then(function (hit) {
      const fresh = fetch(e.request, { cache: 'no-cache' }).then(function (res) {
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || fresh;
    });
  }));
});
