/* Home omikuji interactions + idle-time weather prefetch. */
(() => {
    "use strict";

    // Prefetch weather + sunrise/sunset from the HOME page. The map reads this shared cache
    // immediately and still refreshes on its own. No weather text is shown in the UI.
    const CACHE_KEY = "fushimiMetaMapApiCacheV1";
    const LAT = 34.96705;
    const LNG = 135.7743;
    const TZ = "Asia/Tokyo";

    async function prefetchFushimiConditions() {
        try {
            const params = new URLSearchParams({
                latitude: String(LAT), longitude: String(LNG),
                current: "temperature_2m,apparent_temperature,is_day,precipitation,weather_code",
                daily: "sunrise,sunset", timezone: TZ, past_days: "1", forecast_days: "2"
            });
            const controller = new AbortController();
            const timeout = window.setTimeout(() => controller.abort(), 8500);
            let response;
            try {
                response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
                    method: "GET", headers: { "Accept": "application/json" }, signal: controller.signal, cache: "no-store"
                });
            } finally { window.clearTimeout(timeout); }
            if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
            const payload = await response.json();
            if (!payload.current || !payload.daily || !Array.isArray(payload.daily.time) ||
                !Array.isArray(payload.daily.sunrise) || !Array.isArray(payload.daily.sunset)) {
                throw new Error("Open-Meteo response is incomplete");
            }
            const now = Date.now();
            let previous = {};
            try { previous = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") || {}; } catch (_) {}
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                ...previous, schema: 1, latitude: LAT, longitude: LNG,
                fetchedAt: now, currentFetchedAt: now, dailyFetchedAt: now,
                current: payload.current, daily: payload.daily
            }));
        } catch (error) {
            // Do not erase previously cached data when offline; keep the map's light working.
            console.debug("伏見稲荷の気象データは既存キャッシュを利用します。", error);
        }
    }

    // Weather/sunrise data is decorative. Fetch it after the first page paint so it
    // cannot compete with the initial HTML, CSS, fonts, or hero content.
    const scheduleConditionsPrefetch = () => {
        if ("requestIdleCallback" in window) {
            window.requestIdleCallback(() => prefetchFushimiConditions(), { timeout: 4000 });
        } else {
            window.setTimeout(() => prefetchFushimiConditions(), 1600);
        }
    };
    if (document.readyState === "complete") scheduleConditionsPrefetch();
    else window.addEventListener("load", scheduleConditionsPrefetch, { once: true });

    const translations = {
        ja: {
            title: "伏見稲荷のおみくじ", subtitle: "リズムが神さまに届きました", close: "閉じる", again: "もう一度引く",
            grades: ["大吉", "中吉", "小吉", "吉", "末吉", "凶"], luck: "今日の開運ヒント",
            fortunes: [
                ["最高の追い風が吹く日。思い切った一歩が、思いがけない景色につながりそう。", "新しい道をひとつ歩いてみよう。"],
                ["焦らず進めば、いい出会いと発見が待っています。", "気になった小道をゆっくり観察。"],
                ["小さな幸運を見つけられる日。足元や景色に目を向けて。", "赤いものを見つけたらラッキー。"],
                ["いつものペースが幸運の鍵。人への感謝を忘れずに。", "「ありがとう」をひとつ伝える。"],
                ["ゆっくり運気が上向きに。急がず、自分のペースで。", "休憩をとって水分補給。"],
                ["慎重さが味方になる日。無理せず安全第一で楽しもう。", "無理な近道をせず、案内表示を確認。"]
            ]
        },
        en: {
            title: "Fushimi Inari Omikuji", subtitle: "Your rhythm reached the shrine spirits", close: "Close", again: "Draw again",
            grades: ["Great Blessing", "Middle Blessing", "Small Blessing", "Blessing", "Future Blessing", "Misfortune"], luck: "A little luck for today",
            fortunes: [
                ["A tailwind is with you today. One brave step may lead to an unexpected view.", "Try a path you have never taken."],
                ["Take your time and good encounters may follow.", "Explore a side path slowly."],
                ["Look closely and you may find a little bit of luck.", "Spot something red for good luck."],
                ["Your steady pace is your strength today.", "Share a small thank-you."],
                ["Your luck is gradually turning upward. Go at your own pace.", "Take a short rest and drink water."],
                ["Carefulness is your ally. Enjoy the visit safely and without rushing.", "Follow the signs instead of taking risky shortcuts."]
            ]
        },
        zh: {
            title: "伏见稻荷神签", subtitle: "你的节奏传达到了神明那里", close: "关闭", again: "再抽一次",
            grades: ["大吉", "中吉", "小吉", "吉", "末吉", "凶"], luck: "今日开运提示",
            fortunes: [
                ["今天顺风相伴，勇敢迈出一步，也许会看到意想不到的风景。", "走一条从未走过的小路。"],
                ["不急不躁，好相遇与新发现正在等你。", "慢慢看看旁边的小路。"],
                ["留心身边，就能发现小小的幸运。", "发现红色的东西会带来好运。"],
                ["保持自己的节奏就是今天的幸运秘诀。", "向别人说声谢谢。"],
                ["运势正在慢慢好转，按自己的步调前进。", "休息一下并补充水分。"],
                ["谨慎会成为你的帮手。不要勉强，安全地享受旅程。", "遵循指示牌，不走危险的捷径。"]
            ]
        },
        ko: {
            title: "후시미 이나리 오미쿠지", subtitle: "당신의 리듬이 신에게 전해졌어요", close: "닫기", again: "다시 뽑기",
            grades: ["대길", "중길", "소길", "길", "말길", "흉"], luck: "오늘의 행운 팁",
            fortunes: [
                ["오늘은 순풍이 함께합니다. 용기 있는 한 걸음이 뜻밖의 풍경으로 이어질 수 있어요.", "가보지 않은 길을 걸어 보세요."],
                ["서두르지 않으면 좋은 만남과 발견이 기다립니다.", "옆길도 천천히 둘러보세요."],
                ["작은 행운을 발견할 수 있는 날이에요.", "빨간색 물건을 찾으면 행운이 와요."],
                ["평소의 속도를 지키는 것이 행운의 열쇠예요.", "고맙다는 말을 전해 보세요."],
                ["운이 서서히 좋아지고 있어요. 자기 페이스를 지키세요.", "잠시 쉬고 물을 마셔요."],
                ["신중함이 도움이 되는 날이에요. 무리하지 말고 안전하게 즐기세요.", "위험한 지름길보다 안내 표지를 따라가세요."]
            ]
        }
    };

    let tapTimes = [];
    let overlay = null;

    function currentLanguage() {
        const select = document.querySelector("#languageSelect");
        if (select && translations[select.value]) return select.value;
        try {
            const value = localStorage.getItem("language") || localStorage.getItem("selectedLanguage") || "ja";
            return translations[value] ? value : "ja";
        } catch (_) { return "ja"; }
    }

    // Six taps with the short-short-long / short-short cadence. The tolerance is deliberately
    // generous for touchscreens; a small timing variation should not make the Easter egg fail.
    function rhythmMatches(times) {
        if (times.length !== 6) return false;
        const gaps = times.slice(1).map((value, index) => value - times[index]);
        if (gaps.some(gap => gap < 65 || gap > 900)) return false;
        const total = times[5] - times[0];
        if (total < 450 || total > 3000) return false;
        const mean = gaps.reduce((sum, value) => sum + value, 0) / gaps.length;
        const target = [0.55, 1.0, 1.5, 0.55, 1.0];
        const normalized = gaps.map(value => value / mean);
        const deviation = normalized.reduce((sum, value, index) => sum + Math.abs(value - target[index]), 0) / target.length;
        return deviation < 0.62;
    }

    function closeOmikuji() {
        if (!overlay) return;
        overlay.classList.remove("is-visible");
        window.setTimeout(() => {
            if (overlay && !overlay.classList.contains("is-visible")) {
                overlay.hidden = true;
                overlay.setAttribute("aria-hidden", "true");
                document.body.classList.remove("fushimi-omikuji-open");
            }
        }, 320);
    }

    function drawOmikuji() {
        document.body.classList.add("fushimi-omikuji-open");
        const lang = currentLanguage();
        const t = translations[lang];
        const index = Math.floor(Math.random() * t.grades.length);
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "fushimi-omikuji-overlay";
            overlay.setAttribute("aria-hidden", "true");
            overlay.innerHTML = `
                <section class="fushimi-omikuji-card" role="dialog" aria-modal="true" aria-labelledby="fushimi-omikuji-title" tabindex="-1">
                    <button class="fushimi-omikuji-x" type="button" aria-label="Close">×</button>
                    <div class="fushimi-omikuji-seal" aria-hidden="true">⛩</div>
                    <p class="fushimi-omikuji-subtitle"></p>
                    <h2 id="fushimi-omikuji-title" class="fushimi-omikuji-title"></h2>
                    <div class="fushimi-omikuji-grade" aria-live="polite"></div>
                    <p class="fushimi-omikuji-message"></p>
                    <div class="fushimi-omikuji-luck-label"></div>
                    <p class="fushimi-omikuji-luck"></p>
                    <button class="fushimi-omikuji-again" type="button"></button>
                </section>`;
            document.body.appendChild(overlay);
            overlay.addEventListener("click", event => {
                if (event.target === overlay || event.target.closest(".fushimi-omikuji-x")) closeOmikuji();
                if (event.target.closest(".fushimi-omikuji-again")) drawOmikuji();
            });
            document.addEventListener("keydown", event => {
                if (event.key === "Escape" && overlay && overlay.classList.contains("is-visible")) closeOmikuji();
            });
        }
        overlay.hidden = false;
        overlay.setAttribute("aria-hidden", "false");
        overlay.querySelector(".fushimi-omikuji-subtitle").textContent = t.subtitle;
        overlay.querySelector(".fushimi-omikuji-title").textContent = t.title;
        overlay.querySelector(".fushimi-omikuji-grade").textContent = t.grades[index];
        overlay.querySelector(".fushimi-omikuji-message").textContent = t.fortunes[index][0];
        overlay.querySelector(".fushimi-omikuji-luck-label").textContent = t.luck;
        overlay.querySelector(".fushimi-omikuji-luck").textContent = t.fortunes[index][1];
        overlay.querySelector(".fushimi-omikuji-x").setAttribute("aria-label", t.close);
        overlay.querySelector(".fushimi-omikuji-again").textContent = t.again;
        overlay.classList.remove("is-visible");
        requestAnimationFrame(() => {
            overlay.classList.add("is-visible");
            overlay.setAttribute("aria-hidden", "false");
            overlay.querySelector(".fushimi-omikuji-card").focus({ preventScroll: true });
        });
        try { if (navigator.vibrate) navigator.vibrate([15, 35, 20]); } catch (_) {}
    }

    document.addEventListener("pointerdown", event => {
        if (event.button !== undefined && event.button !== 0) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        // Do not hijack navigation or controls; taps on the home background / hero count.
        if (target.closest("a, button, select, input, textarea, label, [role='button'], #fushimi-omikuji-overlay")) {
            tapTimes = [];
            return;
        }
        const now = performance.now();
        if (tapTimes.length && now - tapTimes[tapTimes.length - 1] > 900) tapTimes = [];
        tapTimes.push(now);
        if (tapTimes.length > 6) tapTimes = tapTimes.slice(-6);
        if (rhythmMatches(tapTimes)) {
            tapTimes = [];
            drawOmikuji();
        }
    }, { passive: true });
})();
