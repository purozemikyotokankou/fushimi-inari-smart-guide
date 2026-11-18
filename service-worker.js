/* Fushimi Inari Smart Guide — offline support (v152 — one planner page) */
'use strict';

const CACHE_NAME = 'fushimi-smart-guide-v152';
const CACHE_PREFIX = 'fushimi-smart-guide-';
const WORKER_VERSION = 152;
const VIDEO_PATH = '/videos/fushimi.mp4';
const CDN_ASSETS = [
  'https://unpkg.com/leaflet/dist/leaflet.js',
  'https://unpkg.com/leaflet/dist/leaflet.css',
  'https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.mjs',
  'https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.css',
  'https://cdn.jsdelivr.net/npm/maplibre-gl@6.18.0/dist/maplibre-gl.mjs',
  'https://cdn.jsdelivr.net/npm/maplibre-gl@6.18.0/dist/maplibre-gl.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

async function migrateCachedVideo(newCache) {
  const canonicalUrl = new URL(`.${VIDEO_PATH}`, self.registration.scope).href;
  if (await newCache.match(canonicalUrl, { ignoreSearch: true })) return;
  const oldNames = (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME);
  for (const name of oldNames) {
    try {
      const oldCache = await caches.open(name);
      const requests = await oldCache.keys();
      const videoRequest = requests.find((request) => new URL(request.url).pathname.endsWith(VIDEO_PATH));
      if (!videoRequest) continue;
      const response = await oldCache.match(videoRequest);
      if (response) {
        await newCache.put(canonicalUrl, response.clone());
        return;
      }
    } catch (error) {
      console.warn('[Fushimi SW] Previous video cache migration skipped:', error);
    }
  }
}

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const currentCache = await caches.open(CACHE_NAME);
    await migrateCachedVideo(currentCache);
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((client) => client.postMessage({ type: 'FUSHIMI_SW_ACTIVE', version: WORKER_VERSION }));
  })());
});

async function matchCached(request) {
  return caches.match(request, { ignoreSearch: true });
}

async function fetchAndCache(request, cache) {
  const response = await fetch(request);
  if (response && (response.ok || response.type === 'opaque')) {
    try { await cache.put(request, response.clone()); } catch (_) { /* quota or opaque restrictions */ }
  }
  return response;
}

async function preloadVideoLast(client) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(`.${VIDEO_PATH}`, self.registration.scope).href;
  const cached = await cache.match(url, { ignoreSearch: true });
  if (cached) {
    client?.postMessage({ type: 'FUSHIMI_VIDEO_PRELOAD_RESULT', status: 'already-cached' });
    return;
  }
  const response = await fetch(new Request(url, { method: 'GET', cache: 'reload' }));
  if (!response || !response.ok) throw new Error(`Video HTTP ${response ? response.status : 'no response'}`);
  await cache.put(url, response.clone());
  client?.postMessage({ type: 'FUSHIMI_VIDEO_PRELOAD_RESULT', status: 'cached' });
}

