// Cloudflare Pages Functions - API 中转 + 边缘缓存
// 把 /api/* 请求转发到 Worker，解决 workers.dev 国内访问问题
// GET 请求缓存 5 分钟，写操作主动清除热门排行缓存
const TARGET = "https://yxmysbd-api.zyb8808.workers.dev";
const CACHE_TTL = 300; // 5 分钟

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
  "Access-Control-Max-Age": "86400",
};

function withCORS(resp) {
  const headers = new Headers(resp.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(resp.body, { status: resp.status, headers });
}

export async function onRequest(context) {
  const { request } = context;
  const cache = caches.default;
  // 用干净的 URL 作为缓存 key，避免 header 差异导致匹配失败
  const cacheKey = new Request(request.url, { method: "GET" });

  // 预检请求直接返回
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const isGet = request.method === "GET" || request.method === "HEAD";

  // GET 请求先查边缘缓存
  if (isGet) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      const r = withCORS(cached);
      r.headers.set("X-Cache", "HIT");
      return r;
    }
  }

  // 转发到 Worker
  const url = new URL(request.url);
  const targetUrl = TARGET + url.pathname + url.search;

  const fwdHeaders = new Headers();
  const ct = request.headers.get("Content-Type");
  if (ct) fwdHeaders.set("Content-Type", ct);
  const token = request.headers.get("X-Admin-Token");
  if (token) fwdHeaders.set("X-Admin-Token", token);

  const init = { method: request.method, headers: fwdHeaders, redirect: "follow" };
  if (!isGet) init.body = request.body;

  let resp;
  try {
    resp = await fetch(targetUrl, init);
  } catch (e) {
    return new Response(JSON.stringify({ error: "upstream_error", detail: String(e) }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  const response = withCORS(resp);

  // GET 且 200：写入边缘缓存
  if (isGet && resp.status === 200) {
    const cached = response.clone();
    cached.headers.set("Cache-Control", `s-maxage=${CACHE_TTL}`);
    context.waitUntil(cache.put(cacheKey, cached));
    response.headers.set("X-Cache", "MISS");
  }

  // 写操作：主动清除热门排行缓存，避免点赞后排行不刷新
  if (!isGet && resp.status < 400) {
    const hotUrl = new URL("/api/likes/all", request.url).toString();
    context.waitUntil(cache.delete(hotUrl));
  }

  return response;
}
