document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    window.__FUSHIMI_PLANNER_BUILD__ = "V12-APPLE-MAP-FIXED";
    console.log("[Fushimi Inari Smart Guide] planner.js V12-APPLE-MAP-FIXED loaded");

    // ============================================================
    // 設定
    // ============================================================
    const DATA_URL = "./data/spots.json";
    const ROUTE_URLS = [
        "./data/routes.json",
        "./data/routes_from_gis.json",
        "./data/routes_gis_shortest_fixed.json"
    ];
    const SELECTED_STORAGE_KEY = "plannerSelectedSpots";
    const SAVED_ROUTE_KEY = "selectedRoute";
    const GOOGLE_FORM_URL = document.body?.dataset?.googleFormUrl || "";
    const ROUTE_COLOR = "#e94709";

    // ============================================================
    // HTML要素
    // ============================================================
    const spotList = document.getElementById("spotList");
    const selectedList = document.getElementById("selectedList");
    const searchInput = document.getElementById("searchInput");
    const locationBtn = document.getElementById("locationBtn");
    const createRouteBtn = document.getElementById("createRouteBtn");
    const clearBtn = document.getElementById("clearBtn");
    const saveRouteBtn = document.getElementById("saveRoute");
    const spotCount = document.getElementById("spotCount");
    const distanceEl = document.getElementById("distance");
    const walkTimeEl = document.getElementById("walkTime");
    const stayTimeEl = document.getElementById("stayTime");
    const categoryButtons = document.querySelectorAll(".category");
    const plannerBottomSheet = document.getElementById("plannerBottomSheet");
    const plannerSheetHandle = document.getElementById("plannerSheetHandle");
    const plannerSheetCount = document.getElementById("plannerSheetCount");
    const googleFormButton = document.getElementById("googleFormButton");

    // ============================================================
    // 状態
    // ============================================================
    let spots = [];
    let routes = [];
    let selectedSpots = [];
    let activeCategory = "all";

    let markerMap = new Map();
    let currentLocation = null;
    let currentLocationMarker = null;

    let routeLine = null;
    let routeArrowLayer = null;
    let routeNumberMarkers = [];
    let routeSegments = [];

    let navigationActive = false;
    let navigationWatchId = null;
    let navigationLegs = [];
    let navigationLegIndex = 0;

    // ============================================================
    // Leaflet
    // ============================================================
    const map = L.map("map", {
        zoomControl: true,
        preferCanvas: true
    }).setView([34.96705, 135.7743], 16);

    const gsiLayer = L.tileLayer(
        "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
        {
            maxZoom: 18,
            attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener noreferrer">国土地理院</a>'
        }
    );

    const osmLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        }
    );

    gsiLayer.addTo(map);

    L.control.layers(
        {
            "地理院地図": gsiLayer,
            "OpenStreetMap": osmLayer
        },
        null,
        { collapsed: true }
    ).addTo(map);

    map.createPane("plannerRoutePane");
    map.getPane("plannerRoutePane").style.zIndex = "450";

    map.createPane("plannerNumberPane");
    map.getPane("plannerNumberPane").style.zIndex = "720";

    map.createPane("plannerCurrentPane");
    map.getPane("plannerCurrentPane").style.zIndex = "760";

    function invalidateMap() {
        requestAnimationFrame(function () {
            map.invalidateSize({ pan: false });
        });
    }

    window.addEventListener("resize", invalidateMap);

    window.addEventListener("orientationchange", function () {
        setTimeout(invalidateMap, 180);
    });

    setTimeout(invalidateMap, 200);

    // ============================================================
    // 共通
    // ============================================================
    function language() {
        return localStorage.getItem("language") || "ja";
    }

    function t(key, fallback) {
        try {
            if (typeof window.t === "function") {
                const value = window.t(key);

                if (value && value !== key) {
                    return value;
                }
            }
        } catch (_) {}

        return fallback;
    }

    function text(value) {
        if (value === null || value === undefined) {
            return "";
        }

        if (typeof value !== "object") {
            return String(value);
        }

        const lang = language();

        return String(
            value[lang] ||
            value.ja ||
            value.en ||
            value.zh ||
            value.ko ||
            Object.values(value)[0] ||
            ""
        );
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function safeURL(value) {
        if (!value) {
            return "";
        }

        try {
            const url = new URL(
                String(value),
                window.location.href
            );

            if (
                url.protocol === "http:" ||
                url.protocol === "https:"
            ) {
                return url.href;
            }
        } catch (_) {}

        return "";
    }

    function localizedCategory(category) {
        const normalized = normalizeCategory(category);

        const labels = {
            scenery: t("scenery", "景観"),
            shrine: t("shrine", "神社"),
            hiking: t("hiking", "登山"),
            restaurant: t("restaurant", "グルメ"),
            transport: t("transport", "交通"),
            toilet: "トイレ",
            guide: "案内"
        };

        return labels[normalized] ||
            String(category || "");
    }

    // ============================================================
    // カテゴリ
    // ============================================================
    function normalizeCategory(category) {
        const value = String(
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

    function categoryMatches(spot, category) {
        if (category === "all") {
            return true;
        }

        return (
            normalizeCategory(spot.category) ===
            category
        );
    }

    // ============================================================
    // 時間
    // ============================================================
    function timeToMinutes(value) {
        const raw = String(
            value ?? ""
        ).trim();

        if (!raw || raw === "-") {
            return 0;
        }

        let total = 0;

        const h = raw.match(
            /(\d+(?:\.\d+)?)\s*(?:時間|hour|hours|시간|小时)/i
        );

        const m = raw.match(
            /(\d+(?:\.\d+)?)\s*(?:分|minutes?|분|分钟)/i
        );

        if (h) {
            total += Number(h[1]) * 60;
        }

        if (m) {
            total += Number(m[1]);
        }

        if (total === 0) {
            const n = raw.match(/\d+/);

            if (n) {
                total = Number(n[0]);
            }
        }

        return Number.isFinite(total)
            ? Math.round(total)
            : 0;
    }

    function formatTime(minutes) {
        const value = Math.max(
            0,
            Math.round(Number(minutes) || 0)
        );

        if (value < 60) {
            return `${value}分`;
        }

        const h = Math.floor(
            value / 60
        );

        const m = value % 60;

        return m
            ? `${h}時間${m}分`
            : `${h}時間`;
    }

    // ============================================================
    // 選択状態
    // ============================================================
    function loadSelectedIDs() {
        try {
            const saved = localStorage.getItem(
                SELECTED_STORAGE_KEY
            );

            if (!saved) {
                return [];
            }

            const ids = JSON.parse(saved);

            return Array.isArray(ids)
                ? ids
                : [];
        } catch (_) {
            return [];
        }
    }

    function saveSelectedIDs() {
        localStorage.setItem(
            SELECTED_STORAGE_KEY,
            JSON.stringify(
                selectedSpots.map(
                    spot => spot.id
                )
            )
        );
    }

    function isSelected(spot) {
        return selectedSpots.some(
            item =>
                String(item.id) ===
                String(spot.id)
        );
    }

    // ============================================================
    // ボトムシート
    // ============================================================
    function updateSheetSummary() {
        if (!plannerSheetCount) {
            return;
        }

        const count =
            selectedSpots.length;

        if (language() === "en") {
            plannerSheetCount.textContent =
                `${count} selected`;
        } else if (language() === "zh") {
            plannerSheetCount.textContent =
                `已选 ${count} 个`;
        } else if (language() === "ko") {
            plannerSheetCount.textContent =
                `${count}곳 선택`;
        } else {
            plannerSheetCount.textContent =
                `${count}か所選択中`;
        }
    }

    function setSheetState(state) {
        if (!plannerBottomSheet) {
            return;
        }

        plannerBottomSheet.classList.remove(
            "is-collapsed",
            "is-expanded"
        );

        if (state === "collapsed") {
            plannerBottomSheet.classList.add(
                "is-collapsed"
            );
        }

        if (state === "expanded") {
            plannerBottomSheet.classList.add(
                "is-expanded"
            );
        }

        if (plannerSheetHandle) {
            plannerSheetHandle.setAttribute(
                "aria-expanded",
                state === "expanded"
                    ? "true"
                    : "false"
            );
        }

        setTimeout(
            invalidateMap,
            250
        );
    }

    if (plannerSheetHandle) {
        plannerSheetHandle.addEventListener(
            "click",
            function () {
                const expanded =
                    plannerBottomSheet?.classList.contains(
                        "is-expanded"
                    );

                setSheetState(
                    expanded
                        ? "collapsed"
                        : "expanded"
                );
            }
        );
    }

    // ============================================================
    // Googleフォーム
    // ============================================================
    function getGoogleFormURL() {
        return safeURL(
            (
                document.body?.dataset?.googleFormUrl ||
                GOOGLE_FORM_URL ||
                ""
            ).trim()
        );
    }

    function openGoogleForm() {
        const url =
            getGoogleFormURL();

        if (!url) {
            alert(
                "GoogleフォームのURLを取得できませんでした。"
            );

            return false;
        }

        window.location.assign(url);

        return true;
    }

    if (googleFormButton) {
        googleFormButton.addEventListener(
            "click",
            openGoogleForm
        );
    }

    // ============================================================
    // スポット表示
    // ============================================================
    function getMarkerIcon(
        spot,
        selected
    ) {
        const color =
            selected
                ? ROUTE_COLOR
                : "#c40018";

        return L.divIcon({
            className:
                "planner-pin-wrapper",

            html:
                `<div ` +
                `style="` +
                `width:34px;` +
                `height:34px;` +
                `border-radius:50% 50% 50% 4px;` +
                `transform:rotate(-45deg);` +
                `background:${color};` +
                `border:3px solid rgba(255,255,255,.96);` +
                `box-shadow:0 8px 20px rgba(0,0,0,.20);` +
                `">` +
                `<span ` +
                `style="` +
                `display:flex;` +
                `align-items:center;` +
                `justify-content:center;` +
                `width:100%;` +
                `height:100%;` +
                `transform:rotate(45deg);` +
                `color:#fff;` +
                `font-size:13px;` +
                `font-weight:900;` +
                `"` +
                `>` +
                `${escapeHTML(String(spot.id))}` +
                `</span>` +
                `</div>`,

            iconSize: [
                34,
                34
            ],

            iconAnchor: [
                17,
                30
            ],

            popupAnchor: [
                0,
                -28
            ]
        });
    }

    function createPopupHTML(
        spot
    ) {
        const name =
            text(spot.name);

        const description =
            text(spot.description);

        const url =
            safeURL(spot.url);

        const selected =
            isSelected(spot);

        const buttonText =
            selected
                ? "選択を解除"
                : "このスポットを選択";

        return `
            <div
                style="
                    min-width:220px;
                    max-width:280px;
                "
            >

                <strong
                    style="
                        display:block;
                        font-size:16px;
                        margin-bottom:5px;
                    "
                >
                    ${escapeHTML(name)}
                </strong>

                <div
                    style="
                        display:inline-block;
                        padding:3px 7px;
                        border-radius:999px;
                        background:rgba(233,71,9,.10);
                        font-size:11px;
                        font-weight:700;
                        margin-bottom:7px;
                    "
                >
                    ${escapeHTML(
                        localizedCategory(
                            spot.category
                        )
                    )}
                </div>

                <p
                    style="
                        margin:0 0 7px;
                        font-size:12px;
                        line-height:1.5;
                        color:#666;
                    "
                >
                    ${escapeHTML(description)}
                </p>

                <div
                    style="
                        font-size:11px;
                        margin-bottom:8px;
                    "
                >
                    滞在目安：
                    ${escapeHTML(
                        spot.time || "-"
                    )}
                </div>

                ${
                    url
                        ? `
                            <a
                                href="${escapeHTML(url)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                style="
                                    display:inline-block;
                                    margin-bottom:8px;
                                "
                            >
                                公式サイト
                            </a>
                            <br>
                        `
                        : ""
                }

                <button
                    type="button"
                    data-spot-id="${escapeHTML(spot.id)}"
                    class="planner-popup-select"
                    style="
                        border:0;
                        border-radius:999px;
                        padding:8px 11px;
                        background:${selected ? "#666" : ROUTE_COLOR};
                        color:#fff;
                        font-weight:700;
                        cursor:pointer;
                    "
                >
                    ${buttonText}
                </button>

            </div>
        `;
    }

    function bindPopupButton(
        marker,
        spot
    ) {
        marker.on(
            "popupopen",
            function () {
                const popup =
                    marker
                        .getPopup()
                        ?.getElement();

                const button =
                    popup?.querySelector(
                        ".planner-popup-select"
                    );

                if (!button) {
                    return;
                }

                button.addEventListener(
                    "click",
                    function () {
                        selectSpot(
                            spot
                        );

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
                    },
                    {
                        once: true
                    }
                );
            }
        );
    }

    function createMarkers(list) {
        markerMap.forEach(
            marker =>
                map.removeLayer(marker)
        );

        markerMap.clear();

        list.forEach(
            function (spot) {
                const marker =
                    L.marker(
                        [
                            Number(spot.lat),
                            Number(spot.lng)
                        ],
                        {
                            icon:
                                getMarkerIcon(
                                    spot,
                                    isSelected(spot)
                                ),
                            title:
                                text(spot.name)
                        }
                    ).addTo(map);

                marker.bindPopup(
                    createPopupHTML(
                        spot
                    ),
                    {
                        maxWidth: 300
                    }
                );

                bindPopupButton(
                    marker,
                    spot
                );

                markerMap.set(
                    String(spot.id),
                    marker
                );
            }
        );
    }

    function refreshMarkerSelection() {
        markerMap.forEach(
            function (
                marker,
                id
            ) {
                const spot =
                    spots.find(
                        item =>
                            String(item.id) ===
                            String(id)
                    );

                if (spot) {
                    marker.setIcon(
                        getMarkerIcon(
                            spot,
                            isSelected(spot)
                        )
                    );
                }
            }
        );
    }

    function focusSpotOnMap(
        spot
    ) {
        const lat =
            Number(spot.lat);

        const lng =
            Number(spot.lng);

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
        ) {
            return;
        }

        setSheetState(
            "collapsed"
        );

        map.flyTo(
            [
                lat,
                lng
            ],
            Math.max(
                map.getZoom(),
                17
            ),
            {
                duration: 0.55
            }
        );

        const marker =
            markerMap.get(
                String(spot.id)
            );

        if (marker) {
            setTimeout(
                function () {
                    marker.openPopup();
                },
                420
            );
        }
    }

    function displaySpots(
        list
    ) {
        if (!spotList) {
            return;
        }

        spotList.innerHTML = "";

        if (!list.length) {
            spotList.innerHTML =
                `<p>スポットが見つかりませんでした。</p>`;

            return;
        }

        list.forEach(
            function (spot) {
                const card =
                    document.createElement(
                        "div"
                    );

                card.className =
                    "planner-spot" +
                    (
                        isSelected(spot)
                            ? " selected"
                            : ""
                    );

                card.dataset.id =
                    spot.id;

                const url =
                    safeURL(
                        spot.url
                    );

                card.innerHTML = `
                    <div class="spot-content">

                        <h3>
                            ${escapeHTML(
                                text(spot.name)
                            )}
                        </h3>

                        <p class="spot-category">
                            ${escapeHTML(
                                localizedCategory(
                                    spot.category
                                )
                            )}
                        </p>

                        <p>
                            ${escapeHTML(
                                text(
                                    spot.description
                                )
                            )}
                        </p>

                        <p class="spot-time">
                            ⏱ ${escapeHTML(
                                spot.time || "-"
                            )}
                        </p>

                        ${
                            isSelected(spot)
                                ? `
                                    <span class="selected-label">
                                        ✓ 選択中
                                    </span>
                                `
                                : ""
                        }

                        ${
                            url
                                ? `
                                    <a
                                        href="${escapeHTML(url)}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="spot-url"
                                    >
                                        公式サイトを見る
                                    </a>
                                `
                                : ""
                        }

                    </div>
                `;

                card.addEventListener(
                    "click",
                    function (event) {
                        if (
                            event.target.closest(
                                "a"
                            )
                        ) {
                            return;
                        }

                        focusSpotOnMap(
                            spot
                        );

                        selectSpot(
                            spot
                        );
                    }
                );

                spotList.appendChild(
                    card
                );
            }
        );
    }

    function updateCardSelection() {
        document
            .querySelectorAll(
                ".planner-spot[data-id]"
            )
            .forEach(
                function (card) {
                    const spot =
                        spots.find(
                            item =>
                                String(
                                    item.id
                                ) ===
                                String(
                                    card.dataset.id
                                )
                        );

                    if (spot) {
                        card.classList.toggle(
                            "selected",
                            isSelected(spot)
                        );
                    }
                }
            );
    }

    function updateSelected() {
        if (!selectedList) {
            return;
        }

        selectedList.innerHTML = "";

        if (!selectedSpots.length) {
            selectedList.innerHTML =
                `<p>${
                    escapeHTML(
                        t(
                            "noSelectedSpots",
                            "スポットを選択してください。"
                        )
                    )
                }</p>`;

            updateSheetSummary();

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

                item.innerHTML = `
                    <span>
                        ${index + 1}.
                        ${escapeHTML(
                            text(spot.name)
                        )}
                    </span>

                    <button
                        type="button"
                        aria-label="${escapeHTML(
                            text(spot.name)
                        )}を削除"
                    >
                        ×
                    </button>
                `;

                item
                    .querySelector(
                        "span"
                    )
                    .addEventListener(
                        "click",
                        function () {
                            focusSpotOnMap(
                                spot
                            );
                        }
                    );

                item
                    .querySelector(
                        "button"
                    )
                    .addEventListener(
                        "click",
                        function () {
                            selectSpot(
                                spot
                            );
                        }
                    );

                selectedList.appendChild(
                    item
                );
            }
        );

        updateSheetSummary();
    }

    function selectSpot(
        spot
    ) {
        const index =
            selectedSpots.findIndex(
                item =>
                    String(item.id) ===
                    String(spot.id)
            );

        if (index >= 0) {
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
        updateCardSelection();
        refreshMarkerSelection();
        updateInfo();
    }

    function filterSpots() {
        const keyword =
            (
                searchInput?.value ||
                ""
            )
                .trim()
                .toLowerCase();

        const filtered =
            spots.filter(
                function (spot) {
                    const haystack = [
                        text(spot.name),
                        text(spot.description),
                        String(
                            spot.category ||
                            ""
                        )
                    ]
                        .join(" ")
                        .toLowerCase();

                    return (
                        haystack.includes(
                            keyword
                        ) &&
                        categoryMatches(
                            spot,
                            activeCategory
                        )
                    );
                }
            );

        displaySpots(
            filtered
        );

        if (
            categoryButtons.length
        ) {
            categoryButtons.forEach(
                function (
                    button
                ) {
                    button.classList.toggle(
                        "active",
                        normalizeCategory(
                            button.dataset.category ||
                            "all"
                        ) ===
                        activeCategory
                    );
                }
            );
        }
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
                    activeCategory =
                        normalizeCategory(
                            button.dataset.category ||
                            "all"
                        );

                    filterSpots();
                }
            );
        }
    );

    // ============================================================
    // ルートデータ
    // ============================================================
    function normalizeRouteObject(
        route
    ) {
        const from =
            route.from ??
            route.start ??
            route.source;

        const to =
            route.to ??
            route.end ??
            route.target;

        const rawPath =
            Array.isArray(route.path)
                ? route.path
                : (
                    Array.isArray(
                        route.coordinates
                    )
                        ? route.coordinates
                        : []
                );

        const path =
            rawPath
                .map(
                    function (point) {
                        if (
                            Array.isArray(
                                point
                            )
                        ) {
                            return [
                                Number(
                                    point[0]
                                ),
                                Number(
                                    point[1]
                                )
                            ];
                        }

                        return [
                            Number(
                                point.lat
                            ),
                            Number(
                                point.lng
                            )
                        ];
                    }
                )
                .filter(
                    point =>
                        Number.isFinite(
                            point[0]
                        ) &&
                        Number.isFinite(
                            point[1]
                        )
                );

        return {
            from: String(from),
            to: String(to),
            name:
                route.name || "",
            path
        };
    }

    const graph =
        new Map();

    function addEdge(
        from,
        to,
        path
    ) {
        if (
            !graph.has(
                String(from)
            )
        ) {
            graph.set(
                String(from),
                []
            );
        }

        graph
            .get(String(from))
            .push({
                to: String(to),
                path:
                    path.slice()
            });
    }

    function reversePath(
        path
    ) {
        return path
            .slice()
            .reverse();
    }

    function buildGraph() {
        graph.clear();

        routes.forEach(
            function (raw) {
                const route =
                    normalizeRouteObject(
                        raw
                    );

                if (
                    route.path.length <
                    2
                ) {
                    return;
                }

                addEdge(
                    route.from,
                    route.to,
                    route.path
                );

                addEdge(
                    route.to,
                    route.from,
                    reversePath(
                        route.path
                    )
                );
            }
        );
    }

    function findGraphRoute(
        fromId,
        toId
    ) {
        const start =
            String(fromId);

        const goal =
            String(toId);

        if (
            start === goal
        ) {
            return {
                coordinates: [],
                legs: []
            };
        }

        if (
            !graph.has(start)
        ) {
            return null;
        }

        const queue = [
            start
        ];

        const parent =
            new Map([
                [
                    start,
                    null
                ]
            ]);

        const edgeUsed =
            new Map();

        while (
            queue.length
        ) {
            const current =
                queue.shift();

            if (
                current === goal
            ) {
                break;
            }

            for (
                const edge of
                graph.get(
                    current
                ) || []
            ) {
                if (
                    parent.has(
                        edge.to
                    )
                ) {
                    continue;
                }

                parent.set(
                    edge.to,
                    current
                );

                edgeUsed.set(
                    edge.to,
                    edge
                );

                queue.push(
                    edge.to
                );
            }
        }

        if (
            !parent.has(goal)
        ) {
            return null;
        }

        const edges = [];

        let node = goal;

        while (
            node !== start
        ) {
            const edge =
                edgeUsed.get(
                    node
                );

            if (!edge) {
                return null;
            }

            edges.unshift(
                edge
            );

            node =
                parent.get(
                    node
                );
        }

        const coordinates = [];

        edges.forEach(
            function (edge) {
                const path =
                    edge.path.slice();

                if (
                    !coordinates.length
                ) {
                    coordinates.push(
                        ...path
                    );
                } else {
                    coordinates.push(
                        ...path.slice(
                            1
                        )
                    );
                }
            }
        );

        return {
            coordinates,
            legs: edges
        };
    }

    function nearestSpot(
        lat,
        lng
    ) {
        let best = null;
        let bestDistance =
            Infinity;

        spots.forEach(
            function (spot) {
                const d =
                    map.distance(
                        [
                            lat,
                            lng
                        ],
                        [
                            Number(
                                spot.lat
                            ),
                            Number(
                                spot.lng
                            )
                        ]
                    );

                if (
                    d < bestDistance
                ) {
                    bestDistance =
                        d;

                    best = {
                        spot,
                        distanceMeters:
                            d
                    };
                }
            }
        );

        return best;
    }

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
            await fetch(
                url
            );

        if (!response.ok) {
            throw new Error(
                `OSRM: ${response.status}`
            );
        }

        const data =
            await response.json();

        if (
            data.code !==
                "Ok" ||
            !Array.isArray(
                data.routes
            ) ||
            !data.routes[0]
                ?.geometry
                ?.coordinates
        ) {
            throw new Error(
                "徒歩ルートが見つかりませんでした。"
            );
        }

        return data.routes[0]
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
            );
    }

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
            graphRoute.coordinates.length >=
                2
        ) {
            return {
                coordinates:
                    graphRoute.coordinates,
                source:
                    "routes.json"
            };
        }

        const coordinates =
            await getOSRMRoute(
                {
                    lat:
                        Number(from.lat),
                    lng:
                        Number(from.lng)
                },
                {
                    lat:
                        Number(to.lat),
                    lng:
                        Number(to.lng)
                }
            );

        return {
            coordinates,
            source:
                "OSRM"
        };
    }

    async function getLocationToSpotRoute(
        location,
        target
    ) {
        const nearest =
            nearestSpot(
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
                graphRoute.coordinates.length >=
                    2
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
                                    Number(
                                        nearest.spot
                                            .lat
                                    ),
                                lng:
                                    Number(
                                        nearest.spot
                                            .lng
                                    )
                            }
                        );
                } catch (_) {}

                const combined =
                    approach.length
                        ? approach.slice()
                        : [
                            [
                                location.lat,
                                location.lng
                            ]
                        ];

                if (
                    graphRoute
                        .coordinates
                        .length
                ) {
                    const first =
                        graphRoute.coordinates[0];

                    const last =
                        combined[
                            combined.length - 1
                        ];

                    if (
                        !last ||
                        map.distance(
                            last,
                            first
                        ) > 1
                    ) {
                        combined.push(
                            first
                        );
                    }

                    combined.push(
                        ...graphRoute
                            .coordinates
                            .slice(1)
                    );
                }

                return {
                    coordinates:
                        combined,
                    source:
                        "HYBRID"
                };
            }
        }

        const coordinates =
            await getOSRMRoute(
                {
                    lat:
                        location.lat,
                    lng:
                        location.lng
                },
                {
                    lat:
                        Number(
                            target.lat
                        ),
                    lng:
                        Number(
                            target.lng
                        )
                }
            );

        return {
            coordinates,
            source:
                "OSRM"
        };
    }

    function routeDistanceKm(
        points
    ) {
        let meters = 0;

        for (
            let i = 0;
            i < points.length - 1;
            i++
        ) {
            meters +=
                map.distance(
                    points[i],
                    points[i + 1]
                );
        }

        return meters / 1000;
    }

    // ============================================================
    // ルート表示
    // ============================================================
    function clearRouteNumberMarkers() {
        routeNumberMarkers.forEach(
            marker =>
                map.removeLayer(
                    marker
                )
        );

        routeNumberMarkers = [];
    }

    function createRouteNumberIcon(
        number
    ) {
        return L.divIcon({
            className:
                "planner-v11-route-number-icon",

            html:
                `<div class="planner-v11-route-badge">` +
                `${escapeHTML(number)}` +
                `</div>`,

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
                            Number(
                                spot.lat
                            ),
                            Number(
                                spot.lng
                            )
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

                            pane:
                                "plannerNumberPane",

                            zIndexOffset:
                                3000
                        }
                    ).addTo(map);

                routeNumberMarkers.push(
                    marker
                );
            }
        );
    }

    function clearRouteVisuals() {
        if (routeLine) {
            map.removeLayer(
                routeLine
            );

            routeLine = null;
        }

        if (routeArrowLayer) {
            map.removeLayer(
                routeArrowLayer
            );

            routeArrowLayer = null;
        }

        clearRouteNumberMarkers();

        routeSegments = [];
    }

    function addRouteDirectionArrows(
        points
    ) {
        if (routeArrowLayer) {
            map.removeLayer(
                routeArrowLayer
            );
        }

        routeArrowLayer =
            L.layerGroup().addTo(
                map
            );

        if (
            !Array.isArray(points) ||
            points.length < 3
        ) {
            return;
        }

        const step =
            Math.max(
                10,
                Math.floor(
                    points.length / 12
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

            const icon =
                L.divIcon({
                    className:
                        "planner-v11-route-arrow-icon",

                    html:
                        `<div ` +
                        `style="` +
                        `transform:rotate(${angle}deg);` +
                        `font-size:20px;` +
                        `color:${ROUTE_COLOR};` +
                        `font-weight:900;` +
                        `text-shadow:0 1px 3px rgba(255,255,255,.95);` +
                        `"` +
                        `>➜</div>`,

                    iconSize: [
                        22,
                        22
                    ],

                    iconAnchor: [
                        11,
                        11
                    ],

                    pane:
                        "plannerRoutePane"
                });

            L.marker(
                current,
                {
                    icon,

                    interactive:
                        false,

                    keyboard:
                        false,

                    pane:
                        "plannerRoutePane"
                }
            ).addTo(
                routeArrowLayer
            );
        }
    }

    function makeNavPanel() {
        if (
            document.getElementById(
                "plannerNavCard"
            )
        ) {
            return;
        }

        const wrapper =
            document.createElement(
                "div"
            );

        wrapper.id =
            "plannerNavPanel";

        wrapper.className =
            "planner-v11-map-panel";

        wrapper.innerHTML = `
            <div
                id="plannerNavCard"
                class="planner-v11-nav-card is-hidden"
            >

                <div
                    class="planner-v11-nav-top"
                >

                    <span
                        class="planner-v11-nav-kicker"
                    >
                        NAVIGATION
                    </span>

                    <span
                        id="plannerNavStatus"
                        class="planner-v11-nav-status"
                    >
                        準備中
                    </span>

                </div>

                <h3
                    id="plannerNavTitle"
                    class="planner-v11-nav-title"
                >
                    ルートを作成してください
                </h3>

                <div
                    id="plannerNavMeta"
                    class="planner-v11-nav-meta"
                ></div>

                <div
                    class="planner-v11-nav-actions"
                >

                    <button
                        id="plannerNavStart"
                        type="button"
                        class="planner-v11-button primary"
                    >
                        現在地からナビ開始
                    </button>

                    <button
                        id="plannerNavStop"
                        type="button"
                        class="planner-v11-button"
                    >
                        ナビ終了
                    </button>

                </div>

                <div
                    id="plannerNavArrival"
                    class="planner-v11-arrival"
                    style="display:none;"
                ></div>

            </div>
        `;

        document
            .getElementById("map")
            ?.appendChild(
                wrapper
            );

        document
            .getElementById(
                "plannerNavStart"
            )
            ?.addEventListener(
                "click",
                function () {
                    startNavigation().catch(
                        function (error) {
                            console.error(
                                "ナビ開始エラー:",
                                error
                            );

                            alert(
                                "現在地からナビを開始できませんでした。"
                            );
                        }
                    );
                }
            );

        document
            .getElementById(
                "plannerNavStop"
            )
            ?.addEventListener(
                "click",
                function () {
                    stopNavigation();
                }
            );
    }

    function navCard() {
        return document.getElementById(
            "plannerNavCard"
        );
    }

    function navStatus() {
        return document.getElementById(
            "plannerNavStatus"
        );
    }

    function navTitle() {
        return document.getElementById(
            "plannerNavTitle"
        );
    }

    function navMeta() {
        return document.getElementById(
            "plannerNavMeta"
        );
    }

    function navArrival() {
        return document.getElementById(
            "plannerNavArrival"
        );
    }

    function showNavCard() {
        makeNavPanel();

        navCard()?.classList.remove(
            "is-hidden"
        );
    }

    function hideNavCard() {
        navCard()?.classList.add(
            "is-hidden"
        );
    }

    function setNavMeta(
        items
    ) {
        const target =
            navMeta();

        if (!target) {
            return;
        }

        target.innerHTML =
            items
                .map(
                    item =>
                        `<span class="planner-v11-nav-chip">` +
                        `${escapeHTML(item)}` +
                        `</span>`
                )
                .join("");
    }

    function updateNavPreview() {
        if (
            !routeLine ||
            !selectedSpots.length
        ) {
            if (
                !navigationActive
            ) {
                hideNavCard();
            }

            return;
        }

        showNavCard();

        if (navStatus()) {
            navStatus().textContent =
                navigationActive
                    ? "ナビ中"
                    : "ルート作成済み";
        }

        if (navTitle()) {
            navTitle().textContent =
                `次の目的地：${
                    text(
                        selectedSpots[
                            Math.min(
                                navigationLegIndex,
                                selectedSpots.length - 1
                            )
                        ].name
                    )
                }`;
        }

        const distanceText =
            distanceEl
                ? distanceEl.textContent
                : "";

        const walkText =
            walkTimeEl
                ? walkTimeEl.textContent
                : "";

        setNavMeta([
            `${selectedSpots.length}スポット`,
            distanceText,
            walkText
        ]);
    }

    // ============================================================
    // 現在地
    // ============================================================
    function setCurrentLocation(
        value
    ) {
        currentLocation =
            value;

        const icon =
            L.divIcon({
                className:
                    "planner-v11-current-location-icon",

                html:
                    `<div class="planner-v11-current-location"></div>`,

                iconSize: [
                    20,
                    20
                ],

                iconAnchor: [
                    10,
                    10
                ],

                pane:
                    "plannerCurrentPane"
            });

        if (
            currentLocationMarker
        ) {
            currentLocationMarker.setLatLng(
                [
                    value.lat,
                    value.lng
                ]
            );

            currentLocationMarker.setIcon(
                icon
            );
        } else {
            currentLocationMarker =
                L.marker(
                    [
                        value.lat,
                        value.lng
                    ],
                    {
                        icon,

                        interactive:
                            false,

                        keyboard:
                            false,

                        pane:
                            "plannerCurrentPane"
                    }
                ).addTo(
                    map
                );
        }
    }

    function requestCurrentLocation(
        centerMap
    ) {
        return new Promise(
            function (
                resolve,
                reject
            ) {
                if (
                    !navigator.geolocation
                ) {
                    reject(
                        new Error(
                            "Geolocation unsupported"
                        )
                    );

                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    function (
                        position
                    ) {
                        const value =
                            {
                                lat:
                                    position.coords
                                        .latitude,

                                lng:
                                    position.coords
                                        .longitude,

                                accuracy:
                                    Number(
                                        position.coords
                                            .accuracy ||
                                        0
                                    )
                            };

                        setCurrentLocation(
                            value
                        );

                        if (
                            centerMap
                        ) {
                            map.flyTo(
                                [
                                    value.lat,
                                    value.lng
                                ],
                                Math.max(
                                    map.getZoom(),
                                    17
                                ),
                                {
                                    duration:
                                        0.6
                                }
                            );
                        }

                        resolve(
                            value
                        );
                    },

                    reject,

                    {
                        enableHighAccuracy:
                            true,

                        timeout:
                            12000,

                        maximumAge:
                            10000
                    }
                );
            }
        );
    }

    if (locationBtn) {
        locationBtn.addEventListener(
            "click",
            function () {
                requestCurrentLocation(
                    true
                ).catch(
                    function () {
                        alert(
                            "現在地を取得できませんでした。位置情報の利用を許可してください。"
                        );
                    }
                );
            }
        );
    }

    // ============================================================
    // ルート作成
    // ============================================================
    async function createRoute() {
        if (
            !selectedSpots.length
        ) {
            alert(
                "まずスポットを1か所以上選択してください。"
            );

            return;
        }

        // 作成し直す前に古いナビ表示を完全に消す
        stopNavigation(
            false
        );

        clearRouteVisuals();

        let start =
            currentLocation;

        if (!start) {
            try {
                start =
                    await requestCurrentLocation(
                        false
                    );
            } catch (_) {
                // 位置情報が取れなくてもスポット間ルートは作成可能
            }
        }

        const allCoordinates =
            [];

        const legs = [];

        try {
            if (start) {
                const firstTarget =
                    selectedSpots[0];

                const firstRoute =
                    await getLocationToSpotRoute(
                        start,
                        firstTarget
                    );

                if (
                    firstRoute
                        .coordinates
                        .length >= 2
                ) {
                    allCoordinates.push(
                        ...firstRoute
                            .coordinates
                    );

                    legs.push({
                        from: {
                            ...start,
                            name: "現在地"
                        },

                        to:
                            firstTarget,

                        coordinates:
                            firstRoute
                                .coordinates,

                        source:
                            firstRoute
                                .source
                    });
                }
            }

            for (
                let i = 0;
                i <
                    selectedSpots.length -
                    1;
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
                    !route.coordinates ||
                    route.coordinates.length <
                        2
                ) {
                    throw new Error(
                        `${from.id} → ${to.id}`
                    );
                }

                const points =
                    route.coordinates
                        .slice();

                if (
                    allCoordinates.length
                ) {
                    points.shift();
                }

                allCoordinates.push(
                    ...points
                );

                legs.push({
                    from,
                    to,
                    coordinates:
                        route.coordinates,
                    source:
                        route.source
                });
            }
        } catch (
            error
        ) {
            console.error(
                "ルート作成エラー:",
                error
            );

            alert(
                "徒歩ルートを取得できませんでした。routes.json / OSRM の接続を確認してください。"
            );

            return;
        }

        // 1地点だけ＋現在地なしなら、その地点へフォーカスするだけ
        if (
            allCoordinates.length <
            2
        ) {
            const first =
                selectedSpots[0];

            map.flyTo(
                [
                    Number(
                        first.lat
                    ),
                    Number(
                        first.lng
                    )
                ],
                17,
                {
                    duration:
                        0.5
                }
            );

            renderRouteNumberMarkers();
            updateInfo();

            return;
        }

        routeSegments =
            legs;

        navigationLegs =
            legs;

        navigationLegIndex =
            0;

        routeLine =
            L.polyline(
                allCoordinates,
                {
                    pane:
                        "plannerRoutePane",

                    color:
                        ROUTE_COLOR,

                    weight:
                        6,

                    opacity:
                        0.88,

                    lineCap:
                        "round",

                    lineJoin:
                        "round"
                }
            ).addTo(
                map
            );

        addRouteDirectionArrows(
            allCoordinates
        );

        renderRouteNumberMarkers();

        map.fitBounds(
            routeLine.getBounds(),
            {
                padding: [
                    70,
                    170
                ]
            }
        );

        const km =
            routeDistanceKm(
                allCoordinates
            );

        const walkingMinutes =
            Math.ceil(
                (
                    km * 1000
                ) / 80
            );

        if (distanceEl) {
            distanceEl.textContent =
                `${km.toFixed(2)} km`;
        }

        if (walkTimeEl) {
            walkTimeEl.textContent =
                formatTime(
                    walkingMinutes
                );
        }

        showNavCard();

        if (navStatus()) {
            navStatus().textContent =
                "ルート作成済み";
        }

        if (navTitle()) {
            navTitle().textContent =
                `次の目的地：${
                    text(
                        selectedSpots[0]
                            .name
                    )
                }`;
        }

        setNavMeta([
            `${selectedSpots.length}スポット`,
            `${km.toFixed(2)} km`,
            formatTime(
                walkingMinutes
            )
        ]);

        if (navArrival()) {
            navArrival().style.display =
                "none";

            navArrival().innerHTML =
                "";
        }

        updateInfo();
    }

    if (createRouteBtn) {
        createRouteBtn.addEventListener(
            "click",
            createRoute
        );
    }

    // ============================================================
    // ナビ
    // ============================================================
    async function startNavigation() {
        if (
            !navigationLegs.length
        ) {
            if (!routeLine) {
                await createRoute();
            }

            if (
                !navigationLegs.length
            ) {
                return;
            }
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

        showNavCard();

        if (navStatus()) {
            navStatus().textContent =
                "ナビ中";
        }

        if (navArrival()) {
            navArrival().style.display =
                "none";

            navArrival().innerHTML =
                "";
        }

        if (
            navigationWatchId !==
            null
        ) {
            navigator.geolocation.clearWatch(
                navigationWatchId
            );
        }

        try {
            await requestCurrentLocation(
                false
            );
        } catch (_) {}

        navigationWatchId =
            navigator.geolocation.watchPosition(
                function (
                    position
                ) {
                    const value =
                        {
                            lat:
                                position.coords
                                    .latitude,

                            lng:
                                position.coords
                                    .longitude,

                            accuracy:
                                Number(
                                    position.coords
                                        .accuracy ||
                                    0
                                )
                        };

                    setCurrentLocation(
                        value
                    );

                    updateNavigationByLocation(
                        value
                    );
                },

                function (
                    error
                ) {
                    console.error(
                        "位置情報エラー:",
                        error
                    );
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

        updateNavigationPanel();
    }

    function remainingDistanceMeters(
        points,
        position
    ) {
        if (
            !points?.length
        ) {
            return 0;
        }

        let bestIndex =
            0;

        let bestDistance =
            Infinity;

        for (
            let i = 0;
            i < points.length;
            i++
        ) {
            const d =
                map.distance(
                    position,
                    points[i]
                );

            if (
                d <
                bestDistance
            ) {
                bestDistance =
                    d;

                bestIndex =
                    i;
            }
        }

        let total =
            bestDistance;

        for (
            let i = bestIndex;
            i < points.length - 1;
            i++
        ) {
            total +=
                map.distance(
                    points[i],
                    points[
                        i + 1
                    ]
                );
        }

        return total;
    }

    function updateNavigationByLocation(
        position
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

        const target = [
            Number(
                leg.to.lat
            ),
            Number(
                leg.to.lng
            )
        ];

        const targetDistance =
            map.distance(
                [
                    position.lat,
                    position.lng
                ],
                target
            );

        if (
            targetDistance <=
            25
        ) {
            navigationLegIndex +=
                1;

            if (
                navigationLegIndex >=
                navigationLegs.length
            ) {
                completeNavigation();
                return;
            }
        }

        updateNavigationPanel();
    }

    function updateNavigationPanel() {
        if (
            !navigationLegs.length
        ) {
            return;
        }

        showNavCard();

        const leg =
            navigationLegs[
                Math.min(
                    navigationLegIndex,
                    navigationLegs.length - 1
                )
            ];

        const remaining =
            currentLocation
                ? remainingDistanceMeters(
                    leg.coordinates,
                    [
                        currentLocation.lat,
                        currentLocation.lng
                    ]
                )
                : map.distance(
                    [
                        Number(
                            leg.from.lat
                        ),
                        Number(
                            leg.from.lng
                        )
                    ],
                    [
                        Number(
                            leg.to.lat
                        ),
                        Number(
                            leg.to.lng
                        )
                    ]
                );

        const minutes =
            Math.ceil(
                remaining / 80
            );

        if (navStatus()) {
            navStatus().textContent =
                navigationActive
                    ? "ナビ中"
                    : "ルート作成済み";
        }

        if (navTitle()) {
            navTitle().textContent =
                `次の目的地：${
                    text(
                        leg.to.name
                    )
                }`;
        }

        setNavMeta([
            `残り ${
                remaining < 1000
                    ? Math.round(
                        remaining
                    ) + " m"
                    : (
                        remaining /
                        1000
                    ).toFixed(2) +
                    " km"
            }`,

            `徒歩 約${minutes}分`,

            leg.source ||
                ""
        ]);
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
        }

        navigationWatchId =
            null;

        navigationLegIndex =
            navigationLegs.length;

        if (navStatus()) {
            navStatus().textContent =
                "ルート完了";
        }

        if (navTitle()) {
            navTitle().textContent =
                "ルート完了";
        }

        if (navArrival()) {
            navArrival().style.display =
                "block";

            navArrival().innerHTML = `
                到着しました！<br>

                <button
                    id="plannerSurveyFromArrival"
                    type="button"
                    class="planner-v11-button primary"
                    style="margin-top:8px;"
                >
                    アンケートへ
                </button>
            `;

            document
                .getElementById(
                    "plannerSurveyFromArrival"
                )
                ?.addEventListener(
                    "click",
                    openGoogleForm
                );
        }

        setNavMeta([
            `${selectedSpots.length}か所を巡りました`
        ]);
    }

    function stopNavigation(
        resetRoute
    ) {
        navigationActive =
            false;

        if (
            navigationWatchId !==
            null
        ) {
            navigator.geolocation.clearWatch(
                navigationWatchId
            );
        }

        navigationWatchId =
            null;

        // ★ ナビ終了時に地図上のナビ表示を完全削除
        if (routeArrowLayer) {
            map.removeLayer(
                routeArrowLayer
            );

            routeArrowLayer =
                null;
        }

        if (routeLine) {
            map.removeLayer(
                routeLine
            );

            routeLine =
                null;
        }

        clearRouteNumberMarkers();

        if (
            resetRoute !== false
        ) {
            routeSegments =
                [];

            navigationLegs =
                [];

            navigationLegIndex =
                0;
        }

        const arrival =
            navArrival();

        if (arrival) {
            arrival.style.display =
                "none";

            arrival.innerHTML =
                "";
        }

        hideNavCard();

        updateInfo();
    }

    // ============================================================
    // 情報表示
    // ============================================================
    function updateInfo() {
        if (spotCount) {
            spotCount.textContent =
                `${selectedSpots.length}か所`;
        }

        if (stayTimeEl) {
            const totalStay =
                selectedSpots.reduce(
                    function (
                        sum,
                        spot
                    ) {
                        return (
                            sum +
                            timeToMinutes(
                                spot.time
                            )
                        );
                    },
                    0
                );

            stayTimeEl.textContent =
                formatTime(
                    totalStay
                );
        }

        if (
            !selectedSpots.length
        ) {
            if (
                distanceEl &&
                !routeLine
            ) {
                distanceEl.textContent =
                    "0 km";
            }

            if (
                walkTimeEl &&
                !routeLine
            ) {
                walkTimeEl.textContent =
                    "0分";
            }
        }
    }

    // ============================================================
    // 保存・クリア
    // ============================================================
    if (saveRouteBtn) {
        saveRouteBtn.addEventListener(
            "click",
            function () {
                if (
                    !selectedSpots.length
                ) {
                    alert(
                        "保存するには1か所以上のスポットを選択してください。"
                    );

                    return;
                }

                localStorage.setItem(
                    SAVED_ROUTE_KEY,
                    JSON.stringify({
                        createdAt:
                            new Date()
                                .toISOString(),

                        spots:
                            selectedSpots.map(
                                spot =>
                                    spot.id
                            )
                    })
                );

                alert(
                    "ルートを保存しました！"
                );
            }
        );
    }

    if (clearBtn) {
        clearBtn.addEventListener(
            "click",
            function () {
                selectedSpots =
                    [];

                saveSelectedIDs();

                stopNavigation();

                clearRouteVisuals();

                navigationLegs =
                    [];

                navigationLegIndex =
                    0;

                activeCategory =
                    "all";

                if (searchInput) {
                    searchInput.value =
                        "";
                }

                filterSpots();

                updateSelected();

                updateInfo();

                map.setView(
                    [
                        34.96705,
                        135.7743
                    ],
                    16
                );
            }
        );
    }

    // ============================================================
    // データ読み込み
    //
    // ★ spots.json と routes.json を分離
    // ★ spots.json 読み込み後すぐ「すべて」を表示
    // ★ routes.json の失敗でスポット表示を止めない
    // ============================================================
    async function loadJSON(
        paths
    ) {
        let lastError =
            null;

        for (
            const path of paths
        ) {
            try {
                const response =
                    await fetch(
                        path,
                        {
                            cache:
                                "no-store"
                        }
                    );

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

                    path
                };
            } catch (
                error
            ) {
                lastError =
                    error;
            }
        }

        throw (
            lastError ||
            new Error(
                "JSON読み込み失敗"
            )
        );
    }

    async function loadSpots() {
        const result =
            await loadJSON(
                [
                    DATA_URL,
                    "./spots.json"
                ]
            );

        if (
            !Array.isArray(
                result.data
            )
        ) {
            throw new Error(
                "spots.jsonの形式が正しくありません。"
            );
        }

        spots =
            result.data;

        const savedIDs =
            loadSelectedIDs();

        selectedSpots =
            savedIDs
                .map(
                    id =>
                        spots.find(
                            spot =>
                                String(
                                    spot.id
                                ) ===
                                String(
                                    id
                                )
                        )
                )
                .filter(
                    Boolean
                );

        // ★ 初回は必ず「すべて」
        activeCategory =
            "all";

        categoryButtons.forEach(
            function (
                button
            ) {
                button.classList.toggle(
                    "active",
                    normalizeCategory(
                        button.dataset
                            .category ||
                        "all"
                    ) === "all"
                );
            }
        );

        // ★ JSON読み込み完了後すぐ全スポット表示
        createMarkers(
            spots
        );

        filterSpots();

        updateSelected();

        updateInfo();

        renderRouteNumberMarkers();

        console.log(
            "spots source:",
            result.path,
            "spots:",
            spots.length
        );
    }

    async function loadRoutes() {
        try {
            const result =
                await loadJSON(
                    ROUTE_URLS
                );

            routes =
                Array.isArray(
                    result.data
                )
                    ? result.data
                    : [];

            buildGraph();

            console.log(
                "routes source:",
                result.path,
                "routes:",
                routes.length
            );
        } catch (
            error
        ) {
            // routes.jsonがなくてもスポット表示には影響させない
            routes =
                [];

            buildGraph();

            console.warn(
                "routes.jsonを読み込めませんでした。必要に応じてOSRMを使用します。",
                error
            );
        }
    }

    // ============================================================
    // 初期化
    // ============================================================
    makeNavPanel();

    updateSheetSummary();

    // ★ Promise.all()を使わない
    // ★ spotsはspots単独で読み込み、最初から全部表示する
    loadSpots().catch(
        function (error) {
            console.error(
                "spots.json読み込みエラー:",
                error
            );

            if (spotList) {
                spotList.innerHTML = `
                    <div class="planner-data-error">

                        スポットデータを
                        読み込めませんでした。<br>

                        <code>
                            ${escapeHTML(
                                DATA_URL
                            )}
                        </code>
                        を確認してください。<br>

                        Live Serverで開いているか、
                        F12 → Console も確認してください。

                    </div>
                `;
            }
        }
    );

    loadRoutes();

    document.addEventListener(
        "languagechange",
        function () {
            filterSpots();
            updateSelected();
            updateInfo();
            updateSheetSummary();
        }
    );

    console.log(
        "planner.js initialization started"
    );
});
    // ============================================================
    // ルートグラフ
    // ============================================================

    function routePoint(route, key) {
        const p = route?.[key];
        if (!p) return null;

        if (Array.isArray(p)) {
            return {
                lat: Number(p[0]),
                lng: Number(p[1])
            };
        }

        if (typeof p === "object") {
            return {
                lat: Number(p.lat),
                lng: Number(p.lng)
            };
        }

        return null;
    }

    function normalizeRoute(route) {
        if (!route) return null;

        const from =
            route.from ??
            route.start ??
            route.source;

        const to =
            route.to ??
            route.end ??
            route.target;

        let path = route.path || route.coordinates || [];

        if (!Array.isArray(path)) {
            return null;
        }

        path = path
            .map(p => {
                if (Array.isArray(p)) {
                    return [
                        Number(p[0]),
                        Number(p[1])
                    ];
                }

                if (
                    p &&
                    typeof p === "object" &&
                    p.lat != null &&
                    p.lng != null
                ) {
                    return [
                        Number(p.lat),
                        Number(p.lng)
                    ];
                }

                return null;
            })
            .filter(
                p =>
                    p &&
                    Number.isFinite(p[0]) &&
                    Number.isFinite(p[1])
            );

        if (
            from == null ||
            to == null ||
            path.length < 2
        ) {
            return null;
        }

        return {
            ...route,
            from: String(from),
            to: String(to),
            path
        };
    }

    function prepareRouteGraph() {
        routes = routes
            .map(normalizeRoute)
            .filter(Boolean);
    }

    function routeCost(path) {
        if (!Array.isArray(path) || path.length < 2) {
            return Infinity;
        }

        let total = 0;

        for (let i = 0; i < path.length - 1; i++) {
            total += map.distance(
                path[i],
                path[i + 1]
            );
        }

        return total;
    }

    function graph() {
        const g = new Map();

        routes.forEach(r => {
            const a = String(r.from);
            const b = String(r.to);

            if (!g.has(a)) {
                g.set(a, []);
            }

            if (!g.has(b)) {
                g.set(b, []);
            }

            const cost = routeCost(r.path);

            g.get(a).push({
                to: b,
                path: r.path,
                cost,
                source: "routes.json"
            });

            g.get(b).push({
                to: a,
                path: [...r.path].reverse(),
                cost,
                source: "routes.json"
            });
        });

        return g;
    }

    function findGraphRoute(a, b) {
        a = String(a);
        b = String(b);

        if (a === b) {
            return {
                coordinates: [],
                legs: []
            };
        }

        const g = graph();

        if (
            !g.has(a) ||
            !g.has(b)
        ) {
            return null;
        }

        const dist = new Map();
        const prev = new Map();
        const used = new Set();
        const queue = [];

        g.forEach(
            (_, key) => {
                dist.set(key, Infinity);
            }
        );

        dist.set(a, 0);

        queue.push({
            node: a,
            distance: 0
        });

        while (queue.length) {
            queue.sort(
                (x, y) =>
                    x.distance -
                    y.distance
            );

            const current =
                queue.shift();

            if (!current) {
                continue;
            }

            if (
                used.has(
                    current.node
                )
            ) {
                continue;
            }

            used.add(
                current.node
            );

            if (
                current.node === b
            ) {
                break;
            }

            const edges =
                g.get(
                    current.node
                ) || [];

            edges.forEach(edge => {
                if (
                    used.has(
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
                        dist.get(
                            edge.to
                        ) ??
                        Infinity
                    )
                ) {
                    dist.set(
                        edge.to,
                        nextDistance
                    );

                    prev.set(
                        edge.to,
                        {
                            from:
                                current.node,
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
            });
        }

        if (!prev.has(b)) {
            return null;
        }

        const legs = [];

        let current = b;

        while (current !== a) {
            const previous =
                prev.get(current);

            if (!previous) {
                return null;
            }

            legs.push(
                previous.edge
            );

            current =
                previous.from;
        }

        legs.reverse();

        const coordinates = [];

        legs.forEach(
            (edge, index) => {
                const points =
                    edge.path.slice();

                if (index > 0) {
                    points.shift();
                }

                coordinates.push(
                    ...points
                );
            }
        );

        return {
            coordinates,
            legs
        };
    }

    // ============================================================
    // OSRM
    // ============================================================

    async function osrm(a, b) {
        const url =
            `https://router.project-osrm.org/route/v1/foot/` +
            `${a.lng},${a.lat};` +
            `${b.lng},${b.lat}` +
            `?overview=full&geometries=geojson`;

        const response =
            await fetch(url);

        if (!response.ok) {
            throw new Error(
                `OSRM ${response.status}`
            );
        }

        const data =
            await response.json();

        if (
            data.code !== "Ok" ||
            !data.routes?.[0]?.geometry?.coordinates
        ) {
            throw new Error(
                "OSRM route not found"
            );
        }

        return data.routes[0]
            .geometry
            .coordinates
            .map(
                coordinate => [
                    Number(coordinate[1]),
                    Number(coordinate[0])
                ]
            );
    }

    function nearestGraphSpot(
        lat,
        lng
    ) {
        const ids =
            new Set(
                routes.flatMap(
                    route => [
                        route.from,
                        route.to
                    ]
                )
            );

        let best = null;
        let bestMeters = Infinity;

        ids.forEach(id => {
            const spot =
                spots.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );

            if (!spot) {
                return;
            }

            const distance =
                map.distance(
                    [lat, lng],
                    [
                        Number(spot.lat),
                        Number(spot.lng)
                    ]
                );

            if (
                distance <
                bestMeters
            ) {
                bestMeters =
                    distance;

                best = spot;
            }
        });

        if (!best) {
            return null;
        }

        return {
            spot: best,
            meters: bestMeters
        };
    }

    async function routeFromLocation(
        location,
        target
    ) {
        const nearest =
            nearestGraphSpot(
                location.lat,
                location.lng
            );

        if (
            nearest &&
            nearest.meters <= 800
        ) {
            const graphRoute =
                findGraphRoute(
                    nearest.spot.id,
                    target.id
                );

            if (
                graphRoute &&
                graphRoute.coordinates &&
                graphRoute.coordinates.length >= 2
            ) {
                let approach = [];

                try {
                    approach =
                        await osrm(
                            location,
                            {
                                lat:
                                    Number(
                                        nearest.spot.lat
                                    ),
                                lng:
                                    Number(
                                        nearest.spot.lng
                                    )
                            }
                        );
                } catch (error) {
                    console.warn(
                        "現在地から参道までのOSRM取得に失敗:",
                        error
                    );
                }

                const points =
                    approach.length
                        ? approach.slice()
                        : [
                            [
                                location.lat,
                                location.lng
                            ]
                        ];

                const graphPoints =
                    graphRoute.coordinates.slice();

                if (
                    points.length &&
                    graphPoints.length &&
                    map.distance(
                        points[
                            points.length - 1
                        ],
                        graphPoints[0]
                    ) > 3
                ) {
                    points.push(
                        graphPoints[0]
                    );
                }

                if (
                    graphPoints.length > 1
                ) {
                    graphPoints.shift();

                    points.push(
                        ...graphPoints
                    );
                }

                return {
                    coordinates:
                        points,
                    source:
                        "HYBRID",
                    legs:
                        graphRoute.legs
                };
            }
        }

        return {
            coordinates:
                await osrm(
                    location,
                    {
                        lat:
                            Number(
                                target.lat
                            ),
                        lng:
                            Number(
                                target.lng
                            )
                    }
                ),
            source:
                "OSRM",
            legs: []
        };
    }

    async function walkingRoute(
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
            graphRoute.coordinates &&
            graphRoute.coordinates.length >= 2
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

        return {
            coordinates:
                await osrm(
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
                ),
            source:
                "OSRM",
            legs: []
        };
    }

    // ============================================================
    // ルート表示
    // ============================================================

    function clearRouteVisuals() {
        if (routeLine) {
            map.removeLayer(
                routeLine
            );
        }

        if (routeArrowLayer) {
            map.removeLayer(
                routeArrowLayer
            );
        }

        routeLine = null;
        routeArrowLayer = null;

        routeNumberMarkers.forEach(
            marker => {
                if (
                    map.hasLayer(marker)
                ) {
                    map.removeLayer(
                        marker
                    );
                }
            }
        );

        routeNumberMarkers = [];
    }

    function renderNumbers() {
        routeNumberMarkers.forEach(
            marker => {
                if (
                    map.hasLayer(marker)
                ) {
                    map.removeLayer(
                        marker
                    );
                }
            }
        );

        routeNumberMarkers = [];

        selectedSpots.forEach(
            (spot, index) => {
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
                            pane:
                                "numberPane",
                            interactive:
                                false,
                            icon:
                                L.divIcon({
                                    className:
                                        "planner-route-number-icon",
                                    html:
                                        `<div class="planner-v11-route-badge">${index + 1}</div>`,
                                    iconSize:
                                        [
                                            28,
                                            28
                                        ],
                                    iconAnchor:
                                        [
                                            -4,
                                            28
                                        ]
                                })
                        }
                    ).addTo(map);

                routeNumberMarkers.push(
                    marker
                );
            }
        );
    }

    function addArrows(points) {
        if (routeArrowLayer) {
            map.removeLayer(
                routeArrowLayer
            );
        }

        routeArrowLayer =
            L.layerGroup();

        if (
            !points ||
            points.length < 3
        ) {
            routeArrowLayer.addTo(
                map
            );

            return;
        }

        const step =
            Math.max(
                10,
                Math.floor(
                    points.length /
                    12
                )
            );

        for (
            let i = step;
            i < points.length - 1;
            i += step
        ) {
            const a =
                points[i];

            const b =
                points[
                    Math.min(
                        i + 2,
                        points.length - 1
                    )
                ];

            const angle =
                Math.atan2(
                    b[1] - a[1],
                    b[0] - a[0]
                ) *
                180 /
                Math.PI;

            routeArrowLayer.addLayer(
                L.marker(
                    a,
                    {
                        pane:
                            "routePane",
                        interactive:
                            false,
                        icon:
                            L.divIcon({
                                className:
                                    "planner-route-arrow",
                                html:
                                    `<span style="display:block;color:${ROUTE_COLOR};font-size:16px;font-weight:900;text-shadow:0 1px 4px rgba(255,255,255,.95);transform:rotate(${angle}deg)">▶</span>`,
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
                            })
                    }
                )
            );
        }

        routeArrowLayer.addTo(
            map
        );
    }

    // ============================================================
    // ルート作成
    // ============================================================

    async function createRoute() {
        if (
            !selectedSpots.length
        ) {
            alert(
                "まずスポットを1か所以上選択してください。"
            );

            return;
        }

        // 古いルートを完全削除
        clearRouteVisuals();

        const all = [];
        const navLegs = [];

        let location = null;

        try {
            location =
                await ensureLocation(
                    false
                );
        } catch (error) {
            console.warn(
                "現在地なしでルート作成:",
                error
            );
        }

        try {
            if (location) {
                const first =
                    await routeFromLocation(
                        location,
                        selectedSpots[0]
                    );

                all.push(
                    ...first.coordinates
                );

                navLegs.push({
                    from: {
                        name:
                            "現在地",
                        lat:
                            location.lat,
                        lng:
                            location.lng
                    },
                    to:
                        selectedSpots[0],
                    coordinates:
                        first.coordinates,
                    source:
                        first.source
                });
            }

            for (
                let i = 0;
                i <
                selectedSpots.length - 1;
                i++
            ) {
                const route =
                    await walkingRoute(
                        selectedSpots[i],
                        selectedSpots[i + 1]
                    );

                const points =
                    route.coordinates.slice();

                if (all.length) {
                    points.shift();
                }

                all.push(
                    ...points
                );

                navLegs.push({
                    from:
                        selectedSpots[i],
                    to:
                        selectedSpots[i + 1],
                    coordinates:
                        route.coordinates,
                    source:
                        route.source
                });
            }
        } catch (error) {
            console.error(
                "ルート作成エラー:",
                error
            );

            alert(
                "徒歩ルートを取得できませんでした。routes.json / OSRM を確認してください。"
            );

            return;
        }

        if (
            all.length < 2
        ) {
            alert(
                "ルートを作成できませんでした。"
            );

            return;
        }

        routeLine =
            L.polyline(
                all,
                {
                    pane:
                        "routePane",
                    color:
                        ROUTE_COLOR,
                    weight:
                        6,
                    opacity:
                        0.88,
                    lineCap:
                        "round",
                    lineJoin:
                        "round"
                }
            ).addTo(map);

        addArrows(all);
        renderNumbers();

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

        const km =
            calcDistance(all);

        if (distanceEl) {
            distanceEl.textContent =
                `${km.toFixed(2)} km`;
        }

        if (walkTimeEl) {
            walkTimeEl.textContent =
                fmtTime(
                    Math.ceil(
                        km * 1000 / 80
                    )
                );
        }

        navigationLegs =
            navLegs;

        navigationLegIndex = 0;

        showNav();
        updateNavPanel();
    }

    function calcDistance(points) {
        let meters = 0;

        for (
            let i = 0;
            i <
            points.length - 1;
            i++
        ) {
            meters +=
                map.distance(
                    points[i],
                    points[i + 1]
                );
        }

        return meters / 1000;
    }

    // ============================================================
    // ナビゲーションUI
    // ============================================================

    const nav =
        document.createElement(
            "div"
        );

    nav.className =
        "planner-v11-map-panel";

    nav.innerHTML = `
        <div
            id="plannerV11NavCard"
            class="planner-v11-nav-card is-hidden"
        >
            <div class="planner-v11-nav-top">
                <span class="planner-v11-nav-kicker">
                    NAVIGATION
                </span>

                <span
                    id="plannerV11NavStatus"
                    class="planner-v11-nav-status"
                >
                    準備中
                </span>
            </div>

            <h3
                id="plannerV11NavTitle"
                class="planner-v11-nav-title"
            >
                次の目的地
            </h3>

            <div
                id="plannerV11NavMeta"
                class="planner-v11-nav-meta"
            ></div>

            <div class="planner-v11-nav-actions">
                <button
                    id="plannerV11StartButton"
                    class="planner-v11-button primary"
                    type="button"
                >
                    現在地からナビ開始
                </button>

                <button
                    id="plannerV11StopButton"
                    class="planner-v11-button"
                    type="button"
                >
                    ナビ終了
                </button>
            </div>

            <div
                id="plannerV11Arrival"
                class="planner-v11-arrival"
                style="display:none"
            ></div>
        </div>
    `;

    map.getContainer().appendChild(
        nav
    );

    const navCard =
        $("plannerV11NavCard");

    const navStatus =
        $("plannerV11NavStatus");

    const navTitle =
        $("plannerV11NavTitle");

    const navMeta =
        $("plannerV11NavMeta");

    const navStartButton =
        $("plannerV11StartButton");

    const navStopButton =
        $("plannerV11StopButton");

    const navArrival =
        $("plannerV11Arrival");

    function showNav() {
        navCard?.classList.remove(
            "is-hidden"
        );
    }

    function hideNav() {
        navCard?.classList.add(
            "is-hidden"
        );
    }

    function navMetaSet(values) {
        if (!navMeta) {
            return;
        }

        navMeta.innerHTML =
            values
                .map(
                    value =>
                        `<span class="planner-v11-nav-chip">${esc(value)}</span>`
                )
                .join("");
    }

    function updateNavPreview() {
        if (
            !selectedSpots.length
        ) {
            hideNav();
            return;
        }

        showNav();

        if (navStatus) {
            navStatus.textContent =
                currentLocation
                    ? "現在地あり"
                    : "現在地を取得してください";
        }

        if (navTitle) {
            navTitle.textContent =
                `次の目的地：${text(
                    selectedSpots[0].name
                )}`;
        }

        navMetaSet([
            `${selectedSpots.length}スポット`,
            currentLocation
                ? "現在地"
                : "選択地点から開始"
        ]);
    }

    function updateNavPanel() {
        const leg =
            navigationLegs[
                navigationLegIndex
            ];

        if (!leg) {
            updateNavPreview();
            return;
        }

        if (navTitle) {
            navTitle.textContent =
                `次の目的地：${text(
                    leg.to.name
                )}`;
        }

        if (navStatus) {
            navStatus.textContent =
                navigationActive
                    ? `ナビ中 ${navigationLegIndex + 1}/${navigationLegs.length}`
                    : `ルート作成済み ${navigationLegIndex + 1}/${navigationLegs.length}`;
        }

        const km =
            calcDistance(
                leg.coordinates
            );

        navMetaSet([
            `${km.toFixed(2)} km`,
            fmtTime(
                Math.ceil(
                    km * 1000 / 80
                )
            ),
            leg.source === "routes.json"
                ? "参道・山道"
                : leg.source === "HYBRID"
                    ? "道路＋参道"
                    : "一般道路"
        ]);
    }

    // ============================================================
    // ナビ開始
    // ============================================================

    async function startNavigation() {
        if (
            !navigationLegs.length
        ) {
            await createRoute();
        }

        if (
            !navigationLegs.length ||
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

        navigationLegIndex =
            0;

        showNav();
        updateNavPanel();

        if (navStartButton) {
            navStartButton.disabled =
                true;

            navStartButton.textContent =
                "ナビゲーション中";
        }

        navigationWatchId =
            navigator.geolocation.watchPosition(
                position => {
                    const value = {
                        lat:
                            position.coords.latitude,
                        lng:
                            position.coords.longitude,
                        accuracy:
                            position.coords.accuracy
                    };

                    setLocation(
                        value,
                        false
                    );

                    updateNavigation(
                        value
                    );
                },
                error => {
                    console.error(
                        "位置情報監視エラー:",
                        error
                    );
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

    // ============================================================
    // ★ ナビ完全終了
    // ============================================================

    function stopNavigation() {
        console.log(
            "[Planner] ナビを完全終了します"
        );

        // 1. ナビ状態解除
        navigationActive =
            false;

        navigationLegIndex =
            0;

        // 2. GPS監視解除
        if (
            navigationWatchId !== null
        ) {
            try {
                navigator.geolocation.clearWatch(
                    navigationWatchId
                );
            } catch (error) {
                console.warn(
                    "watchPosition解除エラー:",
                    error
                );
            }
        }

        navigationWatchId =
            null;

        // 3. ★ ルート線を完全削除
        if (routeLine) {
            try {
                map.removeLayer(
                    routeLine
                );
            } catch (error) {
                console.warn(
                    "routeLine削除エラー:",
                    error
                );
            }

            routeLine = null;
        }

        // 4. ★ 方向矢印を完全削除
        if (routeArrowLayer) {
            try {
                map.removeLayer(
                    routeArrowLayer
                );
            } catch (error) {
                console.warn(
                    "routeArrowLayer削除エラー:",
                    error
                );
            }

            routeArrowLayer = null;
        }

        // 5. ★ ルート番号を完全削除
        routeNumberMarkers.forEach(
            marker => {
                try {
                    if (
                        map.hasLayer(
                            marker
                        )
                    ) {
                        map.removeLayer(
                            marker
                        );
                    }
                } catch (error) {
                    console.warn(
                        "ルート番号削除エラー:",
                        error
                    );
                }
            }
        );

        routeNumberMarkers =
            [];

        // 6. ナビ情報をリセット
        navigationLegs =
            [];

        if (navStartButton) {
            navStartButton.disabled =
                false;

            navStartButton.textContent =
                "現在地からナビ開始";
        }

        if (navStatus) {
            navStatus.textContent =
                "準備中";
        }

        if (navTitle) {
            navTitle.textContent =
                "次の目的地";
        }

        if (navMeta) {
            navMeta.innerHTML =
                "";
        }

        if (navArrival) {
            navArrival.style.display =
                "none";

            navArrival.innerHTML =
                "";
        }

        // 7. ★ ナビカード自体を終了
        hideNav();

        // 8. 通常のマップ表示へ戻す
        refreshDisplay();

        console.log(
            "[Planner] ナビ終了完了。ルート・矢印・番号・案内UIを削除しました。"
        );
    }

    function updateNavigation(
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

        const target = [
            Number(
                leg.to.lat
            ),
            Number(
                leg.to.lng
            )
        ];

        const direct =
            map.distance(
                [
                    location.lat,
                    location.lng
                ],
                target
            );

        const remaining =
            Math.max(
                0,
                getRemainingRouteDistance(
                    location,
                    leg.coordinates
                )
            );

        if (navStatus) {
            navStatus.textContent =
                `ナビ中 · 残り ${Math.round(
                    remaining
                )} m`;
        }

        navMetaSet([
            `${Math.round(
                remaining
            )} m`,
            fmtTime(
                Math.ceil(
                    remaining / 80
                )
            ),
            `${navigationLegIndex + 1}/${navigationLegs.length}`
        ]);

        if (
            direct <= 35
        ) {
            navigationLegIndex++;

            if (
                navigationLegIndex >=
                navigationLegs.length
            ) {
                completeNavigation();
            } else {
                updateNavPanel();
            }
        }
    }

    function getRemainingRouteDistance(
        location,
        points
    ) {
        if (
            !points ||
            !points.length
        ) {
            return 0;
        }

        let nearestIndex =
            0;

        let nearestDistance =
            Infinity;

        points.forEach(
            (point, index) => {
                const distance =
                    map.distance(
                        [
                            location.lat,
                            location.lng
                        ],
                        point
                    );

                if (
                    distance <
                    nearestDistance
                ) {
                    nearestDistance =
                        distance;

                    nearestIndex =
                        index;
                }
            }
        );

        let meters =
            nearestDistance;

        for (
            let i =
                nearestIndex;
            i <
            points.length - 1;
            i++
        ) {
            meters +=
                map.distance(
                    points[i],
                    points[i + 1]
                );
        }

        return meters;
    }

    function completeNavigation() {
        navigationActive =
            false;

        if (
            navigationWatchId !== null
        ) {
            navigator.geolocation.clearWatch(
                navigationWatchId
            );
        }

        navigationWatchId =
            null;

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

            if (GOOGLE_FORM_URL) {
                navArrival.innerHTML = `
                    到着しました！<br>
                    旅の感想をアンケートで教えてください。<br>
                    <button
                        id="surveyBtn"
                        class="planner-v11-button primary"
                        type="button"
                    >
                        アンケートへ
                    </button>
                `;

                $("surveyBtn")
                    ?.addEventListener(
                        "click",
                        () => {
                            window.open(
                                GOOGLE_FORM_URL,
                                "_blank",
                                "noopener,noreferrer"
                            );
                        }
                    );
            } else {
                navArrival.textContent =
                    "到着しました！ GoogleフォームのURLを設定するとアンケートへ進めます。";
            }
        }

        if (navStartButton) {
            navStartButton.disabled =
                false;

            navStartButton.textContent =
                "もう一度ナビ開始";
        }
    }

    navStartButton?.addEventListener(
        "click",
        () =>
            startNavigation()
                .catch(
                    console.error
                )
    );

    navStopButton?.addEventListener(
        "click",
        stopNavigation
    );

    // ============================================================
    // 現在地
    // ============================================================

    function setLocation(
        value,
        center = true
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
                        "currentPane",
                    zIndexOffset:
                        5000,
                    icon:
                        L.divIcon({
                            className:
                                "planner-current-icon",
                            html:
                                `<div class="planner-v11-current"></div>`,
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
                        })
                }
            )
                .addTo(map)
                .bindPopup(
                    `現在地${
                        value.accuracy
                            ? `（精度 約${Math.round(
                                value.accuracy
                            )}m）`
                            : ""
                    }`
                );

        if (center) {
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

        updateNavPreview();
    }

    function ensureLocation(
        center = true
    ) {
        if (
            currentLocation
        ) {
            setLocation(
                currentLocation,
                center
            );

            return Promise.resolve(
                currentLocation
            );
        }

        if (
            !navigator.geolocation
        ) {
            return Promise.reject(
                new Error(
                    "geolocation unavailable"
                )
            );
        }

        return new Promise(
            (
                resolve,
                reject
            ) => {
                navigator.geolocation.getCurrentPosition(
                    position => {
                        const value = {
                            lat:
                                position.coords.latitude,
                            lng:
                                position.coords.longitude,
                            accuracy:
                                position.coords.accuracy
                        };

                        setLocation(
                            value,
                            center
                        );

                        resolve(
                            value
                        );
                    },
                    reject,
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

    locationBtn?.addEventListener(
        "click",
        async () => {
            try {
                await ensureLocation(
                    true
                );
            } catch (error) {
                console.error(
                    error
                );

                alert(
                    "現在地を取得できませんでした。ブラウザの位置情報許可を確認してください。"
                );
            }
        }
    );

    // ============================================================
    // 情報更新
    // ============================================================

    function updateInfo() {
        if (spotCount) {
            spotCount.textContent =
                `${selectedSpots.length}か所`;
        }

        const stay =
            selectedSpots.reduce(
                (total, spot) =>
                    total +
                    minutes(
                        spot.time
                    ),
                0
            );

        if (stayTimeEl) {
            stayTimeEl.textContent =
                fmtTime(stay);
        }

        if (
            selectedSpots.length <
            2
        ) {
            if (distanceEl) {
                distanceEl.textContent =
                    "0 km";
            }

            if (walkTimeEl) {
                walkTimeEl.textContent =
                    "0分";
            }
        }
    }

    // ============================================================
    // ボタンイベント
    // ============================================================

    createRouteBtn?.addEventListener(
        "click",
        createRoute
    );

    clearBtn?.addEventListener(
        "click",
        () => {
            stopNavigation();

            selectedSpots = [];

            saveSelected();

            clearRouteVisuals();

            updateSelectedList();

            updateCards();

            refreshDisplay();

            updateInfo();

            hideNav();
        }
    );

    saveRouteBtn?.addEventListener(
        "click",
        () => {
            if (
                !selectedSpots.length
            ) {
                alert(
                    "保存するには1か所以上のスポットを選択してください。"
                );

                return;
            }

            localStorage.setItem(
                SAVED_ROUTE_KEY,
                JSON.stringify({
                    createdAt:
                        new Date()
                            .toISOString(),
                    spots:
                        selectedSpots.map(
                            spot =>
                                spot.id
                        )
                })
            );

            alert(
                "ルートを保存しました！"
            );
        }
    );

    searchInput?.addEventListener(
        "input",
        refreshDisplay
    );

    categoryButtons.forEach(
        button => {
            button.addEventListener(
                "click",
                () => {
                    categoryButtons.forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );

                    button.classList.add(
                        "active"
                    );

                    refreshDisplay();
                }
            );
        }
    );

    window.addEventListener(
        "languagechange",
        refreshDisplay
    );

    // ============================================================
    // JSON読み込み
    // ============================================================

    async function loadFirst(
        paths
    ) {
        let lastError =
            null;

        for (
            const path of paths
        ) {
            try {
                const response =
                    await fetch(
                        path,
                        {
                            cache:
                                "no-store"
                        }
                    );

                if (
                    !response.ok
                ) {
                    throw new Error(
                        `${path}: ${response.status}`
                    );
                }

                const data =
                    await response.json();

                return {
                    data,
                    path
                };
            } catch (error) {
                lastError =
                    error;

                console.warn(
                    "[Planner] JSON読み込み失敗:",
                    path,
                    error
                );
            }
        }

        throw (
            lastError ||
            new Error(
                "JSON読み込み失敗"
            )
        );
    }

    // ============================================================
    // 初期化
    // ============================================================

    Promise.all([
        loadFirst([
            DATA_URL,
            "./spots.json"
        ]),

        loadFirst(
            ROUTE_URLS
        )
    ])
        .then(
            ([
                spotResult,
                routeResult
            ]) => {
                if (
                    !Array.isArray(
                        spotResult.data
                    )
                ) {
                    throw new Error(
                        "spots.json format error"
                    );
                }

                spots =
                    spotResult.data;

                const savedIDs =
                    loadSelectedIDs();

                selectedSpots =
                    savedIDs
                        .map(
                            id =>
                                spots.find(
                                    spot =>
                                        String(
                                            spot.id
                                        ) ===
                                        String(
                                            id
                                        )
                                )
                        )
                        .filter(
                            Boolean
                        );

                routes =
                    Array.isArray(
                        routeResult.data
                    )
                        ? routeResult.data
                            .map(
                                normalizeRoute
                            )
                            .filter(
                                Boolean
                            )
                        : [];

                console.log(
                    "routes source:",
                    routeResult.path
                );

                console.log(
                    "V11 routes loaded:",
                    routes.length
                );

                // ★ 初回起動時は必ず「すべて」
                const allButton =
                    document.querySelector(
                        '.category[data-category="all"], .category[data-category="すべて"]'
                    );

                if (allButton) {
                    categoryButtons.forEach(
                        button =>
                            button.classList.remove(
                                "active"
                            )
                    );

                    allButton.classList.add(
                        "active"
                    );
                }

                // ★ JSONに登録された全スポットを表示
                refreshDisplay();

                updateSelectedList();

                updateInfo();

                updateNavPreview();

                console.log(
                    "[Planner] 初期化完了:",
                    spots.length,
                    "spots /",
                    routes.length,
                    "routes"
                );
            }
        )
        .catch(
            error => {
                console.error(
                    "planner初期化エラー:",
                    error
                );

                if (spotList) {
                    spotList.innerHTML = `
                        <p
                            style="
                                color:#b33;
                                line-height:1.7;
                            "
                        >
                            データを読み込めませんでした。<br>
                            Live Serverで開いているか、<br>
                            data/spots.json と
                            data/routes.json
                            を確認してください。
                        </p>
                    `;
                }
            }
        );
});