const PRELOAD_CORE = [
  './index.html', './home.html', './planner.html', './spots.html',
  './css/style.css', './css/planner.css',
  './js/language.js', './js/home-ui.js', './js/home-boot.js',
  './js/planner.js', './js/planner-weather.js', './js/planner-ambient-light.js',
  './js/spots.js', './js/carto-config.js', './js/liquid-cursor.js', './js/app-boot.js',
  './service-worker.js',
  'https://unpkg.com/leaflet/dist/leaflet.js',
  'https://unpkg.com/leaflet/dist/leaflet.css',
  'https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.mjs',
  'https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.css',
  'https://cdn.jsdelivr.net/npm/maplibre-gl@6.18.0/dist/maplibre-gl.mjs',
  'https://cdn.jsdelivr.net/npm/maplibre-gl@6.18.0/dist/maplibre-gl.css'
];
const PRELOAD_DATA = ['./data/spots.json', './data/routes.json'];
const PRELOAD_ICONS = [
  './noicon.svg', './shop.svg', './eat.svg',
  './images/icons/category-all.svg', './images/icons/category-back.svg',
  './images/icons/category-buy.svg', './images/icons/category-facilities.svg',
  './images/icons/category-food-shop.svg', './images/icons/category-food.svg',
  './images/icons/category-sightseeing.svg', './images/icons/category-transport.svg',
  './images/icons/current-location.svg', './images/icons/diaper-changing-gray.svg',
  './images/icons/diaper-changing.svg', './images/icons/ostomate-gray.svg',
  './images/icons/ostomate.svg', './images/icons/search.svg',
  './images/icons/station-jr-gray.svg', './images/icons/station-jr.svg',
  './images/icons/station-keihan-gray.svg', './images/icons/station-keihan.svg',
  './images/icons/toilet-female-gray.svg', './images/icons/toilet-female.svg',
  './images/icons/toilet-gray.svg', './images/icons/toilet-japanese-gray.svg',
  './images/icons/toilet-japanese.svg', './images/icons/toilet-male-gray.svg',
  './images/icons/toilet-male.svg', './images/icons/toilet-western-gray.svg',
  './images/icons/toilet-western.svg', './images/icons/toilet.svg',
  './images/icons/washlet-gray.svg', './images/icons/washlet.svg',
  './images/icons/wheelchair-gray.svg', './images/icons/wheelchair.svg'
];
const PRELOAD_HERO_IMAGES = ['./images/hero2.jpg', './images/hero3.jpg', './images/hero4.jpg'];
const MAX_BACKGROUND_IMAGE_BYTES = 600 * 1024;

function absoluteUrl(path) {
  return new URL(path, self.registration.scope).href;
}

async function cacheOne(path, { refresh = false, imageLimit = 0 } = {}) {
  const cache = await caches.open(CACHE_NAME);
  const url = absoluteUrl(path);
  const cached = await cache.match(url, { ignoreSearch: true });
  if (cached && !refresh) return true;
  const external = new URL(url).origin !== self.location.origin;
  try {
    const request = new Request(url, {
      method: 'GET',
      cache: refresh ? 'reload' : 'default',
      ...(external ? { mode: 'no-cors' } : {})
    });
    const response = await fetch(request);
    if (!response || (!response.ok && response.type !== 'opaque')) return !!cached;
    if (imageLimit && response.type !== 'opaque') {
      const declared = Number(response.headers.get('content-length')) || 0;
      if (declared > imageLimit) return !!cached;
      const blob = await response.clone().blob();
      if (!blob.size || blob.size > imageLimit) return !!cached;
    }
    await cache.put(url, response.clone());
    return true;
  } catch (_) {
    return !!cached;
  }
}

async function cacheGroup(paths, concurrency = 4, options = {}) {
  for (let i = 0; i < paths.length; i += concurrency) {
    await Promise.all(paths.slice(i, i + concurrency).map((path) => cacheOne(path, options)));
  }
}

