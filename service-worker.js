const CACHE_NAME = 'yxmysbd-v4';
const urlsToCache = [
  './',
  './index.html',
  './all-builds.html',
  './admin.html',
  './tianfa-huodao.html',
  './huodao-shouling.html',
  './fashi-leidian-shaquan.html',
  './fashi-yanbao.html',
  './fashi-yanling-yanbao.html',
  './fashi-leiquan.html',
  './fashi-bingyan-pk.html',
  './youxia-gandian.html',
  './shadow-dian.html',
  './youxia-jingji-pk.html',
  './youxia-jingji-pve.html',
  './zhuling-huoyan.html',
  './zhanshi-leichui-pve.html',
  './zhanshi-leichui-pk.html',
  './zhanshi-diandao.html',
  './zhanshi-leixuan.html',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache).catch(function() {
        return cache.addAll(urlsToCache.filter(function(u) { return u !== './'; }));
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if (response) return response;
      return fetch(event.request).then(function(response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(function() {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('', { status: 504 });
      });
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});
