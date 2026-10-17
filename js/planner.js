document.addEventListener("DOMContentLoaded", function () {

    // ============================================================
    // BUILD MARKER — V11.2
    // この文字列がConsoleに出れば、このplanner.jsが実行されています。
    // ============================================================
    window.__FUSHIMI_PLANNER_BUILD__ = "V71-KEIHAN-DIRECTION-HIERARCHY-TRAIN-INFO";
    console.log("[Fushimi Inari Smart Guide] planner.js V71-KEIHAN-DIRECTION-HIERARCHY-TRAIN-INFO loaded");

    // ============================================================
    // 伏見稲荷スマートガイド / planner.js V11 ALL-IN-ONE
    //
    // V11 additions
    // ① 現在地を出発地点として利用
    // ② Liquid Glass UIをJSから追加
    // ③ GSI地図をモノクロ表示
    // ④ ルート線をユニバーサルデザインパレットのオレンジ #FF9900
    // ⑤ routes.json をグラフとして扱う
    // ⑥ routes.json の複数区間を自動接続
    // ⑦ 直線フォールバックは使用しない
    // ⑧ 一般道路はOSRM徒歩ルート
    // ⑨ 現在地→最寄りの既知地点→routes.json→目的地のハイブリッド
    // ⑩ 選択順番号を地図に表示
    // ⑪ 次の目的地 / 残距離 / 徒歩時間をLiquid Glass表示
    // ⑫ 現在地追跡ナビ
    // ⑬ 最終到着時にGoogleフォームへ進める準備
    // ============================================================


    // V22: category labels follow the selected UI language, including the short helper line.
    function refreshPlannerCategoryLanguage() {
        const lang = (document.getElementById("languageSelect")?.value || document.documentElement.lang || "ja").toLowerCase();
        document.querySelectorAll(".planner-category-grid .category-label, .planner-category-grid .category-description").forEach(function (el) {
            const value = el.dataset[lang] || el.dataset.ja;
            if (value) el.textContent = value;
        });
    }
    refreshPlannerCategoryLanguage();
    document.getElementById("languageSelect")?.addEventListener("change", function () {
        setTimeout(refreshPlannerCategoryLanguage, 0);
        if (activeRoutePlannerState) setTimeout(function () {
            renderRoutePlanner(activeRoutePlannerState);
        }, 0);
        else if (currentDetailSpot) setTimeout(function () {
            renderMapSpotDetail(currentDetailSpot, mapSpotDetail?.classList.contains("is-expanded"));
        }, 0);
    });

    const DATA_URL = "./data/spots.json";

    // 最初に通常のroutes.jsonを使い、
    // 存在しなければGIS系ファイルを探す。
    const ROUTE_URLS = [
        "./data/routes.json",
        "./data/routes_from_gis.json",
        "./data/routes_gis_shortest_fixed.json"
    ];

    const ICON_DIR = "./images/icons/";

    const SELECTED_STORAGE_KEY = "plannerSelectedSpots";
    const SAVED_ROUTE_KEY = "selectedRoute";
    const SAVED_SPOTS_STORAGE_KEY = "fushimiSavedSpotsV51";

    // 写真ファイルが未配置でもスポット一覧・地図が停止しないようにする。
    // 写真を追加したあと true に変更すれば画像表示を有効化できる。
    const ENABLE_PHOTOS = false;

    // Google Form URL
    // planner.html の body に
    // data-google-form-url="https://docs.google.com/forms/..."
    // を付けても設定できる。
    const GOOGLE_FORM_URL =
        document.body.dataset.googleFormUrl || "";

    const GRAY_COLOR = "#7F878F"; // palette neutral gray
    const PIN_COLOR = "#ff4b00"; // keep the existing Fushimi Inari vermilion pin color
    const ROUTE_COLOR = "#FF9900"; // palette accent orange: route / motion line

    // ============================================================
    // アイコンカラー
    // ============================================================

    // Universal-design palette roles. Gendered toilet variants deliberately share
    // one color so meaning is carried by the icon / label, not pink-versus-blue.
    // Fushimi Inari's existing vermilion shrine/torii colors are intentionally kept.
    const ICON_COLOR_MAP = {
        toilet: "#FF9900",
        "toilet-male": "#FF9900",
        "toilet-female": "#FF9900",
        "toilet-western": "#FF9900",
        "toilet-japanese": "#FF9900",
        washlet: "#FF9900",

        wheelchair: "#35A16B",
        "diaper-changing": "#35A16B",
        "baby-chair": "#35A16B",
        "changing-table": "#35A16B",
        ostomate: "#35A16B",

        scenery: "#0041FF",
        viewpoint: "#0041FF",
        shrine: "#A83432", // existing Fushimi Inari vermilion / shrine color
        hiking: "#35A16B",
        restaurant: "#FF9900",
        guide: "#663300",
        "station-jr": "#0041FF",
        "station-keihan": "#9A0079",
        smoking: "#7F878F",
        exchange: "#35A16B",
        "public-phone": "#0041FF",
        "trash-box": "#663300",
        "evacuation-shelter": "#35A16B",
        "baggage-storage": "#9A0079",
        "coin-locker": "#9A0079",
        "rest-area": "#66CCFF",

        torii: "#A83432" // existing Fushimi Inari vermilion / torii color
    };

    // Use the icon assets supplied in ./images/icons/ for every marker, including rail stations.
    // If both gray and color variants are missing, show the intentional "no icon" fallback.
    window.handlePlannerMarkerIconError = function (img) {
        if (!img) return;
        img.classList.add("is-load-error");
        const marker = img.closest(".custom-map-marker");
        if (!marker) return;

        const images = Array.from(marker.querySelectorAll("img.icon-image"));
        const allFailed = images.length > 0 && images.every(function (image) {
            return image.classList.contains("is-load-error") ||
                (image.complete && image.naturalWidth === 0);
        });

        if (allFailed) {
            const fallback = marker.querySelector(".marker-fallback");
            if (fallback) fallback.classList.add("is-visible");
        }
    };

    // ============================================================
    // 状態
    // ============================================================

    let spots = [];
    let routes = [];
    let selectedSpots = [];
    let currentDetailSpot = null;
    let activeRoutePlannerState = null;
    // Spot currently being inspected in the detail sheet. This is separate from
    // route-selected spots so tapping a pin clearly highlights it without silently
    // adding it to the route.
    let activeViewedSpotId = null;

    let markers = [];
    let markerMap = new Map();

    let routeLine = null;
    let routeOutlineLine = null;
    let routeRunnerTrailLine = null;
    let routeRunnerCoreLine = null;
    let routeRunnerAnimationFrame = null;
    let routeRunnerAnimationStartTime = null;
    let routeRunnerLastBasePathD = "";
    let routeRunnerPathLength = 0;
    let routeSegments = [];

    // V69: the route remains fixed; several bright highlights sweep over the
    // route surface. Both the highlight and its soft tail stay within the route
    // stroke width rather than creating a broad glow outside the line.
    const ROUTE_RUNNER_CONFIG = {
        enabled: true,
        lightCount: 5,
        speedPxPerSecond: 980,
        trailLength: 42,
        coreLength: 18,
        trailSampleStep: 2.6,
        coreSampleStep: 1.8,
        trailWidth: 5.8,
        coreWidth: 5.8
    };
    let routeNumberMarkers = [];

    let currentLocationMarker = null;
    let currentLocation = null;

    let navigationWatchId = null;
    let navigationActive = false;
    let navigationLegs = [];
    let navigationLegIndex = 0;


    // ============================================================
    // HTML要素
    // ============================================================

    const spotList =
        document.getElementById("spotList");

    const selectedList =
        document.getElementById("selectedList");

    const cancelSelectedSpotsBtn =
        document.getElementById("cancelSelectedSpotsBtn");

    const searchInput =
        document.getElementById("searchInput");

    const spotResultCount =
        document.getElementById("spotResultCount");

    const locationBtn =
        document.getElementById("locationBtn");

    const createRouteBtn =
        document.getElementById("createRouteBtn");

    const clearBtn =
        document.getElementById("clearBtn");

    const saveRouteBtn =
        document.getElementById("saveRoute");

    const spotCount =
        document.getElementById("spotCount");

    const distance =
        document.getElementById("distance");

    const walkTime =
        document.getElementById("walkTime");

    const stayTime =
        document.getElementById("stayTime");

    // Only real category buttons are wired to the filter handler. The Eat & Shop
    // trigger opens the back-face menu but is never treated as a filter button.
    const categoryButtons =
        document.querySelectorAll("#plannerCategoryFront .category, #foodCategoryOptions .food-option");

    const foodCategorySwitcher = document.getElementById("foodCategorySwitcher");
    const foodCategoryTrigger = document.getElementById("foodCategoryTrigger");
    const foodCategoryOptions = document.getElementById("foodCategoryOptions");
    const plannerCategoryFront = document.getElementById("plannerCategoryFront");
    const foodCategoryClose = document.getElementById("foodCategoryClose");

    // Keep the sliding category track responsive to the available width (the V45 interaction moves vertically; it does not rotate).
    const foodCategoryFlipInner = foodCategorySwitcher?.querySelector(".food-category-flip-inner");
    const syncFoodCategorySolidWidth = () => {
        if (!foodCategorySwitcher || !foodCategoryFlipInner) return;
        const width = foodCategorySwitcher.getBoundingClientRect().width;
        if (width > 0) foodCategorySwitcher.style.setProperty("--solid-half-width", `${Math.max(0, width / 2)}px`);
    };
    syncFoodCategorySolidWidth();
    if (foodCategorySwitcher && "ResizeObserver" in window) {
        const foodCategorySolidResizeObserver = new ResizeObserver(syncFoodCategorySolidWidth);
        foodCategorySolidResizeObserver.observe(foodCategorySwitcher);
    } else {
        window.addEventListener("resize", syncFoodCategorySolidWidth, { passive: true });
    }

    // The outer Liquid Glass capsule stays fixed. The category face and the Eat/Shop face are
    // stacked vertically on one track; opening slides that track upward, closing slides it down.
    // Neither the card nor individual buttons rotate, and the bar never unmounts.
    let activeCategoryFilter = "all";
    let activeFoodFilter = "all";

    function setFoodCategorySwitcherOpen(open) {
        if (!foodCategorySwitcher || !foodCategoryTrigger || !foodCategoryOptions) return;
        const isOpen = Boolean(open);
        foodCategorySwitcher.classList.toggle("is-open", isOpen);
        foodCategorySwitcher.dataset.face = isOpen ? "food" : "categories";
        foodCategoryTrigger.setAttribute("aria-expanded", String(isOpen));
        foodCategoryOptions.setAttribute("aria-hidden", String(!isOpen));
        plannerCategoryFront?.setAttribute("aria-hidden", String(isOpen));
    }

    foodCategoryTrigger?.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        setFoodCategorySwitcherOpen(!foodCategorySwitcher.classList.contains("is-open"));
    });

    foodCategoryClose?.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        setFoodCategorySwitcherOpen(false);
        window.setTimeout(function () {
            foodCategoryTrigger?.focus({ preventScroll: true });
        }, 260);
    });

    const plannerBottomSheet =
        document.getElementById("plannerBottomSheet");

    const plannerSheetHandle =
        document.getElementById("plannerSheetHandle");

    const plannerSheetCount =
        document.getElementById("plannerSheetCount");

    const googleFormButton =
        document.getElementById("googleFormButton");

    const plannerWorkspace = document.querySelector(".planner-workspace");
    const mapSpotDetail = document.getElementById("mapSpotDetail");
    const mapSpotDetailContent = document.getElementById("mapSpotDetailContent");
    const mapSpotDetailHandle = document.getElementById("mapSpotDetailHandle");
    const closeMapSpotDetailButton = document.getElementById("closeMapSpotDetail");
    const openMapSearchButton = document.getElementById("openMapSearchBtn");
    const mapSearchPopover = document.getElementById("mapSearchPopover");
    const closeMapSearchButton = document.getElementById("closeMapSearchBtn");
    const spotShareDialog = document.getElementById("spotShareDialog");
    const spotShareQrImage = document.getElementById("spotShareQrImage");
    const spotShareQrFallback = document.getElementById("spotShareQrFallback");
    const spotShareUrlInput = document.getElementById("spotShareUrlInput");
    const spotShareSpotName = document.getElementById("spotShareSpotName");
    const spotShareHint = document.getElementById("spotShareHint");
    const spotShareStatus = document.getElementById("spotShareStatus");
    const copySpotShareUrlButton = document.getElementById("copySpotShareUrl");
    const nativeSpotShareButton = document.getElementById("nativeSpotShare");
    const openSavedSpotsButton = document.getElementById("openSavedSpotsBtn");
    const savedSpotsDialog = document.getElementById("savedSpotsDialog");
    const savedSpotsTitle = document.getElementById("savedSpotsTitle");
    const savedSpotsCount = document.getElementById("savedSpotsCount");
    const savedSpotsList = document.getElementById("savedSpotsList");
    const plannerWeatherWidget = document.getElementById("plannerWeatherWidget");
    const plannerWeatherIcon = document.getElementById("plannerWeatherIcon");
    const plannerWeatherLabel = document.getElementById("plannerWeatherLabel");
    const plannerWeatherDetail = document.getElementById("plannerWeatherDetail");

    // ============================================================
    // Leaflet地図
    // ============================================================

    const map =
        L.map("map", {
            zoomControl: false,
            preferCanvas: true
        }).setView(
            [34.96705, 135.7743],
            16
        );


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

    async function refreshPlannerWeather() {
        if (!plannerWeatherWidget) return;
        plannerWeatherWidget.classList.add("is-loading");
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
                    method: "GET",
                    headers: { "Accept": "application/json" },
                    signal: controller.signal,
                    cache: "no-store"
                });
            } finally {
                window.clearTimeout(timeout);
            }
            if (!response.ok) throw new Error(`Weather API HTTP ${response.status}`);
            const payload = await response.json();
            const current = payload && payload.current;
            if (!current || !Number.isFinite(Number(current.temperature_2m))) throw new Error("Weather response missing current values");
            const condition = describeWeatherCode(current.weather_code, Number(current.is_day) === 1);
            plannerWeatherWidget.classList.remove("is-loading", "is-sunny", "is-cloudy", "is-rainy", "is-snowy");
            plannerWeatherWidget.classList.add(`is-${condition.type}`);
            plannerWeatherIcon.textContent = condition.icon;
            plannerWeatherLabel.textContent = `${condition.label} · ${Math.round(Number(current.temperature_2m))}°C`;
            const apparent = Number(current.apparent_temperature);
            plannerWeatherDetail.textContent = Number.isFinite(apparent)
                ? `伏見稲荷周辺 · 体感 ${Math.round(apparent)}°C`
                : "伏見稲荷周辺の現在天気";
            plannerWeatherWidget.setAttribute("aria-label", `伏見稲荷周辺の現在の天気：${condition.label}、気温${Math.round(Number(current.temperature_2m))}度`);
            plannerWorkspace?.classList.remove("weather-sunny", "weather-cloudy", "weather-rainy", "weather-snowy");
            plannerWorkspace?.classList.add(`weather-${condition.type}`);
        } catch (error) {
            console.warn("天気APIを取得できませんでした:", error);
            plannerWeatherWidget.classList.remove("is-loading");
            plannerWeatherIcon.textContent = "🌦️";
            plannerWeatherLabel.textContent = "天気を取得できません";
            plannerWeatherDetail.textContent = "ネット接続を確認してください";
            plannerWeatherWidget.setAttribute("aria-label", "天気を取得できませんでした");
        }
    }
    plannerWeatherWidget?.querySelector(".planner-weather-source")?.setAttribute("href", OPEN_METEO_ATTRIBUTION);
    refreshPlannerWeather();
    window.setInterval(refreshPlannerWeather, 30 * 60 * 1000);

    function refreshPlannerMapSize() {
        requestAnimationFrame(function () {
            if (map && typeof map.invalidateSize === "function") {
                map.invalidateSize({
                    pan: false
                });
            }
        });
    }

    window.addEventListener("resize", refreshPlannerMapSize);
    window.addEventListener("orientationchange", function () {
        setTimeout(refreshPlannerMapSize, 180);
    });
    setTimeout(refreshPlannerMapSize, 120);

    // ============================================================
    // GSIモノクロ地図
    // ============================================================

    map.createPane("plannerGsiPane");

    map.getPane(
        "plannerGsiPane"
    ).style.zIndex = "200";

    map.getPane(
        "plannerGsiPane"
    ).style.filter =
        "grayscale(14%) saturate(.94) contrast(1.025) brightness(1.025)";

    map.getPane(
        "plannerGsiPane"
    ).style.webkitFilter =
        "grayscale(14%) saturate(.94) contrast(1.025) brightness(1.025)";

    const gsiLayer =
        L.tileLayer(
            "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
            {
                maxZoom: 18,
                pane: "plannerGsiPane",
                attribution:
                    '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener noreferrer">国土地理院</a>'
            }
        );

    gsiLayer.addTo(map);

    // ============================================================
    // ルート用Pane
    // ============================================================

    map.createPane(
        "plannerRoutePane"
    );

    map.getPane(
        "plannerRoutePane"
    ).style.zIndex = "450";

    // V59: use a real SVG renderer for the route so stroke-dashoffset animations
    // can move along the actual routed geometry even though the base map prefers Canvas.
    const routeSvgRenderer = L.svg({
        pane: "plannerRoutePane",
        padding: 0.5
    });

    map.createPane(
        "plannerNumberPane"
    );

    map.getPane(
        "plannerNumberPane"
    ).style.zIndex = "720";

    map.createPane(
        "plannerCurrentPane"
    );

    map.getPane(
        "plannerCurrentPane"
    ).style.zIndex = "760";

    // ============================================================
    // 多言語
    // ============================================================

    function getCurrentLanguage() {

        return (
            localStorage.getItem(
                "language"
            ) || "ja"
        );
    }

    function getLocalizedValue(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        if (
            typeof value !== "object"
        ) {
            return String(value);
        }

        const language =
            getCurrentLanguage();

        return (
            value[language] ||
            value.ja ||
            value.en ||
            value.zh ||
            value.ko ||
            Object.values(value)[0] ||
            ""
        );
    }

    function getText(
        key,
        fallback
    ) {

        if (
            typeof window.t ===
            "function"
        ) {

            try {

                const translated =
                    window.t(key);

                if (
                    translated &&
                    translated !== key
                ) {
                    return translated;
                }

            } catch (error) {
                // 翻訳関数に依存しない。
            }
        }

        return fallback;
    }

    function escapeHTML(value) {

        return String(
            value ?? ""
        )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
    }

    function getSafeURL(value) {

        if (!value) {
            return "";
        }

        try {

            const url =
                new URL(
                    value,
                    window.location.href
                );

            if (
                url.protocol ===
                    "http:" ||
                url.protocol ===
                    "https:"
            ) {
                return url.href;
            }

        } catch (error) {
            return "";
        }

        return "";
    }

    function getOfficialSiteText() {

        const language =
            getCurrentLanguage();

        if (
            language === "en"
        ) {
            return "Official Website";
        }

        if (
            language === "zh"
        ) {
            return "官方网站";
        }

        if (
            language === "ko"
        ) {
            return "공식 웹사이트";
        }

        return "公式サイトを見る";
    }

    function getSelectedText() {

        const language =
            getCurrentLanguage();

        if (
            language === "en"
        ) {
            return "✓ Selected";
        }

        if (
            language === "zh"
        ) {
            return "✓ 已选择";
        }

        if (
            language === "ko"
        ) {
            return "✓ 선택됨";
        }

        return "✓ 選択中";
    }

    function getNoSelectedText() {

        const language =
            getCurrentLanguage();

        if (
            language === "en"
        ) {
            return (
                "No spots have been selected yet."
            );
        }

        if (
            language === "zh"
        ) {
            return "尚未选择任何景点。";
        }

        if (
            language === "ko"
        ) {
            return (
                "아직 선택한 관광지가 없습니다."
            );
        }

        return "スポットを選択してください。";
    }

    function getSelectButtonText() {

        const language =
            getCurrentLanguage();

        if (
            language === "en"
        ) {
            return "Select this spot";
        }

        if (
            language === "zh"
        ) {
            return "选择此景点";
        }

        if (
            language === "ko"
        ) {
            return "이 장소 선택";
        }

        return "このスポットを選択";
    }

    function getAddRouteText() {
        const language = getCurrentLanguage();
        if (language === "en") return "+ Add to route";
        if (language === "zh") return "＋ 加入路线";
        if (language === "ko") return "＋ 경로에 추가";
        return "＋ ルートに追加";
    }

    function getRemoveRouteText() {
        const language = getCurrentLanguage();
        if (language === "en") return "Remove";
        if (language === "zh") return "移除";
        if (language === "ko") return "선택 해제";
        return "選択解除";
    }

    function updateCancelSelectedSpotsButton() {
        if (!cancelSelectedSpotsBtn) return;
        const language = getCurrentLanguage();
        const labels = {
            ja: "選択をキャンセル",
            en: "Cancel selection",
            zh: "取消选择",
            ko: "선택 취소"
        };
        const label = labels[language] || labels.ja;
        cancelSelectedSpotsBtn.textContent = label;
        cancelSelectedSpotsBtn.setAttribute("aria-label", label);
        cancelSelectedSpotsBtn.hidden = selectedSpots.length === 0;
    }

    function getViewOnMapText() {
        const language = getCurrentLanguage();
        if (language === "en") return "View on map";
        if (language === "zh") return "在地图上查看";
        if (language === "ko") return "지도에서 보기";
        return "地図で見る";
    }

    function updateSpotResultCount(count) {
        if (!spotResultCount) return;
        const language = getCurrentLanguage();
        if (language === "en") {
            spotResultCount.textContent = `${count} ${count === 1 ? "spot" : "spots"} found`;
        } else if (language === "zh") {
            spotResultCount.textContent = `找到 ${count} 个景点`;
        } else if (language === "ko") {
            spotResultCount.textContent = `${count}곳 검색됨`;
        } else {
            spotResultCount.textContent = `${count}件のスポット`;
        }
    }

    function updatePlannerSheetSummary() {

        if (!plannerSheetCount) {
            return;
        }

        const language = getCurrentLanguage();
        const count = selectedSpots.length;

        if (language === "en") {
            plannerSheetCount.textContent = `${count} selected`;
            return;
        }

        if (language === "zh") {
            plannerSheetCount.textContent = `已选 ${count} 个`;
            return;
        }

        if (language === "ko") {
            plannerSheetCount.textContent = `${count}곳 선택`;
            return;
        }

        plannerSheetCount.textContent = `${count}か所選択中`;
    }

    function setPlannerSheetState(state) {

        if (!plannerBottomSheet) {
            return;
        }

        plannerBottomSheet.classList.remove(
            "is-collapsed",
            "is-expanded"
        );

        if (state === "collapsed") {
            plannerBottomSheet.classList.add("is-collapsed");
        } else if (state === "expanded") {
            plannerBottomSheet.classList.add("is-expanded");
        }

        if (plannerWorkspace) {
            plannerWorkspace.classList.toggle("planner-sheet-expanded", state === "expanded");
        }

        if (plannerSheetHandle) {
            const expanded = state === "expanded";
            plannerSheetHandle.setAttribute(
                "aria-expanded",
                expanded ? "true" : "false"
            );
        }

        window.requestAnimationFrame(function () {
            if (typeof map?.invalidateSize === "function") {
                map.invalidateSize({ pan: false });
            }
        });
    }

    function togglePlannerSheet() {

        if (!plannerBottomSheet) {
            return;
        }

        if (plannerBottomSheet.classList.contains("is-expanded")) {
            setPlannerSheetState("collapsed");
            return;
        }

        setPlannerSheetState("expanded");
    }

    // ------------------------------------------------------------
    // ボトムシート：タップではなく上下スワイプで展開・収納
    // Android / Galaxy / iPhone 対応
    // ------------------------------------------------------------
    let sheetDragActive = false;
    let sheetDragStartY = 0;
    let sheetDragStartState = "normal";
    let sheetDragMoved = false;

    function getSheetDragY(event) {
        if (event && event.touches && event.touches.length) {
            return event.touches[0].clientY;
        }
        if (event && event.changedTouches && event.changedTouches.length) {
            return event.changedTouches[0].clientY;
        }
        return Number(event?.clientY || 0);
    }

    function startSheetDrag(event) {
        if (!plannerBottomSheet) return;
        sheetDragActive = true;
        sheetDragMoved = false;
        sheetDragStartY = getSheetDragY(event);
        sheetDragStartState = plannerBottomSheet.classList.contains("is-expanded")
            ? "expanded"
            : plannerBottomSheet.classList.contains("is-collapsed")
                ? "collapsed"
                : "normal";
        if (plannerSheetHandle?.setPointerCapture && event.pointerId != null) {
            try { plannerSheetHandle.setPointerCapture(event.pointerId); } catch (_) {}
        }
        event.preventDefault?.();
    }

    function moveSheetDrag(event) {
        if (!sheetDragActive) return;
        const y = getSheetDragY(event);
        const delta = y - sheetDragStartY;
        if (Math.abs(delta) > 8) sheetDragMoved = true;
        if (sheetDragMoved) event.preventDefault?.();
    }

    function endSheetDrag(event) {
        if (!sheetDragActive) return;
        const y = getSheetDragY(event);
        const delta = y - sheetDragStartY;
        sheetDragActive = false;

        // 小さな移動は何もしない。タップだけでは展開・収納しない。
        if (Math.abs(delta) < 40) return;

        // 上方向スワイプ → 展開
        if (delta < 0) {
            setPlannerSheetState("expanded");
        }
        // 下方向スワイプ → 収納
        else {
            setPlannerSheetState("collapsed");
        }
    }

    if (plannerSheetHandle) {
        plannerSheetHandle.addEventListener("pointerdown", startSheetDrag, { passive: false });
        plannerSheetHandle.addEventListener("pointermove", moveSheetDrag, { passive: false });
        plannerSheetHandle.addEventListener("pointerup", endSheetDrag, { passive: false });
        plannerSheetHandle.addEventListener("pointercancel", endSheetDrag, { passive: false });
        // タップによる開閉は廃止。誤操作を防ぐためclickは無視する。
        plannerSheetHandle.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
        });
    }

    updatePlannerSheetSummary();

    // Swiping vertically on the category bar reveals/hides the spot list.
    // Horizontal swipes remain available for scrolling through categories.
    const plannerCategoryTray = document.getElementById("plannerCategoryTray");
    let categoryGesture = null;
    let suppressCategoryClick = false;
    if (plannerCategoryTray) {
        plannerCategoryTray.addEventListener("pointerdown", function (event) {
            if (event.button !== undefined && event.button !== 0) return;
            categoryGesture = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                moved: false
            };
        }, { passive: true });

        window.addEventListener("pointermove", function (event) {
            if (!categoryGesture || event.pointerId !== categoryGesture.id) return;
            const dx = event.clientX - categoryGesture.x;
            const dy = event.clientY - categoryGesture.y;
            if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.12) {
                categoryGesture.moved = true;
                if (event.cancelable) event.preventDefault();
            }
        }, { passive: false });

        window.addEventListener("pointerup", function (event) {
            if (!categoryGesture || event.pointerId !== categoryGesture.id) return;
            const dx = event.clientX - categoryGesture.x;
            const dy = event.clientY - categoryGesture.y;
            const wasVerticalSwipe = Math.abs(dy) >= 42 && Math.abs(dy) > Math.abs(dx) * 1.12;
            categoryGesture = null;
            if (!wasVerticalSwipe) return;
            suppressCategoryClick = true;
            setTimeout(function () { suppressCategoryClick = false; }, 320);
            setPlannerSheetState(dy < 0 ? "expanded" : "collapsed");
        }, { passive: true });

        window.addEventListener("pointercancel", function () { categoryGesture = null; }, { passive: true });
        plannerCategoryTray.addEventListener("click", function (event) {
            if (!suppressCategoryClick) return;
            event.preventDefault();
            event.stopImmediatePropagation();
        }, true);
    }

    // Initial state: keep the category bar visible; spots appear after an upward swipe.
    function applyMobileSheetDefault() {
        if (!plannerBottomSheet) return;
        setPlannerSheetState("collapsed");
        requestAnimationFrame(function () {
            if (typeof map?.invalidateSize === "function") {
                map.invalidateSize({ pan: false });
            }
        });
    }

    applyMobileSheetDefault();

    window.addEventListener("orientationchange", function () {
        setTimeout(applyMobileSheetDefault, 220);
    });

    // ============================================================
    // Google Form
    // ============================================================

    function getGoogleFormURL() {

        const rawURL =
            document.body?.dataset?.googleFormUrl ||
            GOOGLE_FORM_URL ||
            "";

        return getSafeURL(rawURL.trim());
    }

    function openGoogleForm() {

        const url = getGoogleFormURL();

        if (!url) {
            alert("GoogleフォームのURLを取得できませんでした。");
            return false;
        }

        console.log("Google Form navigation:", url);
        window.location.assign(url);
        return true;
    }

    if (googleFormButton) {
        googleFormButton.addEventListener("click", openGoogleForm);
    }

    // ============================================================
    // Navigation label
    // ============================================================

    function getNavigationLabel() {

        const language =
            getCurrentLanguage();

        if (
            language === "en"
        ) {
            return "Navigation";
        }

        if (
            language === "zh"
        ) {
            return "导航";
        }

        if (
            language === "ko"
        ) {
            return "내비게이션";
        }

        return "ナビゲーション";
    }

    // ============================================================
    // カテゴリー
    // ============================================================

    function normalizeCategory(
        category
    ) {

        const value =
            String(
                category ?? ""
            )
            .trim()
            .toLowerCase();

        if (
            [
                "all",
                "すべて",
                "全部",
                "전체"
            ].includes(value)
        ) {
            return "all";
        }

        if (
            [
                "景色",
                "景観",
                "展望",
                "scenery",
                "view",
                "viewpoint",
                "景观",
                "观景",
                "경관",
                "전망"
            ].includes(value)
        ) {
            return "scenery";
        }

        if (
            [
                "グルメ",
                "飲食店",
                "restaurant",
                "restaurants",
                "餐厅",
                "음식점"
            ].includes(value)
        ) {
            return "restaurant";
        }

        if (
            [
                "神社",
                "shrine",
                "신사"
            ].includes(value)
        ) {
            return "shrine";
        }

        if (
            [
                "登山",
                "hiking",
                "등산"
            ].includes(value)
        ) {
            return "hiking";
        }

        if (
            [
                "交通",
                "transport",
                "교통"
            ].includes(value)
        ) {
            return "transport";
        }

        if (
            [
                "トイレ",
                "toilet",
                "화장실"
            ].includes(value)
        ) {
            return "toilet";
        }

        if (
            [
                "案内",
                "guide",
                "안내"
            ].includes(value)
        ) {
            return "guide";
        }

        return value;
    }

    function getCategoryLabel(
        category
    ) {

        const normalized =
            normalizeCategory(
                category
            );

        const fallback = {
            scenery: "景色",
            restaurant: "グルメ",
            shrine: "神社",
            hiking: "登山",
            transport: "交通",
            toilet: "トイレ",
            guide: "案内"
        };

        if (
            normalized ===
            "scenery"
        ) {
            return getText(
                "scenery",
                fallback.scenery
            );
        }

        if (
            normalized ===
            "restaurant"
        ) {
            return getText(
                "restaurant",
                fallback.restaurant
            );
        }

        if (
            normalized ===
            "shrine"
        ) {
            return getText(
                "shrine",
                fallback.shrine
            );
        }

        if (
            normalized ===
            "hiking"
        ) {
            return getText(
                "hiking",
                fallback.hiking
            );
        }

        if (
            normalized ===
            "transport"
        ) {
            return getText(
                "transport",
                fallback.transport
            );
        }

        return (
            fallback[normalized] ||
            String(category ?? "")
        );
    }

    // ============================================================
    // 滞在時間
    // ============================================================

    function getTimeInMinutes(
        value
    ) {

        const text =
            String(
                value ?? ""
            ).trim();

        if (
            !text ||
            text === "-"
        ) {
            return 0;
        }

        let total = 0;

        const hourMatch =
            text.match(
                /(\d+(?:\.\d+)?)\s*(?:時間|hour|hours|시간|小时)/i
            );

        const minuteMatch =
            text.match(
                /(\d+(?:\.\d+)?)\s*(?:分|minutes?|분|分钟)/i
            );

        if (hourMatch) {
            total +=
                Number(
                    hourMatch[1]
                ) * 60;
        }

        if (minuteMatch) {
            total +=
                Number(
                    minuteMatch[1]
                );
        }

        if (total === 0) {

            const numeric =
                text.match(
                    /\d+/
                );

            if (numeric) {
                total =
                    Number(
                        numeric[0]
                    );
            }
        }

        return Number.isFinite(total)
            ? Math.round(total)
            : 0;
    }

    function formatTime(
        minutes
    ) {

        const value =
            Math.max(
                0,
                Math.round(
                    Number(minutes) || 0
                )
            );

        if (
            value < 60
        ) {
            return `${value}分`;
        }

        const hours =
            Math.floor(
                value / 60
            );

        const remaining =
            value % 60;

        if (
            remaining === 0
        ) {
            return `${hours}時間`;
        }

        return (
            `${hours}時間${remaining}分`
        );
    }

    // ============================================================
    // 選択状態
    // ============================================================

    function loadSelectedIDs() {

        try {

            const saved =
                localStorage.getItem(
                    SELECTED_STORAGE_KEY
                );

            if (!saved) {
                return [];
            }

            const ids =
                JSON.parse(saved);

            return Array.isArray(ids)
                ? ids
                : [];

        } catch (error) {

            console.error(
                "選択スポットの復元に失敗しました",
                error
            );

            return [];
        }
    }

    function saveSelectedIDs() {

        localStorage.setItem(
            SELECTED_STORAGE_KEY,
            JSON.stringify(
                selectedSpots.map(
                    function (spot) {
                        return spot.id;
                    }
                )
            )
        );
    }

    function isSpotSelected(
        spot
    ) {

        return selectedSpots.some(
            function (selected) {

                return (
                    String(
                        selected.id
                    ) ===
                    String(
                        spot.id
                    )
                );
            }
        );
    }

    // ============================================================
    // JSON読み込み
    // ============================================================

    async function loadJSON(
        paths
    ) {

        let lastError = null;

        for (
            const path of paths
        ) {

            try {

                const response =
                    await fetch(path, { cache: "no-store" });

                if (
                    !response.ok
                ) {

                    throw new Error(
                        `${path}: ${response.status}`
                    );
                }

                return {
                    data:
                        await response.json(),
                    path:
                        path
                };

            } catch (error) {

                lastError = error;
            }
        }

        throw (
            lastError ||
            new Error(
                "JSONを読み込めませんでした。"
            )
        );
    }

    // ============================================================
    // Liquid Glass CSS
    // ============================================================

    function injectLiquidGlassCSS() {

        if (
            document.getElementById(
                "plannerV11GlassCSS"
            )
        ) {
            return;
        }

        const style =
            document.createElement(
                "style"
            );

        style.id =
            "plannerV11GlassCSS";

        style.textContent = `

            :root {
                --planner-glass-bg:
                    rgba(255,255,255,.66);

                --planner-glass-border:
                    rgba(255,255,255,.86);

                --planner-glass-shadow:
                    0 18px 45px rgba(0,0,0,.12);
            }

            #map {
                position: relative;
                isolation: isolate;
                overflow: hidden;
                background: #ededed;
            }

            #map,
            .leaflet-container {
                border-radius: 24px;
            }

            .leaflet-control-layers,
            .leaflet-bar a {
                border:
                    1px solid
                    var(--planner-glass-border)
                    !important;

                background:
                    var(--planner-glass-bg)
                    !important;

                backdrop-filter:
                    blur(18px)
                    saturate(1.08);

                -webkit-backdrop-filter:
                    blur(18px)
                    saturate(1.08);

                box-shadow:
                    0 10px 28px rgba(0,0,0,.10),
                    inset
                    0 1px 0
                    rgba(255,255,255,.95);
            }

            .leaflet-control-layers {
                border-radius:
                    15px
                    !important;

                overflow: hidden;
            }

            .leaflet-control-layers-toggle {
                width: 42px
                    !important;

                height: 42px
                    !important;
            }

            .planner-v11-search-glass {
                border-radius:
                    999px
                    !important;

                border:
                    1px solid
                    rgba(255,255,255,.88)
                    !important;

                background:
                    rgba(255,255,255,.70)
                    !important;

                box-shadow:
                    0 10px 28px rgba(0,0,0,.08),
                    inset
                    0 1px 0
                    rgba(255,255,255,.96);

                backdrop-filter:
                    blur(18px)
                    saturate(1.12);

                -webkit-backdrop-filter:
                    blur(18px)
                    saturate(1.12);
            }

            .planner-v11-category-glass {
                border-radius:
                    20px;

                padding: 7px;

                background:
                    rgba(255,255,255,.44);

                border:
                    1px solid
                    rgba(255,255,255,.70);

                box-shadow:
                    inset
                    0 1px 0
                    rgba(255,255,255,.90),
                    0 9px 23px
                    rgba(0,0,0,.07);

                backdrop-filter:
                    blur(20px)
                    saturate(1.12);

                -webkit-backdrop-filter:
                    blur(20px)
                    saturate(1.12);
            }

            .category {
                border:
                    1px solid
                    rgba(255,255,255,.78)
                    !important;

                background:
                    rgba(255,255,255,.48)
                    !important;

                color:
                    #36363b
                    !important;

                border-radius:
                    999px
                    !important;

                transition:
                    transform .22s
                    cubic-bezier(.16,1,.3,1),

                    background .22s ease,

                    box-shadow .22s ease;
            }

            .category:hover {
                transform:
                    translateY(-1px);

                background:
                    rgba(255,255,255,.72)
                    !important;

                box-shadow:
                    0 8px 19px
                    rgba(0,0,0,.07),

                    inset
                    0 1px 0
                    rgba(255,255,255,.95);
            }

            .category.active {
                color:
                    #fff
                    !important;

                background:
                    linear-gradient(
                        145deg,
                        rgba(255,75,0,.94),
                        rgba(220,58,8,.80)
                    )
                    !important;

                border-color:
                    rgba(255,255,255,.74)
                    !important;

                box-shadow:
                    0 8px 19px
                    rgba(255,75,0,.20),

                    inset
                    0 1px 0
                    rgba(255,255,255,.30);
            }

            .planner-spot {
                border-radius:
                    19px
                    !important;

                border:
                    1px solid
                    rgba(255,255,255,.76)
                    !important;

                background:
                    linear-gradient(
                        145deg,
                        rgba(255,255,255,.76),
                        rgba(255,255,255,.48)
                    )
                    !important;

                box-shadow:
                    0 9px 24px
                    rgba(0,0,0,.07),

                    inset
                    0 1px 0
                    rgba(255,255,255,.94);

                backdrop-filter:
                    blur(18px)
                    saturate(1.08);

                -webkit-backdrop-filter:
                    blur(18px)
                    saturate(1.08);

                transition:
                    transform .22s
                    cubic-bezier(.16,1,.3,1),

                    box-shadow .22s ease,

                    border-color .22s ease;
            }

            .planner-spot:hover {
                transform:
                    translateY(-2px);

                box-shadow:
                    0 13px 30px
                    rgba(0,0,0,.10),

                    inset
                    0 1px 0
                    rgba(255,255,255,.96);
            }

            .planner-spot.selected {
                border-color:
                    rgba(255,75,0,.32)
                    !important;

                box-shadow:
                    0 14px 30px
                    rgba(0,0,0,.12),

                    0 0 0 2px
                    rgba(255,75,0,.07),

                    inset
                    0 1px 0
                    rgba(255,255,255,.96);
            }

            .selected-spot {
                border-radius:
                    16px
                    !important;

                border:
                    1px solid
                    rgba(255,255,255,.78)
                    !important;

                background:
                    rgba(255,255,255,.58)
                    !important;

                box-shadow:
                    0 7px 20px
                    rgba(0,0,0,.06),

                    inset
                    0 1px 0
                    rgba(255,255,255,.94);

                backdrop-filter:
                    blur(16px);

                -webkit-backdrop-filter:
                    blur(16px);
            }

            .planner-v11-map-panel {
                position:
                    absolute;

                left: 10px;
                right: 10px;
                bottom: 10px;

                z-index: 1000;

                display: flex;
                justify-content:
                    center;

                pointer-events:
                    none;
            }

            .planner-v11-nav-card {
                width:
                    min(
                        460px,
                        calc(100% - 12px)
                    );

                padding:
                    12px 14px;

                border-radius:
                    20px;

                border:
                    1px solid
                    rgba(255,255,255,.86);

                background:
                    linear-gradient(
                        145deg,
                        rgba(255,255,255,.82),
                        rgba(255,255,255,.58)
                    );

                box-shadow:
                    0 20px 50px
                    rgba(0,0,0,.15),

                    inset
                    0 1px 0
                    rgba(255,255,255,.98);

                backdrop-filter:
                    blur(24px)
                    saturate(1.13);

                -webkit-backdrop-filter:
                    blur(24px)
                    saturate(1.13);

                color: #202024;

                pointer-events:
                    auto;
            }

            .planner-v11-nav-card.is-hidden {
                display: none;
            }

            .planner-v11-nav-top {
                display: flex;
                align-items:
                    center;
                justify-content:
                    space-between;

                gap: 14px;

                margin-bottom:
                    6px;
            }

            .planner-v11-nav-kicker {
                font-size:
                    10px;

                letter-spacing:
                    .16em;

                font-weight:
                    800;

                color:
                    #727278;

                text-transform:
                    uppercase;
            }

            .planner-v11-nav-status {
                font-size:
                    11px;

                font-weight:
                    700;

                color:
                    #7b7b82;
            }

            .planner-v11-nav-title {
                margin: 0;

                font-size:
                    16px;

                line-height:
                    1.3;

                font-weight:
                    800;

                letter-spacing:
                    -.02em;
            }

            .planner-v11-nav-meta {
                display:
                    flex;

                flex-wrap:
                    wrap;

                gap: 8px;

                margin-top:
                    10px;
            }

            .planner-v11-nav-chip {
                display:
                    inline-flex;

                align-items:
                    center;

                gap: 5px;

                padding:
                    6px 10px;

                border-radius:
                    999px;

                background:
                    rgba(255,255,255,.60);

                border:
                    1px solid
                    rgba(255,255,255,.75);

                box-shadow:
                    inset
                    0 1px 0
                    rgba(255,255,255,.96);

                color:
                    #44444a;

                font-size:
                    11px;

                font-weight:
                    700;
            }

            .planner-v11-nav-actions {
                display:
                    flex;

                flex-wrap:
                    wrap;

                gap: 8px;

                margin-top:
                    9px;
            }

            .planner-v11-button {
                border:
                    1px solid
                    rgba(255,255,255,.86);

                border-radius:
                    999px;

                padding:
                    8px 12px;

                font: inherit;

                font-size:
                    11px;

                font-weight:
                    800;

                cursor:
                    pointer;

                background:
                    rgba(255,255,255,.62);

                box-shadow:
                    0 8px 18px
                    rgba(0,0,0,.06),

                    inset
                    0 1px 0
                    rgba(255,255,255,.98);

                color:
                    #2a2a2e;

                transition:
                    transform .2s ease,

                    background .2s ease;
            }

            .planner-v11-button:hover {
                transform:
                    translateY(-1px);
            }

            .planner-v11-button.primary {
                color:
                    #fff;

                background:
                    linear-gradient(
                        145deg,
                        rgba(255,75,0,.96),
                        rgba(221,59,8,.82)
                    );

                box-shadow:
                    0 10px 22px
                    rgba(255,75,0,.19),

                    inset
                    0 1px 0
                    rgba(255,255,255,.30);
            }

            .planner-v11-arrival {
                margin-top:
                    11px;

                padding:
                    10px 12px;

                border-radius:
                    15px;

                border:
                    1px solid
                    rgba(255,75,0,.18);

                background:
                    rgba(255,75,0,.07);

                color:
                    #7a3b28;

                font-size:
                    12px;

                font-weight:
                    800;

                line-height:
                    1.6;
            }

            .planner-v11-route-badge {
                width:
                    28px;

                height:
                    28px;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                border-radius:
                    50%;

                color:
                    #fff;

                background:
                    linear-gradient(
                        145deg,
                        #ff5a1a,
                        #d73f08
                    );

                border:
                    2px solid
                    rgba(255,255,255,.95);

                box-shadow:
                    0 6px 16px
                    rgba(255,75,0,.24),

                    0 0 0 2px
                    rgba(255,75,0,.12);

                font-size:
                    11px;

                font-weight:
                    900;
            }

            .planner-v11-current-location {
                width:
                    20px;

                height:
                    20px;

                border-radius:
                    50%;

                border:
                    4px solid
                    rgba(255,255,255,.96);

                background:
                    ${ROUTE_COLOR};

                box-shadow:
                    0 0 0 4px
                    rgba(233,71,9,.18),

                    0 8px 18px
                    rgba(0,0,0,.18);

                animation:
                    plannerV11CurrentPulse
                    1.8s
                    ease-out
                    infinite;
            }

            @keyframes plannerV11CurrentPulse {

                0% {
                    box-shadow:
                        0 0 0 3px
                        rgba(233,71,9,.24),

                        0 8px 18px
                        rgba(0,0,0,.18);
                }

                70% {
                    box-shadow:
                        0 0 0 13px
                        rgba(233,71,9,0),

                        0 8px 18px
                        rgba(0,0,0,.18);
                }

                100% {
                    box-shadow:
                        0 0 0 3px
                        rgba(233,71,9,.24),

                        0 8px 18px
                        rgba(0,0,0,.18);
                }
            }

            @media (max-width: 700px) {
                .planner-v11-map-panel {
                    left: 6px;
                    right: 6px;
                    bottom: 6px;
                }

                .planner-v11-nav-card {
                    width: min(100%, 430px);
                    padding: 10px 12px;
                    border-radius: 18px;
                    max-height: 145px;
                    overflow: hidden;
                }

                .planner-v11-nav-title {
                    font-size: 15px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .planner-v11-nav-meta {
                    gap: 5px;
                    margin-top: 6px;
                }

                .planner-v11-nav-chip {
                    padding: 4px 7px;
                    font-size: 9px;
                }

                .planner-v11-nav-actions {
                    gap: 6px;
                    margin-top: 7px;
                }

                .planner-v11-button {
                    padding: 7px 10px;
                    font-size: 10px;
                }
            }
        `;

        document.head.appendChild(
            style
        );
    }

    injectLiquidGlassCSS();

    // ============================================================
    // 既存UIにLiquid Glassクラス
    // ============================================================

    function enhanceExistingUI() {

        if (searchInput) {

            searchInput.classList.add(
                "planner-v11-search-glass"
            );
        }

        categoryButtons.forEach(
            function (button) {

                button.classList.add(
                    "planner-v11-category-glass-item"
                );
            }
        );

        if (
            categoryButtons.length >
            0
        ) {

            const parent =
                categoryButtons[0]
                    .parentElement;

            if (parent) {

                parent.classList.add(
                    "planner-v11-category-glass"
                );
            }
        }

        [
            createRouteBtn,
            locationBtn,
            clearBtn,
            saveRouteBtn
        ].forEach(
            function (button) {

                if (button) {

                    button.classList.add(
                        "planner-v11-button"
                    );
                }
            }
        );
    }

    enhanceExistingUI();

    // ============================================================
    // ナビカード
    // ============================================================

    const navPanel =
        document.createElement(
            "div"
        );

    navPanel.className =
        "planner-v11-map-panel";

    navPanel.innerHTML = `

        <div
            class="planner-v11-nav-card is-hidden"
            id="plannerV11NavCard"
        >

            <div
                class="planner-v11-nav-top"
            >

                <span
                    class="planner-v11-nav-kicker"
                    id="plannerV11NavKicker"
                >
                    ${escapeHTML(
                        getNavigationLabel()
                    )}
                </span>

                <span
                    class="planner-v11-nav-status"
                    id="plannerV11NavStatus"
                >
                    ルート準備中
                </span>

            </div>

            <h3
                class="planner-v11-nav-title"
                id="plannerV11NavTitle"
            >
                次の目的地
            </h3>

            <div
                class="planner-v11-nav-meta"
                id="plannerV11NavMeta"
            ></div>

            <div
                class="planner-v11-nav-actions"
                id="plannerV11NavActions"
            >

                <button
                    type="button"
                    class="planner-v11-button primary"
                    id="plannerV11StartButton"
                >
                    現在地からナビ開始
                </button>

                <button
                    type="button"
                    class="planner-v11-button"
                    id="plannerV11StopButton"
                >
                    ナビ終了
                </button>

            </div>

            <div
                class="planner-v11-arrival"
                id="plannerV11Arrival"
                style="display:none;"
            ></div>

        </div>
    `;

    const mapContainer =
        document.getElementById(
            "map"
        );

    if (mapContainer) {
        mapContainer.appendChild(
            navPanel
        );
    }

    const navCard =
        document.getElementById(
            "plannerV11NavCard"
        );

    const navStatus =
        document.getElementById(
            "plannerV11NavStatus"
        );

    const navTitle =
        document.getElementById(
            "plannerV11NavTitle"
        );

    const navMeta =
        document.getElementById(
            "plannerV11NavMeta"
        );

    const navStartButton =
        document.getElementById(
            "plannerV11StartButton"
        );

    const navStopButton =
        document.getElementById(
            "plannerV11StopButton"
        );

    const navArrival =
        document.getElementById(
            "plannerV11Arrival"
        );

    // ============================================================
    // アイコン
    // ============================================================

    function normalizeIconType(
        value
    ) {

        const raw =
            String(value ?? "")
                .trim()
                .toLowerCase();

        const aliases = {

            "トイレ": "toilet",
            toilet: "toilet",

            "男性用トイレ":
                "toilet-male",

            "toilet-male":
                "toilet-male",

            male:
                "toilet-male",

            "女性用トイレ":
                "toilet-female",

            "toilet-female":
                "toilet-female",

            female:
                "toilet-female",

            "洋式":
                "toilet-western",

            "洋式トイレ":
                "toilet-western",

            western:
                "toilet-western",

            "和式":
                "toilet-japanese",

            "和式トイレ":
                "toilet-japanese",

            japanese:
                "toilet-japanese",

            "温水洗浄便座":
                "washlet",

            washlet:
                "washlet",

            "車いす":
                "wheelchair",

            "車椅子":
                "wheelchair",

            wheelchair:
                "wheelchair",

            "おむつ交換台":
                "diaper-changing",

            "diaper-changing":
                "diaper-changing",

            "ベビーチェア":
                "baby-chair",

            "baby-chair":
                "baby-chair",

            "着替え台":
                "changing-table",

            "changing-table":
                "changing-table",

            "オストメイト":
                "ostomate",

            ostomate:
                "ostomate",

            "JR駅":
                "station-jr",

            jr:
                "station-jr",

            "station-jr":
                "station-jr",

            "京阪駅":
                "station-keihan",

            keihan:
                "station-keihan",

            "station-keihan":
                "station-keihan",

            "鳥居":
                "torii",

            torii:
                "torii",

            "神社":
                "shrine",

            shrine:
                "shrine",

            "景色":
                "viewpoint",

            "景観":
                "viewpoint",

            "展望":
                "viewpoint",

            scenery:
                "viewpoint",

            viewpoint:
                "viewpoint",

            "登山":
                "hiking",

            hiking:
                "hiking",

            "飲食店":
                "restaurant",

            "グルメ":
                "restaurant",

            restaurant:
                "restaurant",

            "案内":
                "guide",

            guide:
                "guide",

            "喫煙所":
                "smoking",

            smoking:
                "smoking",

            "両替機":
                "exchange",

            exchange:
                "exchange",

            "公衆電話":
                "public-phone",

            "public-phone":
                "public-phone",

            "ごみ箱":
                "trash-box",

            "trash-box":
                "trash-box",

            "広域避難場所":
                "evacuation-shelter",

            "evacuation-shelter":
                "evacuation-shelter",

            "手荷物一時預かり所":
                "baggage-storage",

            "baggage-storage":
                "baggage-storage",

            "コインロッカー":
                "coin-locker",

            "coin-locker":
                "coin-locker",

            "休憩所":
                "rest-area",

            "rest-area":
                "rest-area"
        };

        return (
            aliases[raw] || raw
        );
    }

    function getIconType(spot) {
        const id = String(spot?.id ?? "").trim();
        const category = normalizeCategory(spot?.category);
        const rawName = spot?.name;
        const nameText = (rawName && typeof rawName === "object")
            ? Object.values(rawName).join(" ").toLowerCase()
            : String(rawName ?? "").toLowerCase();
        const explicitRaw = spot?.iconType || spot?.icon || spot?.markerIcon || "";
        const explicitText = String(explicitRaw).trim().toLowerCase().replace(/\.svg$/i, "").replace(/-gray$/i, "");
        const explicit = normalizeIconType(explicitText);

        // Transport pins must never inherit a restroom/facility icon from stale or
        // inconsistent icon metadata. Their station identity comes from the data.
        const isStation = category === "transport" ||
            /駅|station|railway|train|keihan|\bjr\b|奈良線/i.test(nameText) ||
            ["station", "railway", "train", "station-jr", "station-keihan"].includes(explicitText) ||
            ["station-jr", "station-keihan"].includes(explicit);

        if (isStation) {
            if (id === "7" || /京阪|keihan/i.test(nameText) || explicit === "station-keihan") {
                return "station-keihan";
            }
            if (id === "8" || /\bjr\b|奈良線|japan railway|inari station/i.test(nameText) || explicit === "station-jr") {
                return "station-jr";
            }
            // The local project already uses the paired station-jr icon files as its
            // generic rail-station fallback; avoid falling through to the toilet icon.
            return "station-jr";
        }

        if (explicit) return explicit;

        if (category === "toilet") return "toilet";
        if (category === "scenery") return "viewpoint";
        if (category === "shrine") return "shrine";
        if (category === "hiking") return "hiking";
        if (category === "restaurant") return "restaurant";
        if (category === "guide") return "guide";

        const otherMap = {
            "喫煙所": "smoking",
            "両替機": "exchange",
            "公衆電話": "public-phone",
            "ごみ箱": "trash-box",
            "広域避難場所": "evacuation-shelter",
            "手荷物一時預かり所": "baggage-storage",
            "コインロッカー": "coin-locker",
            "休憩所": "rest-area"
        };

        return otherMap[String(spot?.category ?? "").trim()] || "guide";
    }


    // 鉄道会社の公式時刻表URLを表示するための補助関数。
    // 時刻表APIへのアクセスは行わず、リンク先で最新の時刻表を確認してもらう。
    function localDateYYYYMMDD() {
        const parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
        }).formatToParts(new Date());
        const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
        return `${values.year}${values.month}${values.day}`;
    }

    function isRailStationSpot(spot) {
        if (!spot) return false;
        const icon = getIconType(spot);
        const nameValue = spot.name && typeof spot.name === "object" ? Object.values(spot.name).join(" ") : String(spot.name || "");
        return ["station-jr", "station-keihan"].includes(icon) || /駅|\bstation\b|\bJR\b|京阪|keihan/i.test(nameValue);
    }

    function getStationOfficialTimetableLinks(spot) {
        if (!isRailStationSpot(spot)) return [];
        const icon = getIconType(spot);
        const nameValue = spot.name && typeof spot.name === "object" ? Object.values(spot.name).join(" ") : String(spot.name || "");
        const isKeihan = icon === "station-keihan" || String(spot?.id) === "7" || /京阪|keihan|伏見稲荷|fushimi.?inari/i.test(nameValue);
        if (isKeihan) {
            return [{
                label: "京阪電車 伏見稲荷駅の公式時刻表（方面・平日／土休日）",
                url: "https://www.keihan.co.jp/traffic/station/151/info.html"
            }];
        }
        return [
            {
                label: "JR公式時刻表（京都方面）",
                url: `https://timetable.jr-odekake.net/station-timetable/3021064002?date=${localDateYYYYMMDD()}`
            },
            {
                label: "JR公式時刻表（宇治・奈良方面）",
                url: `https://timetable.jr-odekake.net/station-timetable/3021064001?date=${localDateYYYYMMDD()}`
            }
        ];
    }

    function getIconFileName(
        iconType,
        selected
    ) {

        const type =
            normalizeIconType(
                iconType
            );

        if (!type) {

            return selected
                ? "guide.svg"
                : "guide-gray.svg";
        }

        return selected
            ? `${type}.svg`
            : `${type}-gray.svg`;
    }

    function getMarkerAccentColor(
        spot
    ) {

        const iconType =
            getIconType(spot);

        if (
            ICON_COLOR_MAP[
                iconType
            ]
        ) {
            return ICON_COLOR_MAP[
                iconType
            ];
        }

        const category =
            normalizeCategory(
                spot.category
            );

        return (
            ICON_COLOR_MAP[
                category
            ] ||
            GRAY_COLOR
        );
    }

    // Platinumaps/park-map inspired category pictograms.
    // These are decorative fallbacks only; spot coordinates remain unchanged.
    function getSpotSymbol(spot) {
        const iconType = getIconType(spot);
        const name = getLocalizedValue(spot?.name).toLowerCase();
        const category = normalizeCategory(spot?.category);

        if (iconType.includes("toilet") || category === "toilet") return "🚻";
        if (["station-jr", "station-keihan"].includes(iconType) || category === "transport") return "🚉";
        if (["wheelchair", "ostomate"].includes(iconType)) return "♿";
        if (["diaper-changing", "baby-chair", "changing-table"].includes(iconType)) return "🍼";
        if (iconType === "restaurant" || category === "restaurant") return "🍜";
        if (iconType === "hiking" || category === "hiking") return "🥾";
        if (["torii", "shrine"].includes(iconType) || category === "shrine" || name.includes("鳥居") || name.includes("神社")) return "⛩️";
        if (iconType === "viewpoint" || category === "scenery") return "🌄";
        if (["rest-area", "smoking"].includes(iconType)) return "☕";
        if (iconType === "coin-locker" || iconType === "baggage-storage") return "🧳";
        if (iconType === "guide" || category === "guide") return "ℹ️";
        if (name.includes("駅")) return "🚉";
        if (name.includes("山") || name.includes("展望")) return "🌄";
        return "📍";
    }

    function getMarkerZIndexOffset(
        spot
    ) {

        const iconType =
            getIconType(spot);

        const priorityIcons = [

            "toilet",
            "toilet-male",
            "toilet-female",
            "toilet-western",
            "toilet-japanese",
            "washlet",
            "wheelchair",
            "diaper-changing",
            "baby-chair",
            "changing-table",
            "ostomate"
        ];

        if (
            iconType === "station-jr" ||
            iconType === "station-keihan"
        ) {
            return 900;
        }

        if (priorityIcons.includes(iconType)) {
            return 850;
        }

        return 100;
    }

    // ============================================================
    // ピン
    // ============================================================

    function createMarkerIcon(
        spot,
        selected,
        viewed = false
    ) {

        const iconType =
            getIconType(spot);

        const grayFile =
            getIconFileName(
                iconType,
                false
            );

        const colorFile =
            getIconFileName(
                iconType,
                true
            );

        const accentColor =
            getMarkerAccentColor(
                spot
            );

        const classes = [
            "custom-map-marker"
        ];
        const isRailway = ["station-jr", "station-keihan"].includes(iconType);
        if (isRailway) classes.push("is-railway");

        if (selected) {
            classes.push("is-selected");
        }
        if (viewed) {
            classes.push("is-viewing");
        }

        return L.divIcon({

            className:
                "planner-custom-div-icon",

            html: `
                <div
                    class="${classes.join(" ")}"
                    style="
                        --marker-pin-color:${PIN_COLOR};
                        --marker-accent-color:${accentColor};
                    "
                >

                    <div class="marker-pin">

                        <span
                            class="marker-accent"
                            aria-hidden="true"
                        ></span>

                        <span class="marker-fallback" aria-hidden="true">no icon</span>

                        <img
                            class="icon-image icon-gray"
                            src="${ICON_DIR}${grayFile}"
                            alt=""
                            aria-hidden="true"
                            draggable="false"
                            onerror="window.handlePlannerMarkerIconError(this)"
                        >

                        <img
                            class="icon-image icon-color"
                            src="${ICON_DIR}${colorFile}"
                            alt=""
                            aria-hidden="true"
                            draggable="false"
                            onerror="window.handlePlannerMarkerIconError(this)"
                        >

                    </div>
                    <span class="marker-name-glass">${escapeHTML(getLocalizedValue(spot.name))}</span>
                </div>
            `,

            // Keep the hit target close to the actual circular pin. The long name
            // pill is an overlay with pointer-events:none, so nearby markers can
            // no longer steal station taps because their labels overlap.
            iconSize: [
                46,
                46
            ],

            iconAnchor: [
                23,
                21
            ],

            popupAnchor: [
                0,
                -27
            ]
        });
    }

    function injectMarkerCSS() {

        if (
            document.getElementById(
                "plannerV11MarkerCSS"
            )
        ) {
            return;
        }

        const style =
            document.createElement(
                "style"
            );

        style.id =
            "plannerV11MarkerCSS";

        style.textContent = `

            .planner-custom-div-icon {
                background:
                    transparent
                    !important;

                border:
                    0
                    !important;

                overflow:
                    visible
                    !important;
            }

            .custom-map-marker {
                width:
                    58px;

                height:
                    68px;

                position:
                    relative;

                display:
                    flex;

                justify-content:
                    center;

                align-items:
                    flex-start;

                cursor:
                    pointer;

                perspective:
                    1000px;

                transform-origin:
                    50% 78%;

                user-select:
                    none;
            }

            .custom-map-marker
            .marker-pin {

                width:
                    50px;

                height:
                    50px;

                margin-top:
                    1px;

                position:
                    relative;

                display:
                    flex;

                align-items:
                    center;

                justify-content:
                    center;

                border-radius:
                    50%;

                border:
                    2px solid
                    ${PIN_COLOR};

                background:
                    linear-gradient(
                        145deg,
                        rgba(255,255,255,.97),
                        rgba(255,247,243,.84)
                    );

                box-shadow:
                    0 8px 20px rgba(0,0,0,.14),

                    0 0 0 2px
                    rgba(255,255,255,.86),

                    inset
                    0 1px 0
                    rgba(255,255,255,1);

                backdrop-filter:
                    blur(15px)
                    saturate(1.05);

                -webkit-backdrop-filter:
                    blur(15px)
                    saturate(1.05);

                transform-style:
                    preserve-3d;

                transition:
                    transform .28s
                    cubic-bezier(.16,1,.3,1),

                    box-shadow .28s ease;

                z-index:
                    1;
            }

            .custom-map-marker
            .marker-pin::after {

                content:
                    "";

                position:
                    absolute;

                left:
                    50%;

                bottom:
                    -7px;

                width:
                    16px;

                height:
                    16px;

                transform:
                    translateX(-50%)
                    rotate(45deg);

                border-right:
                    2px solid
                    ${PIN_COLOR};

                border-bottom:
                    2px solid
                    ${PIN_COLOR};

                background:
                    rgba(255,247,243,.88);

                z-index:
                    -1;
            }

            .custom-map-marker
            .marker-accent {

                position:
                    absolute;

                left:
                    50%;

                top:
                    8px;

                width:
                    34px;

                height:
                    34px;

                transform:
                    translateX(-50%);

                border-radius:
                    50%;

                background:
                    var(--marker-accent-color);

                opacity:
                    .07;

                pointer-events:
                    none;

                transition:
                    opacity .24s ease,

                    transform .24s ease;

                z-index:
                    0;
            }

            .custom-map-marker
            .icon-image {

                position:
                    absolute;

                left:
                    50%;

                top:
                    50%;

                width:
                    28px;

                height:
                    28px;

                object-fit:
                    contain;

                transform:
                    translate(-50%, -50%)
                    scale(1);

                transform-origin:
                    center center;

                user-select:
                    none;

                -webkit-user-drag:
                    none;

                filter:
                    drop-shadow(
                        0 2px 4px
                        rgba(0,0,0,.12)
                    );

                transition:
                    opacity .18s ease,

                    transform .28s
                    cubic-bezier(.16,1,.3,1),

                    filter .24s ease;

                z-index:
                    2;
            }

            .custom-map-marker
            .icon-gray {
                opacity:
                    1;
            }

            .custom-map-marker
            .icon-color {
                opacity:
                    0;
            }

            .custom-map-marker:hover
            .icon-gray {
                opacity:
                    0;
            }

            .custom-map-marker:hover
            .icon-color {
                opacity:
                    1;

                transform:
                    translate(-50%, -50%)
                    scale(1.18);

                filter:
                    drop-shadow(
                        0 4px 8px
                        rgba(0,0,0,.19)
                    );
            }

            .custom-map-marker:hover
            .marker-accent {
                opacity:
                    .16;

                transform:
                    translateX(-50%)
                    scale(1.08);
            }

            .custom-map-marker:hover
            .marker-pin {

                transform:
                    translateY(-3px)
                    scale(1.08);

                box-shadow:
                    0 12px 24px
                    rgba(0,0,0,.18),

                    0 0 0 3px
                    rgba(255,75,0,.11),

                    inset
                    0 1px 0
                    rgba(255,255,255,1);

                animation:
                    plannerMarkerFrontBack
                    1s
                    cubic-bezier(.22,.72,.32,1);
            }

            .custom-map-marker.is-selected
            .icon-gray {
                opacity:
                    0;
            }

            .custom-map-marker.is-selected
            .icon-color {

                opacity:
                    1;

                transform:
                    translate(-50%, -50%)
                    scale(1.23);

                filter:
                    drop-shadow(
                        0 4px 9px
                        rgba(0,0,0,.22)
                    );
            }

            .custom-map-marker.is-selected
            .marker-accent {

                opacity:
                    .24;

                transform:
                    translateX(-50%)
                    scale(1.12);
            }

            .custom-map-marker.is-selected
            .marker-pin {

                transform:
                    translateY(-3px)
                    scale(1.13);

                box-shadow:
                    0 14px 28px
                    rgba(0,0,0,.21),

                    0 0 0 4px
                    rgba(255,75,0,.20),

                    0 0 0 7px
                    rgba(255,75,0,.07),

                    inset
                    0 1px 0
                    rgba(255,255,255,1);
            }

            @keyframes
            plannerMarkerFrontBack {

                0% {
                    transform:
                        translateY(-3px)
                        rotateX(0deg)
                        scale(1.08);
                }

                25% {
                    transform:
                        translateY(-3px)
                        rotateX(-13deg)
                        scale(1.08);
                }

                50% {
                    transform:
                        translateY(-3px)
                        rotateX(11deg)
                        scale(1.08);
                }

                75% {
                    transform:
                        translateY(-3px)
                        rotateX(-6deg)
                        scale(1.08);
                }

                100% {
                    transform:
                        translateY(-3px)
                        rotateX(0deg)
                        scale(1.08);
                }
            }
        `;

        document.head.appendChild(
            style
        );
    }

    injectMarkerCSS();

    // ============================================================
    // ポップアップCSS
    // ============================================================

    function injectPopupCSS() {

        if (
            document.getElementById(
                "plannerV11PopupCSS"
            )
        ) {
            return;
        }

        const style =
            document.createElement(
                "style"
            );

        style.id =
            "plannerV11PopupCSS";

        style.textContent = `

            .planner-popup {

                width:
                    280px;

                max-width:
                    280px;

                padding:
                    3px 2px;

                font-family:
                    inherit;
            }

            .planner-popup
            .popup-image {

                display:
                    block;

                width:
                    100%;

                height:
                    150px;

                object-fit:
                    cover;

                border-radius:
                    15px;

                margin:
                    0 0 13px;

                box-shadow:
                    0 7px 18px
                    rgba(0,0,0,.12);
            }

            .planner-popup h3 {

                margin:
                    0 0 7px;

                color:
                    #151515;

                font-size:
                    17px;

                line-height:
                    1.4;

                font-weight:
                    700;
            }

            .planner-popup
            .popup-category {

                display:
                    inline-block;

                margin:
                    0 0 10px;

                padding:
                    4px 10px;

                border-radius:
                    999px;

                background:
                    rgba(255,75,0,.09);

                color:
                    #B8491F;

                font-size:
                    11px;

                font-weight:
                    700;
            }

            .planner-popup
            .popup-description {

                margin:
                    0 0 10px;

                color:
                    #555;

                font-size:
                    13px;

                line-height:
                    1.7;
            }

            .planner-popup
            .popup-meta {

                margin:
                    0 0 13px;

                color:
                    #333;

                font-size:
                    12px;
            }

            .planner-popup
            .popup-button {

                width:
                    100%;

                padding:
                    10px 14px;

                border:
                    1px solid
                    rgba(255,255,255,.88);

                border-radius:
                    999px;

                background:
                    linear-gradient(
                        145deg,
                        rgba(255,255,255,.94),
                        rgba(255,255,255,.57)
                    );

                box-shadow:
                    0 8px 22px
                    rgba(0,0,0,.08),

                    inset
                    0 1px 0
                    rgba(255,255,255,.97);

                backdrop-filter:
                    blur(16px)
                    saturate(1.15);

                -webkit-backdrop-filter:
                    blur(16px)
                    saturate(1.15);

                color:
                    #222;

                font:
                    inherit;

                font-size:
                    13px;

                font-weight:
                    700;

                cursor:
                    pointer;
            }

            .planner-popup
            .popup-button.is-selected {

                color:
                    #fff;

                border-color:
                    rgba(255,75,0,.34);

                background:
                    linear-gradient(
                        145deg,
                        rgba(255,75,0,.96),
                        rgba(196,54,8,.84)
                    );
            }

            .planner-popup
            .popup-url {

                display:
                    inline-block;

                margin-top:
                    10px;

                color:
                    #B8491F;

                font-size:
                    12px;

                text-decoration:
                    none;
            }

            .planner-popup
            .popup-url:hover {

                text-decoration:
                    underline;
            }

            .leaflet-popup-content-wrapper,
            .leaflet-popup-tip {

                border:
                    1px solid
                    rgba(255,255,255,.86);

                background:
                    rgba(255,255,255,.72);

                box-shadow:
                    0 18px 45px
                    rgba(0,0,0,.14),

                    inset
                    0 1px 0
                    rgba(255,255,255,.96);

                backdrop-filter:
                    blur(22px)
                    saturate(1.12);

                -webkit-backdrop-filter:
                    blur(22px)
                    saturate(1.12);
            }
        `;

        document.head.appendChild(
            style
        );
    }

    injectPopupCSS();

    // ============================================================
    // ポップアップHTML
    // 初期化時のReferenceErrorを防ぐため、マーカー生成より前に定義。
    // ============================================================

    function createPopupHTML(spot) {

        const name = getLocalizedValue(spot.name);
        const description = getLocalizedValue(spot.description);
        const category = getCategoryLabel(spot.category);
        const symbol = getSpotSymbol(spot);
        const time = spot.time || "-";
        const url = getSafeURL(spot.url);
        const selected = isSpotSelected(spot);

        const photoHTML =
            ENABLE_PHOTOS && spot.image
                ? `
                    <img
                        class="popup-image"
                        src="./images/${encodeURIComponent(spot.image)}"
                        alt="${escapeHTML(name)}"
                        onerror="this.style.display='none';"
                    >
                `
                : "";

        return `
            <div class="planner-popup">
                ${photoHTML}

                <div class="planner-popup-heading">
                    <span class="planner-popup-symbol" aria-hidden="true">${symbol}</span>
                    <div class="planner-popup-title-group">
                        <h3>${escapeHTML(name)}</h3>
                        <div class="popup-category">${escapeHTML(category)}</div>
                    </div>
                </div>

                <p class="popup-description">
                    ${escapeHTML(description)}
                </p>

                <p class="popup-meta">
                    ⏱ ${escapeHTML(time)}
                </p>

                <button
                    type="button"
                    class="popup-button ${selected ? "is-selected" : ""}"
                >
                    ${escapeHTML(
                        selected
                            ? getRemoveRouteText()
                            : getAddRouteText()
                    )}
                </button>

                ${
                    url
                        ? `
                            <a
                                class="popup-url"
                                href="${escapeHTML(url)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                ${escapeHTML(getOfficialSiteText())}
                            </a>
                        `
                        : ""
                }
            </div>
        `;
    }

    window.createFushimiPopupHTML = createPopupHTML;

    // ============================================================
    // ポップアップボタン
    // ============================================================

    function bindPopupButton(
        marker,
        spot
    ) {

        const element =
            marker.getPopup() &&
            marker.getPopup().getElement();

        if (!element) {
            return;
        }

        const button =
            element.querySelector(
                ".popup-button"
            );

        if (!button) {
            return;
        }

        button.onclick =
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                selectSpot(spot);

                marker.setPopupContent(
                    createPopupHTML(
                        spot
                    )
                );

                setTimeout(
                    function () {

                        bindPopupButton(
                            marker,
                            spot
                        );

                    },
                    0
                );
            };
    }

    // ============================================================
    // スポット一覧
    // ============================================================

    function displaySpots(
        list
    ) {
        if (!spotList) return;
        spotList.innerHTML = "";

        if (!Array.isArray(list) || list.length === 0) {
            spotList.innerHTML = `<p class="spot-empty-state">${escapeHTML(getNoSpotsFoundText())}</p>`;
            return;
        }

        list.forEach(function (spot) {
            const name = getLocalizedValue(spot.name);
            const description = getLocalizedValue(spot.description);
            const category = getCategoryLabel(spot.category);
            const time = spot.time || "-";
            const image = spot.image || "";
            const url = getSafeURL(spot.url);
            const selected = isSpotSelected(spot);
            const accentColor = getMarkerAccentColor(spot);
            const card = document.createElement("article");
            card.className = "planner-spot";
            card.dataset.id = String(spot.id);
            card.style.setProperty("--spot-accent-color", accentColor);
            if (selected) card.classList.add("selected");

            const imageHTML = ENABLE_PHOTOS && image
                ? `<img src="./images/${encodeURIComponent(image)}" alt="${escapeHTML(name)}" class="spot-image" loading="lazy" onerror="this.style.display='none';">`
                : "";
            const urlHTML = url
                ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" class="spot-url">${escapeHTML(getOfficialSiteText())}</a>`
                : "";
            const selectedHTML = selected
                ? `<span class="selected-label">${escapeHTML(getSelectedText())}</span>`
                : "";
            const viewing = String(activeViewedSpotId ?? "") === String(spot.id);
            const viewingHTML = viewing
                ? `<span class="viewing-label">${escapeHTML(getSpotViewingLabel())}</span>`
                : "";
            const iconType = getIconType(spot);
            const customIconFile = iconType ? `${ICON_DIR}${iconType}.svg` : "";
            const symbol = customIconFile
                ? `<img class="spot-custom-icon" src="${customIconFile}" alt="" aria-hidden="true" onerror="this.classList.add('is-load-error'); this.nextElementSibling.hidden=false;"> <span class="spot-card-icon-fallback" hidden>no icon</span>`
                : `<span class="spot-card-icon-fallback">no icon</span>`;

            card.innerHTML = `
                ${imageHTML}
                <div class="spot-card-heading">
                    <div class="spot-card-iconbox" aria-label="${escapeHTML(getSpotIconLabel())}">${symbol}</div>
                    <div class="spot-card-heading-main">
                        <div class="spot-content">
                            <div class="spot-card-name-line"><h3>${escapeHTML(name)}</h3>${viewingHTML}</div>
                            <p class="spot-category">${escapeHTML(category)}</p>
                            <p class="spot-description-line">${escapeHTML(description)}</p>
                            <p class="spot-time">⏱ ${escapeHTML(time)}</p>
                            ${selectedHTML}
                            ${urlHTML}
                        </div>
                    </div>
                </div>
                <div class="spot-card-actions">
                    <button type="button" class="spot-card-detail-button" aria-label="${escapeHTML(getViewOnMapText())}">${escapeHTML(getViewOnMapText())}</button>
                    <button type="button" class="spot-card-select-button ${selected ? "is-selected" : ""}" aria-pressed="${selected ? "true" : "false"}">${escapeHTML(selected ? getRemoveRouteText() : getAddRouteText())}</button>
                </div>
            `;
            if (viewing) card.classList.add("is-viewing");

            card.addEventListener("click", function (event) {
                if (event.target.closest("a, button")) return;
                // A card tap means inspect/show this place; route selection is explicit.
                showSpotOnMap(spot);
            });

            const detailButton = card.querySelector(".spot-card-detail-button");
            if (detailButton) {
                detailButton.addEventListener("click", function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    showSpotOnMap(spot);
                });
            }

            const selectButton = card.querySelector(".spot-card-select-button");
            if (selectButton) {
                selectButton.addEventListener("click", function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    selectSpot(spot);
                });
            }

            spotList.appendChild(card);
        });
    }

    function getNoSpotsFoundText() {
        const language = getCurrentLanguage();
        if (language === "en") return "No matching spots found.";
        if (language === "zh") return "没有找到符合条件的景点。";
        if (language === "ko") return "검색된 장소가 없습니다.";
        return "条件に合うスポットが見つかりませんでした。";
    }

    function focusSpotOnMap(spot) {

        const lat = Number(spot?.lat);
        const lng = Number(spot?.lng);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return;
        }

        const currentZoom = Number(map.getZoom?.() || 16);
        const nextZoom = Math.min(18, Math.max(16, currentZoom));
        // Offset the target before flying, so the marker clears the bottom sheet
        // without a second pan animation (the old second movement caused a jerk).
        const detailIsVisible = mapSpotDetail && !mapSpotDetail.hidden;
        const obstruction = detailIsVisible ? mapSpotDetail : plannerBottomSheet;
        const rect = obstruction ? obstruction.getBoundingClientRect() : null;
        const sheetHeight = rect ? Math.min(Math.max(0, rect.height), window.innerHeight * 0.62) : 0;
        const targetPoint = map.project([lat, lng], nextZoom);
        targetPoint.y += sheetHeight * 0.28;
        const targetCenter = map.unproject(targetPoint, nextZoom);

        map.flyTo(targetCenter, nextZoom, {
            animate: true,
            duration: 0.9,
            easeLinearity: 0.22
        });
    }

    function routeSetupText(key) {
        const translations = {
            viewing: { ja: "表示中", en: "Viewing", zh: "正在查看", ko: "보고 있음" },
            icon: { ja: "スポットアイコン", en: "Spot icon", zh: "地点图标", ko: "장소 아이콘" },
            route: { ja: "ルート作成", en: "Create route", zh: "创建路线", ko: "경로 만들기" },
            chooseOrigin: { ja: "出発地を選択", en: "Choose a starting point", zh: "选择出发点", ko: "출발 지점 선택" },
            currentLocation: { ja: "現在地から", en: "From my location", zh: "从当前位置出发", ko: "현재 위치에서" },
            anotherSpot: { ja: "別のスポットから", en: "From another spot", zh: "从其他地点出发", ko: "다른 장소에서" },
            pickSpot: { ja: "出発するスポットを選択", en: "Choose a starting spot", zh: "选择出发地点", ko: "출발 장소 선택" },
            destination: { ja: "到着地", en: "Destination", zh: "目的地", ko: "도착지" },
            start: { ja: "出発地", en: "Start", zh: "出发地", ko: "출발지" },
            confirmRoute: { ja: "この条件でルート作成", en: "Build this route", zh: "按此条件创建路线", ko: "이 조건으로 경로 만들기" },
            cancel: { ja: "キャンセル", en: "Cancel", zh: "取消", ko: "취소" },
            selectStartError: { ja: "出発するスポットを選択してください。", en: "Choose a starting spot.", zh: "请选择出发地点。", ko: "출발 장소를 선택해 주세요." },
            sameSpotError: { ja: "出発地と到着地は別のスポットを選択してください。", en: "Choose different start and destination spots.", zh: "出发地点和目的地不能相同。", ko: "출발지와 도착지는 서로 다른 장소여야 합니다." },
            noOrigin: { ja: "現在地を取得できませんでした。位置情報の許可を確認して、もう一度お試しください。", en: "Could not get your location. Check location permission and try again.", zh: "无法获取当前位置。请检查位置权限后重试。", ko: "현재 위치를 가져오지 못했습니다. 위치 권한을 확인하고 다시 시도해 주세요." },
            iconMissing: { ja: "no icon", en: "no icon", zh: "无图标", ko: "아이콘 없음" }
        };
        const language = getCurrentLanguage();
        return translations[key]?.[language] || translations[key]?.ja || key;
    }

    function getSpotViewingLabel() {
        return routeSetupText("viewing");
    }

    function getSpotIconLabel() {
        return routeSetupText("icon");
    }


    // ============================================================
    // Spot save / QR share
    // ============================================================
    function readIdSet(storageKey) {
        try {
            const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
            return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
        } catch (_) {
            return new Set();
        }
    }

    function writeIdSet(storageKey, values) {
        try { localStorage.setItem(storageKey, JSON.stringify(Array.from(values))); } catch (_) {}
    }

    function isSpotSaved(spot) {
        return Boolean(spot && readIdSet(SAVED_SPOTS_STORAGE_KEY).has(String(spot.id)));
    }

    function getEngagementText(key) {
        const lang = getCurrentLanguage();
        const dict = {
            save: { ja: "保存", en: "Save", zh: "收藏", ko: "저장" },
            saved: { ja: "保存済み", en: "Saved", zh: "已收藏", ko: "저장됨" },
            share: { ja: "シェア", en: "Share", zh: "分享", ko: "공유" },
            shareTitle: { ja: "スポットをシェア", en: "Share this spot", zh: "分享地点", ko: "장소 공유" },
            scan: { ja: "QRコードを別のスマホで読み取ると、このスポットを開けます。", en: "Scan this QR code on another phone to open this spot.", zh: "用另一部手机扫描二维码即可打开此地点。", ko: "다른 휴대폰으로 QR 코드를 스캔하면 이 장소가 열립니다." },
            localUrl: { ja: "別のスマホで開くには、GitHub Pagesなど公開済みのURLが必要です。", en: "To open on another phone, deploy this app to a public URL such as GitHub Pages.", zh: "要在另一部手机上打开，请先部署到 GitHub Pages 等公开网址。", ko: "다른 휴대폰에서 열려면 GitHub Pages 등 공개 URL에 배포해야 합니다." },
            copied: { ja: "リンクをコピーしました。", en: "Link copied.", zh: "链接已复制。", ko: "링크를 복사했습니다." },
            copiedManual: { ja: "リンクを選択してコピーしてください。", en: "Select and copy the link.", zh: "请选择并复制链接。", ko: "링크를 선택해 복사해 주세요." },
            noShare: { ja: "このブラウザでは共有機能を利用できません。リンクをコピーしてください。", en: "Sharing is unavailable in this browser. Copy the link instead.", zh: "此浏览器不支持系统分享，请复制链接。", ko: "이 브라우저에서는 공유를 사용할 수 없습니다. 링크를 복사해 주세요." },
            copyLink: { ja: "リンクをコピー", en: "Copy link", zh: "复制链接", ko: "링크 복사" },
            nativeShare: { ja: "共有", en: "Share", zh: "分享", ko: "공유" },
            shareLinkLabel: { ja: "共有リンク", en: "Share link", zh: "分享链接", ko: "공유 링크" },
            qrAlt: { ja: "別の端末でスポットを開くQRコード", en: "QR code to open this spot on another device", zh: "在其他设备打开此地点的二维码", ko: "다른 기기에서 장소를 여는 QR 코드" },
            qrFallback: { ja: "QRコードを読み込めませんでした。リンクをコピーして共有してください。", en: "The QR code could not be loaded. Copy and share the link instead.", zh: "无法加载二维码，请复制链接进行分享。", ko: "QR 코드를 불러오지 못했습니다. 링크를 복사해 공유해 주세요." },
            close: { ja: "閉じる", en: "Close", zh: "关闭", ko: "닫기" }
        };
        return dict[key]?.[lang] || dict[key]?.ja || key;
    }

    function setEngagementStatus(message, isError = false) {
        const status = mapSpotDetailContent?.querySelector(".spot-engagement-status");
        if (!status) return;
        status.textContent = message || "";
        status.classList.toggle("is-error", Boolean(isError));
        status.hidden = !message;
    }

    function updateSpotEngagementButtons(spot) {
        if (!spot || !mapSpotDetailContent) return;
        const saveButton = mapSpotDetailContent.querySelector('[data-spot-action="save"]');
        const saved = isSpotSaved(spot);
        if (saveButton) {
            saveButton.classList.toggle("is-active", saved);
            saveButton.setAttribute("aria-pressed", String(saved));
            saveButton.title = saved ? getEngagementText("saved") : getEngagementText("save");
            const label = saveButton.querySelector("[data-save-label]");
            if (label) label.textContent = saved ? getEngagementText("saved") : getEngagementText("save");
        }
    }

    function toggleSpotSaved(spot) {
        if (!spot) return;
        const saved = readIdSet(SAVED_SPOTS_STORAGE_KEY);
        const id = String(spot.id);
        const nextSaved = !saved.has(id);
        if (nextSaved) saved.add(id); else saved.delete(id);
        writeIdSet(SAVED_SPOTS_STORAGE_KEY, saved);
        updateSpotEngagementButtons(spot);
        if (savedSpotsDialog && !savedSpotsDialog.hidden) renderSavedSpotsList();
        setEngagementStatus(nextSaved
            ? (getCurrentLanguage() === "en" ? "Saved on this device." : getCurrentLanguage() === "zh" ? "已保存在此设备。" : getCurrentLanguage() === "ko" ? "이 기기에 저장했습니다." : "この端末に保存しました。")
            : (getCurrentLanguage() === "en" ? "Removed from saved spots." : getCurrentLanguage() === "zh" ? "已从收藏中移除。" : getCurrentLanguage() === "ko" ? "저장 목록에서 삭제했습니다." : "保存を解除しました。"));
    }

    function buildSpotShareUrl(spot) {
        const url = new URL(window.location.href);
        url.searchParams.set("spot", String(spot.id));
        url.hash = "";
        return url.toString();
    }

    function savedSpotsText(key) {
        const lang = getCurrentLanguage();
        const dict = {
            open: { ja: "保存済み", en: "Saved", zh: "已收藏", ko: "저장됨" },
            title: { ja: "保存したスポット", en: "Saved spots", zh: "已收藏地点", ko: "저장한 장소" },
            empty: { ja: "保存したスポットはまだありません。スポット詳細の「保存」から追加できます。", en: "No saved spots yet. Use Save in a spot's details to add one.", zh: "还没有收藏地点。请在地点详情中点击“收藏”添加。", ko: "저장한 장소가 없습니다. 장소 상세에서 ‘저장’을 눌러 추가하세요." },
            count: { ja: "{n}件のスポットを保存中", en: "{n} saved spot(s)", zh: "已收藏 {n} 个地点", ko: "{n}개 장소 저장됨" },
            view: { ja: "地図で見る", en: "View on map", zh: "在地图查看", ko: "지도에서 보기" },
            remove: { ja: "削除", en: "Remove", zh: "移除", ko: "삭제" },
            close: { ja: "閉じる", en: "Close", zh: "关闭", ko: "닫기" }
        };
        return (dict[key] && (dict[key][lang] || dict[key].ja)) || key;
    }

    function updateSavedSpotsDialogLanguage() {
        if (savedSpotsTitle) savedSpotsTitle.textContent = savedSpotsText("title");
        openSavedSpotsButton?.setAttribute("aria-label", savedSpotsText("open"));
        openSavedSpotsButton?.querySelector(".map-action-label") && (openSavedSpotsButton.querySelector(".map-action-label").textContent = savedSpotsText("open"));
        savedSpotsDialog?.querySelectorAll("[data-saved-close]").forEach(function (el) {
            el.setAttribute("aria-label", savedSpotsText("close"));
        });
    }

    function renderSavedSpotsList() {
        if (!savedSpotsList) return;
        updateSavedSpotsDialogLanguage();
        const savedIds = readIdSet(SAVED_SPOTS_STORAGE_KEY);
        const saved = spots.filter(function (spot) { return savedIds.has(String(spot.id)); });
        if (savedSpotsCount) savedSpotsCount.textContent = savedSpotsText("count").replace("{n}", String(saved.length));
        if (!saved.length) {
            savedSpotsList.innerHTML = `<p class="saved-spots-empty">${escapeHTML(savedSpotsText("empty"))}</p>`;
            return;
        }
        savedSpotsList.innerHTML = saved.map(function (spot) {
            const id = escapeHTML(String(spot.id));
            const name = escapeHTML(getLocalizedValue(spot.name) || String(spot.id));
            const category = escapeHTML(getCategoryLabel(spot.category));
            return `<article class="saved-spot-item">
                <div class="saved-spot-copy"><strong>${name}</strong><span>${category}</span></div>
                <div class="saved-spot-item-actions">
                    <button type="button" class="saved-spot-view" data-saved-spot-open="${id}">${escapeHTML(savedSpotsText("view"))}</button>
                    <button type="button" class="saved-spot-remove" data-saved-spot-remove="${id}" aria-label="${escapeHTML(savedSpotsText("remove"))}: ${name}">${escapeHTML(savedSpotsText("remove"))}</button>
                </div>
            </article>`;
        }).join("");
    }

    function openSavedSpotsDialog() {
        if (!savedSpotsDialog) return;
        renderSavedSpotsList();
        savedSpotsDialog.hidden = false;
        document.body.classList.add("saved-spots-open");
        savedSpotsDialog.querySelector("[data-saved-close].spot-share-close")?.focus({ preventScroll: true });
    }

    function closeSavedSpotsDialog() {
        if (!savedSpotsDialog) return;
        savedSpotsDialog.hidden = true;
        document.body.classList.remove("saved-spots-open");
    }

    openSavedSpotsButton?.addEventListener("click", openSavedSpotsDialog);
    savedSpotsDialog?.addEventListener("click", function (event) {
        if (event.target.closest("[data-saved-close]")) {
            closeSavedSpotsDialog();
            return;
        }
        const openButton = event.target.closest("[data-saved-spot-open]");
        if (openButton) {
            const spot = spots.find(function (item) { return String(item.id) === openButton.dataset.savedSpotOpen; });
            if (spot) {
                closeSavedSpotsDialog();
                showSpotOnMap(spot);
            }
            return;
        }
        const removeButton = event.target.closest("[data-saved-spot-remove]");
        if (removeButton) {
            const ids = readIdSet(SAVED_SPOTS_STORAGE_KEY);
            ids.delete(String(removeButton.dataset.savedSpotRemove));
            writeIdSet(SAVED_SPOTS_STORAGE_KEY, ids);
            renderSavedSpotsList();
            if (currentDetailSpot && String(currentDetailSpot.id) === String(removeButton.dataset.savedSpotRemove)) {
                updateSpotEngagementButtons(currentDetailSpot);
            }
        }
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && savedSpotsDialog && !savedSpotsDialog.hidden) closeSavedSpotsDialog();
    });

    function updateSpotShareDialogLanguage() {
        const title = document.getElementById("spotShareTitle");
        const linkLabel = document.querySelector('label[for="spotShareUrlInput"]');
        const copyLabel = copySpotShareUrlButton?.querySelector("span");
        const shareLabel = nativeSpotShareButton?.querySelector("span");
        if (title) title.textContent = getEngagementText("shareTitle");
        if (linkLabel) linkLabel.textContent = getEngagementText("shareLinkLabel");
        if (copyLabel) copyLabel.textContent = getEngagementText("copyLink");
        if (shareLabel) shareLabel.textContent = getEngagementText("nativeShare");
        if (spotShareQrFallback) spotShareQrFallback.textContent = getEngagementText("qrFallback");
        spotShareDialog?.querySelectorAll("[data-share-close]").forEach(function (el) {
            if (el.tagName === "BUTTON" && el.classList.contains("spot-share-close")) {
                el.setAttribute("aria-label", getEngagementText("close"));
            }
        });
    }

    function openSpotShareDialog(spot) {
        if (!spotShareDialog || !spotShareUrlInput || !spotShareQrImage) return;
        updateSpotShareDialogLanguage();
        const shareUrl = buildSpotShareUrl(spot);
        spotShareUrlInput.value = shareUrl;
        if (spotShareSpotName) spotShareSpotName.textContent = getLocalizedValue(spot.name);
        if (spotShareHint) spotShareHint.textContent = getEngagementText("scan");
        if (spotShareStatus) spotShareStatus.textContent = "";
        if (spotShareQrFallback) spotShareQrFallback.hidden = true;
        spotShareQrImage.hidden = false;
        // The QR is rendered by a public QR image endpoint. The shared URL itself is public.
        spotShareQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&format=svg&data=${encodeURIComponent(shareUrl)}`;
        spotShareQrImage.alt = `${getLocalizedValue(spot.name)} — ${getEngagementText("qrAlt")}`;
        const host = window.location.hostname;
        if ((host === "localhost" || host === "127.0.0.1" || window.location.protocol === "file:") && spotShareHint) {
            spotShareHint.textContent = getEngagementText("localUrl");
        }
        spotShareDialog.hidden = false;
        document.body.classList.add("spot-share-open");
        spotShareDialog.querySelector("[data-share-close]")?.focus({ preventScroll: true });
    }

    function closeSpotShareDialog() {
        if (!spotShareDialog) return;
        spotShareDialog.hidden = true;
        document.body.classList.remove("spot-share-open");
    }

    spotShareQrImage?.addEventListener("error", function () {
        spotShareQrImage.hidden = true;
        if (spotShareQrFallback) spotShareQrFallback.hidden = false;
    });

    spotShareDialog?.addEventListener("click", function (event) {
        if (event.target.closest("[data-share-close]")) closeSpotShareDialog();
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && spotShareDialog && !spotShareDialog.hidden) closeSpotShareDialog();
    });

    copySpotShareUrlButton?.addEventListener("click", async function () {
        if (!spotShareUrlInput) return;
        try {
            await navigator.clipboard.writeText(spotShareUrlInput.value);
            if (spotShareStatus) spotShareStatus.textContent = getEngagementText("copied");
        } catch (_) {
            spotShareUrlInput.focus();
            spotShareUrlInput.select();
            let copied = false;
            try { copied = document.execCommand("copy"); } catch (_) {}
            if (spotShareStatus) spotShareStatus.textContent = copied ? getEngagementText("copied") : getEngagementText("copiedManual");
        }
    });

    nativeSpotShareButton?.addEventListener("click", async function () {
        if (!spotShareUrlInput) return;
        const shareData = { title: spotShareSpotName?.textContent || "Fushimi Inari Smart Guide", text: spotShareHint?.textContent || "", url: spotShareUrlInput.value };
        if (navigator.share) {
            try { await navigator.share(shareData); }
            catch (error) { if (error?.name !== "AbortError" && spotShareStatus) spotShareStatus.textContent = String(error.message || error); }
        } else if (spotShareStatus) {
            spotShareStatus.textContent = getEngagementText("noShare");
        }
    });

    mapSpotDetailContent?.addEventListener("click", function (event) {
        const button = event.target.closest("[data-spot-action]");
        if (!button || !currentDetailSpot) return;
        event.preventDefault();
        event.stopPropagation();
        const action = button.dataset.spotAction;
        if (action === "save") toggleSpotSaved(currentDetailSpot);
        else if (action === "share") openSpotShareDialog(currentDetailSpot);
    });

    function openSharedSpotFromUrl() {
        let spotId = "";
        try { spotId = new URLSearchParams(window.location.search).get("spot") || ""; } catch (_) {}
        if (!spotId) return;
        const sharedSpot = spots.find(item => String(item.id) === String(spotId));
        if (!sharedSpot) {
            console.warn("共有リンクのスポットIDが見つかりません:", spotId);
            return;
        }
        window.setTimeout(function () { showSpotOnMap(sharedSpot); }, 180);
    }

    function setSpotAsSingleDestination(spot) {
        if (!spot) return;
        selectedSpots = [spot];
        saveSelectedIDs();
        updateSelected();
        updateInfo();
        updateCardSelection();
        updateRoutePreviewState();
        filterSpots();
    }

    function renderMapSpotDetail(spot, expanded) {
        if (!spot || !mapSpotDetail || !mapSpotDetailContent) return;
        activeRoutePlannerState = null;
        currentDetailSpot = spot;
        mapSpotDetail.classList.remove("is-route-mode");
        plannerWorkspace?.classList.remove("has-route-planner");
        window.requestAnimationFrame(function () {
            if (typeof map?.invalidateSize === "function") map.invalidateSize({ pan: true });
        });
        const name = getLocalizedValue(spot.name);
        const description = getLocalizedValue(spot.description) || "説明はまだ登録されていません。";
        const category = getCategoryLabel(spot.category);
        const time = spot.time || "";
        const url = getSafeURL(spot.url);
        const image = typeof spot.image === "string" ? spot.image.trim() : "";
        const imageHtml = image
            ? `<img class="map-spot-detail-image" src="./images/${encodeURIComponent(image)}" alt="${escapeHTML(name)}" onerror="this.hidden=true; this.parentElement.classList.add('has-no-photo'); this.parentElement.querySelector('.map-spot-detail-photo-fallback').hidden=false;">`
            : "";
        const urlHtml = url
            ? `<a class="map-spot-detail-url" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(getOfficialSiteText())} ↗</a>`
            : `<p class="map-spot-detail-no-url">公式サイトのURLは登録されていません。</p>`;
        const timeHtml = time ? `<p class="map-spot-detail-meta">滞在目安：${escapeHTML(time)}</p>` : "";
        const addressValue = getLocalizedValue(spot.address || "");
        const addressHtml = addressValue ? `<p class="map-spot-detail-meta">${escapeHTML(addressValue)}</p>` : "";
        const accessValue = getLocalizedValue(spot.access || "");
        const accessHtml = accessValue ? `<h3>アクセス</h3><p class="map-spot-detail-full-description">${escapeHTML(accessValue)}</p>` : "";

        mapSpotDetailContent.innerHTML = `
            <div class="map-spot-detail-summary">
                <div class="map-spot-detail-photo${image ? "" : " has-no-photo"}">
                    ${imageHtml}
                    <div class="map-spot-detail-photo-fallback" ${image ? "hidden" : ""}>no photo</div>
                </div>
                <div class="map-spot-detail-title-row">
                    <div class="map-spot-detail-title-copy">
                        <p class="map-spot-detail-category">${escapeHTML(category)} <span class="map-spot-detail-viewing-badge">${escapeHTML(routeSetupText("viewing"))}</span></p>
                        <h2>${escapeHTML(name)}</h2>
                    </div>
                </div>
                <p class="map-spot-detail-short-description">${escapeHTML(description)}</p>
                <div class="spot-engagement-actions" role="group" aria-label="スポットの操作">
                    <button type="button" class="spot-engagement-button spot-save-button${isSpotSaved(spot) ? " is-active" : ""}" data-spot-action="save" aria-pressed="${isSpotSaved(spot) ? "true" : "false"}">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.8L6 21Z"/></svg>
                        <span data-save-label>${escapeHTML(getEngagementText(isSpotSaved(spot) ? "saved" : "save"))}</span>
                    </button>
                    <button type="button" class="spot-engagement-button spot-share-button" data-spot-action="share">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4"/></svg><span>${escapeHTML(getEngagementText("share"))}</span>
                    </button>
                </div>
                <p class="spot-engagement-status" role="status" aria-live="polite" hidden></p>
                <button type="button" class="map-spot-detail-route-button map-spot-detail-route-button-summary"><span class="route-button-symbol" aria-hidden="true">↗</span><span>${escapeHTML(routeSetupText("route"))}</span></button>
                ${getStationOfficialTimetableLinks(spot).map(link => `<a class="map-spot-detail-timetable-link" href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer">🚉 ${escapeHTML(link.label)} ↗</a>`).join("")}
            </div>
            <div class="map-spot-detail-body">
                <div class="map-spot-detail-divider"></div>
                <h3>スポットについて</h3>
                <p class="map-spot-detail-full-description">${escapeHTML(description)}</p>
                ${timeHtml}
                ${addressHtml}
                ${accessHtml}
                ${urlHtml}
            </div>
        `;

        mapSpotDetail.hidden = false;
        mapSpotDetail.classList.toggle("is-expanded", Boolean(expanded));
        mapSpotDetail.classList.toggle("is-compact", !expanded);
        plannerWorkspace?.classList.add("has-spot-detail");
        updateSpotEngagementButtons(spot);

        const routeButton = mapSpotDetailContent.querySelector(".map-spot-detail-route-button-summary");
        routeButton?.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            setSpotAsSingleDestination(spot);
            activeRoutePlannerState = {
                destinationSpot: spot,
                originMode: "current",
                startSpotId: "",
                travelMode: "walk",
                locationStatus: ""
            };
            renderRoutePlanner(activeRoutePlannerState);
        });
    }

    // Route-builder inspired by the supplied venue-map video. On desktop it becomes
    // a left-side glass panel; on small screens it stays a bottom sheet over the map.
    function renderRoutePlanner(state) {
        if (!state || !mapSpotDetail || !mapSpotDetailContent) return;
        // Route planning should not leave the spot/category drawer expanded behind the panel.
        setFoodCategorySwitcherOpen(false);
        setPlannerSheetState("collapsed");
        activeRoutePlannerState = state;
        currentDetailSpot = state.destinationSpot;
        const destination = state.destinationSpot;
        const destinationName = getLocalizedValue(destination?.name || "");
        const language = getCurrentLanguage();
        const t = {
            back: {ja:"詳細に戻る", en:"Back to details", zh:"返回详情", ko:"상세로 돌아가기"},
            title: {ja:"ルート検索", en:"Plan your route", zh:"路线规划", ko:"경로 검색"},
            subtitle: {ja:"出発地と到着地を確認", en:"Confirm your start and destination", zh:"确认出发地和目的地", ko:"출발지와 도착지 확인"},
            start: {ja:"出発地", en:"START", zh:"出发地", ko:"출발지"},
            destination: {ja:"到着地", en:"DESTINATION", zh:"目的地", ko:"도착지"},
            current: {ja:"現在地", en:"My location", zh:"当前位置", ko:"현재 위치"},
            getLocation: {ja:"現在地を取得", en:"Use current location", zh:"获取当前位置", ko:"현재 위치 가져오기"},
            currentHelp: {ja:"端末の位置情報を使います", en:"Uses your device location", zh:"使用设备的位置", ko:"기기의 위치 정보를 사용합니다"},
            startMode: {ja:"出発地の指定方法", en:"Choose starting point", zh:"选择出发方式", ko:"출발지 선택 방법"},
            fromCurrent: {ja:"現在地から", en:"My location", zh:"当前位置", ko:"현재 위치"},
            fromSpot: {ja:"スポットから", en:"A spot", zh:"从地点出发", ko:"장소에서"},
            chooseSpot: {ja:"出発するスポットを選択", en:"Choose a starting spot", zh:"选择出发地点", ko:"출발 장소 선택"},
            swap: {ja:"出発地と到着地を入れ替え", en:"Swap start and destination", zh:"交换出发地和目的地", ko:"출발지와 도착지 바꾸기"},
            method: {ja:"移動方法", en:"Travel mode", zh:"出行方式", ko:"이동 방법"},
            walking: {ja:"徒歩", en:"Walking", zh:"步行", ko:"도보"},
            accessible: {ja:"車いす対応", en:"Wheelchair", zh:"无障碍", ko:"휠체어"},
            accessibleNote: {ja:"車いす対応ルートのデータは準備中です。現在は徒歩ルートを案内します。", en:"Accessible route data is still being prepared; walking routes are available now.", zh:"无障碍路线数据仍在准备中，目前提供步行路线。", ko:"휠체어 대응 경로 데이터는 준비 중이며 현재는 도보 경로를 안내합니다."},
            search: {ja:"ルート検索", en:"Find route", zh:"搜索路线", ko:"경로 검색"},
            loading: {ja:"ルートを作成中…", en:"Building route…", zh:"正在生成路线…", ko:"경로 생성 중…"},
            cancel: {ja:"キャンセル", en:"Cancel", zh:"取消", ko:"취소"},
            chooseStartError: {ja:"出発するスポットを選択してください。", en:"Choose a starting spot.", zh:"请选择出发地点。", ko:"출발 장소를 선택해 주세요."},
            sameSpotError: {ja:"出発地と到着地は別のスポットを選択してください。", en:"Start and destination must be different spots.", zh:"出发地和目的地不能相同。", ko:"출발지와 도착지는 서로 다른 장소여야 합니다."},
            locationPending: {ja:"ルート検索時に位置情報を確認します。", en:"Location will be requested when you search.", zh:"搜索路线时将请求位置权限。", ko:"경로 검색 시 위치 정보를 확인합니다."},
            locationSuccess: {ja:"現在地を取得しました", en:"Location acquired", zh:"已获取当前位置", ko:"현재 위치를 가져왔습니다"},
            locationError: {ja:"現在地を取得できません。ブラウザの位置情報許可を確認してください。", en:"Could not get location. Check your browser's location permission.", zh:"无法获取当前位置，请检查浏览器位置权限。", ko:"현재 위치를 가져올 수 없습니다. 브라우저 위치 권한을 확인해 주세요."},
            swapHint: {ja:"入れ替えはスポットを出発地に選ぶと利用できます", en:"Choose a spot as the start to swap endpoints", zh:"选择地点作为出发地后即可交换", ko:"장소를 출발지로 선택하면 바꿀 수 있습니다"}
        };
        const text = key => t[key]?.[language] || t[key]?.ja || key;
        const startSpot = state.originMode === "spot" ? spots.find(item => String(item.id) === String(state.startSpotId || "")) : null;
        const startName = state.originMode === "current" ? text("current") : (startSpot ? getLocalizedValue(startSpot.name) : text("chooseSpot"));
        const originOptions = spots.filter(item => String(item.id) !== String(destination?.id)).map(item => {
            const id = String(item.id);
            const selected = id === String(state.startSpotId || "") ? " selected" : "";
            return `<option value="${escapeHTML(id)}"${selected}>${escapeHTML(getLocalizedValue(item.name))}</option>`;
        }).join("");
        const locationStatus = state.locationStatus || text("locationPending");
        const swapDisabled = !(state.originMode === "spot" && startSpot);

        mapSpotDetail.classList.add("is-route-mode", "is-expanded");
        mapSpotDetail.classList.remove("is-compact");
        plannerWorkspace?.classList.add("has-spot-detail", "has-route-planner");
        window.requestAnimationFrame(function () {
            if (typeof map?.invalidateSize === "function") map.invalidateSize({ pan: true });
        });
        mapSpotDetailContent.innerHTML = `
          <div class="map-route-builder">
            <header class="map-route-builder-header">
              <button type="button" class="map-route-builder-back" aria-label="${escapeHTML(text("back"))}">‹</button>
              <div class="map-route-builder-heading"><h2>${escapeHTML(text("title"))}</h2><p>${escapeHTML(text("subtitle"))}</p></div>
              <span class="map-route-builder-badge" aria-hidden="true">${escapeHTML(text("walking"))}</span>
            </header>
            <section class="map-route-endpoints" aria-label="${escapeHTML(text("title"))}">
              <div class="map-route-endpoint map-route-endpoint-start">
                <span class="map-route-point-dot" aria-hidden="true"></span>
                <div class="map-route-endpoint-copy"><span class="map-route-endpoint-label">${escapeHTML(text("start"))}</span><strong class="map-route-start-name">${escapeHTML(startName)}</strong><small>${escapeHTML(state.originMode === "current" ? text("currentHelp") : text("chooseSpot"))}</small></div>
                <button type="button" class="map-route-location-button" ${state.originMode === "spot" ? "hidden" : ""}>${escapeHTML(text("getLocation"))}</button>
              </div>
              <div class="map-route-endpoint-connector">
                <span aria-hidden="true"></span>
                <button type="button" class="map-route-swap" aria-label="${escapeHTML(text("swap"))}" title="${escapeHTML(swapDisabled ? text("swapHint") : text("swap"))}" ${swapDisabled ? "disabled" : ""}>⇅</button>
              </div>
              <div class="map-route-endpoint map-route-endpoint-destination">
                <span class="map-route-point-dot" aria-hidden="true"></span>
                <div class="map-route-endpoint-copy"><span class="map-route-endpoint-label">${escapeHTML(text("destination"))}</span><strong>${escapeHTML(destinationName)}</strong><small>${escapeHTML(getCategoryLabel(destination?.category || ""))}</small></div>
              </div>
            </section>
            <section class="map-route-origin-picker">
              <h3>${escapeHTML(text("startMode"))}</h3>
              <div class="map-route-origin-mode" role="group" aria-label="${escapeHTML(text("startMode"))}">
                <button type="button" data-origin-mode="current" class="${state.originMode === "current" ? "is-active" : ""}" aria-pressed="${state.originMode === "current"}"><span aria-hidden="true">⌖</span>${escapeHTML(text("fromCurrent"))}</button>
                <button type="button" data-origin-mode="spot" class="${state.originMode === "spot" ? "is-active" : ""}" aria-pressed="${state.originMode === "spot"}"><span aria-hidden="true">◎</span>${escapeHTML(text("fromSpot"))}</button>
              </div>
              <label class="map-route-start-select-wrap" ${state.originMode === "spot" ? "" : "hidden"}>
                <span>${escapeHTML(text("chooseSpot"))}</span>
                <select class="map-route-start-select"><option value="">${escapeHTML(text("chooseSpot"))}</option>${originOptions}</select>
              </label>
              <p class="map-route-location-status" role="status">${escapeHTML(locationStatus)}</p>
            </section>
            <section class="map-route-mode-section">
              <h3>${escapeHTML(text("method"))}</h3>
              <div class="map-route-mode-options">
                <button type="button" class="map-route-mode-option is-active" aria-pressed="true" data-travel-mode="walk"><span aria-hidden="true">♙</span>${escapeHTML(text("walking"))}</button>
                <button type="button" class="map-route-mode-option is-unavailable" aria-disabled="true" disabled title="${escapeHTML(text("accessibleNote"))}"><span aria-hidden="true">♿</span>${escapeHTML(text("accessible"))}<small>準備中</small></button>
              </div>
              <p class="map-route-mode-note">${escapeHTML(text("accessibleNote"))}</p>
            </section>
            <p class="map-route-builder-error" role="alert" hidden></p>
            <div class="map-route-builder-actions">
              <button type="button" class="map-route-builder-submit"><span aria-hidden="true">➜</span><span>${escapeHTML(text("search"))}</span></button>
              <button type="button" class="map-route-builder-cancel">${escapeHTML(text("cancel"))}</button>
            </div>
          </div>`;

        const backButton = mapSpotDetailContent.querySelector(".map-route-builder-back");
        const currentButton = mapSpotDetailContent.querySelector(".map-route-location-button");
        const status = mapSpotDetailContent.querySelector(".map-route-location-status");
        const originModeButtons = Array.from(mapSpotDetailContent.querySelectorAll("[data-origin-mode]"));
        const startSelect = mapSpotDetailContent.querySelector(".map-route-start-select");
        const startSelectWrap = mapSpotDetailContent.querySelector(".map-route-start-select-wrap");
        const swapButton = mapSpotDetailContent.querySelector(".map-route-swap");
        const startNameNode = mapSpotDetailContent.querySelector(".map-route-start-name");
        const errorNode = mapSpotDetailContent.querySelector(".map-route-builder-error");
        const submitButton = mapSpotDetailContent.querySelector(".map-route-builder-submit");
        const cancelButton = mapSpotDetailContent.querySelector(".map-route-builder-cancel");

        backButton?.addEventListener("click", function () {
            activeRoutePlannerState = null;
            renderMapSpotDetail(state.destinationSpot, true);
        });
        originModeButtons.forEach(button => button.addEventListener("click", function () {
            state.originMode = button.dataset.originMode === "spot" ? "spot" : "current";
            state.locationStatus = state.originMode === "current" ? text("locationPending") : text("chooseSpot");
            if (state.originMode === "current") state.startSpotId = "";
            renderRoutePlanner(state);
        }));
        startSelect?.addEventListener("change", function () {
            state.startSpotId = startSelect.value;
            const newStart = spots.find(item => String(item.id) === String(state.startSpotId));
            if (startNameNode) startNameNode.textContent = newStart ? getLocalizedValue(newStart.name) : text("chooseSpot");
            if (errorNode) errorNode.hidden = true;
            if (swapButton) {
                const disabled = !newStart;
                swapButton.disabled = disabled;
                swapButton.title = disabled ? text("swapHint") : text("swap");
            }
            const small = mapSpotDetailContent.querySelector(".map-route-endpoint-start .map-route-endpoint-copy small");
            if (small) small.textContent = newStart ? getCategoryLabel(newStart.category || "") : text("chooseSpot");
            // V55: both endpoints are now set, so start routing automatically.
            if (newStart && state.destinationSpot && String(newStart.id) !== String(state.destinationSpot.id)) {
                createRoute({
                    destinationSpot: state.destinationSpot,
                    originMode: "spot",
                    startSpot: newStart,
                    travelMode: state.travelMode || "walking"
                }).catch(function (error) {
                    console.error("出発地選択後の自動ルート作成に失敗しました:", error);
                });
            }
        });
        swapButton?.addEventListener("click", function () {
            if (state.originMode !== "spot" || !state.startSpotId) return;
            const oldDestination = state.destinationSpot;
            const newDestination = spots.find(item => String(item.id) === String(state.startSpotId));
            if (!oldDestination || !newDestination || String(newDestination.id) === String(oldDestination.id)) return;
            state.destinationSpot = newDestination;
            state.startSpotId = String(oldDestination.id);
            currentDetailSpot = newDestination;
            activeViewedSpotId = String(newDestination.id);
            filterSpots();
            renderRoutePlanner(state);
        });
        currentButton?.addEventListener("click", async function () {
            if (status) status.textContent = language === "en" ? "Getting location…" : language === "zh" ? "正在获取位置…" : language === "ko" ? "위치 가져오는 중…" : "現在地を取得中…";
            currentButton.disabled = true;
            try {
                await ensureCurrentLocation();
                state.locationStatus = text("locationSuccess");
                if (status) status.textContent = state.locationStatus;
            } catch (error) {
                console.warn("ルートパネルから現在地を取得できませんでした。", error);
                state.locationStatus = text("locationError");
                if (status) status.textContent = state.locationStatus;
            } finally {
                currentButton.disabled = false;
            }
        });
        cancelButton?.addEventListener("click", function () {
            activeRoutePlannerState = null;
            renderMapSpotDetail(state.destinationSpot, false);
        });
        submitButton?.addEventListener("click", async function () {
            if (errorNode) { errorNode.hidden = true; errorNode.textContent = ""; }
            const startSpot = state.originMode === "spot" ? spots.find(item => String(item.id) === String(state.startSpotId || "")) : null;
            if (state.originMode === "spot" && !startSpot) {
                if (errorNode) { errorNode.textContent = text("chooseStartError"); errorNode.hidden = false; }
                return;
            }
            if (startSpot && String(startSpot.id) === String(state.destinationSpot.id)) {
                if (errorNode) { errorNode.textContent = text("sameSpotError"); errorNode.hidden = false; }
                return;
            }
            submitButton.disabled = true;
            submitButton.innerHTML = `<span aria-hidden="true">◌</span><span>${escapeHTML(text("loading"))}</span>`;
            try {
                await createRoute({
                    destinationSpot: state.destinationSpot,
                    originMode: state.originMode,
                    startSpot: startSpot || null,
                    travelMode: state.travelMode
                });
            } finally {
                if (submitButton.isConnected) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = `<span aria-hidden="true">➜</span><span>${escapeHTML(text("search"))}</span>`;
                }
            }
        });
    }

    function hideSpotDetail() {
        if (!mapSpotDetail) return;
        mapSpotDetail.hidden = true;
        mapSpotDetail.classList.remove("is-expanded", "is-compact", "is-route-mode");
        plannerWorkspace?.classList.remove("has-spot-detail", "has-route-planner");
        activeRoutePlannerState = null;
        window.requestAnimationFrame(function () {
            if (typeof map?.invalidateSize === "function") map.invalidateSize({ pan: true });
        });
        currentDetailSpot = null;
        activeViewedSpotId = null;
        filterSpots();
    }

    function showSpotOnMap(spot) {
        if (!spot) return;
        closeMapSearch();
        // 駅も通常のスポットと同じ詳細シートを開き、ルート操作と公式時刻表リンクを表示する。
        activeViewedSpotId = String(spot.id);
        filterSpots();
        focusSpotOnMap(spot);
        renderMapSpotDetail(spot, false);
    }

    closeMapSpotDetailButton?.addEventListener("click", function (event) {
        event.preventDefault();
        hideSpotDetail();
    });

    // The grip/summary can be dragged up to expand the sheet and down to return to preview.
    let detailDragStart = null;
    let detailDragMoved = false;
    function handleDetailPointerDown(event) {
        if (event.button !== undefined && event.button !== 0) return;
        detailDragStart = { y: event.clientY, id: event.pointerId };
        detailDragMoved = false;
        if (event.currentTarget?.setPointerCapture && event.pointerId != null) {
            try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_) {}
        }
    }
    function handleDetailPointerUp(event) {
        if (!detailDragStart || (event.pointerId != null && event.pointerId !== detailDragStart.id)) return;
        const delta = event.clientY - detailDragStart.y;
        detailDragStart = null;
        if (Math.abs(delta) < 28) return;
        detailDragMoved = true;
        if (delta < 0) {
            renderMapSpotDetail(currentDetailSpot, true);
        } else if (mapSpotDetail?.classList.contains("is-expanded")) {
            renderMapSpotDetail(currentDetailSpot, false);
        } else {
            hideSpotDetail();
        }
        window.setTimeout(function () { detailDragMoved = false; }, 220);
    }
    [mapSpotDetailHandle].forEach(function (el) {
        if (!el) return;
        el.addEventListener("pointerdown", handleDetailPointerDown, { passive: true });
        el.addEventListener("pointerup", handleDetailPointerUp, { passive: true });
        el.addEventListener("pointercancel", function () { detailDragStart = null; }, { passive: true });
        el.addEventListener("click", function () {
            if (detailDragMoved || !currentDetailSpot) return;
            renderMapSpotDetail(currentDetailSpot, !mapSpotDetail.classList.contains("is-expanded"));
        });
    });
    mapSpotDetailContent?.addEventListener("pointerdown", function (event) {
        if (!event.target.closest(".map-spot-detail-summary")) return;
        // Buttons / links in the compact summary must remain tappable. Capturing
        // their pointer here suppresses their click event on some mobile browsers.
        if (event.target.closest("button, a, input, select, textarea, label")) return;
        handleDetailPointerDown(event);
    }, { passive: true });
    mapSpotDetailContent?.addEventListener("pointerup", function (event) {
        if (!event.target.closest(".map-spot-detail-summary")) return;
        if (event.target.closest("button, a, input, select, textarea, label")) return;
        handleDetailPointerUp(event);
    }, { passive: true });

    function selectSpot(
        spot
    ) {

        const index =
            selectedSpots.findIndex(
                function (selected) {

                    return (
                        String(
                            selected.id
                        ) ===
                        String(
                            spot.id
                        )
                    );
                }
            );

        if (index !== -1) {

            selectedSpots.splice(
                index,
                1
            );

        } else {

            selectedSpots.push(
                spot
            );
        }

        saveSelectedIDs();
        updateSelected();
        focusSpotOnMap(spot);
        updateInfo();
        updateCardSelection();
        updateMarkerSelection(
            spot.id
        );
        updateRoutePreviewState();
    }

    function cancelAllSelectedSpots() {
        if (!selectedSpots.length) return;

        const previouslySelected = selectedSpots.slice();
        if (navigationActive) {
            stopNavigation();
        }

        selectedSpots = [];
        saveSelectedIDs();
        clearRouteVisuals();
        updateSelected();
        updateInfo();
        updateCardSelection();
        previouslySelected.forEach(function (spot) {
            updateMarkerSelection(spot.id);
        });
        updateRoutePreviewState();
    }

    if (cancelSelectedSpotsBtn) {
        cancelSelectedSpotsBtn.addEventListener("click", function (event) {
            event.preventDefault();
            cancelAllSelectedSpots();
        });
    }

    function updateCardSelection() {

        const cards =
            document.querySelectorAll(
                ".planner-spot"
            );

        cards.forEach(
            function (card) {

                const id =
                    String(
                        card.dataset.id
                    );

                const selected =
                    selectedSpots.some(
                        function (spot) {

                            return (
                                String(
                                    spot.id
                                ) === id
                            );
                        }
                    );

                card.classList.toggle(
                    "selected",
                    selected
                );

                const selectButton = card.querySelector(".spot-card-select-button");
                if (selectButton) {
                    selectButton.textContent = selected ? getRemoveRouteText() : getAddRouteText();
                    selectButton.classList.toggle("is-selected", selected);
                    selectButton.setAttribute("aria-pressed", selected ? "true" : "false");
                }

                const oldLabel =
                    card.querySelector(
                        ".selected-label"
                    );

                if (
                    selected &&
                    !oldLabel
                ) {

                    const content =
                        card.querySelector(
                            ".spot-content"
                        );

                    if (content) {

                        const label =
                            document.createElement(
                                "span"
                            );

                        label.className =
                            "selected-label";

                        label.textContent =
                            getSelectedText();

                        content.appendChild(
                            label
                        );
                    }
                }

                if (
                    !selected &&
                    oldLabel
                ) {

                    oldLabel.remove();
                }
            }
        );
    }

    function updateSelected() {

        updateCancelSelectedSpotsButton();

        if (!selectedList) {
            return;
        }

        selectedList.innerHTML = "";

        if (
            selectedSpots.length ===
            0
        ) {

            selectedList.innerHTML = `
                <p>
                    ${getNoSelectedText()}
                </p>
            `;

            updatePlannerSheetSummary();
            return;
        }

        selectedSpots.forEach(
            function (
                spot,
                index
            ) {

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "selected-spot";

                const name =
                    getLocalizedValue(
                        spot.name
                    );

                item.innerHTML = `

                    <span>
                        ${index + 1}.
                        ${escapeHTML(name)}
                    </span>

                    <button
                        type="button"
                        aria-label="選択解除"
                    >
                        ×
                    </button>
                `;

                item.querySelector(
                    "button"
                ).addEventListener(
                    "click",
                    function (event) {

                        event.stopPropagation();

                        selectedSpots =
                            selectedSpots.filter(
                                function (
                                    selected
                                ) {

                                    return (
                                        String(
                                            selected.id
                                        ) !==
                                        String(
                                            spot.id
                                        )
                                    );
                                }
                            );

                        saveSelectedIDs();
                        updateSelected();
                        updateInfo();
                        updateCardSelection();
                        updateMarkerSelection(
                            spot.id
                        );
                        updateRoutePreviewState();
                    }
                );

                selectedList.appendChild(
                    item
                );
            }
        );

        updatePlannerSheetSummary();
    }

    // ============================================================
    // マーカー
    // ============================================================

    function createMarkers(
        list
    ) {

        markers.forEach(
            function (marker) {

                map.removeLayer(
                    marker
                );
            }
        );

        markers = [];
        markerMap = new Map();

        list.forEach(
            function (spot) {

                const isViewing = String(activeViewedSpotId ?? "") === String(spot.id);
                const marker =
                    L.marker(
                        [
                            Number(spot.lat),
                            Number(spot.lng)
                        ],
                        {
                            icon: createMarkerIcon(spot, isSpotSelected(spot), isViewing),
                            keyboard: true,
                            title: getLocalizedValue(spot.name),
                            zIndexOffset: isViewing ? 12000 : getMarkerZIndexOffset(spot)
                        }
                    );

                marker.on("click", function () {
                    // When the route planner is open, a pin still chooses the route origin.
                    const plannerState = activeRoutePlannerState;
                    if (plannerState && plannerState.destinationSpot) {
                        if (String(spot.id) === String(plannerState.destinationSpot.id)) {
                            showSpotOnMap(spot);
                            return;
                        }
                        plannerState.originMode = "spot";
                        plannerState.startSpotId = String(spot.id);
                        plannerState.startSpot = spot;
                        createRoute({
                            destinationSpot: plannerState.destinationSpot,
                            originMode: "spot",
                            startSpot: spot,
                            travelMode: plannerState.travelMode || "walking"
                        }).catch(function (error) {
                            console.error("地図からの自動ルート作成に失敗しました:", error);
                        });
                        return;
                    }

                    const sameId = String(spot.id);

                    // 選択済みスポットは、マーカーをもう一度タップすると選択解除できる。
                    if (isSpotSelected(spot)) {
                        // The drawn route must not keep pointing to a waypoint that has just been removed.
                        if (navigationActive) {
                            stopNavigation();
                        } else if (routeLine) {
                            clearRouteVisuals();
                            hideNavCard();
                        }
                        selectedSpots = selectedSpots.filter(function (selected) {
                            return String(selected.id) !== sameId;
                        });
                        saveSelectedIDs();
                        updateSelected();
                        updateInfo();
                        updateCardSelection();
                        updateMarkerSelection(spot.id);
                        updateRoutePreviewState();

                        if (String(activeViewedSpotId ?? "") === sameId) {
                            if (currentDetailSpot && String(currentDetailSpot.id) === sameId) {
                                hideSpotDetail();
                            } else {
                                activeViewedSpotId = null;
                                filterSpots();
                            }
                        }
                        return;
                    }

                    // Tapping the currently highlighted pin again closes its detail sheet.
                    if (String(activeViewedSpotId ?? "") === sameId) {
                        if (currentDetailSpot && String(currentDetailSpot.id) === sameId) {
                            hideSpotDetail();
                        } else {
                            activeViewedSpotId = null;
                            filterSpots();
                        }
                        return;
                    }

                    showSpotOnMap(spot);
                });

                marker.addTo(map);
                const markerElement = marker.getElement?.();
                if (markerElement) markerElement.classList.toggle("planner-marker-viewing", isViewing);

                markers.push(
                    marker
                );

                markerMap.set(
                    String(
                        spot.id
                    ),
                    marker
                );
            }
        );
    }

    function updateMarkerSelection(
        changedSpotId
    ) {

        const marker =
            markerMap.get(
                String(
                    changedSpotId
                )
            );

        if (!marker) {
            return;
        }

        const spot =
            spots.find(
                function (item) {

                    return (
                        String(
                            item.id
                        ) ===
                        String(
                            changedSpotId
                        )
                    );
                }
            );

        if (!spot) {
            return;
        }

        const isViewing = String(activeViewedSpotId ?? "") === String(spot.id);
        marker.setIcon(createMarkerIcon(spot, isSpotSelected(spot), isViewing));
        const markerElement = marker.getElement?.();
        if (markerElement) markerElement.classList.toggle("planner-marker-viewing", isViewing);
        marker.setZIndexOffset(isViewing ? 12000 : getMarkerZIndexOffset(spot));

    }

    // ============================================================
    // 検索
    // ============================================================

    function getFilteredSpotsForCurrentState() {
        const keyword = searchInput ? searchInput.value.trim().toLocaleLowerCase() : "";
        const selectedCategory = activeCategoryFilter || "all";
        const isFoodMode = selectedCategory === "__food_shop__";
        const targetCategory = selectedCategory === "施設"
            ? "facility"
            : (isFoodMode ? "__food_shop__" : normalizeCategory(selectedCategory));
        const foodFilter = activeFoodFilter || "all";

        const eatPattern = /食事|飲食|料理|食堂|カフェ|喫茶|レストラン|ラーメン|そば|うどん|寿司|甘味|スイーツ|food|eat|restaurant|cafe|dining|ramen|noodle|sushi|dessert|餐|吃|咖啡|饮食|식당|음식|카페|식사/i;
        const buyPattern = /お土産|土産|土みやげ|売店|物販|商店|雑貨|本舗|専門店|ショップ|買い物|購入|販売|グッズ|みやげ|souvenir|shopping|gift shop|retail|store|shop|merchandise|购物|纪念品|礼品|商店|판매|기념품|쇼핑|매장/i;

        return spots.filter(function (spot) {
            const searchFields = [
                spot.id, spot.name, spot.description, spot.category, spot.keyword,
                spot.keywords, spot.searchKeyword, spot.searchKeywords, spot.tags,
                spot.address, spot.access, spot.englishName, spot.type, spot.icon
            ];
            const searchableText = searchFields.map(function (value) {
                if (Array.isArray(value)) return value.map(getLocalizedValue).join(" ");
                return getLocalizedValue(value);
            }).join(" ").toLocaleLowerCase();
            const matchesSearch = !keyword || searchableText.includes(keyword);

            const normalizedSpotCategory = normalizeCategory(spot.category);
            const foodFields = [spot.name, spot.category, spot.description, spot.tags,
                spot.keywords, spot.keyword, spot.type, spot.icon, spot.englishName];
            const foodText = foodFields.map(function (value) {
                if (Array.isArray(value)) return value.map(getLocalizedValue).join(" ");
                return getLocalizedValue(value);
            }).join(" ").toLocaleLowerCase();

            let matchesCategory;
            if (isFoodMode) {
                const isBuySpot = buyPattern.test(foodText) ||
                    ["shop", "shopping", "store", "souvenir", "gift", "retail", "物販", "土産"].includes(normalizedSpotCategory);
                // When a spot has conflicting text (for example a store name and a
                // copied café description), treat explicit shop signals as Buy first.
                const isEatSpot = !isBuySpot &&
                    (normalizedSpotCategory === "restaurant" || eatPattern.test(foodText));
                matchesCategory = foodFilter === "eat" ? isEatSpot :
                    foodFilter === "buy" ? isBuySpot : (isEatSpot || isBuySpot);
            } else {
                matchesCategory = targetCategory === "all" ||
                    (targetCategory === "sightseeing" && ["scenery", "shrine", "hiking"].includes(normalizedSpotCategory)) ||
                    (targetCategory === "facility" && ["toilet", "guide", "施設", "トイレ", "案内"].includes(normalizedSpotCategory)) ||
                    normalizedSpotCategory === targetCategory;
            }
            return matchesSearch && matchesCategory;
        });
    }

    function filterSpots() {
        const filtered = getFilteredSpotsForCurrentState();
        if (activeViewedSpotId !== null) {
            filtered.sort(function (a, b) {
                const aViewed = String(a.id) === String(activeViewedSpotId) ? 1 : 0;
                const bViewed = String(b.id) === String(activeViewedSpotId) ? 1 : 0;
                return bViewed - aViewed;
            });
        }
        updateSpotResultCount(filtered.length);
        displaySpots(filtered);
        createMarkers(filtered);
        renderRouteNumberMarkers();
    }

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            filterSpots();
            if (searchInput.value.trim()) {
                setPlannerSheetState("expanded");
            }
        });
    }

    if (openMapSearchButton && mapSearchPopover) {
        openMapSearchButton.addEventListener("click", function () {
            mapSearchPopover.hidden = false;
            openMapSearchButton.setAttribute("aria-expanded", "true");
            window.setTimeout(function () { searchInput?.focus(); }, 60);
        });
    }
    function closeMapSearch() {
        if (mapSearchPopover) mapSearchPopover.hidden = true;
        openMapSearchButton?.setAttribute("aria-expanded", "false");
    }
    closeMapSearchButton?.addEventListener("click", closeMapSearch);
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeMapSearch();
            hideSpotDetail();
            setFoodCategorySwitcherOpen(false);
        }
    });

    categoryButtons.forEach(function (button) {
        button.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            const isFoodOption = button.matches(".food-option");

            // Never animate the selected tile itself. The only transition is the
            // shared contents switching inside the persistent capsule.
            categoryButtons.forEach(function (item) { item.classList.remove("active"); });

            if (isFoodOption) {
                activeCategoryFilter = "__food_shop__";
                activeFoodFilter = button.dataset.foodFilter === "buy" ? "buy" : "eat";
                button.classList.add("active"); // remembers the last choice on the back face
                foodCategoryTrigger?.classList.add("active");
                setFoodCategorySwitcherOpen(false);
                filterSpots();
                return;
            }

            activeCategoryFilter = button.dataset.category || button.textContent.trim() || "all";
            activeFoodFilter = "all";
            button.classList.add("active");
            foodCategoryTrigger?.classList.remove("active");
            setFoodCategorySwitcherOpen(false);
            filterSpots();
        });
    });

    // ============================================================
    // routes.json 正規化
    // ============================================================

    function normalizeRouteObject(
        route,
        index
    ) {

        if (
            !route ||
            typeof route !==
                "object"
        ) {
            return null;
        }

        const from =
            String(
                route.from ??
                ""
            ).trim();

        const to =
            String(
                route.to ??
                ""
            ).trim();

        if (
            !from ||
            !to
        ) {
            return null;
        }

        if (
            !Array.isArray(
                route.path
            )
        ) {
            return null;
        }

        const path =
            route.path
                .map(
                    function (point) {

                        const lat =
                            Number(
                                point?.lat
                            );

                        const lng =
                            Number(
                                point?.lng
                            );

                        if (
                            !Number.isFinite(
                                lat
                            ) ||
                            !Number.isFinite(
                                lng
                            )
                        ) {
                            return null;
                        }

                        return [
                            lat,
                            lng
                        ];
                    }
                )
                .filter(Boolean);

        if (
            path.length < 2
        ) {
            return null;
        }

        return {

            from:
                from,

            to:
                to,

            name:
                String(
                    route.name ||
                    `${from} → ${to}`
                ),

            path:
                path,

            index:
                index,

            priority:
                Number.isFinite(
                    Number(
                        route.priority
                    )
                )
                    ? Number(
                        route.priority
                    )
                    : 0,

            type:
                String(
                    route.type ||
                    ""
                )
                .trim()
                .toLowerCase()
        };
    }

    function routePathDistanceKm(
        path
    ) {

        if (
            !Array.isArray(path) ||
            path.length < 2
        ) {
            return Infinity;
        }

        let totalMeters = 0;

        for (
            let i = 0;
            i < path.length - 1;
            i++
        ) {

            totalMeters +=
                map.distance(
                    path[i],
                    path[i + 1]
                );
        }

        return (
            totalMeters / 1000
        );
    }

    function prepareRouteGraph() {

        routes =
            routes
                .map(
                    normalizeRouteObject
                )
                .filter(Boolean);

        console.log(
            "V11 routes loaded:",
            routes.length
        );
    }

    function getEdgeCost(
        route
    ) {

        const distanceKm =
            routePathDistanceKm(
                route.path
            );

        let cost =
            distanceKm;

        if (
            route.priority > 0
        ) {

            cost *= Math.max(
                0.75,
                1 -
                Math.min(
                    route.priority,
                    100
                ) / 1000
            );
        }

        const routeName =
            route.name.toLowerCase();

        if (
            route.type ===
                "main" ||
            route.type ===
                "shrine" ||
            route.type ===
                "mountain" ||
            routeName.includes(
                "gis実測"
            ) ||
            routeName.includes(
                "実測"
            )
        ) {

            cost *= 0.995;
        }

        return cost;
    }

    function buildGraph() {

        const graph =
            new Map();

        routes.forEach(
            function (route) {

                if (
                    !graph.has(
                        route.from
                    )
                ) {

                    graph.set(
                        route.from,
                        []
                    );
                }

                if (
                    !graph.has(
                        route.to
                    )
                ) {

                    graph.set(
                        route.to,
                        []
                    );
                }

                graph.get(
                    route.from
                ).push({

                    from:
                        route.from,

                    to:
                        route.to,

                    path:
                        route.path,

                    cost:
                        getEdgeCost(
                            route
                        ),

                    route:
                        route,

                    reversed:
                        false
                });

                graph.get(
                    route.to
                ).push({

                    from:
                        route.to,

                    to:
                        route.from,

                    path:
                        route.path
                            .slice()
                            .reverse(),

                    cost:
                        getEdgeCost(
                            route
                        ),

                    route:
                        route,

                    reversed:
                        true
                });
            }
        );

        return graph;
    }

    // ============================================================
    // 最適ルート探索
    // ============================================================

    function findGraphRoute(
        fromId,
        toId
    ) {

        const start =
            String(
                fromId
            );

        const goal =
            String(
                toId
            );

        if (
            start === goal
        ) {

            return {

                coordinates:
                    [],

                distanceKm:
                    0,

                legs:
                    []
            };
        }

        const graph =
            buildGraph();

        if (
            !graph.has(start) ||
            !graph.has(goal)
        ) {

            return null;
        }

        const distances =
            new Map();

        const previous =
            new Map();

        const visited =
            new Set();

        const queue = [];

        graph.forEach(
            function (
                _,
                node
            ) {

                distances.set(
                    node,
                    Infinity
                );
            }
        );

        distances.set(
            start,
            0
        );

        queue.push({

            node:
                start,

            distance:
                0
        });

        while (
            queue.length > 0
        ) {

            queue.sort(
                function (
                    a,
                    b
                ) {

                    return (
                        a.distance -
                        b.distance
                    );
                }
            );

            const current =
                queue.shift();

            if (!current) {
                break;
            }

            const node =
                current.node;

            if (
                visited.has(
                    node
                )
            ) {
                continue;
            }

            visited.add(
                node
            );

            if (
                node === goal
            ) {
                break;
            }

            const edges =
                graph.get(
                    node
                ) || [];

            edges.forEach(
                function (
                    edge
                ) {

                    if (
                        visited.has(
                            edge.to
                        )
                    ) {
                        return;
                    }

                    const nextDistance =
                        current.distance +
                        edge.cost;

                    if (
                        nextDistance <
                        (
                            distances.get(
                                edge.to
                            ) ??
                            Infinity
                        )
                    ) {

                        distances.set(
                            edge.to,
                            nextDistance
                        );

                        previous.set(
                            edge.to,
                            {

                                previousNode:
                                    node,

                                edge:
                                    edge
                            }
                        );

                        queue.push({

                            node:
                                edge.to,

                            distance:
                                nextDistance
                        });
                    }
                }
            );
        }

        if (
            !previous.has(
                goal
            )
        ) {
            return null;
        }

        const pathEdges = [];
        let cursor = goal;

        while (
            cursor !== start
        ) {

            const record =
                previous.get(
                    cursor
                );

            if (!record) {
                return null;
            }

            pathEdges.push(
                record.edge
            );

            cursor =
                record.previousNode;
        }

        pathEdges.reverse();

        const coordinates = [];
        let totalDistanceKm = 0;

        pathEdges.forEach(
            function (
                edge,
                index
            ) {

                const points =
                    edge.path.slice();

                if (
                    index > 0
                ) {
                    points.shift();
                }

                coordinates.push(
                    ...points
                );

                totalDistanceKm +=
                    routePathDistanceKm(
                        edge.path
                    );
            }
        );

        return {

            coordinates:
                coordinates,

            distanceKm:
                totalDistanceKm,

            legs:
                pathEdges
        };
    }

    // ============================================================
    // スポット検索
    // ============================================================

    function findSpotById(
        id
    ) {

        return (
            spots.find(
                function (spot) {

                    return (
                        String(
                            spot.id
                        ) ===
                        String(id)
                    );
                }
            ) ||
            null
        );
    }

    // ============================================================
    // 現在地から最寄りのroutes.json接続地点
    // ============================================================

    function findNearestGraphSpot(
        lat,
        lng
    ) {

        const connectedIds =
            new Set();

        routes.forEach(
            function (route) {

                connectedIds.add(
                    String(
                        route.from
                    )
                );

                connectedIds.add(
                    String(
                        route.to
                    )
                );
            }
        );

        let nearest = null;
        let nearestDistance =
            Infinity;

        connectedIds.forEach(
            function (id) {

                const spot =
                    findSpotById(
                        id
                    );

                if (!spot) {
                    return;
                }

                const meters =
                    map.distance(
                        [
                            lat,
                            lng
                        ],
                        [
                            spot.lat,
                            spot.lng
                        ]
                    );

                if (
                    meters <
                    nearestDistance
                ) {

                    nearestDistance =
                        meters;

                    nearest =
                        spot;
                }
            }
        );

        if (!nearest) {
            return null;
        }

        return {

            spot:
                nearest,

            distanceMeters:
                nearestDistance
        };
    }

    // ============================================================
    // OSRM
    // ============================================================

    async function getOSRMRoute(
        fromPoint,
        toPoint
    ) {

        const url =
            "https://router.project-osrm.org/route/v1/foot/" +
            `${fromPoint.lng},${fromPoint.lat};` +
            `${toPoint.lng},${toPoint.lat}` +
            "?overview=full&geometries=geojson";

        const response =
            await fetch(url);

        if (
            !response.ok
        ) {

            throw new Error(
                `OSRM API error: ${response.status}`
            );
        }

        const data =
            await response.json();

        if (
            data.code !== "Ok" ||
            !Array.isArray(
                data.routes
            ) ||
            data.routes.length === 0 ||
            !data.routes[0].geometry ||
            !Array.isArray(
                data.routes[0]
                    .geometry
                    .coordinates
            )
        ) {

            throw new Error(
                "徒歩ルートが見つかりませんでした。"
            );
        }

        return (
            data.routes[0]
                .geometry
                .coordinates
                .map(
                    function (coord) {

                        return [
                            Number(
                                coord[1]
                            ),
                            Number(
                                coord[0]
                            )
                        ];
                    }
                )
        );
    }

    // ============================================================
    // スポット間ルート
    // ============================================================

    async function getWalkingRoute(
        from,
        to
    ) {

        const graphRoute =
            findGraphRoute(
                from.id,
                to.id
            );

        if (
            graphRoute &&
            graphRoute.coordinates
                .length >= 2
        ) {

            return {

                coordinates:
                    graphRoute.coordinates,

                source:
                    "routes.json",

                legs:
                    graphRoute.legs
            };
        }

        const osrmCoordinates =
            await getOSRMRoute(
                {
                    lat:
                        Number(
                            from.lat
                        ),

                    lng:
                        Number(
                            from.lng
                        )
                },
                {
                    lat:
                        Number(
                            to.lat
                        ),

                    lng:
                        Number(
                            to.lng
                        )
                }
            );

        return {

            coordinates:
                osrmCoordinates,

            source:
                "OSRM",

            legs:
                []
        };
    }

    // ============================================================
    // 現在地→目的地
    // ============================================================

    async function getLocationToSpotRoute(
        location,
        target
    ) {

        const nearest =
            findNearestGraphSpot(
                location.lat,
                location.lng
            );

        if (
            nearest &&
            nearest.distanceMeters <=
                800
        ) {

            const graphRoute =
                findGraphRoute(
                    nearest.spot.id,
                    target.id
                );

            if (
                graphRoute &&
                graphRoute.coordinates
                    .length >= 2
            ) {

                let approach = [];

                try {

                    approach =
                        await getOSRMRoute(
                            {
                                lat:
                                    location.lat,

                                lng:
                                    location.lng
                            },
                            {
                                lat:
                                    nearest.spot.lat,

                                lng:
                                    nearest.spot.lng
                            }
                        );

                } catch (error) {

                    console.warn(
                        "現在地→routes.json接続地点のOSRMに失敗しました。",
                        error
                    );
                }

                const combined =
                    approach.length > 0
                        ? approach.slice()
                        : [
                            [
                                location.lat,
                                location.lng
                            ]
                        ];

                if (
                    combined.length >
                    0
                ) {

                    const firstRoutePoint =
                        graphRoute
                            .coordinates[0];

                    const lastApproachPoint =
                        combined[
                            combined.length - 1
                        ];

                    if (
                        !lastApproachPoint ||
                        map.distance(
                            lastApproachPoint,
                            firstRoutePoint
                        ) > 1
                    ) {

                        combined.push(
                            firstRoutePoint
                        );
                    }
                }

                combined.push(
                    ...graphRoute
                        .coordinates
                        .slice(1)
                );

                return {

                    coordinates:
                        combined,

                    source:
                        "HYBRID",

                    legs:
                        graphRoute.legs
                };
            }
        }

        const direct =
            await getOSRMRoute(
                {
                    lat:
                        location.lat,

                    lng:
                        location.lng
                },
                {
                    lat:
                        target.lat,

                    lng:
                        target.lng
                }
            );

        return {

            coordinates:
                direct,

            source:
                "OSRM",

            legs:
                []
        };
    }

    // ============================================================
    // 距離計算
    // ============================================================

    function calculateDistance(
        points
    ) {

        let totalMeters = 0;

        for (
            let i = 0;
            i < points.length - 1;
            i++
        ) {

            totalMeters +=
                map.distance(
                    points[i],
                    points[i + 1]
                );
        }

        return (
            totalMeters /
            1000
        );
    }

    // ============================================================
    // ルート番号
    // ============================================================

    function clearRouteNumberMarkers() {

        routeNumberMarkers.forEach(
            function (marker) {

                map.removeLayer(
                    marker
                );
            }
        );

        routeNumberMarkers = [];
    }

    function createRouteNumberIcon(
        number
    ) {

        return L.divIcon({

            className:
                "planner-v11-route-number-icon",

            html: `
                <div
                    class="planner-v11-route-badge"
                >
                    ${escapeHTML(
                        number
                    )}
                </div>
            `,

            iconSize: [
                28,
                28
            ],

            iconAnchor: [
                14,
                14
            ],

            pane:
                "plannerNumberPane"
        });
    }

    function renderRouteNumberMarkers() {

        clearRouteNumberMarkers();

        selectedSpots.forEach(
            function (
                spot,
                index
            ) {

                const marker =
                    L.marker(
                        [
                            spot.lat,
                            spot.lng
                        ],
                        {

                            icon:
                                createRouteNumberIcon(
                                    index + 1
                                ),

                            interactive:
                                false,

                            keyboard:
                                false,

                            zIndexOffset:
                                3000,

                            pane:
                                "plannerNumberPane"
                        }
                    );

                marker.addTo(
                    map
                );

                routeNumberMarkers.push(
                    marker
                );
            }
        );
    }

    // ============================================================
    // ナビパネル
    // ============================================================

    function showNavCard() {

        if (navCard) {

            navCard.classList.remove(
                "is-hidden"
            );
        }
    }

    function hideNavCard() {

        if (navCard) {

            navCard.classList.add(
                "is-hidden"
            );
        }
    }

    function setNavMeta(
        items
    ) {

        if (!navMeta) {
            return;
        }

        navMeta.innerHTML =
            items.map(
                function (item) {

                    return `
                        <span
                            class="planner-v11-nav-chip"
                        >
                            ${escapeHTML(
                                item
                            )}
                        </span>
                    `;
                }
            ).join("");
    }

    function updateNavPanelForRoute() {

        if (
            !selectedSpots.length ||
            (!routeLine && !navigationActive)
        ) {

            hideNavCard();
            return;
        }

        showNavCard();

        if (navTitle) {

            navTitle.textContent =
                "現在地からルートを開始できます";
        }

        if (navStatus) {

            navStatus.textContent =
                `全${selectedSpots.length}か所`;
        }

        setNavMeta(
            [
                `${selectedSpots.length}スポット`,

                currentLocation
                    ? "現在地あり"
                    : "現在地を取得してください"
            ]
        );

        if (navArrival) {

            navArrival.style.display =
                "none";

            navArrival.textContent =
                "";
        }
    }

    function updateRoutePreviewState() {

        renderRouteNumberMarkers();

        if (
            !navigationActive
        ) {

            updateNavPanelForRoute();
        }
    }

    // ============================================================
    // ルート作成
    // ============================================================

    async function ensureCurrentLocation() {

        if (
            currentLocation
        ) {
            return currentLocation;
        }

        if (
            !navigator.geolocation
        ) {

            throw new Error(
                "このブラウザでは現在地機能を利用できません。"
            );
        }

        return new Promise(
            function (
                resolve,
                reject
            ) {

                navigator.geolocation.getCurrentPosition(

                    function (
                        position
                    ) {

                        const value =
                            {

                                lat:
                                    position.coords.latitude,

                                lng:
                                    position.coords.longitude,

                                accuracy:
                                    Number(
                                        position.coords.accuracy ||
                                        0
                                    )
                            };

                        setCurrentLocation(
                            value
                        );

                        resolve(
                            value
                        );
                    },

                    function (error) {

                        reject(
                            error
                        );
                    },

                    {

                        enableHighAccuracy:
                            true,

                        timeout:
                            12000,

                        maximumAge:
                            30000
                    }
                );
            }
        );
    }

    // V66: animate only a short local light along the route. The route's base
    // geometry never changes. getPointAtLength() samples the rendered SVG path,
    // so each light follows real curves and turns rather than cutting corners.
    function stopRouteRunnerAnimation() {
        if (routeRunnerAnimationFrame !== null) {
            window.cancelAnimationFrame(routeRunnerAnimationFrame);
            routeRunnerAnimationFrame = null;
        }
        routeRunnerAnimationStartTime = null;
        routeRunnerLastBasePathD = "";
        routeRunnerPathLength = 0;
    }

    function buildRouteRunnerSlice(sourcePath, headDistance, tailLength, totalLength, sampleStep) {
        const startDistance = Math.max(0, headDistance - tailLength);
        const endDistance = Math.min(totalLength, headDistance);
        if (!(endDistance > startDistance)) return "";

        const distances = [startDistance];
        for (let distance = startDistance + sampleStep; distance < endDistance; distance += sampleStep) {
            distances.push(distance);
        }
        distances.push(endDistance);

        const commands = [];
        for (let index = 0; index < distances.length; index++) {
            const point = sourcePath.getPointAtLength(distances[index]);
            const x = Number(point.x.toFixed(2));
            const y = Number(point.y.toFixed(2));
            commands.push(`${index === 0 ? "M" : "L"} ${x} ${y}`);
        }
        return commands.join(" ");
    }

    function startRouteRunnerAnimation() {
        stopRouteRunnerAnimation();
        if (!ROUTE_RUNNER_CONFIG.enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            if (routeRunnerTrailLine && routeRunnerTrailLine._path) routeRunnerTrailLine._path.setAttribute("d", "");
            if (routeRunnerCoreLine && routeRunnerCoreLine._path) routeRunnerCoreLine._path.setAttribute("d", "");
            return;
        }

        const animate = function (timestamp) {
            const sourcePath = routeLine && routeLine._path;
            const trailPath = routeRunnerTrailLine && routeRunnerTrailLine._path;
            const corePath = routeRunnerCoreLine && routeRunnerCoreLine._path;

            if (!sourcePath || !trailPath || !corePath || typeof sourcePath.getPointAtLength !== "function") {
                routeRunnerAnimationFrame = window.requestAnimationFrame(animate);
                return;
            }

            const basePathD = sourcePath.getAttribute("d") || "";
            if (basePathD !== routeRunnerLastBasePathD || !(routeRunnerPathLength > 0)) {
                routeRunnerLastBasePathD = basePathD;
                try {
                    routeRunnerPathLength = sourcePath.getTotalLength();
                } catch (error) {
                    routeRunnerPathLength = 0;
                }
            }

            if (!(routeRunnerPathLength > 1)) {
                routeRunnerAnimationFrame = window.requestAnimationFrame(animate);
                return;
            }

            if (routeRunnerAnimationStartTime === null) {
                routeRunnerAnimationStartTime = timestamp;
            }

            const trailLength = Math.max(8, ROUTE_RUNNER_CONFIG.trailLength);
            const coreLength = Math.max(5, Math.min(ROUTE_RUNNER_CONFIG.coreLength, trailLength));
            const cycleLength = routeRunnerPathLength + trailLength;
            const elapsedSeconds = Math.max(0, timestamp - routeRunnerAnimationStartTime) / 1000;
            const distanceTravelled = elapsedSeconds * Math.max(1, ROUTE_RUNNER_CONFIG.speedPxPerSecond);
            const lightCount = Math.max(1, Math.floor(ROUTE_RUNNER_CONFIG.lightCount));
            const trailSlices = [];
            const coreSlices = [];

            for (let index = 0; index < lightCount; index++) {
                const cycleDistance = (distanceTravelled + index * cycleLength / lightCount) % cycleLength;
                // The light enters from just before the route start and exits just
                // after its end, preventing a visible jump while the tail is on-screen.
                const headDistance = cycleDistance - trailLength;
                const trailD = buildRouteRunnerSlice(
                    sourcePath,
                    headDistance,
                    trailLength,
                    routeRunnerPathLength,
                    ROUTE_RUNNER_CONFIG.trailSampleStep
                );
                const coreD = buildRouteRunnerSlice(
                    sourcePath,
                    headDistance,
                    coreLength,
                    routeRunnerPathLength,
                    ROUTE_RUNNER_CONFIG.coreSampleStep
                );
                if (trailD) trailSlices.push(trailD);
                if (coreD) coreSlices.push(coreD);
            }

            // These are short sub-paths, not a moving full route and not a full-line glow.
            trailPath.setAttribute("d", trailSlices.join(" "));
            corePath.setAttribute("d", coreSlices.join(" "));
            routeRunnerAnimationFrame = window.requestAnimationFrame(animate);
        };

        routeRunnerAnimationFrame = window.requestAnimationFrame(animate);
    }

    async function createRoute(routeOptions = null) {

        // When launched from a spot detail, that spot is the sole destination.
        // A chosen origin is kept separate from the destination list.
        if (routeOptions?.destinationSpot) {
            setSpotAsSingleDestination(routeOptions.destinationSpot);
        }

        if (selectedSpots.length === 0) {
            alert("まずスポットを1か所以上選択してください。");
            return;
        }

        const explicitOriginMode = routeOptions?.originMode || null;
        const explicitStartSpot = explicitOriginMode === "spot" ? routeOptions?.startSpot || null : null;
        if (explicitOriginMode === "spot" && !explicitStartSpot) {
            alert(routeSetupText("selectStartError"));
            return;
        }

        stopRouteRunnerAnimation();
        if (routeRunnerCoreLine) {
            map.removeLayer(routeRunnerCoreLine);
            routeRunnerCoreLine = null;
        }
        if (routeLine) {
            map.removeLayer(routeLine);
            routeLine = null;
        }
        if (routeOutlineLine) {
            map.removeLayer(routeOutlineLine);
            routeOutlineLine = null;
        }
        if (routeRunnerTrailLine) {
            map.removeLayer(routeRunnerTrailLine);
            routeRunnerTrailLine = null;
        }
        clearRouteNumberMarkers();

        routeSegments = [];

        let startLocation = null;

        if (explicitOriginMode === "current") {
            try {
                startLocation = await ensureCurrentLocation();
            } catch (error) {
                console.warn("現在地を取得できませんでした。", error);
                alert(routeSetupText("noOrigin"));
                return;
            }
        } else if (!explicitOriginMode) {
            try {
                startLocation = await ensureCurrentLocation();
            } catch (error) {
                console.warn("現在地を取得できませんでした。選択スポット同士のルートを作成します。", error);
            }
        }

        const allCoordinates = [];
        const legs = [];

        try {
            if (explicitStartSpot) {
                const firstTarget = selectedSpots[0];
                const firstRoute = await getWalkingRoute(explicitStartSpot, firstTarget);
                if (!firstRoute || !Array.isArray(firstRoute.coordinates) || firstRoute.coordinates.length < 2) {
                    throw new Error("出発スポットから到着地への徒歩ルートが空です。");
                }
                routeSegments.push(firstRoute);
                legs.push({
                    from: explicitStartSpot,
                    to: firstTarget,
                    coordinates: firstRoute.coordinates,
                    source: firstRoute.source
                });
                allCoordinates.push(...firstRoute.coordinates);
            } else if (startLocation) {

                const firstTarget =
                    selectedSpots[0];

                const firstRoute =
                    await getLocationToSpotRoute(
                        startLocation,
                        firstTarget
                    );

                if (
                    firstRoute.coordinates
                        .length < 2
                ) {

                    throw new Error(
                        "現在地から最初のスポットへのルートが空です。"
                    );
                }

                routeSegments.push(
                    firstRoute
                );

                legs.push(

                    {

                        from:
                            {

                                lat:
                                    startLocation.lat,

                                lng:
                                    startLocation.lng,

                                name:
                                    "現在地"
                            },

                        to:
                            firstTarget,

                        coordinates:
                            firstRoute
                                .coordinates,

                        source:
                            firstRoute.source
                    }
                );

                allCoordinates.push(
                    ...firstRoute.coordinates
                );
            }

            for (
                let i = 0;
                i <
                    selectedSpots.length - 1;
                i++
            ) {

                const from =
                    selectedSpots[i];

                const to =
                    selectedSpots[
                        i + 1
                    ];

                const route =
                    await getWalkingRoute(
                        from,
                        to
                    );

                if (
                    !route ||
                    route.coordinates
                        .length < 2
                ) {

                    throw new Error(
                        `${from.id} → ${to.id} のルートが取得できませんでした。`
                    );
                }

                routeSegments.push(
                    route
                );

                legs.push(

                    {

                        from:
                            from,

                        to:
                            to,

                        coordinates:
                            route.coordinates,

                        source:
                            route.source
                    }
                );

                const points =
                    route.coordinates
                        .slice();

                if (
                    allCoordinates.length >
                    0
                ) {

                    points.shift();
                }

                allCoordinates.push(
                    ...points
                );
            }

        } catch (error) {

            console.error(
                "V11ルート取得エラー:",
                error
            );

            alert(
                "徒歩ルートを取得できませんでした。\n" +
                "routes.json / OSRM の接続を確認してください。"
            );

            return;
        }

        if (
            allCoordinates.length <
            2
        ) {

            alert(
                "ルートを作成できませんでした。"
            );

            return;
        }

        // V66: keep the route completely static. A short white streak alone moves
        // along the exact SVG route geometry; no whole-line glow or pulsing is used.
        routeOutlineLine = L.polyline(allCoordinates, {
            pane: "plannerRoutePane",
            renderer: routeSvgRenderer,
            className: "planner-route-outline-line",
            color: "#FFFFFF",
            weight: 12,
            opacity: 0.96,
            lineCap: "round",
            lineJoin: "round",
            interactive: false
        }).addTo(map);

        routeLine = L.polyline(allCoordinates, {
            pane: "plannerRoutePane",
            renderer: routeSvgRenderer,
            className: "planner-route-base-line",
            color: ROUTE_COLOR,
            weight: 6,
            opacity: 0.98,
            lineCap: "round",
            lineJoin: "round",
            interactive: false
        }).addTo(map);

        // These two layers are used only as a local light tail and bright center.
        // Their SVG path data is replaced every frame with a short sampled section
        // from the real route path, so the light remains on bends and corners.
        routeRunnerTrailLine = L.polyline(allCoordinates, {
            pane: "plannerRoutePane",
            renderer: routeSvgRenderer,
            className: "planner-route-runner-trail",
            color: "#FFF8E8",
            weight: ROUTE_RUNNER_CONFIG.trailWidth,
            opacity: 0.8,
            lineCap: "round",
            lineJoin: "round",
            interactive: false
        }).addTo(map);

        routeRunnerCoreLine = L.polyline(allCoordinates, {
            pane: "plannerRoutePane",
            renderer: routeSvgRenderer,
            className: "planner-route-runner-core",
            color: "#FFFFFF",
            weight: ROUTE_RUNNER_CONFIG.coreWidth,
            opacity: 1,
            lineCap: "round",
            lineJoin: "round",
            interactive: false
        }).addTo(map);

        startRouteRunnerAnimation();

        map.fitBounds(
            routeLine.getBounds(),
            {
                padding:
                    [
                        40,
                        40
                    ]
            }
        );

        renderRouteNumberMarkers();

        const routeDistance =
            calculateDistance(
                allCoordinates
            );

        if (distance) {

            distance.textContent =
                `${routeDistance.toFixed(2)} km`;
        }

        const walkingMinutes =
            Math.ceil(
                routeDistance *
                1000 /
                80
            );

        if (walkTime) {

            walkTime.textContent =
                formatTime(
                    walkingMinutes
                );
        }

        navigationLegs =
            legs;

        navigationLegIndex =
            0;

        showNavCard();

        if (navStatus) {

            navStatus.textContent = explicitStartSpot
                ? `${getLocalizedValue(explicitStartSpot.name)}から作成`
                : startLocation
                    ? "現在地から作成"
                    : "ルート作成完了";
        }

        if (navTitle) {

            navTitle.textContent =
                `次の目的地：${getLocalizedValue(
                    selectedSpots[0].name
                )}`;
        }

        setNavMeta(
            [
                `${selectedSpots.length}スポット`,

                `${routeDistance.toFixed(2)} km`,

                formatTime(
                    walkingMinutes
                )
            ]
        );

        if (navArrival) {

            navArrival.style.display =
                "none";

            navArrival.textContent =
                "";
        }

        updateNavigationPanel();

        if (routeOptions?.destinationSpot) {
            hideSpotDetail();
        }
        // After any route is built, collapse the category/list drawer.
        setFoodCategorySwitcherOpen(false);
        setPlannerSheetState("collapsed");
    }

    if (createRouteBtn) {
        createRouteBtn.addEventListener("click", function (event) {
            event.preventDefault();
            setFoodCategorySwitcherOpen(false);
            setPlannerSheetState("collapsed");
            createRoute();
        });
    }

    // Route direction arrows and moving light are temporarily disabled; keep the route line static.

    // ============================================================
    // ナビ開始
    // ============================================================

    function startNavigation() {

        if (
            selectedSpots.length ===
            0
        ) {

            alert(
                "先にスポットを選択してルートを作成してください。"
            );

            return;
        }

        if (
            navigationActive
        ) {
            return;
        }

        if (
            !navigator.geolocation
        ) {

            alert(
                "このブラウザでは現在地ナビを利用できません。"
            );

            return;
        }

        navigationActive =
            true;

        setPlannerSheetState("collapsed");

        navigationLegIndex =
            0;

        showNavCard();

        if (navStatus) {

            navStatus.textContent =
                "ナビ中";
        }

        if (navStartButton) {

            navStartButton.textContent =
                "ナビゲーション中";

            navStartButton.disabled =
                true;

            navStartButton.style.opacity =
                ".65";
        }

        if (navStopButton) {

            navStopButton.disabled =
                false;
        }

        navigationWatchId =
            navigator.geolocation.watchPosition(

                function (position) {

                    const value =
                        {

                            lat:
                                position.coords.latitude,

                            lng:
                                position.coords.longitude,

                            accuracy:
                                Number(
                                    position.coords.accuracy ||
                                    0
                                )
                        };

                    setCurrentLocation(
                        value,
                        false
                    );

                    updateNavigationByLocation(
                        value
                    );
                },

                function (error) {

                    console.error(
                        "ナビ位置情報エラー:",
                        error
                    );

                    if (navStatus) {

                        navStatus.textContent =
                            "位置情報エラー";
                    }
                },

                {

                    enableHighAccuracy:
                        true,

                    timeout:
                        12000,

                    maximumAge:
                        5000
                }
            );
    }

    function clearRouteVisuals() {

        stopRouteRunnerAnimation();

        if (routeRunnerCoreLine) {
            try {
                map.removeLayer(routeRunnerCoreLine);
            } catch (error) {
                console.warn("routeRunnerCoreLine cleanup warning:", error);
            }
            routeRunnerCoreLine = null;
        }

        if (routeLine) {
            try {
                map.removeLayer(routeLine);
            } catch (error) {
                console.warn("routeLine cleanup warning:", error);
            }
            routeLine = null;
        }

        if (routeOutlineLine) {
            try {
                map.removeLayer(routeOutlineLine);
            } catch (error) {
                console.warn("routeOutlineLine cleanup warning:", error);
            }
            routeOutlineLine = null;
        }

        if (routeRunnerTrailLine) {
            try {
                map.removeLayer(routeRunnerTrailLine);
            } catch (error) {
                console.warn("routeRunnerTrailLine cleanup warning:", error);
            }
            routeRunnerTrailLine = null;
        }

        clearRouteNumberMarkers();
        routeSegments = [];
    }

    function stopNavigation() {

        navigationActive = false;

        if (navigationWatchId !== null) {
            try {
                navigator.geolocation.clearWatch(navigationWatchId);
            } catch (error) {
                console.warn("navigation watch cleanup warning:", error);
            }
            navigationWatchId = null;
        }

        navigationLegs = [];
        navigationLegIndex = 0;

        clearRouteVisuals();
        hideNavCard();

        if (navStartButton) {
            navStartButton.disabled = false;
            navStartButton.style.opacity = "";
            navStartButton.textContent = "現在地からナビ開始";
        }

        if (navStopButton) {
            navStopButton.disabled = true;
        }

        if (navStatus) {
            navStatus.textContent = "ナビ終了";
        }

        if (navTitle) {
            navTitle.textContent = "ナビゲーションを終了しました";
        }

        if (navMeta) {
            navMeta.innerHTML = "";
        }

        if (navArrival) {
            navArrival.style.display = "none";
            navArrival.innerHTML = "";
        }

        if (distance) {
            distance.textContent = "0 km";
        }

        if (walkTime) {
            walkTime.textContent = "0分";
        }

        if (typeof map?.invalidateSize === "function") {
            window.requestAnimationFrame(function () {
                map.invalidateSize({ pan: false });
            });
        }

        // 「ナビ終了」は案内を完全に終了したあと、
        // そのままアンケートページへ進む。
        openGoogleForm();
    }

    function updateNavigationPanel() {

        if (
            !navigationLegs.length
        ) {

            updateNavPanelForRoute();
            return;
        }

        const leg =
            navigationLegs[
                Math.min(
                    navigationLegIndex,
                    navigationLegs.length - 1
                )
            ];

        if (!leg) {
            return;
        }

        if (navTitle) {

            navTitle.textContent =
                `次の目的地：${getLocalizedValue(
                    leg.to.name
                )}`;
        }

        if (navStatus) {

            navStatus.textContent =
                navigationActive
                    ? "ナビ中"
                    : `次 ${navigationLegIndex + 1}/${navigationLegs.length}`;
        }

        const legDistance =
            calculateDistance(
                leg.coordinates
            );

        const minutes =
            Math.ceil(
                legDistance *
                1000 /
                80
            );

        setNavMeta(
            [
                `${legDistance.toFixed(2)} km`,

                formatTime(
                    minutes
                ),

                leg.source ===
                    "routes.json"
                    ? "参道・山道"

                    : leg.source ===
                        "HYBRID"

                        ? "道路＋参道"

                        : "一般道路"
            ]
        );
    }

    function updateNavigationByLocation(
        location
    ) {

        if (
            !navigationActive
        ) {
            return;
        }

        const leg =
            navigationLegs[
                navigationLegIndex
            ];

        if (!leg) {

            completeNavigation();
            return;
        }

        const targetLat =
            Number(
                leg.to.lat
            );

        const targetLng =
            Number(
                leg.to.lng
            );

        const remainingToTarget =
            map.distance(
                [
                    location.lat,
                    location.lng
                ],
                [
                    targetLat,
                    targetLng
                ]
            );

        const progress =
            getRemainingRouteDistance(
                location,
                leg.coordinates
            );

        const remainingMeters =
            Math.max(
                0,
                progress > 0
                    ? progress
                    : remainingToTarget
            );

        if (navTitle) {

            navTitle.textContent =
                `次の目的地：${getLocalizedValue(
                    leg.to.name
                )}`;
        }

        if (navStatus) {

            navStatus.textContent =
                `ナビ中 · 残り ${Math.round(
                    remainingMeters
                )} m`;
        }

        const remainingMinutes =
            Math.ceil(
                remainingMeters /
                80
            );

        setNavMeta(
            [
                `${Math.round(
                    remainingMeters
                )} m`,

                formatTime(
                    remainingMinutes
                ),

                `${navigationLegIndex + 1}/${navigationLegs.length}`
            ]
        );

        if (
            remainingToTarget <= 35
        ) {

            navigationLegIndex += 1;

            if (
                navigationLegIndex >=
                navigationLegs.length
            ) {

                completeNavigation();
                return;
            }

            updateNavigationPanel();
        }
    }

    function getRemainingRouteDistance(
        location,
        points
    ) {

        if (
            !Array.isArray(points) ||
            points.length < 2
        ) {
            return 0;
        }

        let nearestIndex =
            0;

        let nearestDistance =
            Infinity;

        for (
            let i = 0;
            i < points.length;
            i++
        ) {

            const meters =
                map.distance(
                    [
                        location.lat,
                        location.lng
                    ],
                    points[i]
                );

            if (
                meters <
                nearestDistance
            ) {

                nearestDistance =
                    meters;

                nearestIndex =
                    i;
            }
        }

        let totalMeters =
            nearestDistance;

        for (
            let i = nearestIndex;
            i < points.length - 1;
            i++
        ) {

            totalMeters +=
                map.distance(
                    points[i],
                    points[i + 1]
                );
        }

        return totalMeters;
    }

    function completeNavigation() {

        navigationActive =
            false;

        if (
            navigationWatchId !==
            null
        ) {

            navigator.geolocation.clearWatch(
                navigationWatchId
            );

            navigationWatchId =
                null;
        }

        if (navStatus) {

            navStatus.textContent =
                "到着";
        }

        if (navTitle) {

            navTitle.textContent =
                "ルート完了";
        }

        if (navArrival) {

            navArrival.style.display =
                "block";

            if (
                GOOGLE_FORM_URL
            ) {

                navArrival.innerHTML = `

                    到着しました！<br>

                    旅の感想をアンケートで教えてください。

                    <br>

                    <button
                        type="button"
                        class="planner-v11-button primary"
                        id="plannerV11SurveyButton"
                        style="margin-top:8px;"
                    >
                        アンケートへ
                    </button>
                `;

                const surveyButton =
                    document.getElementById(
                        "plannerV11SurveyButton"
                    );

                if (surveyButton) {

                    surveyButton.addEventListener(
                        "click",
                        function () {

                            openGoogleForm();
                        }
                    );
                }

            } else {

                navArrival.textContent =
                    "到着しました！ GoogleフォームのURLを設定すると、ここからアンケートへ進めます。";
            }
        }

        if (navStartButton) {

            navStartButton.disabled =
                false;

            navStartButton.style.opacity =
                "";

            navStartButton.textContent =
                "もう一度ナビ開始";
        }
    }

    if (navStartButton) {

        navStartButton.addEventListener(
            "click",
            async function () {

                if (
                    !routeLine
                ) {

                    try {

                        await createRoute();

                    } catch (error) {

                        console.error(
                            error
                        );

                        return;
                    }
                }

                startNavigation();
            }
        );
    }

    if (navStopButton) {

        navStopButton.addEventListener(
            "click",
            function () {

                stopNavigation();
            }
        );
    }

    // ============================================================
    // 現在地
    // ============================================================

    function setCurrentLocation(
        value,
        centerMap = true
    ) {

        currentLocation =
            value;

        if (
            currentLocationMarker
        ) {

            map.removeLayer(
                currentLocationMarker
            );
        }

        currentLocationMarker =
            L.marker(
                [
                    value.lat,
                    value.lng
                ],
                {

                    pane:
                        "plannerCurrentPane",

                    interactive:
                        true,

                    keyboard:
                        false,

                    icon:
                        L.divIcon(
                            {

                                className:
                                    "planner-v11-current-location-icon",

                                html:
                                    `
                                        <div
                                            class="planner-v11-current-location"
                                        ></div>
                                    `,

                                iconSize:
                                    [
                                        20,
                                        20
                                    ],

                                iconAnchor:
                                    [
                                        10,
                                        10
                                    ]
                            }
                        ),

                    zIndexOffset:
                        5000
                }
            )
            .addTo(
                map
            )
            .bindPopup(
                `現在地${
                    value.accuracy
                        ? `（精度 約${Math.round(
                            value.accuracy
                        )}m）`
                        : ""
                }`
            );

        if (
            centerMap
        ) {

            map.setView(
                [
                    value.lat,
                    value.lng
                ],
                18,
                {
                    animate:
                        true
                }
            );
        }

        updateNavPanelForRoute();
    }

    if (locationBtn) {

        locationBtn.addEventListener(
            "click",
            async function () {

                try {

                    const location =
                        await ensureCurrentLocation();

                    map.setView(
                        [
                            location.lat,
                            location.lng
                        ],
                        18,
                        {
                            animate:
                                true
                        }
                    );

                    if (
                        currentLocationMarker
                    ) {

                        currentLocationMarker.openPopup();
                    }

                } catch (error) {

                    console.error(
                        "現在地取得エラー:",
                        error
                    );

                    alert(
                        "現在地を取得できませんでした。\n" +
                        "ブラウザの位置情報許可を確認してください。"
                    );
                }
            }
        );
    }

    // ============================================================
    // 情報表示
    // ============================================================

    function updateInfo() {

        if (spotCount) {

            const language =
                getCurrentLanguage();

            if (
                language === "en"
            ) {

                spotCount.textContent =
                    `${selectedSpots.length} spots`;

            } else if (
                language === "zh"
            ) {

                spotCount.textContent =
                    `${selectedSpots.length}个景点`;

            } else if (
                language === "ko"
            ) {

                spotCount.textContent =
                    `${selectedSpots.length}곳`;

            } else {

                spotCount.textContent =
                    `${selectedSpots.length}か所`;
            }
        }

        let totalStay = 0;

        selectedSpots.forEach(
            function (spot) {

                totalStay +=
                    getTimeInMinutes(
                        spot.time
                    );
            }
        );

        if (stayTime) {

            stayTime.textContent =
                formatTime(
                    totalStay
                );
        }

        if (
            selectedSpots.length <
            2
        ) {

            if (distance) {
                distance.textContent =
                    "0 km";
            }

            if (walkTime) {
                walkTime.textContent =
                    "0分";
            }
        }
    }

    // ============================================================
    // 保存
    // ============================================================

    if (saveRouteBtn) {

        saveRouteBtn.addEventListener(
            "click",
            function () {

                if (
                    selectedSpots.length <
                    1
                ) {

                    alert(
                        "保存するには1か所以上のスポットを選択してください。"
                    );

                    return;
                }

                const routeData = {

                    createdAt:
                        new Date()
                            .toISOString(),

                    spots:
                        selectedSpots.map(
                            function (spot) {
                                return spot.id;
                            }
                        )
                };

                localStorage.setItem(
                    SAVED_ROUTE_KEY,
                    JSON.stringify(
                        routeData
                    )
                );

                alert(
                    "ルートを保存しました！"
                );
            }
        );
    }

    // ============================================================
    // 消去
    // ============================================================

    if (clearBtn) {

        clearBtn.addEventListener(
            "click",
            function () {

                stopNavigation();

                selectedSpots = [];
                saveSelectedIDs();

                updateSelected();
                updateInfo();
                updateCardSelection();

                if (distance) {
                    distance.textContent = "0 km";
                }

                if (walkTime) {
                    walkTime.textContent = "0分";
                }

                markerMap.forEach(function (marker, id) {
                    const spot = spots.find(function (item) {
                        return String(item.id) === String(id);
                    });

                    if (spot) {
                        marker.setIcon(
                            createMarkerIcon(spot, false)
                        );
                    }
                });

                hideNavCard();
                setPlannerSheetState("collapsed");
            }
        );
    }

    // ============================================================
    // JSONロード
    // ============================================================

    async function initializePlannerData() {

        const results = await Promise.allSettled([
            loadJSON([DATA_URL]),
            loadJSON(ROUTE_URLS)
        ]);

        const spotResult = results[0];
        const routeResult = results[1];

        if (spotResult.status !== "fulfilled") {
            throw spotResult.reason ||
                new Error("spots.jsonを読み込めませんでした。");
        }

        if (!Array.isArray(spotResult.value.data)) {
            throw new Error("spots.jsonの形式が正しくありません。");
        }

        spots = spotResult.value.data;

        if (routeResult.status === "fulfilled" &&
            Array.isArray(routeResult.value.data)) {

            routes = routeResult.value.data;

            console.log(
                "routes source:",
                routeResult.value.path,
                "routes:",
                routes.length
            );

        } else {

            routes = [];

            console.warn(
                "routes.jsonを読み込めませんでした。スポット表示は継続します。",
                routeResult.reason
            );
        }

        const savedIDs = loadSelectedIDs();

        selectedSpots = savedIDs
            .map(function (id) {
                return spots.find(function (spot) {
                    return String(spot.id) === String(id);
                });
            })
            .filter(Boolean);

        // 初回起動時は必ず「すべて」を標準状態にする。
        const allButton =
            document.querySelector('.category[data-category="all"]');

        categoryButtons.forEach(function (button) {
            button.classList.remove("active");
        });
        activeCategoryFilter = "all";
        activeFoodFilter = "all";
        foodCategoryTrigger?.classList.remove("active");
        setFoodCategorySwitcherOpen(false);

        if (allButton) {
            allButton.classList.add("active");
        }

        // spots.jsonを先に画面へ反映。routes.jsonの不備でスポット表示を止めない。
        updateSpotResultCount(spots.length);
        displaySpots(spots);
        createMarkers(spots);
        updateSelected();
        updateInfo();

        if (routes.length) {
            prepareRouteGraph();
        }

        updateRoutePreviewState();
        updatePlannerSheetSummary();
        openSharedSpotFromUrl();

        console.log(
            "planner initialized:",
            spots.length,
            "spots /",
            routes.length,
            "routes"
        );
    }

    initializePlannerData().catch(function (error) {

        console.error(
            "planner初期化エラー:",
            error
        );

        updateSpotResultCount(0);

        if (spotList) {
            spotList.innerHTML = `
                <div class="planner-data-error">
                    <strong>スポットデータを読み込めませんでした。</strong>
                    <br>
                    Live Serverで開いているか、
                    <code>data/spots.json</code> を確認してください。
                    <br>
                    F12 → Console に詳細なエラーを表示しています。
                </div>
            `;
        }
    });

    // ============================================================
    // language.js 連動
    // ============================================================

    window.addEventListener(
        "languagechange",
        function () {

            const visibleSpots =
                getCurrentlyVisibleSpots();

            updateSpotResultCount(visibleSpots.length);

            displaySpots(
                visibleSpots
            );

            createMarkers(
                visibleSpots
            );

            updateSelected();

            updateInfo();
            updatePlannerSheetSummary();

            renderRouteNumberMarkers();

            if (
                navCard &&
                !navCard.classList.contains(
                    "is-hidden"
                )
            ) {

                updateNavigationPanel();
            }
        }
    );

    function getCurrentlyVisibleSpots() {
        return getFilteredSpotsForCurrentState();
    }

    // ============================================================
    // 初期更新
    // ============================================================

    updateInfo();

});