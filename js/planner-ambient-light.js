/* Adaptive map edge lighting — split from planner.html for maintainability. */
/* V80 — no lighting controls: follows Kyoto local time, sunrise/sunset and the existing live-weather API. */
(function () {
    "use strict";
    const LAT = 34.96705;
    const LNG = 135.7743;
    const TZ = "Asia/Tokyo";
    const MIN = 60 * 1000;
    const HOUR = 60 * MIN;
    const FALLBACK_SUNRISE_MIN = 6 * 60;
    const FALLBACK_SUNSET_MIN = 17 * 60 + 30;
    let sunTimes = null;
    let activeWeather = "sunny";
    let lightLayer = null;
    let mapElement = null;
    let workspaceElement = null;
    let lastLocalDate = "";
    let weatherObserver = null;

    function tokyoDateParts(date) {
        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit"
        }).formatToParts(date);
        const values = {};
        parts.forEach(part => { if (part.type !== "literal") values[part.type] = part.value; });
        return { year: Number(values.year), month: Number(values.month), day: Number(values.day), key: `${values.year}-${values.month}-${values.day}` };
    }

    function tokyoEpoch(year, month, day, hour, minute) {
        // Kyoto observes JST (UTC+09:00); use UTC arithmetic so a visitor's device zone won't shift the light.
        return Date.UTC(year, month - 1, day, hour, minute, 0, 0) - 9 * HOUR;
    }

    function parseApiDateTime(value) {
        if (!value || typeof value !== "string") return NaN;
        const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
        return Date.parse(hasZone ? value : `${value}+09:00`);
    }

    function fallbackSunTimes(now) {
        const today = tokyoDateParts(new Date(now));
        const yesterdayDate = new Date(Date.UTC(today.year, today.month - 1, today.day) - 86400000);
        const tomorrowDate = new Date(Date.UTC(today.year, today.month - 1, today.day) + 86400000);
        return {
            yesterdaySunset: tokyoEpoch(yesterdayDate.getUTCFullYear(), yesterdayDate.getUTCMonth() + 1, yesterdayDate.getUTCDate(), 17, 30),
            sunrise: tokyoEpoch(today.year, today.month, today.day, 6, 0),
            sunset: tokyoEpoch(today.year, today.month, today.day, 17, 30),
            tomorrowSunrise: tokyoEpoch(tomorrowDate.getUTCFullYear(), tomorrowDate.getUTCMonth() + 1, tomorrowDate.getUTCDate(), 6, 0),
            dateKey: today.key,
            isFallback: true
        };
    }

    function smoothstep(value) {
        const t = Math.max(0, Math.min(1, value));
        return t * t * (3 - 2 * t);
    }

    function mixColor(a, b, amount) {
        const t = Math.max(0, Math.min(1, amount));
        return a.map((value, index) => Math.round(value + (b[index] - value) * t));
    }

    function mixNumber(a, b, amount) {
        const t = Math.max(0, Math.min(1, amount));
        return a + (b - a) * t;
    }

    function colorAndNightForTime(now, times) {
        // Sunrise, golden hour, sunset and twilight are transition ranges, not hard switches.
        const night = [99, 124, 199];
        const dawn = [255, 171, 119];
        const day = [255, 244, 224];
        const afternoon = [255, 225, 185];
        const sunset = [255, 139, 83];
        const twilight = [156, 158, 218];
        const sunriseStart = times.sunrise - 90 * MIN;
        const sunriseEnd = times.sunrise + 95 * MIN;
        const sunsetStart = times.sunset - 115 * MIN;
        const sunsetGoldenEnd = times.sunset + 28 * MIN;
        const twilightEnd = times.sunset + 125 * MIN;

        if (now < sunriseStart) return { rgb: night, strength: .67, nightLevel: 1 };
        if (now < times.sunrise) {
            const t = smoothstep((now - sunriseStart) / (times.sunrise - sunriseStart));
            return { rgb: mixColor(night, dawn, t), strength: mixNumber(.67, .98, t), nightLevel: 1 - t * .72 };
        }
        if (now < sunriseEnd) {
            const t = smoothstep((now - times.sunrise) / (sunriseEnd - times.sunrise));
            return { rgb: mixColor(dawn, day, t), strength: mixNumber(.98, .72, t), nightLevel: .28 * (1 - t) };
        }
        if (now < sunsetStart) {
            const t = smoothstep((now - sunriseEnd) / Math.max(1, sunsetStart - sunriseEnd));
            // A subtle warming through the afternoon, while keeping the midday glow discreet.
            return { rgb: mixColor(day, afternoon, t), strength: mixNumber(.70, .77, t), nightLevel: 0 };
        }
        if (now < times.sunset) {
            const t = smoothstep((now - sunsetStart) / (times.sunset - sunsetStart));
            return { rgb: mixColor(afternoon, sunset, t), strength: mixNumber(.77, 1, t), nightLevel: t * .18 };
        }
        if (now < sunsetGoldenEnd) {
            const t = smoothstep((now - times.sunset) / (sunsetGoldenEnd - times.sunset));
            return { rgb: mixColor(sunset, twilight, t), strength: mixNumber(1, .79, t), nightLevel: mixNumber(.18, .58, t) };
        }
        if (now < twilightEnd) {
            const t = smoothstep((now - sunsetGoldenEnd) / (twilightEnd - sunsetGoldenEnd));
            return { rgb: mixColor(twilight, night, t), strength: mixNumber(.79, .67, t), nightLevel: mixNumber(.58, 1, t) };
        }
        return { rgb: night, strength: .67, nightLevel: 1 };
    }

    function weatherAppearance(rgb, strength, weather) {
        if (weather === "cloudy") {
            return { rgb: mixColor(rgb, [190, 201, 215], .34), strength: strength * .86, blur: "8px" };
        }
        if (weather === "rainy") {
            return { rgb: mixColor(rgb, [137, 174, 222], .42), strength: strength * .94, blur: "4.5px" };
        }
        if (weather === "snowy") {
            return { rgb: mixColor(rgb, [200, 219, 241], .43), strength: strength * .87, blur: "6px" };
        }
        return { rgb: rgb, strength: strength, blur: "1.5px" };
    }

    function findWeatherClass() {
        if (!workspaceElement) return "sunny";
        if (workspaceElement.classList.contains("weather-rainy")) return "rainy";
        if (workspaceElement.classList.contains("weather-cloudy")) return "cloudy";
        if (workspaceElement.classList.contains("weather-snowy")) return "snowy";
        if (workspaceElement.classList.contains("weather-sunny")) return "sunny";
        return "sunny";
    }

    function solarPosition(now, times) {
        if (now >= times.sunrise && now <= times.sunset) {
            const progress = (now - times.sunrise) / Math.max(1, times.sunset - times.sunrise);
            return 94 - 88 * smoothstep(progress); // right at sunrise -> left at sunset
        }
        if (now > times.sunset) {
            const progress = (now - times.sunset) / Math.max(1, times.tomorrowSunrise - times.sunset);
            return 6 + 88 * smoothstep(progress); // glide softly back across the edge during night
        }
        const progress = (now - times.yesterdaySunset) / Math.max(1, times.sunrise - times.yesterdaySunset);
        return 6 + 88 * smoothstep(progress);
    }

    function renderLight() {
        if (!lightLayer || !mapElement) return;
        const now = Date.now();
        const fallback = fallbackSunTimes(now);
        const times = sunTimes && sunTimes.dateKey === tokyoDateParts(new Date(now)).key ? sunTimes : fallback;
        const appearance = colorAndNightForTime(now, times);
        activeWeather = findWeatherClass();
        const weather = weatherAppearance(appearance.rgb, appearance.strength, activeWeather);
        const rgb = weather.rgb.join(", ");
        lightLayer.style.setProperty("--fushimi-edge-rgb", rgb);
        lightLayer.style.setProperty("--fushimi-light-strength", weather.strength.toFixed(3));
        lightLayer.style.setProperty("--fushimi-light-blur", weather.blur);
        const x = solarPosition(now, times);
        const source = lightLayer.querySelector(".fushimi-adaptive-light-source");
        if (source) source.style.left = `${x.toFixed(2)}%`;
        const nightLevel = Math.max(0, Math.min(1, appearance.nightLevel));
        mapElement.style.setProperty("--fushimi-night-level", nightLevel.toFixed(3));
        mapElement.style.setProperty("--fushimi-map-brightness", (1 - nightLevel * 0.025).toFixed(3));
        mapElement.style.setProperty("--fushimi-map-saturation", (1 - nightLevel * 0.045).toFixed(3));
        lightLayer.classList.remove("weather-sunny", "weather-cloudy", "weather-rainy", "weather-snowy");
        lightLayer.classList.add(`weather-${activeWeather}`);
    }

    function readHomepagePrefetch() {
        try {
            const raw = localStorage.getItem("fushimiMetaMapApiCacheV1");
            if (!raw) return null;
            const cache = JSON.parse(raw);
            if (Number(cache.latitude) !== LAT || Number(cache.longitude) !== LNG) return null;
            return cache;
        } catch (_) { return null; }
    }

    function applyDailySunTimes(daily) {
        if (!daily || !Array.isArray(daily.time) || !Array.isArray(daily.sunrise) || !Array.isArray(daily.sunset)) return false;
        const todayKey = tokyoDateParts(new Date()).key;
        const index = daily.time.findIndex(value => value === todayKey);
        if (index < 0) return false;
        const yesterdayIndex = index - 1;
        const tomorrowIndex = index + 1;
        const result = {
            dateKey: todayKey,
            sunrise: parseApiDateTime(daily.sunrise[index]),
            sunset: parseApiDateTime(daily.sunset[index]),
            yesterdaySunset: yesterdayIndex >= 0 ? parseApiDateTime(daily.sunset[yesterdayIndex]) : NaN,
            tomorrowSunrise: tomorrowIndex < daily.time.length ? parseApiDateTime(daily.sunrise[tomorrowIndex]) : NaN,
            isFallback: false
        };
        if (![result.sunrise, result.sunset, result.yesterdaySunset, result.tomorrowSunrise].every(Number.isFinite)) return false;
        sunTimes = result;
        renderLight();
        return true;
    }

    async function fetchSunTimes() {
        // Apply the copy prefetched on index.html synchronously, avoiding a blank/fallback-light wait.
        const cached = readHomepagePrefetch();
        const cachedDailyAt = Number(cached && (cached.dailyFetchedAt || cached.fetchedAt));
        if (cached && cached.daily && Number.isFinite(cachedDailyAt) && Date.now() - cachedDailyAt < 24 * HOUR) {
            applyDailySunTimes(cached.daily);
        }
        const params = new URLSearchParams({
            latitude: String(LAT),
            longitude: String(LNG),
            daily: "sunrise,sunset",
            timezone: TZ,
            past_days: "1",
            forecast_days: "2"
        });
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
                method: "GET", headers: { "Accept": "application/json" }, signal: controller.signal,
                cache: "no-store"
            });
            if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
            const payload = await response.json();
            if (!applyDailySunTimes(payload && payload.daily)) throw new Error("日出・日没データを読み取れません");
            try {
                const existing = readHomepagePrefetch() || {};
                const now = Date.now();
                localStorage.setItem("fushimiMetaMapApiCacheV1", JSON.stringify({
                    ...existing,
                    schema: 1, latitude: LAT, longitude: LNG,
                    daily: payload.daily, dailyFetchedAt: now,
                    fetchedAt: Math.max(Number(existing.fetchedAt) || 0, now)
                }));
            } catch (_) { /* Local storage can be disabled; live light still works. */ }
            console.info("[Fushimi Adaptive Light] 日出・日没データを更新しました");
        } catch (error) {
            console.warn("[Fushimi Adaptive Light] 日出・日没APIを取得できません。キャッシュ／近似時刻を使用します。", error);
            // Keep valid cached data instead of clearing it merely because the refresh failed.
            if (!sunTimes || sunTimes.dateKey !== tokyoDateParts(new Date()).key) sunTimes = null;
            renderLight();
        } finally {
            window.clearTimeout(timeout);
        }
    }

    function init() {
        mapElement = document.getElementById("map");
        workspaceElement = document.querySelector(".planner-workspace");
        if (!mapElement) return;
        lightLayer = document.createElement("div");
        lightLayer.id = "fushimiAdaptiveLight";
        lightLayer.setAttribute("aria-hidden", "true");
        lightLayer.innerHTML = '<div class="fushimi-adaptive-light-source"></div>';
        // Keep the edge light anchored to the visible map frame, not the panning map pane.
        // z-index 650 places it above Leaflet's transformed map pane; Leaflet controls remain above it.
        // The light is transparent and pointer-events:none, so map interaction continues normally.
        mapElement.appendChild(lightLayer);

        const syncWeather = () => renderLight();
        if (workspaceElement && "MutationObserver" in window) {
            weatherObserver = new MutationObserver(syncWeather);
            weatherObserver.observe(workspaceElement, { attributes: true, attributeFilter: ["class"] });
        }
        renderLight();
        fetchSunTimes();
        window.setInterval(() => { if (!document.hidden) renderLight(); }, 30 * 1000);
        // Refresh sunrise/sunset data on a schedule and after local date rollover.
        window.setInterval(() => {
            if (document.hidden) return;
            const key = tokyoDateParts(new Date()).key;
            if (key !== lastLocalDate) fetchSunTimes();
            lastLocalDate = key;
            renderLight();
        }, 5 * 60 * 1000);
        window.setInterval(() => {
            if (!document.hidden) fetchSunTimes();
        }, 6 * 60 * 60 * 1000);
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) {
                renderLight();
                const key = tokyoDateParts(new Date()).key;
                if (key !== lastLocalDate) fetchSunTimes();
                lastLocalDate = key;
            }
        });
        lastLocalDate = tokyoDateParts(new Date()).key;
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
})();
