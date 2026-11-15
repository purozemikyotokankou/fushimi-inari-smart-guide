/* Small connection-status notice for the app's main screens. */
(() => {
  'use strict';

  function init() {
    if (document.getElementById('fushimi-offline-status')) return;

    const badge = document.createElement('div');
    badge.id = 'fushimi-offline-status';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');
    badge.style.cssText = [
      'position:fixed', 'z-index:90000', 'left:50%',
      'bottom:calc(14px + env(safe-area-inset-bottom, 0px))',
      'transform:translateX(-50%)', 'max-width:calc(100vw - 32px)',
      'padding:9px 14px', 'border-radius:999px', 'white-space:nowrap',
      'background:rgba(32,32,35,.90)', 'color:#fff',
      'font:600 12px/1.35 system-ui,-apple-system,sans-serif',
      'box-shadow:0 5px 20px rgba(0,0,0,.18)',
      'backdrop-filter:blur(14px)', '-webkit-backdrop-filter:blur(14px)',
      'pointer-events:none', 'opacity:0', 'transition:opacity .22s ease'
    ].join(';');
    document.body.appendChild(badge);

    let hideTimer;
    const language = () => localStorage.getItem('language') || 'ja';
    const labels = {
      ja: { offline: 'オフライン — 保存済みデータで表示中', online: 'オンラインに復帰しました' },
      en: { offline: 'Offline — showing saved content', online: 'Back online' },
      zh: { offline: '离线模式 — 正在显示已保存的数据', online: '已恢复网络连接' },
      ko: { offline: '오프라인 — 저장된 데이터 표시 중', online: '온라인으로 다시 연결되었습니다' }
    };

    function show(text, persistent) {
      badge.textContent = text;
      badge.style.opacity = '1';
      clearTimeout(hideTimer);
      if (!persistent) hideTimer = setTimeout(() => { badge.style.opacity = '0'; }, 2600);
    }

    function update() {
      const copy = labels[language()] || labels.ja;
      if (!navigator.onLine) show(copy.offline, true);
      else if (badge.style.opacity === '1') show(copy.online, false);
    }

    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    if (!navigator.onLine) update();

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)
      && !window.FushimiAppBoot && !window.FushimiServiceWorkerReady) {
      navigator.serviceWorker.register('./service-worker.js', { scope: './' })
        .catch((error) => console.warn('Offline support registration failed:', error));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
