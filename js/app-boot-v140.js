/* Fushimi Inari Smart Guide V140 — language-screen preloader and offline cache. */
(() => {
    'use strict';

    const CACHE_NAME = 'fushimi-smart-guide-v140';
    const VIDEO_URL = './videos/fushimi.mp4';
    const CORE_ASSETS = [
        './index.html', './home.html', './planner.html', './spots.html',
        './css/style.css', './css/planner.css',
        './js/language.js', './js/home-ui.js', './js/home-boot.js',
        './js/planner.js', './js/planner-weather.js', './js/planner-ambient-light.js',
        './js/spots.js', './js/carto-config.js', './js/liquid-cursor.js',
        './js/app-boot-v140.js', './service-worker.js',
        'https://unpkg.com/leaflet/dist/leaflet.js',
        'https://unpkg.com/leaflet/dist/leaflet.css'
    ];
    const ICON_ASSETS = [
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
    const DATA_ASSETS = ['./data/spots.json', './data/routes.json'];
    // Small, frequently used photos only. Large originals are cached on first use
    // by the Service Worker so the first visit is not burdened by dozens of MB.
    const IMAGE_ASSETS = ['./images/hero2.jpg', './images/hero3.jpg', './images/hero4.jpg'];
    const MAX_PRELOAD_IMAGE_BYTES = 600 * 1024;

    const COPY = {
        ja: {
            title: 'ガイドを準備しています', intro: '動画を先に読み込み、そのあと地図・参道・画像を保存しています。',
            video: '動画を優先して読み込んでいます…', shell: 'マップとアプリの準備中…',
            spots: 'スポットの位置を保存中…', routes: '参道の位置を保存中…', images: '画像を保存中…',
            ready: '準備が完了しました', failed: '読み込みに失敗しました', partial: '動画と基本データを準備しました。一部の画像は後から読み込みます。',
            retry: '動画や必要なデータを読み込めませんでした。通信を確認して再試行してください。',
            count: (done, total) => `${done} / ${total} 項目を保存`, retryButton: '再試行'
        },
        en: {
            title: 'Preparing your guide', intro: 'Loading the video first, then saving the map, paths and photos.',
            video: 'Loading the video first…', shell: 'Preparing the map and app…',
            spots: 'Saving spot locations…', routes: 'Saving walking paths…', images: 'Saving photos…',
            ready: 'Your guide is ready', failed: 'Loading failed', partial: 'The video and core data are ready. Some photos will load later.',
            retry: 'The video or required app data could not be loaded. Check your connection and try again.',
            count: (done, total) => `Saving ${done} / ${total} items`, retryButton: 'Try again'
        },
        zh: {
            title: '正在准备导览', intro: '先加载视频，然后保存地图、参道和图片。',
            video: '正在优先加载视频…', shell: '正在准备地图和应用…',
            spots: '正在保存景点位置…', routes: '正在保存参道位置…', images: '正在保存图片…',
            ready: '准备完成', failed: '加载失败', partial: '视频和基本数据已准备完成，部分图片将在之后加载。',
            retry: '视频或必要数据加载失败。请检查网络后重试。',
            count: (done, total) => `正在保存 ${done} / ${total} 项`, retryButton: '重试'
        },
        ko: {
            title: '가이드를 준비하고 있어요', intro: '동영상을 먼저 불러온 뒤 지도, 참배길, 이미지를 저장합니다.',
            video: '동영상을 우선 불러오는 중…', shell: '지도와 앱을 준비하는 중…',
            spots: '관광지 위치를 저장하는 중…', routes: '참배길 위치를 저장하는 중…', images: '이미지를 저장하는 중…',
            ready: '준비가 완료되었습니다', failed: '불러오기에 실패했습니다', partial: '동영상과 기본 데이터가 준비되었습니다. 일부 이미지는 나중에 불러옵니다.',
            retry: '동영상 또는 필수 데이터를 불러오지 못했습니다. 연결을 확인하고 다시 시도하세요.',
            count: (done, total) => `${done} / ${total}개 항목 저장`, retryButton: '다시 시도'
        }
    };

    const state = {
        language: 'ja', phase: 'video', done: 0,
        total: 1 + CORE_ASSETS.length + DATA_ASSETS.length + ICON_ASSETS.length + IMAGE_ASSETS.length,
        videoPercent: 0, videoBytes: 0, videoTotalBytes: 0,
        failures: [], started: false, promise: null, cache: null
    };

    const byId = (id) => document.getElementById(id);
    const overlay = byId('fushimi-startup-overlay');
    const retryButton = byId('fushimi-boot-retry');

    function copy() { return COPY[state.language] || COPY.ja; }

    function setPhase(phase) {
        state.phase = phase;
        updateOverlay();
    }

    function progressPercent() {
        if (state.phase === 'video') return Math.round(state.videoPercent * 0.55);
        const laterTotal = Math.max(1, state.total - 1);
        const laterDone = Math.max(0, state.done - 1);
        return Math.min(100, 55 + Math.round((laterDone / laterTotal) * 45));
    }

    function updateOverlay() {
        if (!overlay) return;
        const t = copy();
        const title = byId('fushimi-boot-title');
        const intro = byId('fushimi-boot-intro');
        const status = byId('fushimi-boot-status');
        const count = byId('fushimi-boot-count');
        const bar = byId('fushimi-boot-progress');
        const fill = byId('fushimi-boot-progress-fill');
        if (title) title.textContent = t.title;
        if (intro) intro.textContent = t.intro;
        if (status) status.textContent = state.phase === 'video' ? t.video
            : state.phase === 'shell' ? t.shell
            : state.phase === 'spots' ? t.spots
            : state.phase === 'routes' ? t.routes
            : state.phase === 'images' ? t.images
            : state.phase === 'complete' ? t.ready : t.retry;
        if (count) {
            if (state.phase === 'video' && state.videoTotalBytes > 0) {
                const mb = (bytes) => (bytes / 1048576).toFixed(1);
                count.textContent = `${mb(state.videoBytes)} / ${mb(state.videoTotalBytes)} MB`;
            } else {
                count.textContent = t.count(state.done, state.total);
            }
        }
        const percent = progressPercent();
        if (fill) fill.style.width = `${percent}%`;
        if (bar) bar.setAttribute('aria-valuenow', String(percent));
    }

    function showOverlay() {
        if (!overlay) return;
        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
        updateOverlay();
        requestAnimationFrame(() => overlay.classList.add('is-visible'));
    }

    async function askWorkerVersion(worker) {
        if (!worker || typeof MessageChannel === 'undefined') return null;
        return new Promise((resolve) => {
            const channel = new MessageChannel();
            const timer = setTimeout(() => { channel.port1.close(); resolve(null); }, 500);
            channel.port1.onmessage = (event) => {
                clearTimeout(timer);
                channel.port1.close();
                resolve(event.data && event.data.version ? Number(event.data.version) : null);
            };
            try { worker.postMessage({ type: 'FUSHIMI_GET_VERSION' }, [channel.port2]); }
            catch (_) { clearTimeout(timer); channel.port1.close(); resolve(null); }
        });
    }

    async function registerWorker() {
        if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return false;
        try {
            const registration = await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
            window.FushimiServiceWorkerRegistration = registration;
            // Explicitly request an update, then wait until this page is controlled
            // by V140. This prevents an older worker from supplying stale cached JS.
            registration.update().catch(() => {});
            const deadline = Date.now() + 12000;
            while (Date.now() < deadline) {
                const worker = navigator.serviceWorker.controller || registration.active;
                if (await askWorkerVersion(worker) === 140) {
                    await waitForWorkerControl();
                    window.FushimiServiceWorkerReady = Promise.resolve(registration);
                    return true;
                }
                await new Promise((resolve) => setTimeout(resolve, 300));
            }
            console.warn('[Fushimi] V140 Service Worker did not become active before preload.');
            return false;
        } catch (error) {
            console.warn('[Fushimi] Service Worker registration failed:', error);
            return false;
        }
    }

    async function getCache() {
        if (!('caches' in window)) throw new Error('Cache Storage is unavailable');
        return caches.open(CACHE_NAME);
    }

    function isExternal(path) {
        return /^https?:\/\//i.test(path) && new URL(path).origin !== location.origin;
    }

    async function storeAsset(path, required = false) {
        const url = new URL(path, document.baseURI).href;
        const cached = await state.cache.match(url, { ignoreSearch: true });
        if (cached) { state.done += 1; updateOverlay(); return true; }
        const external = isExternal(path);
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), external ? 10000 : 10000);
        try {
            const requestUrl = new URL(url);
            if (!external) requestUrl.searchParams.set('__fushimi_preload', 'v140');
            const response = await fetch(requestUrl.href, {
                cache: 'reload', signal: controller.signal,
                ...(external ? { mode: 'no-cors' } : {})
            });
            if (!response || (!response.ok && response.type !== 'opaque')) {
                throw new Error(`HTTP ${response ? response.status : 'no response'}: ${path}`);
            }
            await state.cache.put(url, response.clone());
            state.done += 1;
            updateOverlay();
            return true;
        } catch (error) {
            state.failures.push({ path, required, message: error.message });
            state.done += 1;
            updateOverlay();
            console.debug('[Fushimi] Preload skipped:', path, error);
            return false;
        } finally {
            window.clearTimeout(timeout);
        }
    }

    async function storeImageIfSmall(path) {
        const url = new URL(path, document.baseURI).href;
        const cached = await state.cache.match(url, { ignoreSearch: true });
        if (cached) { state.done += 1; updateOverlay(); return true; }
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 4500);
        try {
            const fetchUrl = new URL(url);
            fetchUrl.searchParams.set('__fushimi_preload', 'v140');
            const response = await fetch(fetchUrl.href, { cache: 'reload', signal: controller.signal });
            if (!response.ok) throw new Error(`Image HTTP ${response.status}: ${path}`);
            const declaredSize = Number(response.headers.get('content-length')) || 0;
            if (declaredSize > MAX_PRELOAD_IMAGE_BYTES) {
                await response.body?.cancel();
                state.done += 1;
                updateOverlay();
                return false;
            }
            const blob = await response.blob();
            if (!blob.size || blob.size > MAX_PRELOAD_IMAGE_BYTES) {
                state.done += 1;
                updateOverlay();
                return false;
            }
            await state.cache.put(url, new Response(blob, {
                status: 200,
                headers: { 'Content-Type': response.headers.get('content-type') || 'image/jpeg', 'Content-Length': String(blob.size) }
            }));
            state.done += 1;
            updateOverlay();
            return true;
        } catch (error) {
            state.failures.push({ path, required: false, message: error.message });
            state.done += 1;
            updateOverlay();
            console.debug('[Fushimi] Optional photo skipped:', path, error);
            return false;
        } finally {
            window.clearTimeout(timeout);
        }
    }

    async function getSpotImagePaths() {
        try {
            const dataUrl = new URL(DATA_ASSETS[0], document.baseURI).href;
            const cached = await state.cache.match(dataUrl, { ignoreSearch: true });
            if (!cached) return [];
            const payload = await cached.json();
            if (!Array.isArray(payload)) return [];
            return payload
                .map((spot) => spot && typeof spot.image === 'string' ? spot.image.trim() : '')
                .filter((image) => image && !/^https?:\/\//i.test(image) && !image.includes('..') && /\.(?:jpe?g|png|webp|avif)$/i.test(image))
                .map((image) => `./images/${image.replace(/^\/+/, '')}`);
        } catch (_) { return []; }
    }

    async function preloadVideo() {
        const url = new URL(VIDEO_URL, document.baseURI).href;
        const cached = await state.cache.match(url, { ignoreSearch: true });
        if (cached) {
            state.done = 1;
            state.videoPercent = 100;
            updateOverlay();
            return true;
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 120000);
        try {
            const fetchUrl = new URL(url);
            fetchUrl.searchParams.set('__fushimi_preload', 'v140');
            const response = await fetch(fetchUrl.href, { cache: 'reload', signal: controller.signal });
            if (!response.ok) throw new Error(`Video HTTP ${response.status}`);
            const total = Number(response.headers.get('content-length')) || 0;
            state.videoTotalBytes = total;
            const mime = response.headers.get('content-type') || 'video/mp4';
            let videoBlob;
            if (response.body && response.body.getReader) {
                const reader = response.body.getReader();
                const chunks = [];
                while (true) {
                    const part = await reader.read();
                    if (part.done) break;
                    chunks.push(part.value);
                    state.videoBytes += part.value.byteLength;
                    if (total > 0) state.videoPercent = Math.min(99, Math.round(state.videoBytes / total * 100));
                    updateOverlay();
                }
                videoBlob = new Blob(chunks, { type: mime });
            } else {
                videoBlob = await response.blob();
                state.videoBytes = videoBlob.size;
                state.videoPercent = 99;
                updateOverlay();
            }
            if (!videoBlob.size) throw new Error('Downloaded video is empty');
            await state.cache.put(url, new Response(videoBlob, {
                status: 200,
                headers: { 'Content-Type': mime, 'Content-Length': String(videoBlob.size) }
            }));
            state.videoPercent = 100;
            state.done = 1;
            updateOverlay();
            return true;
        } finally {
            window.clearTimeout(timeout);
        }
    }

    async function runGroup(items, concurrency = 4, required = false) {
        let allSucceeded = true;
        for (let index = 0; index < items.length; index += concurrency) {
            const results = await Promise.all(items.slice(index, index + concurrency)
                .map((path) => storeAsset(path, required)));
            if (required && results.some((success) => !success)) allSucceeded = false;
        }
        return allSucceeded;
    }

    async function prepare() {
        state.failures = [];
        state.done = 0;
        state.videoPercent = 0;
        state.videoBytes = 0;
        state.videoTotalBytes = 0;
        // Activate the new worker before warming the cache, so an older worker
        // cannot feed stale files into this version's cache.
        await registerWorker();
        state.cache = await getCache();

        setPhase('video');
        await preloadVideo();

        setPhase('shell');
        const appAssetsReady = await runGroup(CORE_ASSETS, 5, true);
        if (!appAssetsReady) throw new Error('Some essential app files could not be saved.');

        setPhase('spots');
        if (!await storeAsset(DATA_ASSETS[0], true)) throw new Error('spots.json could not be saved.');

        setPhase('routes');
        if (!await storeAsset(DATA_ASSETS[1], true)) throw new Error('routes.json could not be saved.');

        setPhase('images');
        await runGroup(ICON_ASSETS, 5, false);
        const spotImages = await getSpotImagePaths();
        const images = Array.from(new Set([...IMAGE_ASSETS, ...spotImages]));
        state.total = 1 + CORE_ASSETS.length + DATA_ASSETS.length + ICON_ASSETS.length + images.length;
        updateOverlay();
        for (let index = 0; index < images.length; index += 3) {
            await Promise.all(images.slice(index, index + 3).map(storeImageIfSmall));
        }

        setPhase('complete');
        return { videoReady: true, failures: state.failures.slice() };
    }

    function waitForWorkerControl() {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) return Promise.resolve();
        return new Promise((resolve) => {
            let timer;
            const done = () => {
                if (timer) clearTimeout(timer);
                navigator.serviceWorker?.removeEventListener('controllerchange', done);
                resolve();
            };
            navigator.serviceWorker?.addEventListener('controllerchange', done, { once: true });
            timer = setTimeout(done, 1800);
        });
    }

    async function start(language) {
        if (state.started) return;
        state.started = true;
        state.language = COPY[language] ? language : 'ja';
        try { localStorage.setItem('language', state.language); } catch (_) {}
        document.querySelectorAll('.language-box button').forEach((button) => {
            button.disabled = true;
            button.setAttribute('aria-disabled', 'true');
        });
        if (retryButton) retryButton.hidden = true;
        showOverlay();
        const minimumDisplay = new Promise((resolve) => setTimeout(resolve, 450));

        try {
            if (!state.promise) state.promise = prepare();
            const result = await state.promise;
            await minimumDisplay;
            await waitForWorkerControl();
            if (result && result.videoReady) {
                if (byId('fushimi-boot-intro')) {
                    byId('fushimi-boot-intro').textContent = state.failures.length ? copy().partial : copy().intro;
                }
                setPhase('complete');
                await new Promise((resolve) => setTimeout(resolve, 350));
                location.href = 'home.html';
                return;
            }
            throw new Error('Video was not cached');
        } catch (error) {
            console.error('[Fushimi] Startup preparation failed:', error);
            state.promise = null;
            state.started = false;
            if (byId('fushimi-boot-title')) byId('fushimi-boot-title').textContent = copy().failed;
            if (byId('fushimi-boot-intro')) byId('fushimi-boot-intro').textContent = copy().retry;
            if (byId('fushimi-boot-status')) byId('fushimi-boot-status').textContent = copy().retry;
            if (retryButton) {
                retryButton.textContent = copy().retryButton;
                retryButton.hidden = false;
            }
            document.querySelectorAll('.language-box button').forEach((button) => {
                button.disabled = false;
                button.removeAttribute('aria-disabled');
            });
        }
    }

    retryButton?.addEventListener('click', () => start(state.language));

    window.FushimiAppBoot = { start, getStatus: () => ({ phase: state.phase, done: state.done, total: state.total, failures: state.failures.slice() }) };
    // Keep the existing inline language buttons working, but route them through the loader.
    window.selectLanguage = start;

    // Silent background preparation begins as soon as the language screen opens.
    state.promise = prepare().catch((error) => {
        console.warn('[Fushimi] Background preparation could not start:', error);
        state.promise = null;
        return null;
    });
})();
