/* Fushimi Inari Smart Guide V144 — silent background offline preparation. */
(() => {
    'use strict';

    const WORKER_URL = './service-worker.js';
    const LANGUAGE_KEY = 'language';
    let registrationPromise = null;
    let preloadRequested = false;

    async function getRegistration() {
        if (registrationPromise) return registrationPromise;
        registrationPromise = (async () => {
            if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return null;
            try {
                const registration = await navigator.serviceWorker.register(WORKER_URL, { scope: './' });
                window.FushimiServiceWorkerRegistration = registration;
                registration.update().catch(() => {});
                return registration;
            } catch (error) {
                console.warn('[Fushimi] Offline preparation is unavailable:', error);
                return null;
            }
        })();
        return registrationPromise;
    }

    async function requestSilentPreload() {
        if (preloadRequested) return;
        preloadRequested = true;
        const registration = await getRegistration();
        if (!registration) return;

        // Prefer the controlling worker; otherwise wait for the newly installed worker.
        let worker = navigator.serviceWorker.controller || registration.active;
        if (!worker && registration.installing) {
            worker = registration.installing;
            await new Promise((resolve) => {
                const finish = () => {
                    if (worker.state === 'activated' || worker.state === 'redundant') {
                        worker.removeEventListener('statechange', finish);
                        resolve();
                    }
                };
                worker.addEventListener('statechange', finish);
                finish();
                setTimeout(resolve, 8000);
            });
            worker = navigator.serviceWorker.controller || registration.active || registration.waiting;
        }
        if (!worker) worker = registration.waiting;
        if (!worker) return;

        try {
            worker.postMessage({ type: 'FUSHIMI_PRELOAD_ALL_SILENT' });
            console.info('[Fushimi] Silent offline preparation scheduled.');
        } catch (error) {
            preloadRequested = false;
            console.warn('[Fushimi] Could not schedule silent offline preparation:', error);
        }
    }

    function selectLanguage(language) {
        const supported = ['ja', 'en', 'zh', 'ko'];
        const selected = supported.includes(language) ? language : 'ja';
        try { localStorage.setItem(LANGUAGE_KEY, selected); } catch (_) {}
        // Never show a loading screen or wait for downloads. The Service Worker
        // continues caching in the background; each destination page can load normally.
        location.href = 'home.html';
    }

    window.selectLanguage = selectLanguage;
    window.FushimiAppBoot = {
        start: selectLanguage,
        preload: requestSilentPreload
    };

    // Start caching immediately while the visitor is still on the language page.
    // No visible spinner, progress text, or navigation lock is used.
    requestSilentPreload();
})();
