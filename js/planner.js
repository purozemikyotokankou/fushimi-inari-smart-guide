document.addEventListener("DOMContentLoaded", function () {

    // ============================================================
    // BUILD MARKER — V11.2
    // この文字列がConsoleに出れば、このplanner.jsが実行されています。
    // ============================================================
    window.__FUSHIMI_PLANNER_BUILD__ = "V21-PLATINUM-INSPIRED-GSI";
    console.log("[Fushimi Inari Smart Guide] planner.js V21-PLATINUM-INSPIRED-GSI loaded");

    // ============================================================
    // 伏見稲荷スマートガイド / planner.js V11 ALL-IN-ONE
    //
    // V11 additions
    // ① 現在地を出発地点として利用
    // ② Liquid Glass UIをJSから追加
    // ③ GSI地図をモノクロ表示
    // ④ ルート線を #e94709
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

    // 写真ファイルが未配置でもスポット一覧・地図が停止しないようにする。
    // 写真を追加したあと true に変更すれば画像表示を有効化できる。
    const ENABLE_PHOTOS = false;

    // Google Form URL
    // planner.html の body に
    // data-google-form-url="https://docs.google.com/forms/..."
    // を付けても設定できる。
    const GOOGLE_FORM_URL =
        document.body.dataset.googleFormUrl || "";

    const GRAY_COLOR = "#8A8A8E";
    const PIN_COLOR = "#ff4b00";
    const ROUTE_COLOR = "#e94709";

    // ============================================================
    // アイコンカラー
    // ============================================================

    const ICON_COLOR_MAP = {
        toilet: "#B97800",
        "toilet-male": "#2F86B2",
        "toilet-female": "#C95F66",
        "toilet-western": "#B97800",
        "toilet-japanese": "#B97800",
        washlet: "#B97800",

        wheelchair: "#21805D",
        "diaper-changing": "#21805D",
        "baby-chair": "#21805D",
        "changing-table": "#21805D",
        ostomate: "#21805D",

        scenery: "#5C548F",
        viewpoint: "#5C548F",
        shrine: "#A83432",
        hiking: "#2C7F5E",
        restaurant: "#B97800",
        guide: "#327B9B",

        torii: "#A83432"
    };

    // ============================================================
    // 状態
    // ============================================================

    let spots = [];
    let routes = [];
    let selectedSpots = [];

    let markers = [];
    let markerMap = new Map();

    let routeLine = null;
    let routeOutlineLine = null;
    let routeSegments = [];
    let routeNumberMarkers = [];

    let currentLocationMarker = null;
    let currentLocation = null;

    let navigationWatchId = null;
    let navigationActive = false;
    let navigationLegs = [];
    let navigationLegIndex = 0;

    let routeArrowLayer = null;

    // ============================================================
    // HTML要素
    // ============================================================

    const spotList =
        document.getElementById("spotList");

    const selectedList =
        document.getElementById("selectedList");

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

    const categoryButtons =
        document.querySelectorAll(".category");

    const plannerBottomSheet =
        document.getElementById("plannerBottomSheet");

    const plannerSheetHandle =
        document.getElementById("plannerSheetHandle");

    const plannerSheetCount =
        document.getElementById("plannerSheetCount");

    const googleFormButton =
        document.getElementById("googleFormButton");

    // ============================================================
    // Leaflet地図
    // ============================================================

    const map =
        L.map("map", {
            zoomControl: true,
            preferCanvas: true
        }).setView(
            [34.96705, 135.7743],
            16
        );

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

    // スマホでは地図を主役にし、検索とカテゴリは地図上に浮かせる。
    // ボトムシートは必要に応じて上スワイプで展開する。
    function applyMobileSheetDefault() {
        if (!plannerBottomSheet) {
            return;
        }

        if (window.matchMedia && window.matchMedia("(max-width: 820px)").matches) {
            // 初期表示は地図を主役にするため収納。
            // 上スワイプで一覧を展開、下スワイプで地図を広く見せる。
            setPlannerSheetState("collapsed");
            requestAnimationFrame(function () {
                if (typeof map?.invalidateSize === "function") {
                    map.invalidateSize({ pan: false });
                }
            });
        } else {
            setPlannerSheetState("normal");
        }
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

    function getIconType(
        spot
    ) {

        const explicit =
            spot.iconType ||
            spot.icon ||
            spot.markerIcon;

        if (explicit) {

            const normalized =
                normalizeIconType(
                    explicit
                );

            if (normalized) {
                return normalized;
            }
        }

        if (
            String(spot.id) ===
            "7"
        ) {
            return "station-keihan";
        }

        if (
            String(spot.id) ===
            "8"
        ) {
            return "station-jr";
        }

        const category =
            normalizeCategory(
                spot.category
            );

        const categoryMap = {

            toilet:
                "toilet",

            scenery:
                "viewpoint",

            shrine:
                "shrine",

            hiking:
                "hiking",

            restaurant:
                "restaurant",

            guide:
                "guide"
        };

        if (
            categoryMap[category]
        ) {
            return categoryMap[
                category
            ];
        }

        const otherMap = {

            "喫煙所":
                "smoking",

            "両替機":
                "exchange",

            "公衆電話":
                "public-phone",

            "ごみ箱":
                "trash-box",

            "広域避難場所":
                "evacuation-shelter",

            "手荷物一時預かり所":
                "baggage-storage",

            "コインロッカー":
                "coin-locker",

            "休憩所":
                "rest-area"
        };

        return (
            otherMap[
                String(
                    spot.category ?? ""
                ).trim()
            ] ||
            "guide"
        );
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
            priorityIcons.includes(
                iconType
            )
        ) {
            return 1400;
        }

        if (
            iconType ===
                "station-jr" ||
            iconType ===
                "station-keihan"
        ) {
            return 1200;
        }

        return 100;
    }

    // ============================================================
    // ピン
    // ============================================================

    function createMarkerIcon(
        spot,
        selected
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

        if (selected) {
            classes.push(
                "is-selected"
            );
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

                        <span class="marker-fallback" aria-hidden="true">${getSpotSymbol(spot)}</span>

                        <img
                            class="icon-image icon-gray"
                            src="${ICON_DIR}${grayFile}"
                            alt=""
                            aria-hidden="true"
                            draggable="false"
                            onerror="this.style.display='none';this.parentElement.querySelector('.marker-fallback').style.display='grid';"
                        >

                        <img
                            class="icon-image icon-color"
                            src="${ICON_DIR}${colorFile}"
                            alt=""
                            aria-hidden="true"
                            draggable="false"
                            onerror="this.style.display='none';this.parentElement.querySelector('.marker-fallback').style.display='grid';"
                        >

                    </div>

                </div>
            `,

            iconSize: [
                48,
                48
            ],

            iconAnchor: [
                24,
                24
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
            const symbol = getSpotSymbol(spot);

            card.innerHTML = `
                ${imageHTML}
                <div class="spot-card-heading">
                    <span class="spot-card-category-dot" aria-hidden="true">${symbol}</span>
                    <div class="spot-card-heading-main">
                        <div class="spot-content">
                            <h3>${escapeHTML(name)}</h3>
                            <p class="spot-category">${escapeHTML(category)}</p>
                            <p>${escapeHTML(description)}</p>
                            <p class="spot-time">⏱ ${escapeHTML(time)}</p>
                            ${selectedHTML}
                            ${urlHTML}
                        </div>
                    </div>
                </div>
                <div class="spot-card-actions">
                    <button type="button" class="spot-card-detail-button">${escapeHTML(getViewOnMapText())}</button>
                    <button type="button" class="spot-card-select-button ${selected ? "is-selected" : ""}" aria-pressed="${selected ? "true" : "false"}">${escapeHTML(selected ? getRemoveRouteText() : getAddRouteText())}</button>
                </div>
            `;

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
        const nextZoom = Math.min(18, Math.max(17, currentZoom));

        map.flyTo(
            [lat, lng],
            nextZoom,
            {
                animate: true,
                duration: 0.55
            }
        );

        window.setTimeout(function () {
            if (!plannerBottomSheet) {
                return;
            }

            const rect = plannerBottomSheet.getBoundingClientRect();
            const visibleSheetHeight = Math.min(
                Math.max(0, rect.height),
                window.innerHeight * 0.62
            );

            if (visibleSheetHeight > 0) {
                map.panBy(
                    [0, -Math.round(visibleSheetHeight * 0.24)],
                    {
                        animate: true,
                        duration: 0.35
                    }
                );
            }
        }, 620);
    }

    function showSpotOnMap(spot) {
        focusSpotOnMap(spot);
        window.setTimeout(function () {
            const marker = markerMap.get(String(spot?.id));
            if (marker && map.hasLayer(marker)) {
                marker.openPopup();
            }
        }, 650);
    }

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

                const marker =
                    L.marker(
                        [
                            Number(
                                spot.lat
                            ),
                            Number(
                                spot.lng
                            )
                        ],
                        {
                            icon:
                                createMarkerIcon(
                                    spot,
                                    isSpotSelected(
                                        spot
                                    )
                                ),

                            keyboard:
                                true,

                            title:
                                getLocalizedValue(
                                    spot.name
                                ),

                            zIndexOffset:
                                getMarkerZIndexOffset(
                                    spot
                                )
                        }
                    );

                marker.on(
                    "click",
                    function () {
                        focusSpotOnMap(spot);
                    }
                );

                marker.bindPopup(
                    createPopupHTML(
                        spot
                    ),
                    {
                        className:
                            "planner-liquid-popup",

                        maxWidth:
                            350,

                        minWidth:
                            250,

                        closeButton:
                            true,

                        autoPan:
                            true
                    }
                );

                marker.on(
                    "popupopen",
                    function () {

                        bindPopupButton(
                            marker,
                            spot
                        );
                    }
                );

                marker.addTo(map);

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

        marker.setIcon(
            createMarkerIcon(
                spot,
                isSpotSelected(
                    spot
                )
            )
        );

        if (
            marker.isPopupOpen()
        ) {

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
        }
    }

    // ============================================================
    // 検索
    // ============================================================

    function filterSpots() {

        const keyword =
            searchInput
                ? searchInput.value
                    .trim()
                    .toLowerCase()
                : "";

        const activeButton =
            document.querySelector(
                ".category.active"
            );

        const selectedCategory =
            activeButton
                ? (
                    activeButton.dataset.category ||
                    activeButton.textContent.trim()
                )
                : "all";

        const targetCategory =
            normalizeCategory(
                selectedCategory
            );

        const filtered =
            spots.filter(
                function (spot) {

                    const searchFields = [
                        spot.id,
                        spot.name,
                        spot.description,
                        spot.category,
                        spot.keyword,
                        spot.keywords,
                        spot.searchKeyword,
                        spot.searchKeywords,
                        spot.tags,
                        spot.address,
                        spot.access,
                        spot.englishName
                    ];

                    const searchableText = searchFields.map(function (value) {
                        if (Array.isArray(value)) {
                            return value.map(getLocalizedValue).join(" ");
                        }
                        return getLocalizedValue(value);
                    }).join(" ").toLocaleLowerCase();

                    const matchesSearch =
                        !keyword || searchableText.includes(keyword);

                    const matchesCategory =
                        targetCategory ===
                            "all" ||
                        normalizeCategory(
                            spot.category
                        ) ===
                            targetCategory;

                    return (
                        matchesSearch &&
                        matchesCategory
                    );
                }
            );

        updateSpotResultCount(filtered.length);

        displaySpots(
            filtered
        );

        createMarkers(
            filtered
        );

        renderRouteNumberMarkers();
    }

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            filterSpots
        );
    }

    categoryButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    categoryButtons.forEach(
                        function (item) {

                            item.classList.remove(
                                "active"
                            );
                        }
                    );

                    button.classList.add(
                        "active"
                    );

                    filterSpots();
                }
            );
        }
    );

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

    async function createRoute() {

        if (
            selectedSpots.length ===
            0
        ) {

            alert(
                "まずスポットを1か所以上選択してください。"
            );

            return;
        }

        if (routeLine) {
            map.removeLayer(routeLine);
            routeLine = null;
        }
        if (routeOutlineLine) {
            map.removeLayer(routeOutlineLine);
            routeOutlineLine = null;
        }

        clearRouteNumberMarkers();

        if (
            routeArrowLayer
        ) {

            map.removeLayer(
                routeArrowLayer
            );

            routeArrowLayer =
                null;
        }

        routeSegments = [];

        let startLocation = null;

        try {

            startLocation =
                await ensureCurrentLocation();

        } catch (error) {

            console.warn(
                "現在地を取得できませんでした。選択スポット同士のルートを作成します。",
                error
            );
        }

        const allCoordinates =
            [];

        const legs =
            [];

        try {

            if (
                startLocation
            ) {

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

        routeOutlineLine = L.polyline(allCoordinates, {
            pane: "plannerRoutePane",
            color: "#ffffff",
            weight: 12,
            opacity: 0.96,
            lineCap: "round",
            lineJoin: "round",
            interactive: false
        }).addTo(map);

        routeLine = L.polyline(allCoordinates, {
            pane: "plannerRoutePane",
            color: ROUTE_COLOR,
            weight: 6,
            opacity: 0.98,
            lineCap: "round",
            lineJoin: "round"
        }).addTo(map);

        addRouteDirectionArrows(
            allCoordinates
        );

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

            navStatus.textContent =
                startLocation
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
    }

    if (createRouteBtn) {

        createRouteBtn.addEventListener(
            "click",
            createRoute
        );
    }

    // ============================================================
    // ルート方向矢印
    // ============================================================

    function addRouteDirectionArrows(
        points
    ) {

        if (
            routeArrowLayer
        ) {

            map.removeLayer(
                routeArrowLayer
            );
        }

        routeArrowLayer =
            L.layerGroup();

        if (
            !Array.isArray(points) ||
            points.length < 3
        ) {

            routeArrowLayer.addTo(
                map
            );

            return;
        }

        const step =
            Math.max(
                12,
                Math.floor(
                    points.length /
                    14
                )
            );

        for (
            let i = step;
            i < points.length - 1;
            i += step
        ) {

            const current =
                points[i];

            const next =
                points[
                    Math.min(
                        i + 2,
                        points.length - 1
                    )
                ];

            const angle =
                Math.atan2(
                    next[1] -
                        current[1],
                    next[0] -
                        current[0]
                ) *
                180 /
                Math.PI;

            const arrow =
                L.marker(
                    current,
                    {

                        pane:
                            "plannerRoutePane",

                        interactive:
                            false,

                        keyboard:
                            false,

                        icon:
                            L.divIcon(

                                {

                                    className:
                                        "planner-v11-route-arrow-icon",

                                    html:
                                        `
                                            <span
                                                style="
                                                    display:block;
                                                    color:${ROUTE_COLOR};
                                                    font-size:17px;
                                                    font-weight:900;
                                                    text-shadow:
                                                        0 1px 4px rgba(255,255,255,.98);
                                                    transform:
                                                        rotate(${angle}deg);
                                                "
                                            >
                                                ▶
                                            </span>
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
                            )
                    }
                );

            routeArrowLayer.addLayer(
                arrow
            );
        }

        routeArrowLayer.addTo(
            map
        );
    }

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

        if (routeArrowLayer) {
            try {
                map.removeLayer(routeArrowLayer);
            } catch (error) {
                console.warn("routeArrowLayer cleanup warning:", error);
            }
            routeArrowLayer = null;
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

        const keyword =
            searchInput
                ? searchInput.value
                    .trim()
                    .toLowerCase()
                : "";

        const activeButton =
            document.querySelector(
                ".category.active"
            );

        const categoryValue =
            activeButton
                ? (
                    activeButton.dataset.category ||
                    activeButton.textContent.trim()
                )
                : "all";

        const targetCategory =
            normalizeCategory(
                categoryValue
            );

        return spots.filter(
            function (spot) {

                const name =
                    getLocalizedValue(
                        spot.name
                    )
                    .toLowerCase();

                const description =
                    getLocalizedValue(
                        spot.description
                    )
                    .toLowerCase();

                const categoryText =
                    String(
                        spot.category ?? ""
                    )
                    .toLowerCase();

                const matchesSearch =
                    !keyword ||
                    name.includes(
                        keyword
                    ) ||
                    description.includes(
                        keyword
                    ) ||
                    categoryText.includes(
                        keyword
                    );

                const matchesCategory =
                    targetCategory ===
                        "all" ||

                    normalizeCategory(
                        spot.category
                    ) ===
                        targetCategory;

                return (
                    matchesSearch &&
                    matchesCategory
                );
            }
        );
    }

    // ============================================================
    // 初期更新
    // ============================================================

    updateInfo();

});