async function preloadAllSilently(client) {
  await cacheGroup(PRELOAD_CORE, 5);
  await cacheGroup(PRELOAD_DATA, 2, { refresh: true });
  const cache = await caches.open(CACHE_NAME);
  let spotImages = [];
  try {
    const spotsResponse = await cache.match(absoluteUrl('./data/spots.json'), { ignoreSearch: true });
    const spots = spotsResponse ? await spotsResponse.clone().json() : [];
    if (Array.isArray(spots)) {
      spotImages = spots
        .map((spot) => spot && typeof spot.image === 'string' ? spot.image.trim() : '')
        .filter((image) => image && !/^https?:\/\//i.test(image) && !image.includes('..') && /\.(?:jpe?g|png|webp|avif)$/i.test(image))
        .map((image) => `./images/${image.replace(/^\/+/, '')}`);
    }
  } catch (_) { /* Keep the rest of the offline cache useful if the JSON is malformed. */ }

  const allImages = Array.from(new Set([...PRELOAD_HERO_IMAGES, ...spotImages]));
  await cacheGroup(PRELOAD_ICONS, 5);
  await cacheGroup(allImages, 3, { imageLimit: MAX_BACKGROUND_IMAGE_BYTES });
  await preloadVideoLast(client);
  client?.postMessage({ type: 'FUSHIMI_SILENT_PRELOAD_RESULT', status: 'finished' });
}

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'FUSHIMI_GET_VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: WORKER_VERSION });
    return;
  }
  if (data.type === 'FUSHIMI_PRELOAD_ALL_SILENT') {
    const task = preloadAllSilently(event.source).catch((error) => {
      console.warn('[Fushimi SW] Silent offline preparation stopped; normal online loading remains available:', error);
    });
    event.waitUntil(task);
    return;
  }
  if (data.type === 'FUSHIMI_PRELOAD_VIDEO_LAST') {
    const task = preloadVideoLast(event.source).catch((error) => {
      console.warn('[Fushimi SW] Background video preload failed; home playback can still stream:', error);
      event.source?.postMessage({ type: 'FUSHIMI_VIDEO_PRELOAD_RESULT', status: 'failed' });
    });
    event.waitUntil(task);
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const cachePromise = caches.open(CACHE_NAME);

  if (sameOrigin && url.pathname.endsWith('.mp4') && request.headers.has('range')) {
    event.respondWith((async () => {
      const cached = await caches.match(new URL(request.url).href, { ignoreSearch: true });
      if (!cached) {
        try { return await fetch(request); } catch (_) { return Response.error(); }
      }
      const blob = await cached.blob();
      const rangeHeader = request.headers.get('range') || '';
      const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
      if (!match) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
      let start = match[1] ? Number(match[1]) : NaN;
      let end = match[2] ? Number(match[2]) : NaN;
      if (Number.isNaN(start)) {
        const suffixLength = end;
        if (!Number.isFinite(suffixLength) || suffixLength <= 0) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
        start = Math.max(0, blob.size - suffixLength);
        end = blob.size - 1;
      } else if (Number.isNaN(end)) {
        end = blob.size - 1;
      }
      if (start < 0 || start >= blob.size || end < start) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
      end = Math.min(end, blob.size - 1);
      const part = blob.slice(start, end + 1);
      return new Response(part, {
        status: 206,
        headers: {
          'Content-Type': cached.headers.get('Content-Type') || 'video/mp4',
          'Content-Length': String(part.size),
          'Content-Range': `bytes ${start}-${end}/${blob.size}`,
          'Accept-Ranges': 'bytes'
        }
      });
    })());
    return;
  }

  if (!sameOrigin) {
    if (!CDN_ASSETS.includes(url.href)) return;
    event.respondWith((async () => {
      const cached = await matchCached(request);
      if (cached) return cached;
      try { return await fetchAndCache(request, await cachePromise); }
      catch (_) { return Response.error(); }
    })());
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cached = await matchCached(request);
      const cache = await cachePromise;
      let timer;
      try {
        const network = fetch(request).then(async (response) => {
          if (response && response.ok) {
            try { await cache.put(request, response.clone()); } catch (_) {}
            return response;
          }
          return cached || response;
        });
        const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('navigation timeout')), 1200); });
        const response = await Promise.race([network, timeout]);
        clearTimeout(timer);
        return response;
      } catch (_) {
        clearTimeout(timer);
        return cached || await matchCached(new URL('./index.html', self.registration.scope).href) || Response.error();
      }
    })());
    return;
  }

  if (url.pathname.endsWith('.json')) {
    const cachedPromise = matchCached(request);
    const backgroundRefresh = cachedPromise.then(async (cached) => {
      if (!cached) return;
      const cache = await cachePromise;
      const response = await fetch(request);
      if (response && response.ok) {
        try { await cache.put(request, response.clone()); } catch (_) {}
      }
    }).catch(() => {});
    event.waitUntil(backgroundRefresh);
    event.respondWith((async () => {
      const cached = await cachedPromise;
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          try { await (await cachePromise).put(request, response.clone()); } catch (_) {}
        }
        return response;
      } catch (_) { return Response.error(); }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await matchCached(request);
    if (cached) return cached;
    try { return await fetchAndCache(request, await cachePromise); }
    catch (_) { return Response.error(); }
  })());
});
