/* Bubble Pop Safari - cache-first service worker */
const CACHE = 'bps-cache-v8';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './art/lion.webp', './art/monkey.webp', './art/elephant.webp', './art/panda.webp', './art/tiger.webp', './art/frog.webp',
  './art/koala.webp', './art/zebra.webp', './art/giraffe.webp', './art/hippo.webp', './art/owl.webp', './art/bomb.webp',
  './art/star.webp', './art/heart.webp', './art/home.webp', './art/sound.webp', './art/mute.webp',
  './art/next.webp', './art/hand.webp', './art/trophy.webp', './art/chick.webp', './art/flame.webp', './art/bolt.webp', './art/math.webp'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        try {
          if (res && res.ok && new URL(e.request.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
        } catch (err) {}
        return res;
      }).catch(() => (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined));
    })
  );
});
