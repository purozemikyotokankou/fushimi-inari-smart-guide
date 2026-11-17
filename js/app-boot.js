/* Fushimi Inari Smart Guide V143 — prepare guide data first; video is optional background work. */
(() => {
    'use strict';

    const CACHE_NAME = 'fushimi-smart-guide-v143';
    const VIDEO_URL = './videos/fushimi.mp4';
    const CORE_ASSETS = [
        './index.html', './home.html', './planner.html', './spots.html',
        './css/style.css', './css/planner.css',
        './js/language.js', './js/home-ui.js', './js/home-boot.js',
        './js/planner.js', './js/planner-weather.js', './js/planner-ambient-light.js',
        './js/spots.js', './js/carto-config.js', './js/liquid-cursor.js',
        './js/app-boot.js', './service-worker.js',
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
    const IMAGE_ASSETS = ['./images/hero2.jpg', './images/hero3.jpg', './images/hero4.jpg'];
    const MAX_PRELOAD_IMAGE_BYTES = 600 * 1024;
    const WORKER_VERSION = 143;

    // Visitor-facing messages, translated for every language offered on the language screen.
    const COPY = {
        ja: {
            title: '伏見稲荷の散策ガイドを準備しています',
            intro: '地図や見どころ情報を準備しています。まもなく、伏見稲荷の魅力を巡る旅が始まります！',
            shell: 'ガイドの画面を準備しています…',
            spots: '観光スポットの情報を準備しています…',
            routes: '参道ルートを準備しています…',
            images: '写真やアイコンを準備しています…',
            video: 'ホーム画面の映像は、準備完了後もバックグラウンドで読み込みます。',
            ready: '準備ができました。ホーム画面へ移動します。',
            failed: 'ガイドを開けませんでした',
            partial: '基本のガイド情報を準備しました。一部の写真は表示後に読み込みます。',
            retry: 'ガイドの準備が完了しませんでした。通信状況を確認して、もう一度お試しください。',
            count: (done, total) => `準備状況 ${done} / ${total}`,
            progressLabel: 'ガイドの準備状況', retryButton: 'もう一度試す'
        },
        en: {
            title: 'Getting Your Fushimi Inari Guide Ready',
            intro: 'We’re preparing your map and sightseeing information. Get ready to explore the beauty of Fushimi Inari!',
            shell: 'Preparing your guide…',
            spots: 'Preparing sightseeing information…',
            routes: 'Preparing walking routes…',
            images: 'Preparing photos and icons…',
            video: 'The home-screen video will continue loading in the background.',
            ready: 'You’re all set. Opening the home screen…',
            failed: 'The guide could not be opened',
            partial: 'The essential guide information is ready. Some photos will load later.',
            retry: 'The guide could not finish preparing. Check your connection and try again.',
            count: (done, total) => `Preparation ${done} / ${total}`,
            progressLabel: 'Guide preparation progress', retryButton: 'Try again'
        },
        zh: {
            title: '正在为您准备伏见稻荷导览',
            intro: '正在准备地图和景点介绍。马上就可以开启您的伏见稻荷探索之旅！',
            shell: '正在准备导览页面…',
            spots: '正在准备景点信息…',
            routes: '正在准备参道路线…',
            images: '正在准备照片和图标…',
            video: '主页视频将在后台继续加载。',
            ready: '准备完成，正在进入主页…',
            failed: '无法打开导览',
            partial: '基本导览信息已准备完成，部分照片将在之后加载。',
            retry: '导览准备未能完成。请检查网络连接后重试。',
            count: (done, total) => `准备进度 ${done} / ${total}`,
            progressLabel: '导览准备进度', retryButton: '重试'
        },
        ko: {
            title: '후시미 이나리 여행 가이드를 준비하고 있어요',
            intro: '지도와 주요 명소 정보를 준비하고 있습니다. 곧 후시미 이나리의 매력을 만나보세요!',
            shell: '가이드 화면을 준비하는 중…',
            spots: '관광 명소 정보를 준비하는 중…',
            routes: '참배길 경로를 준비하는 중…',
            images: '사진과 아이콘을 준비하는 중…',
            video: '홈 화면 동영상은 백그라운드에서 계속 불러옵니다.',
            ready: '준비가 완료되었습니다. 홈 화면으로 이동합니다…',
            failed: '가이드를 열 수 없습니다',
            partial: '기본 가이드 정보가 준비되었습니다. 일부 사진은 나중에 불러옵니다.',
            retry: '가이드 준비를 완료하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.',
            count: (done, total) => `준비 상태 ${done} / ${total}`,
            progressLabel: '가이드 준비 진행 상황', retryButton: '다시 시도'
        }
    };

    const state = {
        language: 'ja', phase: 'shell', done: 0,
        total: CORE_ASSETS.length + DATA_ASSETS.length + ICON_ASSETS.length + IMAGE_ASSETS.length,
        failures: [], started: false, promise: null, cache: null, workerRegistration: null
    };

    const byId = (id) => document.getElementById(id);
    const overlay = byId('fushimi-startup-overlay');
    const retryButton = byId('fushimi-boot-retry');
    const copy = () => COPY[state.language] || COPY.ja;

    function progressPercent() {
        return state.total ? Math.min(100, Math.round(state.done / state.total * 100)) : 0;
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
        if (intro) intro.textContent = state.phase === 'complete' && state.failures.length ? t.partial : t.intro;
        if (status) status.textContent = state.phase === 'shell' ? t.shell
            : state.phase === 'spots' ? t.spots
            : state.phase === 'routes' ? t.routes
            : state.phase === 'images' ? t.images
            : state.phase === 'video' ? t.video
            : state.phase === 'complete' ? t.ready : t.retry;
        if (count) count.textContent = t.count(state.done, state.total);
        const percent = progressPercent();
        if (fill) fill.style.width = `${percent}%`;
        if (bar) {
            bar.setAttribute('aria-valuenow', String(percent));
            bar.setAttribute('aria-label', t.progressLabel);
        }
        if (retryButton) retryButton.textContent = t.retryButton;
    }

    function setPhase(phase) {
        state.phase = phase;
        updateOverlay();
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

    function waitForWorkerControl(timeoutMs = 1800) {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) return Promise.resolve();
        return new Promise((resolve) => {
            let timer;
            const done = () => {
                if (timer) clearTimeout(timer);
                navigator.serviceWorker?.removeEventListener('controllerchange', done);
                resolve();
            };
            navigator.serviceWorker?.addEventListener('controllerchange', done, { once: true });
            timer = setTimeout(done, timeoutMs);
        });
    }

    async function registerWorker() {
        if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return false;
        try {
            const registration = await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
            state.workerRegistration = registration;
            window.FushimiServiceWorkerRegistration = registration;
            registration.update().catch(() => {});
            const deadline = Date.now() + 12000;
            while (Date.now() < deadline) {
                const worker = navigator.serviceWorker.controller || registration.active;
                if (await askWorkerVersion(worker) === WORKER_VERSION) {
                    await waitForWorkerControl();
                    window.FushimiServiceWorkerReady = Promise.resolve(registration);
                    return true;
                }
                await new Promise((resolve) => setTimeout(resolve, 300));
            }
            console.warn('[Fushimi] V143 Service Worker did not become active before preparation.');
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
        const timeout = window.setTimeout(() => controller.abort(), 10000);
        try {
            const requestUrl = new URL(url);
            if (!external) requestUrl.searchParams.set('__fushimi_preload', 'v143');
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
            fetchUrl.searchParams.set('__fushimi_preload', 'v143');
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

    async function runGroup(items, concurrency = 4, required = false) {
        let allSucceeded = true;
        for (let index = 0; index < items.length; index += concurrency) {
            const results = await Promise.all(items.slice(index, index + concurrency)
                .map((path) => storeAsset(path, required)));
            if (required && results.some((success) => !success)) allSucceeded = false;
        }
        return allSucceeded;
    }

    // Ask the active Service Worker to cache the large video last. The worker's
    // message event uses waitUntil(), so this download can continue after we
    // navigate away from the language page. It is deliberately not awaited.
    function startVideoPreloadInBackground() {
        const registration = state.workerRegistration;
        const worker = navigator.serviceWorker?.controller || registration?.active || registration?.waiting;
        if (!worker) {
            console.info('[Fushimi] Video will load normally from the home page; no active worker.');
            return false;
        }
        try {
            worker.postMessage({ type: 'FUSHIMI_PRELOAD_VIDEO_LAST', url: new URL(VIDEO_URL, document.baseURI).href });
            return true;
        } catch (error) {
            console.warn('[Fushimi] Could not schedule background video preload:', error);
            return false;
        }
    }

    async function prepare() {
        state.failures = [];
        state.done = 0;
        state.total = CORE_ASSETS.length + DATA_ASSETS.length + ICON_ASSETS.length + IMAGE_ASSETS.length;
        await registerWorker();
        state.cache = await getCache();

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
        state.total = CORE_ASSETS.length + DATA_ASSETS.length + ICON_ASSETS.length + images.length;
        updateOverlay();
        for (let index = 0; index < images.length; index += 3) {
            await Promise.all(images.slice(index, index + 3).map(storeImageIfSmall));
        }

        // This is intentionally the final preload step, and it must never hold
        // up navigation to the home screen.
        setPhase('video');
        startVideoPreloadInBackground();
        setPhase('complete');
        return { guideReady: true, failures: state.failures.slice() };
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
        const minimumDisplay = new Promise((resolve) => setTimeout(resolve, 650));

        try {
            if (!state.promise) state.promise = prepare();
            const result = await state.promise;
            if (!result || !result.guideReady) throw new Error('Guide assets are not ready');
            await minimumDisplay;
            await waitForWorkerControl();
            setPhase('complete');
            await new Promise((resolve) => setTimeout(resolve, 180));
            // Do not wait for fushimi.mp4. It is being cached by the Service Worker
            // in the background and the home page may stream it as needed.
            location.href = 'home.html';
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

    window.FushimiAppBoot = {
        start,
        getStatus: () => ({ phase: state.phase, done: state.done, total: state.total, failures: state.failures.slice() })
    };
    window.selectLanguage = start;

    // Prewarm app data and images silently while the visitor is choosing a language.
    // The video is only scheduled after everything else and never blocks the home page.
    state.promise = prepare().catch((error) => {
        console.warn('[Fushimi] Background preparation could not start:', error);
        state.promise = null;
        return null;
    });
})();
