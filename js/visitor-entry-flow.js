/* Fushimi Inari Smart Guide
   Visitor entry flow: early preparation -> notice -> home
*/
(() => {
    'use strict';

    const NOTICE_VERSION = '2026-11-20-v3';
    const CONSENT_KEY = 'fushimi_smart_guide_consent_version';
    const LANGUAGE_KEY = 'language';
    const SUPPORTED_LANGUAGES = ['ja', 'en', 'zh', 'ko'];

    const TEXT = {
        ja: {
            preparing: '観光ガイドのデータを準備しています',
            ready: '基本データの準備ができました',
            noticeTitle: 'ご利用前の注意事項',
            notice: [
                'このアプリは、伏見稲荷周辺の観光情報や参道ルートを案内する参考ツールです。',
                '掲載情報やルートは、更新状況や現地の状況によって実際と異なる場合があります。通行止め・立入制限・足元の状況を現地で確認し、神社や施設の案内・係員の指示を優先してください。',
                '歩きスマホを避け、周囲の歩行者や車両に十分注意してご利用ください。',
                '現在地機能を使う場合、端末の位置情報を利用します。位置情報の精度は端末や周囲の環境によって異なります。',
                '通信環境やご利用の契約によっては、通信料が発生する場合があります。'
            ],
            waiting: '準備が終わるまで、この画面でお待ちください。',
            agree: '同意して利用を開始',
            back: '同意しない（戻る）',
            loadingTitle: 'ガイドを準備しています',
            retry: 'もう一度試す',
            error: 'データを読み込めませんでした。通信環境を確認して、もう一度お試しください。'
        },
        en: {
            preparing: 'Preparing the guide data',
            ready: 'Basic data is ready',
            noticeTitle: 'Important Information Before Use',
            notice: [
                'This app provides tourist information and walking-route guidance around Fushimi Inari for reference.',
                'Information and routes may differ from actual conditions. Check signs, closures, restricted areas and ground conditions. Follow instructions from shrine and facility staff.',
                'Please do not use your phone while walking. Watch out for pedestrians and vehicles.',
                'When you use the current-location feature, the app uses your device location. Accuracy depends on your device and surroundings.',
                'Mobile data charges may apply depending on your network and service plan.'
            ],
            waiting: 'Please wait while the guide data is prepared.',
            agree: 'Agree and Continue',
            back: 'Do Not Agree (Back)',
            loadingTitle: 'Preparing the Guide',
            retry: 'Try Again',
            error: 'The data could not be loaded. Check your connection and try again.'
        },
        zh: {
            preparing: '正在准备观光指南数据',
            ready: '基本数据已准备完成',
            noticeTitle: '使用前注意事项',
            notice: [
                '本应用提供伏见稻荷周边旅游信息和参道路线，仅供参考。',
                '刊载的信息和路线可能与现场实际情况不同。请确认现场标识、封闭区域、禁止进入区域及路面状况，并遵从神社和设施工作人员的指示。',
                '请勿边走边看手机，并注意周围行人和车辆。',
                '使用当前位置功能时，应用会使用设备的位置信息。定位精度取决于设备和周围环境。',
                '根据网络环境和通信套餐，使用本应用可能产生通信费用。'
            ],
            waiting: '正在准备数据，请稍候。',
            agree: '同意并开始使用',
            back: '不同意（返回）',
            loadingTitle: '正在准备观光指南',
            retry: '重试',
            error: '无法读取数据。请检查网络连接后重试。'
        },
        ko: {
            preparing: '관광 안내 데이터를 준비하고 있습니다',
            ready: '기본 데이터 준비가 완료되었습니다',
            noticeTitle: '이용 전 주의사항',
            notice: [
                '이 앱은 후시미이나리 주변의 관광 정보와 참배길 경로를 안내하는 참고용 도구입니다.',
                '게시된 정보와 경로는 현장 상황에 따라 실제와 다를 수 있습니다. 통행 금지, 출입 제한 구역과 바닥 상태를 확인하고 신사 및 시설 직원의 안내를 따라 주세요.',
                '걸으면서 휴대전화를 보지 말고 주변 사람과 차량에 주의해 주세요.',
                '현재 위치 기능을 사용하면 기기의 위치 정보를 이용합니다. 정확도는 기기와 주변 환경에 따라 달라질 수 있습니다.',
                '네트워크 환경과 요금제에 따라 데이터 통신 요금이 발생할 수 있습니다.'
            ],
            waiting: '데이터 준비가 끝날 때까지 잠시 기다려 주세요.',
            agree: '동의하고 시작하기',
            back: '동의하지 않음 (뒤로)',
            loadingTitle: '관광 안내를 준비하고 있습니다',
            retry: '다시 시도',
            error: '데이터를 불러오지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.'
        }
    };

    let preparedData = null;
    let preparationPromise = null;
    let indicatorText = null;

    function addStyles() {
        if (document.getElementById('fsg-entry-styles')) return;

        const style = document.createElement('style');
        style.id = 'fsg-entry-styles';
        style.textContent = `
            .fsg-language-prep {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                margin: 18px auto 0;
                min-height: 24px;
                color: rgba(25,25,27,.68);
                font-size: 12px;
                line-height: 1.5;
            }

            .fsg-spinner {
                display: inline-block;
                flex: 0 0 auto;
                width: 17px;
                height: 17px;
                border: 2px solid rgba(196,0,24,.16);
                border-top-color: #c40018;
                border-radius: 50%;
                animation: fsgSpin .75s linear infinite;
            }

            @keyframes fsgSpin {
                to { transform: rotate(360deg); }
            }

            .fsg-notice-backdrop {
                position: fixed;
                inset: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 18px;
                background: rgba(18,18,20,.48);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
            }

            .fsg-notice-card {
                width: min(560px, 100%);
                max-height: 88vh;
                overflow-y: auto;
                padding: 30px 26px 24px;
                border: 1px solid rgba(255,255,255,.72);
                border-radius: 25px;
                background: rgba(255,255,255,.94);
                color: #19191b;
                box-shadow: 0 24px 70px rgba(0,0,0,.22);
                font-family: -apple-system, BlinkMacSystemFont,
                    "Helvetica Neue", Arial, sans-serif;
            }

            .fsg-notice-card h2 {
                margin: 0 0 20px;
                font-size: 23px;
                line-height: 1.35;
                text-align: center;
            }

            .fsg-notice-copy {
                margin: 0 0 13px;
                font-size: 14px;
                line-height: 1.8;
                color: rgba(25,25,27,.82);
            }

            .fsg-notice-status {
                display: flex;
                align-items: center;
                gap: 9px;
                min-height: 34px;
                margin: 18px 0 14px;
                padding: 9px 12px;
                border-radius: 12px;
                background: rgba(196,0,24,.055);
                color: rgba(25,25,27,.72);
                font-size: 12px;
                line-height: 1.5;
            }

            .fsg-notice-actions {
                display: grid;
                grid-template-columns: 1fr 1.25fr;
                gap: 10px;
                margin-top: 15px;
            }

            .fsg-notice-actions button {
                min-height: 48px;
                margin: 0;
                padding: 9px 12px;
                border: 1px solid rgba(0,0,0,.08);
                border-radius: 13px;
                font: inherit;
                font-size: 13px;
                font-weight: 650;
                cursor: pointer;
            }

            .fsg-notice-back {
                color: #333;
                background: #f0f0f0;
            }

            .fsg-notice-agree {
                color: white;
                background: #c40018;
                border-color: #c40018 !important;
            }

            .fsg-notice-actions button:disabled {
                opacity: .55;
                cursor: wait;
            }

            @media (max-width: 430px) {
                .fsg-notice-card {
                    padding: 25px 19px 20px;
                    border-radius: 21px;
                }

                .fsg-notice-card h2 {
                    font-size: 21px;
                }

                .fsg-notice-copy {
                    font-size: 13px;
                }

                .fsg-notice-actions {
                    grid-template-columns: 1fr;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .fsg-spinner {
                    animation-duration: 2s;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function addLanguageIndicator() {
        const box = document.querySelector('.language-box');
        if (!box || document.getElementById('fsg-language-prep')) return;

        const indicator = document.createElement('div');
        indicator.id = 'fsg-language-prep';
        indicator.className = 'fsg-language-prep';
        indicator.setAttribute('role', 'status');
        indicator.setAttribute('aria-live', 'polite');

        const spinner = document.createElement('span');
        spinner.className = 'fsg-spinner';
        spinner.setAttribute('aria-hidden', 'true');

        indicatorText = document.createElement('span');
        indicatorText.textContent = TEXT.ja.preparing;

        indicator.append(spinner, indicatorText);
        box.appendChild(indicator);
    }

    function updateIndicator(isReady, hasError = false) {
        const indicator = document.getElementById('fsg-language-prep');
        if (!indicator || !indicatorText) return;

        const spinner = indicator.querySelector('.fsg-spinner');

        if (isReady) {
            if (spinner) spinner.style.display = 'none';
            indicatorText.textContent = TEXT.ja.ready;
        } else {
            if (spinner) spinner.style.display = 'inline-block';
            indicatorText.textContent = hasError
                ? 'データの準備に失敗しました。言語選択後に再試行できます。'
                : TEXT.ja.preparing;
        }
    }

    async function fetchJson(path) {
        const response = await fetch(path, { cache: 'no-cache' });

        if (!response.ok) {
            throw new Error(`${path}: HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data === null || typeof data !== 'object') {
            throw new Error(`${path}: JSONの形式が正しくありません`);
        }

        return data;
    }

    function startPreparation() {
        if (preparedData) {
            return Promise.resolve(preparedData);
        }

        if (preparationPromise) {
            return preparationPromise;
        }

        preparationPromise = Promise.all([
            fetchJson('./data/spots.json'),
            fetchJson('./data/routes.json')
        ]).then(([spots, routes]) => {
            preparedData = { spots, routes };
            updateIndicator(true);
            return preparedData;
        }).catch((error) => {
            preparationPromise = null;
            updateIndicator(false, true);
            console.error('[Fushimi] Startup preparation failed:', error);
            throw error;
        });

        return preparationPromise;
    }

    function hasAccepted(language) {
        try {
            return localStorage.getItem(CONSENT_KEY) ===
                `${NOTICE_VERSION}:${language}`;
        } catch (_) {
            return false;
        }
    }

    function rememberAcceptance(language) {
        try {
            localStorage.setItem(
                CONSENT_KEY,
                `${NOTICE_VERSION}:${language}`
            );
        } catch (error) {
            console.warn('[Fushimi] Could not save consent:', error);
        }
    }

    function createDialog(language, showNotice) {
        const copy = TEXT[language] || TEXT.ja;

        const backdrop = document.createElement('div');
        backdrop.className = 'fsg-notice-backdrop';

        const card = document.createElement('section');
        card.className = 'fsg-notice-card';
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-modal', 'true');

        const title = document.createElement('h2');
        title.textContent = showNotice
            ? copy.noticeTitle
            : copy.loadingTitle;
        card.appendChild(title);

        if (showNotice) {
            copy.notice.forEach((paragraph) => {
                const p = document.createElement('p');
                p.className = 'fsg-notice-copy';
                p.textContent = paragraph;
                card.appendChild(p);
            });
        }

        const status = document.createElement('div');
        status.className = 'fsg-notice-status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');

        const spinner = document.createElement('span');
        spinner.className = 'fsg-spinner';
        spinner.setAttribute('aria-hidden', 'true');

        const statusText = document.createElement('span');
        statusText.textContent = preparedData
            ? copy.ready
            : copy.waiting;

        status.append(spinner, statusText);
        card.appendChild(status);

        const actions = document.createElement('div');
        actions.className = 'fsg-notice-actions';

        const backButton = document.createElement('button');
        backButton.type = 'button';
        backButton.className = 'fsg-notice-back';
        backButton.textContent = copy.back;
        backButton.addEventListener('click', () => {
            backdrop.remove();
        });

        const agreeButton = document.createElement('button');
        agreeButton.type = 'button';
        agreeButton.className = 'fsg-notice-agree';
        agreeButton.textContent = showNotice
            ? copy.agree
            : copy.retry;

        actions.append(backButton, agreeButton);
        card.appendChild(actions);
        backdrop.appendChild(card);
        document.body.appendChild(backdrop);

        async function continueToHome() {
            agreeButton.disabled = true;
            backButton.disabled = true;
            statusText.textContent = copy.waiting;
            spinner.style.display = 'inline-block';

            try {
                await startPreparation();

                if (showNotice) {
                    rememberAcceptance(language);
                }

                statusText.textContent = copy.ready;
                window.location.replace('home.html');
            } catch (error) {
                statusText.textContent = copy.error;
                spinner.style.display = 'none';
                agreeButton.textContent = copy.retry;
                agreeButton.disabled = false;
                backButton.disabled = false;
            }
        }

        agreeButton.addEventListener('click', () => {
            if (showNotice) {
                rememberAcceptance(language);
            }
            continueToHome();
        });

        return { backdrop, continueToHome };
    }

    function chooseLanguage(language) {
        const selected = SUPPORTED_LANGUAGES.includes(language)
            ? language
            : 'ja';

        try {
            localStorage.setItem(LANGUAGE_KEY, selected);
        } catch (_) {}

        document.documentElement.lang = selected;

        if (hasAccepted(selected)) {
            if (preparedData) {
                window.location.replace('home.html');
                return;
            }

            const dialog = createDialog(selected, false);
            dialog.continueToHome();
            return;
        }

        createDialog(selected, true);
    }

    // Make sure this runs after app-boot.js so it replaces its direct
    // language-to-home navigation.
    addStyles();
    addLanguageIndicator();
    window.selectLanguage = chooseLanguage;

    // Begin as soon as the language-selection page opens.
    // The visitor can read the notice while spots and routes are loading.
    startPreparation().catch(() => {
        // The error is shown in the language-page indicator.
        // The visitor can retry after choosing a language.
    });
})();
