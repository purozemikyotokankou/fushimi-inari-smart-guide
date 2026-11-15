/* Index startup: begin offline preparation before the visitor chooses a language. */
(() => {
  'use strict';

  const CACHE_NAME = 'fushimi-smart-guide-v130';
  const REQUIRED_ASSETS = [
    './index.html',
    './home.html',
    './planner.html',
    './spots.html',
    './css/style.css',
    './css/planner.css',
    './js/language.js',
    './js/home.js',
    './js/planner.js',
    './js/spots.js',
    './js/map.js',
    './js/liquid-cursor.js',
    './js/app-boot.js',
    './js/offline.js',
    './service-worker.js',
    './js/carto-config.js',
    './data/spots.json',
    './data/routes.json',
    './noicon.svg',
    './shop.svg',
    './eat.svg',
    './images/icons/category-all.svg',
    './images/icons/category-back.svg',
    './images/icons/category-buy.svg',
    './images/icons/category-facilities.svg',
    './images/icons/category-food-shop.svg',
    './images/icons/category-food.svg',
    './images/icons/category-sightseeing.svg',
    './images/icons/category-transport.svg',
    './images/icons/current-location.svg',
    './images/icons/diaper-changing-gray.svg',
    './images/icons/diaper-changing.svg',
    './images/icons/ostomate-gray.svg',
    './images/icons/ostomate.svg',
    './images/icons/search.svg',
    './images/icons/station-jr-gray.svg',
    './images/icons/station-jr.svg',
    './images/icons/station-keihan-gray.svg',
    './images/icons/station-keihan.svg',
    './images/icons/toilet-female-gray.svg',
    './images/icons/toilet-female.svg',
    './images/icons/toilet-gray.svg',
    './images/icons/toilet-japanese-gray.svg',
    './images/icons/toilet-japanese.svg',
    './images/icons/toilet-male-gray.svg',
    './images/icons/toilet-male.svg',
    './images/icons/toilet-western-gray.svg',
    './images/icons/toilet-western.svg',
    './images/icons/toilet.svg',
    './images/icons/washlet-gray.svg',
    './images/icons/washlet.svg',
    './images/icons/wheelchair-gray.svg',
    './images/icons/wheelchair.svg',
    'https://unpkg.com/leaflet/dist/leaflet.js',
    'https://unpkg.com/leaflet/dist/leaflet.css'
  ];

  // Small photos are best-effort assets. The Leaflet library is essential
  // for the map and is included in the required list above. Large original
  // photos and the 9 MB hero video are intentionally excluded.
  const OPTIONAL_ASSETS = [
    './images/hero2.jpg',
    './images/hero3.jpg',
    './images/hero4.jpg',
    './images/honden.jpg',
    './images/summit.jpg',
    './images/toire.jpg'
  ];

  const COPY = {
    ja: {
      title: 'ガイドを準備しています',
      intro: 'オフラインでも使えるように、必要なデータを保存しています。',
      required: 'アプリと観光データを保存中…',
      optional: '追加の画像を保存中…',
      ready: '準備が完了しました',
      issue: '一部のデータを保存できませんでした。オンラインで続行します。',
      offline: '接続できません。保存済みのデータで起動します。',
      count: (done, total) => `${done} / ${total} 項目を確認`,
      note: '初回の準備が終わると、次回からオフラインでも一部の機能を利用できます。'
    },
    en: {
      title: 'Preparing your guide',
      intro: 'Saving the essential files so the guide can work offline.',
      required: 'Saving the app and guide data…',
      optional: 'Saving additional images…',
      ready: 'You’re all set',
      issue: 'Some files could not be saved. Continuing online.',
      offline: 'No connection. Starting with previously saved files.',
      count: (done, total) => `${done} / ${total} items checked`,
      note: 'After this first setup, some features will remain available offline.'
    },
    zh: {
      title: '正在准备导览',
      intro: '正在保存必要文件，以便离线使用。',
      required: '正在保存应用和景点数据…',
      optional: '正在保存补充图片…',
      ready: '准备完成',
      issue: '部分文件未能保存，将继续在线打开。',
      offline: '目前无法连接网络，将使用已保存的数据启动。',
      count: (done, total) => `已检查 ${done} / ${total} 项`,
      note: '首次准备完成后，部分功能可在离线时继续使用。'
    },
    ko: {
      title: '가이드를 준비하고 있어요',
      intro: '오프라인에서도 사용할 수 있도록 필요한 데이터를 저장하고 있습니다.',
      required: '앱과 관광 데이터를 저장하는 중…',
      optional: '추가 이미지를 저장하는 중…',
      ready: '준비가 완료되었습니다',
      issue: '일부 파일을 저장하지 못했습니다. 온라인으로 계속합니다.',
      offline: '인터넷에 연결할 수 없습니다. 저장된 데이터로 시작합니다.',
      count: (done, total) => `${done} / ${total}개 항목 확인`,
      note: '첫 준비가 끝나면 일부 기능을 오프라인에서도 사용할 수 있습니다.'
    }
  };

  const state = {
    done: 0,
    total: REQUIRED_ASSETS.length + OPTIONAL_ASSETS.length,
    requiredDone: 0,
    requiredTotal: REQUIRED_ASSETS.length,
    requiredFailures: [],
    optionalFailures: [],
    phase: 'required',
    started: false,
    completed: false,
    result: null,
    preparation: null
  };

  const byId = (id) => document.getElementById(id);

  function getCopy() {
    const selected = localStorage.getItem('language') || 'ja';
    return COPY[selected] || COPY.ja;
  }

  function updateOverlay() {
    const copy = getCopy();
    const status = byId('fushimi-boot-status');
    const count = byId('fushimi-boot-count');
    const bar = byId('fushimi-boot-progress');
    const fill = byId('fushimi-boot-progress-fill');
    const title = byId('fushimi-boot-title');
    const intro = byId('fushimi-boot-intro');
    if (!status || !count || !bar || !fill || !title || !intro) return;

    title.textContent = copy.title;
    intro.textContent = copy.intro;
    status.textContent = state.phase === 'required' ? copy.required : copy.optional;
    const percent = state.total ? Math.round((state.done / state.total) * 100) : 100;
    fill.style.width = `${percent}%`;
    bar.setAttribute('aria-valuenow', String(percent));
    count.textContent = copy.count(state.done, state.total);
  }

  function showOverlay() {
    const overlay = byId('fushimi-startup-overlay');
    if (!overlay) return;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    updateOverlay();
    requestAnimationFrame(() => overlay.classList.add('is-visible'));
  }

  function updateTaskProgress(required, success, url) {
    state.done += 1;
    if (required) {
      state.requiredDone += 1;
      if (!success) state.requiredFailures.push(url);
      if (state.requiredDone >= state.requiredTotal) state.phase = 'optional';
    } else if (!success) {
      state.optionalFailures.push(url);
    }
    updateOverlay();
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return { ok: false, reason: 'unsupported' };
    if (!/^https?:$/.test(location.protocol)) return { ok: false, reason: 'protocol' };
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
      window.FushimiServiceWorkerRegistration = registration;
      let becameReady = false;
      await Promise.race([
        navigator.serviceWorker.ready.then(() => { becameReady = true; }),
        new Promise((resolve) => setTimeout(resolve, 7000))
      ]);
      return { ok: becameReady && Boolean(registration.active) };
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
      return { ok: false, reason: 'registration' };
    }
  }

  async function cacheOne(cache, path, required) {
    const absoluteUrl = new URL(path, document.baseURI).href;
    try {
      const cached = await cache.match(absoluteUrl, { ignoreSearch: true });
      if (cached) {
        updateTaskProgress(required, true, path);
        return true;
      }

      const isExternal = /^https?:\/\//i.test(path) && new URL(path).origin !== location.origin;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), isExternal ? 8000 : 10000);
      let response;
      // Add a one-time query token to same-origin preload requests. This avoids
      // an older active service worker returning its previous cached copy while
      // the v130 cache is being warmed during an update.
      const fetchUrl = new URL(absoluteUrl);
      if (!isExternal) fetchUrl.searchParams.set('__fushimi_preload', 'v130');
      try {
        response = await fetch(fetchUrl.href, {
          cache: 'reload',
          signal: controller.signal,
          ...(isExternal ? { mode: 'no-cors' } : {})
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response || (!response.ok && response.type !== 'opaque')) {
        throw new Error(`HTTP ${response ? response.status : 'no response'}`);
      }
      await cache.put(absoluteUrl, response.clone());
      updateTaskProgress(required, true, path);
      return true;
    } catch (error) {
      updateTaskProgress(required, false, path);
      return false;
    }
  }

  async function runInBatches(cache, items, required, batchSize) {
    for (let index = 0; index < items.length; index += batchSize) {
      const batch = items.slice(index, index + batchSize);
      await Promise.all(batch.map((path) => cacheOne(cache, path, required)));
    }
  }

  const serviceWorkerPromise = registerServiceWorker();
  window.FushimiServiceWorkerReady = serviceWorkerPromise;

  async function prepareOfflineAssets() {
    const worker = await serviceWorkerPromise;
    let cache;
    try {
      if (!('caches' in window)) throw new Error('Cache Storage is unavailable');
      cache = await caches.open(CACHE_NAME);
    } catch (error) {
      console.warn('Offline cache is unavailable:', error);
      state.requiredFailures.push('Cache Storage');
      state.done = state.total;
      state.phase = 'optional';
      updateOverlay();
      return { ok: false, worker, requiredFailures: state.requiredFailures.slice(), optionalFailures: [] };
    }

    // Essential local files are completed first. Small photos and the Leaflet
    // CDN are best-effort and never prevent the visitor from entering the app.
    await runInBatches(cache, REQUIRED_ASSETS, true, 5);
    await runInBatches(cache, OPTIONAL_ASSETS, false, 3);

    state.completed = true;
    state.result = {
      ok: state.requiredFailures.length === 0 && worker.ok,
      worker,
      requiredFailures: state.requiredFailures.slice(),
      optionalFailures: state.optionalFailures.slice()
    };
    return state.result;
  }

  state.preparation = prepareOfflineAssets().catch((error) => {
    console.warn('Offline preparation failed:', error);
    state.requiredFailures.push('preparation');
    state.completed = true;
    state.result = {
      ok: false,
      worker: { ok: false },
      requiredFailures: state.requiredFailures.slice(),
      optionalFailures: state.optionalFailures.slice()
    };
    return state.result;
  });

  async function start(language) {
    if (state.started) return;
    state.started = true;
    if (language) localStorage.setItem('language', language);

    document.querySelectorAll('.language-box button').forEach((button) => {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
    });

    showOverlay();
    const minimumDisplay = new Promise((resolve) => setTimeout(resolve, 500));
    const maxWait = new Promise((resolve) => setTimeout(() => resolve({
      ok: false,
      timedOut: true,
      requiredFailures: state.requiredFailures.slice(),
      optionalFailures: state.optionalFailures.slice()
    }), 25000));
    const result = await Promise.race([state.preparation, maxWait]);
    await minimumDisplay;

    const copy = getCopy();
    const status = byId('fushimi-boot-status');
    const intro = byId('fushimi-boot-intro');
    const title = byId('fushimi-boot-title');
    const fill = byId('fushimi-boot-progress-fill');
    const bar = byId('fushimi-boot-progress');
    const count = byId('fushimi-boot-count');

    if (result && result.ok) {
      state.phase = 'complete';
      if (title) title.textContent = copy.ready;
      if (status) status.textContent = copy.ready;
      if (intro) intro.textContent = copy.note;
      if (fill) fill.style.width = '100%';
      if (bar) bar.setAttribute('aria-valuenow', '100');
      if (count) count.textContent = copy.count(state.total, state.total);
    } else {
      const message = !navigator.onLine ? copy.offline : copy.issue;
      if (title) title.textContent = copy.title;
      if (status) status.textContent = message;
      if (intro) intro.textContent = copy.note;
      if (count && result && result.timedOut) count.textContent = '';
    }

    // A short completion hold makes the status readable without adding an
    // unnecessary long splash screen after the files are already cached.
    await new Promise((resolve) => setTimeout(resolve, result && result.ok ? 550 : 700));
    location.href = 'home.html';
  }

  window.FushimiAppBoot = {
    start,
    getStatus: () => ({
      done: state.done,
      total: state.total,
      requiredDone: state.requiredDone,
      requiredTotal: state.requiredTotal,
      complete: state.completed,
      result: state.result
    })
  };

  // Expose progress even before the loading panel is opened, then initialize
  // the hidden overlay once the HTML has finished parsing.
  document.addEventListener('DOMContentLoaded', updateOverlay, { once: true });
})();
