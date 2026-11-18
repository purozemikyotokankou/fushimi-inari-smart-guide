/* Open-Meteo weather presentation — idle-loaded independently from the route engine. */
(() => {
    "use strict";
    const plannerWorkspace = document.querySelector(".planner-workspace");
    const plannerWeatherWidget = document.getElementById("plannerWeatherWidget");
    const plannerWeatherIcon = document.getElementById("plannerWeatherIcon");
    const plannerWeatherLabel = document.getElementById("plannerWeatherLabel");
    const plannerWeatherDetail = document.getElementById("plannerWeatherDetail");

    // ============================================================
    // V67 天気API: 伏見稲荷周辺の現在天気（Open-Meteo / APIキー不要）
    // ============================================================
    const FUSHIMI_WEATHER_COORDS = { latitude: 34.96705, longitude: 135.7743 };
    const OPEN_METEO_ATTRIBUTION = "https://open-meteo.com/";

    function describeWeatherCode(code, isDay) {
        const value = Number(code);
        if (value === 0) return { type: "sunny", icon: isDay ? "☀️" : "🌙", label: isDay ? "晴れ" : "快晴の夜" };
        if (value === 1) return { type: "sunny", icon: isDay ? "🌤️" : "🌙", label: isDay ? "おおむね晴れ" : "晴れ" };
        if (value === 2) return { type: "cloudy", icon: "⛅", label: "晴れ時々くもり" };
        if (value === 3) return { type: "cloudy", icon: "☁️", label: "くもり" };
        if ([45, 48].includes(value)) return { type: "cloudy", icon: "🌫️", label: "霧" };
        if ([51, 53, 55, 56, 57, 61, 63, 66, 80].includes(value)) return { type: "rainy", icon: "🌦️", label: "小雨" };
        if ([65, 67, 81, 82].includes(value)) return { type: "rainy", icon: "🌧️", label: "雨" };
        if ([71, 73, 75, 77, 85, 86].includes(value)) return { type: "snowy", icon: "❄️", label: "雪" };
        if ([95, 96, 99].includes(value)) return { type: "rainy", icon: "⛈️", label: "雷雨" };
        return { type: "cloudy", icon: "☁️", label: "天気" };
    }

    const FUSHIMI_HOME_PREFETCH_KEY = "fushimiMetaMapApiCacheV1";
    function readFushimiHomeCache() {
        try {
            const cache = JSON.parse(localStorage.getItem(FUSHIMI_HOME_PREFETCH_KEY) || "null");
            if (!cache || Number(cache.latitude) !== FUSHIMI_WEATHER_COORDS.latitude || Number(cache.longitude) !== FUSHIMI_WEATHER_COORDS.longitude) return null;
            return cache;
        } catch (_) { return null; }
    }

    function applyPlannerWeatherCurrent(current) {
        if (!current || !Number.isFinite(Number(current.temperature_2m))) return false;
        const condition = describeWeatherCode(current.weather_code, Number(current.is_day) === 1);

        // Weather is consumed silently by the edge-light effect; no weather card is shown.
        plannerWorkspace?.classList.remove("weather-sunny", "weather-cloudy", "weather-rainy", "weather-snowy");
        plannerWorkspace?.classList.add(`weather-${condition.type}`);

        // Keep optional UI updates guarded in case a weather chip is reintroduced deliberately later.
        if (plannerWeatherWidget) {
            plannerWeatherWidget.classList.remove("is-loading", "is-sunny", "is-cloudy", "is-rainy", "is-snowy");
            plannerWeatherWidget.classList.add(`is-${condition.type}`);
            if (plannerWeatherIcon) plannerWeatherIcon.textContent = condition.icon;
            if (plannerWeatherLabel) plannerWeatherLabel.textContent = `${condition.label} · ${Math.round(Number(current.temperature_2m))}°C`;
            const apparent = Number(current.apparent_temperature);
            if (plannerWeatherDetail) plannerWeatherDetail.textContent = Number.isFinite(apparent)
                ? `伏見稲荷周辺 · 体感 ${Math.round(apparent)}°C`
                : "伏見稲荷周辺の現在天気";
            plannerWeatherWidget.setAttribute("aria-label", `伏見稲荷周辺の現在の天気：${condition.label}、気温${Math.round(Number(current.temperature_2m))}度`);
        }
        return true;
    }

    function cacheFushimiWeather(current) {
        try {
            const previous = readFushimiHomeCache() || {};
            const now = Date.now();
            localStorage.setItem(FUSHIMI_HOME_PREFETCH_KEY, JSON.stringify({
                ...previous,
                schema: 1,
                latitude: FUSHIMI_WEATHER_COORDS.latitude,
                longitude: FUSHIMI_WEATHER_COORDS.longitude,
                current,
                currentFetchedAt: now,
                fetchedAt: Math.max(Number(previous.fetchedAt) || 0, now)
            }));
        } catch (_) { /* Local storage can be disabled; the live widget still works. */ }
    }

    async function refreshPlannerWeather() {
        const cached = readFushimiHomeCache();
        const cachedAt = Number(cached && (cached.currentFetchedAt || cached.fetchedAt));
        const hasUsableCache = cached && cached.current && Number.isFinite(cachedAt) &&
            Date.now() - cachedAt < 12 * 60 * 60 * 1000 && applyPlannerWeatherCurrent(cached.current);
        if (!hasUsableCache && plannerWeatherWidget) plannerWeatherWidget.classList.add("is-loading");
        const params = new URLSearchParams({
            latitude: String(FUSHIMI_WEATHER_COORDS.latitude),
            longitude: String(FUSHIMI_WEATHER_COORDS.longitude),
            current: "temperature_2m,apparent_temperature,is_day,precipitation,weather_code",
            timezone: "Asia/Tokyo"
        });
        try {
            const controller = new AbortController();
            const timeout = window.setTimeout(() => controller.abort(), 10000);
            let response;
            try {
                response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
                    method: "GET", headers: { "Accept": "application/json" }, signal: controller.signal, cache: "no-store"
                });
            } finally {
                window.clearTimeout(timeout);
            }
            if (!response.ok) throw new Error(`Weather API HTTP ${response.status}`);
            const payload = await response.json();
            const current = payload && payload.current;
            if (!applyPlannerWeatherCurrent(current)) throw new Error("Weather response missing current values");
            cacheFushimiWeather(current);
        } catch (error) {
            console.warn("天気APIを取得できませんでした:", error);
            // When cached weather has already been painted, keep it instead of flashing an error state.
            if (!hasUsableCache && plannerWeatherWidget) {
                plannerWeatherWidget.classList.remove("is-loading");
                if (plannerWeatherIcon) plannerWeatherIcon.textContent = "🌦️";
                if (plannerWeatherLabel) plannerWeatherLabel.textContent = "天気を取得できません";
                if (plannerWeatherDetail) plannerWeatherDetail.textContent = "ネット接続を確認してください";
                plannerWeatherWidget.setAttribute("aria-label", "天気を取得できませんでした");
            }
        }
    }
    plannerWeatherWidget?.querySelector(".planner-weather-source")?.setAttribute("href", OPEN_METEO_ATTRIBUTION);


    // Weather only affects ambient presentation, so wait until the browser is idle.
    const startWeather = () => {
        refreshPlannerWeather();
        window.setInterval(() => { if (!document.hidden) refreshPlannerWeather(); }, 30 * 60 * 1000);
    };
    if ("requestIdleCallback" in window) {
        window.requestIdleCallback(startWeather, { timeout: 2500 });
    } else {
        window.setTimeout(startWeather, 1000);
    }
})();
