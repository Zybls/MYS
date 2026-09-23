const CACHE_NAME = 'yxmysbd-v5';
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
  './youxia-shengyin-jingji.html',
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
  var req = event.request;
  if (req.method !== 'GET') return;

  // 页面导航请求：network-first，保证用户看到最新内容；离线时回退缓存
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(req, clone); });
        }
        return response;
      }).catch(function() {
        return caches.match(req).then(function(r) { return r || caches.match('./index.html'); });
      })
    );
    return;
  }

  // 静态资源（图片/CSS/JS/字体）：cache-first，加快二次访问
  event.respondWith(
    caches.match(req).then(function(cached) {
      if (cached) return cached;
      return fetch(req).then(function(response) {
        if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
          var respClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(req, respClone); });
        }
        return response;
      }).catch(function() { return new Response('', { status: 504 }); });
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
