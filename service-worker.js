const CACHE_NAME = 'yxmysbd-v8';
const urlsToCache = [
  './',
  './index.html',
  './404.html',
  './changelog.html',
  './all-builds.html',
  './admin.html',
  './skills.html',
  './engravings.html',
  './dark-armor.html',
  './pets.html',
  './runes-relics.html',
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

  var sameOrigin = new URL(req.url).origin === self.location.origin;

  // 跨域请求（后端 API、第三方 CDN 等）：只走网络、不查不写缓存。
  // 动态数据（公告/点赞/统计/日志/首页配置）必须实时，绝不能被旧缓存卡住。
  if (!sameOrigin) {
    event.respondWith(fetch(req).catch(function() { return new Response('', { status: 504 }); }));
    return;
  }

  // 同源页面导航请求：network-first，保证用户看到最新内容；离线时回退缓存
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

  // 同源静态资源（图片/CSS/JS/字体）：cache-first，加快二次访问
  event.respondWith(
    caches.match(req).then(function(cached) {
      if (cached) return cached;
      return fetch(req).then(function(response) {
        if (response && response.status === 200 && response.type === 'basic') {
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
