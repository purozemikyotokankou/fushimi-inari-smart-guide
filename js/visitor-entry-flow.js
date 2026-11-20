/* Fushimi Inari Smart Guide — consent + early startup preparation
 * Load after js/app-boot.js on index.html.
 * Essential data preparation starts while the visitor reads the notice.
 * The Service Worker keeps the large video as the final background task.
 */
(() => {
  'use strict';

  const NOTICE_VERSION = '2026-11-20-2';
  const CONSENT_KEY = 'fushimi_smart_guide_consent_version';
  const LANG_KEY = 'language';
  const SUPPORTED = ['ja', 'en', 'zh', 'ko'];

  const COPY = {
    ja: {
      title: 'ご利用前の確認',
      intro: '伏見稲荷スマートガイドをご利用になる前に、以下の内容をご確認ください。',
      sections: [
        ['情報について', '掲載情報・施設情報・参道情報は、正確性や最新性、完全性を保証するものではありません。営業時間、通行可否、施設の状況などは現地でご確認ください。'],
        ['安全について', '境内・山道には階段、坂道、段差、滑りやすい場所があります。足元や周囲に注意し、無理のない行動をしてください。混雑、天候、路面状況にも十分ご注意ください。'],
        ['ルート・位置情報について', '表示されるルートやGPS位置は、通信環境・端末・地形などにより、実際と異なる場合や利用できない場合があります。必ず現地の案内標識・係員の指示・通行規制を優先してください。'],
        ['緊急時について', '本アプリは緊急時の通報・救助・安全確認を行うものではありません。緊急時は本アプリに頼らず、周囲の係員や適切な緊急窓口へ連絡してください。'],
        ['免責について', '本アプリの利用により生じた損害等について、運営者が責任を負わない場合があります。ただし、法令上免責が認められない場合まで責任を免れるものではありません。']
      ],
      warning: '安全に関わる判断は、必ず現地の状況と公式な案内を優先してください。',
      accept: '内容を確認して同意する',
      decline: '同意しない',
      declined: 'ご利用には上記内容への同意が必要です。同意しない場合は、アプリを開始できません。',
      prep: 'ガイドを先に準備しています',
      prepSub: 'この画面を確認している間に、必要な情報を読み込んでいます。',
      loadingTitle: 'まもなくご利用いただけます',
      loadingSub: '最後の準備をしています。',
      tasks: ['スポット情報', '参道ルート', '画面の準備'],
      failedTitle: '準備を完了できませんでした',
      failedBody: '通信環境を確認して、もう一度お試しください。現地の案内を優先してください。',
      retry: 'もう一度試す',
      back: '言語選択に戻る',
      ready: '準備ができました'
    },
    en: {
      title: 'Before You Continue',
      intro: 'Please review the following information before using Fushimi Inari Smart Guide.',
      sections: [
        ['Information', 'Spot, facility and trail information may be inaccurate, incomplete or out of date. Confirm opening hours, access and current conditions on site.'],
        ['Safety', 'The grounds and mountain paths include stairs, slopes, uneven surfaces and slippery areas. Watch your step, surroundings, crowds, weather and ground conditions. Do not push beyond your ability.'],
        ['Routes and location', 'Routes and GPS positions may differ from reality or may be unavailable due to your device, terrain or network conditions. Always follow on-site signs, closures and staff instructions.'],
        ['Emergencies', 'This app does not provide emergency response, rescue or safety monitoring. Do not rely on the app in an emergency; contact on-site staff or the appropriate emergency services.'],
        ['Limitation of liability', 'The operator may not be liable for certain losses arising from use of this app, to the extent permitted by applicable law. This notice does not exclude liability where the law does not allow it.']
      ],
      warning: 'For all safety decisions, follow actual site conditions and official instructions.',
      accept: 'I have read and agree',
      decline: 'I do not agree',
      declined: 'You must agree to the notice to use the app. The app cannot start unless you agree.',
      prep: 'Preparing your guide in the background',
      prepSub: 'We are loading essential information while you review this notice.',
      loadingTitle: 'Almost ready',
      loadingSub: 'Finishing the final preparations.',
      tasks: ['Sightseeing spots', 'Walking routes', 'Guide screen'],
      failedTitle: 'Could not finish preparing',
      failedBody: 'Please check your connection and try again. Always follow on-site guidance.',
      retry: 'Try again',
      back: 'Back to language selection',
      ready: 'Ready'
    },
    zh: {
      title: '使用前请确认',
      intro: '使用伏见稻荷智能导览前，请阅读并确认以下内容。',
      sections: [
        ['信息说明', '景点、设施及参道信息可能不准确、不完整或未及时更新。营业时间、开放情况及现场状况请以现场信息为准。'],
        ['安全注意事项', '境内及山路有台阶、坡道、高低差和湿滑路面。请注意脚下及周围环境，并根据自身情况行动，同时留意拥挤、天气和路面状况。'],
        ['路线与定位', '路线及GPS位置可能因设备、地形或网络状况而与实际情况不同，也可能无法使用。请务必优先遵守现场标识、封闭规定及工作人员指示。'],
        ['紧急情况', '本应用不提供紧急报警、救援或安全监控服务。发生紧急情况时，请勿仅依赖本应用，请联系现场工作人员或适当的紧急服务机构。'],
        ['责任限制', '在适用法律允许的范围内，运营方可能不对使用本应用造成的某些损失承担责任。但法律不允许免责的情形不在此限。']
      ],
      warning: '涉及安全的判断，请始终以现场情况及官方指引为准。',
      accept: '已阅读并同意',
      decline: '不同意',
      declined: '使用本应用需要同意上述内容。不同意则无法启动应用。',
      prep: '正在后台提前准备导览',
      prepSub: '您阅读本说明时，我们正在加载必要信息。',
      loadingTitle: '即将准备完成',
      loadingSub: '正在完成最后准备。',
      tasks: ['景点信息', '参道路线', '导览画面'],
      failedTitle: '准备未能完成',
      failedBody: '请检查网络连接后重试。请始终优先遵守现场指引。',
      retry: '重试',
      back: '返回语言选择',
      ready: '准备完成'
    },
    ko: {
      title: '이용 전 확인 사항',
      intro: '후시미 이나리 스마트 가이드를 이용하기 전에 아래 내용을 확인해 주세요.',
      sections: [
        ['정보 안내', '관광지·시설·참배길 정보는 정확성, 최신성 또는 완전성을 보장하지 않습니다. 영업시간, 출입 가능 여부 및 현장 상황은 현장에서 확인해 주세요.'],
        ['안전 안내', '경내와 산길에는 계단, 경사, 단차 및 미끄러운 구간이 있습니다. 발밑과 주변을 살피고 무리하지 마세요. 혼잡도, 날씨와 노면 상태에도 주의해 주세요.'],
        ['경로 및 위치 정보', '경로와 GPS 위치는 기기, 지형 또는 통신 상태에 따라 실제와 다르거나 이용할 수 없을 수 있습니다. 현장 안내 표지, 통행 제한 및 직원의 안내를 항상 우선해 주세요.'],
        ['긴급 상황', '이 앱은 긴급 신고, 구조 또는 안전 확인 서비스를 제공하지 않습니다. 긴급 상황에서는 앱에만 의존하지 말고 현장 직원이나 적절한 긴급 기관에 연락해 주세요.'],
        ['책임 제한', '관련 법령이 허용하는 범위에서 운영자는 앱 이용으로 발생한 일부 손해에 대해 책임을 지지 않을 수 있습니다. 법률상 면책이 허용되지 않는 경우까지 책임을 면제하는 것은 아닙니다.']
      ],
      warning: '안전과 관련된 판단은 반드시 현장 상황과 공식 안내를 우선해 주세요.',
      accept: '내용을 확인하고 동의합니다',
      decline: '동의하지 않습니다',
      declined: '앱을 이용하려면 위 내용에 동의해야 합니다. 동의하지 않으면 앱을 시작할 수 없습니다.',
      prep: '백그라운드에서 가이드를 미리 준비하고 있습니다',
      prepSub: '안내 내용을 확인하는 동안 필요한 정보를 불러옵니다.',
      loadingTitle: '곧 이용할 수 있습니다',
      loadingSub: '마지막 준비를 진행하고 있습니다.',
      tasks: ['관광지 정보', '참배길 경로', '안내 화면'],
      failedTitle: '준비를 완료하지 못했습니다',
      failedBody: '네트워크 연결을 확인한 후 다시 시도해 주세요. 현장 안내를 항상 우선해 주세요.',
      retry: '다시 시도',
      back: '언어 선택으로 돌아가기',
      ready: '준비 완료'
    }
  };

  let preparationPromise = null;
  let preparedData = null;
  let preparationError = null;

  const lang = () => {
    let value = 'ja';
    try { value = localStorage.getItem(LANG_KEY) || 'ja'; } catch (_) {}
    return SUPPORTED.includes(value) ? value : 'ja';
  };

  const styles = `
    .fsg-entry-layer{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:18px;background:rgba(16,18,22,.46);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;color:#19191b}
    .fsg-entry-card{width:min(620px,100%);max-height:min(88dvh,900px);overflow:auto;border:1px solid rgba(255,255,255,.72);border-radius:28px;background:linear-gradient(145deg,rgba(255,255,255,.97),rgba(247,247,245,.93));box-shadow:0 28px 90px rgba(0,0,0,.25);padding:clamp(22px,4vw,34px);overscroll-behavior:contain}
    .fsg-entry-card h2{margin:0 0 10px;font-size:clamp(23px,4vw,30px);letter-spacing:-.03em}
    .fsg-entry-intro{margin:0 0 18px;color:#555;line-height:1.65}
    .fsg-entry-section{padding:13px 0;border-top:1px solid rgba(0,0,0,.08)}
    .fsg-entry-section h3{margin:0 0 5px;font-size:15px}
    .fsg-entry-section p{margin:0;color:#555;font-size:14px;line-height:1.72}
    .fsg-entry-warning{margin:15px 0 18px;padding:12px 14px;border-radius:14px;background:#fff3e8;color:#7a3d08;font-size:13px;line-height:1.6}
    .fsg-entry-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .fsg-entry-btn{min-height:50px;border:0;border-radius:14px;padding:12px 16px;font:inherit;font-weight:650;cursor:pointer}
    .fsg-entry-accept{background:#c40018;color:#fff;box-shadow:0 7px 18px rgba(196,0,24,.2)}
    .fsg-entry-decline{background:#ececee;color:#333}
    .fsg-entry-error{margin:12px 0 0;color:#a00018;font-size:13px;line-height:1.55}
    .fsg-prep-strip{display:flex;align-items:center;gap:10px;margin:-3px 0 17px;padding:10px 12px;border-radius:13px;background:#f5f5f6;color:#666;font-size:12px;line-height:1.45}
    .fsg-prep-wheel{flex:0 0 17px;width:17px;height:17px;border:2px solid rgba(196,0,24,.18);border-top-color:#c40018;border-radius:50%;animation:fsg-spin .75s linear infinite}
    .fsg-loader-card{text-align:center;padding:34px 26px}
    .fsg-loader-spinner{width:34px;height:34px;margin:0 auto 20px;border:3px solid rgba(196,0,24,.15);border-top-color:#c40018;border-radius:50%;animation:fsg-spin .75s linear infinite}
    .fsg-loader-card h2{margin-bottom:8px}
    .fsg-loader-sub{color:#666;font-size:14px;line-height:1.6}
    .fsg-loader-task{margin:22px auto 0;max-width:360px;text-align:left;color:#666;font-size:13px;line-height:2}
    .fsg-loader-task li{list-style:none}
    .fsg-loader-task li::before{content:"";display:inline-block;width:7px;height:7px;margin:0 10px 1px 0;border-radius:50%;background:#d0d0d0}
    .fsg-loader-task li.is-done::before{background:#27834b}
    .fsg-loader-task li.is-active::before{background:#c40018;box-shadow:0 0 0 4px rgba(196,0,24,.1)}
    @keyframes fsg-spin{to{transform:rotate(360deg)}}
    @media(max-width:520px){.fsg-entry-actions{grid-template-columns:1fr}.fsg-entry-card{border-radius:23px}}
    @media(prefers-reduced-motion:reduce){.fsg-loader-spinner,.fsg-prep-wheel{animation:none}}
  `;

  function addStyles() {
    if (document.getElementById('fsg-entry-style')) return;
    const node = document.createElement('style');
    node.id = 'fsg-entry-style';
    node.textContent = styles;
    document.head.appendChild(node);
  }

  async function getJson(path, timeoutMs = 20000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(path, { cache: 'no-cache', signal: controller.signal });
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // Start immediately when the notice appears. Both JSON files are fetched in parallel.
  function beginPreparation() {
    if (preparationPromise) return preparationPromise;
    preparationError = null;
    preparationPromise = (async () => {
      const [spots, routes] = await Promise.all([
        getJson('./data/spots.json'),
        getJson('./data/routes.json')
      ]);
      if (!Array.isArray(spots) && (!spots || typeof spots !== 'object')) throw new Error('Invalid spots data');
      if (!routes || typeof routes !== 'object') throw new Error('Invalid routes data');
      preparedData = { spots, routes };
      return preparedData;
    })().catch(error => {
      preparationError = error;
      preparationPromise = null;
      throw error;
    });
    return preparationPromise;
  }

  function showNotice(language) {
    const c = COPY[language];
    const layer = document.createElement('div');
    layer.className = 'fsg-entry-layer';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    layer.setAttribute('aria-labelledby', 'fsg-notice-title');

    const sections = c.sections.map(([heading, body]) =>
      `<section class="fsg-entry-section"><h3>${heading}</h3><p>${body}</p></section>`
    ).join('');

    layer.innerHTML = `
      <div class="fsg-entry-card">
        <h2 id="fsg-notice-title">${c.title}</h2>
        <p class="fsg-entry-intro">${c.intro}</p>
        <div class="fsg-prep-strip"><span class="fsg-prep-wheel" aria-hidden="true"></span><span>${c.prep}<br>${c.prepSub}</span></div>
        ${sections}
        <div class="fsg-entry-warning">${c.warning}</div>
        <div class="fsg-entry-actions">
          <button type="button" class="fsg-entry-btn fsg-entry-accept">${c.accept}</button>
          <button type="button" class="fsg-entry-btn fsg-entry-decline">${c.decline}</button>
        </div>
        <p class="fsg-entry-error" hidden></p>
      </div>`;
    document.body.appendChild(layer);

    const error = layer.querySelector('.fsg-entry-error');
    layer.querySelector('.fsg-entry-decline').addEventListener('click', () => {
      error.textContent = c.declined;
      error.hidden = false;
    });
    layer.querySelector('.fsg-entry-accept').addEventListener('click', async () => {
      try { localStorage.setItem(CONSENT_KEY, NOTICE_VERSION); } catch (_) {}
      layer.remove();
      await startLoading(language);
    });
    layer.querySelector('.fsg-entry-accept').focus({ preventScroll: true });

    // Begin loading while the visitor reads the terms, not after pressing agree.
    beginPreparation().catch(error => console.warn('[Fushimi] Early preparation failed; retrying after consent:', error));
  }

  function showLoader(language) {
    const c = COPY[language];
    const layer = document.createElement('div');
    layer.className = 'fsg-entry-layer';
    layer.setAttribute('role', 'status');
    layer.setAttribute('aria-live', 'polite');
    layer.innerHTML = `
      <div class="fsg-entry-card fsg-loader-card">
        <div class="fsg-loader-spinner" aria-hidden="true"></div>
        <h2 class="fsg-loader-title">${c.loadingTitle}</h2>
        <p class="fsg-loader-sub">${c.loadingSub}</p>
        <ul class="fsg-loader-task">${c.tasks.map((task, i) => `<li data-task="${i}">${task}</li>`).join('')}</ul>
      </div>`;
    document.body.appendChild(layer);
    return layer;
  }

  async function startLoading(language) {
    const c = COPY[language];
    const layer = showLoader(language);
    const tasks = [...layer.querySelectorAll('[data-task]')];
    const setTask = (index, state) => {
      if (tasks[index]) tasks[index].classList.add(`is-${state}`);
    };

    try {
      setTask(0, 'active');
      const data = preparedData || await beginPreparation();
      setTask(0, 'done');
      setTask(1, 'done');
      setTask(2, 'active');

      // The main page itself is checked only after consent; large movie is never awaited.
      const homeResponse = await fetch('./home.html', { cache: 'no-cache' });
      if (!homeResponse.ok) throw new Error(`home.html: HTTP ${homeResponse.status}`);
      setTask(2, 'done');

      // Make parsed essential data available for diagnostics only; home loads its own canonical data.
      window.FushimiStartupPrepared = data;
      layer.querySelector('.fsg-loader-title').textContent = c.ready;
      await new Promise(resolve => setTimeout(resolve, 220));
      location.href = 'home.html';
    } catch (error) {
      console.warn('[Fushimi] Startup preparation failed:', error);
      layer.querySelector('.fsg-loader-spinner').remove();
      layer.querySelector('.fsg-loader-title').textContent = c.failedTitle;
      layer.querySelector('.fsg-loader-sub').textContent = c.failedBody;
      layer.querySelector('.fsg-loader-task').hidden = true;
      const actions = document.createElement('div');
      actions.className = 'fsg-entry-actions';
      actions.style.marginTop = '22px';
      actions.innerHTML = `<button class="fsg-entry-btn fsg-entry-accept" type="button">${c.retry}</button><button class="fsg-entry-btn fsg-entry-decline" type="button">${c.back}</button>`;
      layer.querySelector('.fsg-entry-card').appendChild(actions);
      actions.children[0].addEventListener('click', () => {
        preparationPromise = null;
        preparedData = null;
        layer.remove();
        startLoading(language);
      });
      actions.children[1].addEventListener('click', () => {
        layer.remove();
        location.href = 'index.html';
      });
    }
  }

  function chooseLanguage(language) {
    const selected = SUPPORTED.includes(language) ? language : 'ja';
    try { localStorage.setItem(LANG_KEY, selected); } catch (_) {}
    let accepted = false;
    try { accepted = localStorage.getItem(CONSENT_KEY) === NOTICE_VERSION; } catch (_) {}
    if (accepted) {
      beginPreparation().catch(error => console.warn('[Fushimi] Preparation will retry:', error));
      startLoading(selected);
    } else {
      showNotice(selected); // starts preloading immediately
    }
  }

  addStyles();
  window.selectLanguage = chooseLanguage;
})();
