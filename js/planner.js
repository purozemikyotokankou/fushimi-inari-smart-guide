/* ================================================================
   Fushimi Inari Smart Guide / planner.js V11.7
   MARKER POPUP + LIQUID GLASS FINAL
   ================================================================ */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const BUILD_ID = "V11.7-MARKER-POPUP-FINAL";
    window.__FUSHIMI_PLANNER_BUILD__ = BUILD_ID;

    const SPOTS_URL = "./data/spots.json";
    const ROUTES_URL = "./data/routes.json";
    const ICON_DIR = "./images/icons/";
    const SELECTED_KEY = "plannerSelectedSpots";
    const SAVED_ROUTE_KEY = "selectedRoute";
    const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfZQYyVeUwdfxDnmGi2dWMtzfNxWuxCfhIR0BTycJzAO8pytQ/viewform?usp=dialog";

    const COLOR = {
        pin: "#ff4b00",
        route: "#e94709",
        gray: "#8A8A8E"
    };

    const CONFIG = {
        walkSpeed: 80,
        arrivalRadius: 35,
        arrowSpacing: 170,
        hybridRadius: 1200,
        hybridCandidates: 5
    };

    const $ = id => document.getElementById(id);

    const els = {
        spotList: $("spotList"),
        selectedList: $("selectedList"),
        search: $("searchInput"),
        location: $("locationBtn"),
        create: $("createRouteBtn"),
        clear: $("clearBtn"),
        save: $("saveRoute"),
        count: $("spotCount"),
        distance: $("distance"),
        walk: $("walkTime"),
        stay: $("stayTime")
    };

    const categoryButtons = document.querySelectorAll(".category");

    if (!window.L || !$("map")) {
        console.error("Leafletまたは#mapが見つかりません。");
        return;
    }

    let spots = [];
    let routes = [];
    let selectedSpots = [];
    let markers = new Map();

    let routeLine = null;
    let arrowLayer = null;
    let routeNumberMarkers = [];

    let currentLocation = null;
    let currentLocationMarker = null;
    let currentAccuracyCircle = null;
    let watchId = null;
    let locationPromise = null;

    let navigationLegs = [];
    let navigationLegIndex = 0;
    let navigationActive = false;
    let routeToken = 0;

    /* ============================================================
       MAP
       ============================================================ */

    const map = L.map("map", {
        zoomControl: true,
        preferCanvas: true
    }).setView([34.96705, 135.7743], 16);

    map.createPane("plannerGsiPane");
    map.getPane("plannerGsiPane").style.zIndex = "200";
    map.getPane("plannerGsiPane").style.filter = "grayscale(100%)";
    map.getPane("plannerGsiPane").style.webkitFilter = "grayscale(100%)";

    map.createPane("plannerRoutePane");
    map.getPane("plannerRoutePane").style.zIndex = "450";
    map.getPane("plannerRoutePane").style.pointerEvents = "none";

    map.createPane("plannerMarkerPane");
    map.getPane("plannerMarkerPane").style.zIndex = "650";
    map.getPane("plannerMarkerPane").style.pointerEvents = "auto";

    map.createPane("plannerArrowPane");
    map.getPane("plannerArrowPane").style.zIndex = "700";
    map.getPane("plannerArrowPane").style.pointerEvents = "none";

    map.createPane("plannerNumberPane");
    map.getPane("plannerNumberPane").style.zIndex = "720";
    map.getPane("plannerNumberPane").style.pointerEvents = "none";

    map.createPane("plannerCurrentPane");
    map.getPane("plannerCurrentPane").style.zIndex = "780";
    map.getPane("plannerCurrentPane").style.pointerEvents = "none";

    const gsiLayer = L.tileLayer(
        "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
        {
            maxZoom: 18,
            pane: "plannerGsiPane",
            attribution: '&copy; 国土地理院'
        }
    ).addTo(map);

    const osmLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        }
    );

    L.control.layers(
        {
            "地理院地図（モノクロ）": gsiLayer,
            "OpenStreetMap": osmLayer
        },
        null,
        { collapsed: true }
    ).addTo(map);

    /* ============================================================
       CSS
       ============================================================ */

    function injectCSS() {
        if ($("plannerV117CSS")) return;

        const style = document.createElement("style");
        style.id = "plannerV117CSS";

        style.textContent = `
            #map .leaflet-marker-icon.planner-marker-icon {
                pointer-events: auto !important;
                touch-action: manipulation !important;
                cursor: pointer !important;
            }

            #map #plannerMarkerPane {
                pointer-events: auto !important;
            }

            #map #plannerNumberPane,
            #map #plannerArrowPane,
            #map #plannerCurrentPane {
                pointer-events: none !important;
            }

            .planner-marker-root {
                position: relative;
                width: 58px;
                height: 68px;
                display: flex;
                align-items: flex-start;
                justify-content: center;
                perspective: 1000px;
                cursor: pointer;
                touch-action: manipulation;
                user-select: none;
            }

            .planner-marker-pin {
                position: relative;
                width: 50px;
                height: 50px;
                margin-top: 1px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid ${COLOR.pin};
                border-radius: 50%;
                background: linear-gradient(
                    145deg,
                    rgba(255,255,255,.97),
                    rgba(255,247,243,.82)
                );
                box-shadow:
                    0 8px 20px rgba(0,0,0,.12),
                    0 0 0 2px rgba(255,255,255,.82),
                    inset 0 1px 0 rgba(255,255,255,1);
                backdrop-filter: blur(16px) saturate(1.08);
                -webkit-backdrop-filter: blur(16px) saturate(1.08);
                transform-style: preserve-3d;
                transition:
                    transform .25s cubic-bezier(.16,1,.3,1),
                    box-shadow .25s ease;
            }

            .planner-marker-pin::after {
                content: "";
                position: absolute;
                left: 50%;
                bottom: -7px;
                width: 16px;
                height: 16px;
                transform: translateX(-50%) rotate(45deg);
                background: rgba(255,247,243,.88);
                border-right: 2px solid ${COLOR.pin};
                border-bottom: 2px solid ${COLOR.pin};
                z-index: -1;
            }

            .planner-marker-icon {
                position: absolute;
                left: 50%;
                top: 50%;
                width: 28px;
                height: 28px;
                object-fit: contain;
                transform: translate(-50%,-50%) scale(1);
                transition:
                    opacity .18s ease,
                    transform .25s cubic-bezier(.16,1,.3,1);
                pointer-events: none !important;
            }

            .planner-marker-icon.gray {
                opacity: 1;
            }

            .planner-marker-icon.color {
                opacity: 0;
            }

            .planner-marker-root:hover .planner-marker-pin {
                transform:
                    translateY(-3px)
                    scale(1.08);
                animation: plannerMarkerRotateX .8s ease;
                box-shadow:
                    0 12px 25px rgba(0,0,0,.18),
                    0 0 0 3px rgba(255,75,0,.12),
                    inset 0 1px 0 rgba(255,255,255,1);
            }

            .planner-marker-root:hover .planner-marker-icon.gray {
                opacity: 0;
            }

            .planner-marker-root:hover .planner-marker-icon.color {
                opacity: 1;
                transform:
                    translate(-50%,-50%)
                    scale(1.10);
            }

            .planner-marker-root.selected .planner-marker-pin {
                transform:
                    translateY(-3px)
                    scale(1.13);
                box-shadow:
                    0 14px 28px rgba(0,0,0,.21),
                    0 0 0 4px rgba(255,75,0,.20),
                    0 0 0 7px rgba(255,75,0,.07),
                    inset 0 1px 0 rgba(255,255,255,1);
                animation: none;
            }

            .planner-marker-root.selected .planner-marker-icon.gray {
                opacity: 0;
            }

            .planner-marker-root.selected .planner-marker-icon.color {
                opacity: 1;
                transform:
                    translate(-50%,-50%)
                    scale(1.22);
            }

            @keyframes plannerMarkerRotateX {
                0% {
                    transform:
                        translateY(-3px)
                        rotateX(0deg)
                        scale(1.08);
                }

                30% {
                    transform:
                        translateY(-3px)
                        rotateX(-11deg)
                        scale(1.08);
                }

                60% {
                    transform:
                        translateY(-3px)
                        rotateX(9deg)
                        scale(1.08);
                }

                100% {
                    transform:
                        translateY(-3px)
                        rotateX(0deg)
                        scale(1.08);
                }
            }

            .spot-list-window #spotList {
                display: grid;
                grid-template-columns:
                    repeat(2,minmax(0,1fr));
                gap: 16px;
                align-items: stretch;
            }

            .planner-spot-card {
                position: relative;
                overflow: hidden;
                min-width: 0;
                border:
                    1px solid
                    rgba(255,255,255,.78);
                border-radius: 24px;
                background:
                    linear-gradient(
                        145deg,
                        rgba(255,255,255,.78),
                        rgba(255,255,255,.46)
                    );
                box-shadow:
                    0 14px 34px
                    rgba(0,0,0,.055),
                    inset
                    0 1px 0
                    rgba(255,255,255,.92);
                backdrop-filter:
                    blur(20px)
                    saturate(1.16);
                -webkit-backdrop-filter:
                    blur(20px)
                    saturate(1.16);
                cursor: pointer;
                transition:
                    transform .22s
                    cubic-bezier(.16,1,.3,1),
                    box-shadow .22s ease,
                    border-color .22s ease;
            }

            .planner-spot-card:hover {
                transform: translateY(-4px);
                border-color:
                    rgba(255,75,0,.23);
                box-shadow:
                    0 20px 40px
                    rgba(0,0,0,.08),
                    inset
                    0 1px 0
                    rgba(255,255,255,.98);
            }

            .planner-spot-card.selected {
                border-color:
                    rgba(255,75,0,.44);
                background:
                    linear-gradient(
                        145deg,
                        rgba(255,255,255,.86),
                        rgba(255,241,235,.65)
                    );
                box-shadow:
                    0 18px 40px
                    rgba(233,71,9,.11),
                    0 0 0 2px
                    rgba(255,75,0,.08),
                    inset
                    0 1px 0
                    rgba(255,255,255,.98);
            }

            .planner-spot-photo {
                width: 100%;
                height: 160px;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                border-radius: 17px;
                margin: 0 0 12px;
                background:
                    linear-gradient(
                        145deg,
                        rgba(255,255,255,.95),
                        rgba(236,236,240,.74)
                    );
                color: ${COLOR.gray};
                font-size: 12px;
                font-weight: 900;
                letter-spacing: .22em;
                border:
                    1px solid
                    rgba(255,255,255,.9);
            }

            .planner-spot-photo img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .planner-spot-content {
                position: relative;
                z-index: 1;
                padding: 0 17px 17px;
            }

            .planner-spot-content h3 {
                margin: 0 0 7px;
                color: #202024;
                font-size: 18px;
                line-height: 1.4;
                font-weight: 900;
            }

            .planner-spot-category {
                display: inline-flex;
                align-items: center;
                min-height: 27px;
                margin: 0 0 9px;
                padding: 0 9px;
                border-radius: 999px;
                background: rgba(255,75,0,.08);
                border:
                    1px solid
                    rgba(255,255,255,.76);
                color: #A9441F;
                font-size: 11px;
                font-weight: 850;
            }

            .planner-spot-description {
                margin: 0 0 9px;
                color: #636369;
                font-size: 13px;
                line-height: 1.7;
            }

            .planner-spot-time {
                margin: 0 0 10px;
                color: #4A4A4F;
                font-size: 12px;
                font-weight: 800;
            }

            .planner-selected-label {
                display: inline-flex;
                align-items: center;
                min-height: 28px;
                padding: 0 10px;
                border-radius: 999px;
                color: #fff;
                background:
                    linear-gradient(
                        145deg,
                        ${COLOR.pin},
                        #cf430a
                    );
                font-size: 11px;
                font-weight: 900;
                box-shadow:
                    0 7px 16px
                    rgba(255,75,0,.18);
            }

            .planner-popup {
                width: 290px;
                max-width: 290px;
            }

            .planner-popup h3 {
                margin: 0 0 8px;
                color: #18181b;
                font-size: 18px;
                line-height: 1.35;
                font-weight: 900;
            }

            .planner-popup-category {
                display: inline-flex;
                align-items: center;
                min-height: 28px;
                padding: 0 10px;
                margin: 0 0 9px;
                border-radius: 999px;
                background: rgba(255,75,0,.09);
                color: #B8491F;
                font-size: 11px;
                font-weight: 800;
            }

            .planner-popup p {
                margin: 0 0 10px;
                color: #5D5D63;
                font-size: 13px;
                line-height: 1.7;
            }

            .planner-popup-select {
                width: 100%;
                min-height: 43px;
                border:
                    1px solid
                    rgba(255,255,255,.88);
                border-radius: 999px;
                background:
                    linear-gradient(
                        145deg,
                        rgba(255,255,255,.97),
                        rgba(255,255,255,.60)
                    );
                color: #222225;
                font: inherit;
                font-size: 13px;
                font-weight: 850;
                cursor: pointer;
                touch-action: manipulation;
                box-shadow:
                    0 8px 22px
                    rgba(0,0,0,.08),
                    inset
                    0 1px 0
                    rgba(255,255,255,.98);
            }

            .planner-popup-select.selected {
                color: #fff;
                background:
                    linear-gradient(
                        145deg,
                        ${COLOR.pin},
                        #cc4007
                    );
            }

            .leaflet-popup-pane {
                z-index: 1200 !important;
                pointer-events: auto !important;
            }

            .leaflet-popup-content-wrapper {
                border-radius: 19px !important;
                border:
                    1px solid
                    rgba(255,255,255,.86);
                background:
                    linear-gradient(
                        145deg,
                        rgba(255,255,255,.97),
                        rgba(247,247,249,.92)
                    );
                box-shadow:
                    0 18px 45px
                    rgba(0,0,0,.18),
                    inset
                    0 1px 0
                    rgba(255,255,255,1);
                backdrop-filter:
                    blur(16px);
                -webkit-backdrop-filter:
                    blur(16px);
            }

            .leaflet-popup-tip {
                background:
                    rgba(255,255,255,.96) !important;
            }

            .planner-route-number {
                width: 31px;
                height: 31px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid #fff;
                border-radius: 50%;
                background: ${COLOR.route};
                color: #fff;
                font-size: 12px;
                font-weight: 900;
                box-shadow:
                    0 7px 18px
                    rgba(0,0,0,.2);
                pointer-events: none;
            }

            .planner-route-arrow {
                width: 0;
                height: 0;
                border-left:
                    5px solid transparent;
                border-right:
                    5px solid transparent;
                border-bottom:
                    11px solid ${COLOR.route};
                filter:
                    drop-shadow(
                        0 2px 4px
                        rgba(0,0,0,.18)
                    );
                pointer-events: none;
            }

            .planner-current {
                width: 46px;
                height: 46px;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .planner-current-pulse {
                position: absolute;
                inset: 5px;
                border-radius: 50%;
                background:
                    rgba(255,75,0,.16);
                border:
                    1px solid
                    rgba(255,75,0,.25);
                animation:
                    plannerCurrentPulse
                    2s ease-out infinite;
            }

            .planner-current-pulse.delay {
                animation-delay: -1s;
            }

            .planner-current-core {
                width: 15px;
                height: 15px;
                border: 3px solid #fff;
                border-radius: 50%;
                background: ${COLOR.pin};
                box-shadow:
                    0 4px 13px
                    rgba(0,0,0,.24);
            }

            @keyframes plannerCurrentPulse {
                0% {
                    transform: scale(.7);
                    opacity: .85;
                }

                70% {
                    transform: scale(1.8);
                    opacity: 0;
                }

                100% {
                    transform: scale(1.8);
                    opacity: 0;
                }
            }

            .planner-navigation-wrap {
                position: absolute;
                left: 9px;
                right: 9px;
                bottom: 9px;
                z-index: 1300;
                display: flex;
                justify-content: center;
                pointer-events: none;
            }

            .planner-navigation {
                width:
                    min(
                        560px,
                        calc(100% - 4px)
                    );
                padding: 15px 16px;
                border-radius: 23px;
                border:
                    1px solid
                    rgba(255,255,255,.87);
                background:
                    linear-gradient(
                        145deg,
                        rgba(255,255,255,.86),
                        rgba(255,255,255,.58)
                    );
                box-shadow:
                    0 20px 50px
                    rgba(0,0,0,.17),
                    inset
                    0 1px 0
                    rgba(255,255,255,.98);
                backdrop-filter:
                    blur(23px)
                    saturate(1.12);
                -webkit-backdrop-filter:
                    blur(23px)
                    saturate(1.12);
                pointer-events: auto;
            }

            .planner-navigation.hidden {
                display: none;
            }

            .planner-nav-kicker {
                color: #77777d;
                font-size: 10px;
                font-weight: 900;
                letter-spacing: .16em;
            }

            .planner-nav-status {
                color: #77777d;
                font-size: 11px;
                font-weight: 800;
            }

            .planner-nav-title {
                margin: 4px 0 0;
                color: #202024;
                font-size: 21px;
                line-height: 1.3;
                font-weight: 900;
            }

            .planner-nav-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 7px;
                margin-top: 10px;
            }

            .planner-nav-chip {
                display: inline-flex;
                align-items: center;
                min-height: 29px;
                padding: 0 10px;
                border-radius: 999px;
                border:
                    1px solid
                    rgba(255,255,255,.78);
                background:
                    rgba(255,255,255,.60);
                color: #48484d;
                font-size: 11px;
                font-weight: 800;
            }

            .planner-nav-progress {
                display: flex;
                align-items: center;
                gap: 5px;
                overflow-x: auto;
                margin-top: 10px;
                padding: 7px;
                border-radius: 16px;
                border:
                    1px solid
                    rgba(255,255,255,.72);
                background:
                    rgba(255,255,255,.46);
            }

            .planner-nav-step {
                flex: 0 0 auto;
                min-height: 27px;
                display: inline-flex;
                align-items: center;
                padding: 0 8px;
                border-radius: 999px;
                background:
                    rgba(255,255,255,.42);
                color: #8A8A8E;
                font-size: 11px;
                font-weight: 850;
            }

            .planner-nav-step.current {
                background: ${COLOR.route};
                color: #fff;
            }

            .planner-nav-step.done {
                background:
                    rgba(0,0,0,.06);
                color: #7d7d82;
            }

            .planner-nav-actions {
                display: flex;
                gap: 8px;
                margin-top: 10px;
            }

            .planner-nav-button {
                flex: 1;
                min-height: 42px;
                border:
                    1px solid
                    rgba(255,255,255,.86);
                border-radius: 999px;
                background:
                    linear-gradient(
                        145deg,
                        rgba(255,255,255,.93),
                        rgba(255,255,255,.56)
                    );
                color: #222225;
                font: inherit;
                font-size: 12px;
                font-weight: 850;
                cursor: pointer;
            }

            .planner-nav-button.primary {
                color: #fff;
                background:
                    linear-gradient(
                        145deg,
                        ${COLOR.pin},
                        #cc4007
                    );
                border-color: transparent;
            }

            .planner-nav-button:disabled {
                opacity: .45;
                cursor: not-allowed;
            }

            .planner-nav-arrival {
                margin-top: 9px;
                padding: 11px 12px;
                border-radius: 15px;
                background:
                    rgba(255,255,255,.52);
                font-size: 12px;
                line-height: 1.6;
            }

            .planner-nav-arrival strong {
                display: block;
                margin-bottom: 2px;
                font-size: 14px;
                font-weight: 900;
            }

            @media(max-width:760px){
                .spot-list-window #spotList{
                    grid-template-columns:1fr;
                }

                .planner-nav-actions{
                    flex-direction:column;
                }

                .planner-navigation{
                    border-radius:19px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    injectCSS();

    /* ============================================================
       NAVIGATION UI
       ============================================================ */

    const navWrap = document.createElement("div");
    navWrap.className = "planner-navigation-wrap";

    navWrap.innerHTML = `
        <div
            id="plannerNavigation"
            class="planner-navigation hidden"
        >
            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    gap:10px;
                "
            >
                <span class="planner-nav-kicker">
                    NAVIGATION
                </span>

                <span
                    id="plannerNavStatus"
                    class="planner-nav-status"
                >
                    準備中
                </span>
            </div>

            <h3
                id="plannerNavTitle"
                class="planner-nav-title"
            >
                次の目的地
            </h3>

            <div
                id="plannerNavMeta"
                class="planner-nav-meta"
            ></div>

            <div
                id="plannerNavProgress"
                class="planner-nav-progress"
            ></div>

            <div class="planner-nav-actions">
                <button
                    id="plannerNavStart"
                    class="planner-nav-button primary"
                    type="button"
                >
                    現在地からナビ開始
                </button>

                <button
                    id="plannerNavStop"
                    class="planner-nav-button"
                    type="button"
                >
                    ナビ終了
                </button>
            </div>

            <div
                id="plannerNavArrival"
                class="planner-nav-arrival"
                style="display:none;"
            ></div>
        </div>
    `;

    map.getContainer().appendChild(navWrap);

    const nav = {
        card: $("plannerNavigation"),
        status: $("plannerNavStatus"),
        title: $("plannerNavTitle"),
        meta: $("plannerNavMeta"),
        progress: $("plannerNavProgress"),
        start: $("plannerNavStart"),
        stop: $("plannerNavStop"),
        arrival: $("plannerNavArrival")
    };

    function showNavigation() {
        nav.card.classList.remove("hidden");
    }

    function hideNavigation() {
        nav.card.classList.add("hidden");
    }

    /* ============================================================
       UTIL
       ============================================================ */

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g,"&amp;")
            .replace(/</g,"&lt;")
            .replace(/>/g,"&gt;")
            .replace(/"/g,"&quot;")
            .replace(/'/g,"&#039;");
    }

    function getLanguage() {
        return localStorage.getItem("language") || "ja";
    }

    function localized(value) {
        if (value == null) return "";
        if (typeof value !== "object") return String(value);

        const l = getLanguage();

        return (
            value[l] ||
            value.ja ||
            value.en ||
            value.zh ||
            value.ko ||
            Object.values(value)[0] ||
            ""
        );
    }

    function safeURL(value) {
        try {
            const url =
                new URL(
                    value,
                    window.location.href
                );

            return (
                ["http:","https:"].includes(
                    url.protocol
                )
                    ? url.href
                    : ""
            );

        } catch (_) {
            return "";
        }
    }

    function formatDistance(meters) {
        const m =
            Math.max(
                0,
                Math.round(
                    Number(meters) || 0
                )
            );

        return (
            m < 1000
                ? `${m} m`
                : `${(m/1000).toFixed(2)} km`
        );
    }

    function formatMinutes(minutes) {
        const n =
            Math.max(
                0,
                Math.ceil(
                    Number(minutes) || 0
                )
            );

        if (n < 60) {
            return `${n}分`;
        }

        const h = Math.floor(n/60);
        const m = n % 60;

        return (
            m
                ? `${h}時間${m}分`
                : `${h}時間`
        );
    }

    function stayMinutes(value) {
        const s =
            String(value ?? "");

        const h =
            s.match(
                /(\d+(?:\.\d+)?)\s*(?:時間|hour|hours|시간|小时)/i
            );

        const m =
            s.match(
                /(\d+(?:\.\d+)?)\s*(?:分|minutes?|분|分钟)/i
            );

        let total = 0;

        if (h) {
            total +=
                Number(h[1]) * 60;
        }

        if (m) {
            total +=
                Number(m[1]);
        }

        if (!total) {
            const n =
                s.match(/\d+/);

            if (n) {
                total =
                    Number(n[0]);
            }
        }

        return Number.isFinite(total)
            ? Math.round(total)
            : 0;
    }

    function pointOfSpot(spot) {
        return [
            Number(spot.lat),
            Number(spot.lng)
        ];
    }

    function pathDistance(path) {
        if (
            !Array.isArray(path) ||
            path.length < 2
        ) {
            return 0;
        }

        let total = 0;

        for (
            let i = 0;
            i < path.length - 1;
            i++
        ) {
            total +=
                map.distance(
                    path[i],
                    path[i+1]
                );
        }

        return total;
    }

    function mergePath(a,b) {
        if (!a.length) return b.slice();
        if (!b.length) return a.slice();

        const out =
            a.slice();

        if (
            map.distance(
                out[out.length-1],
                b[0]
            ) <= 2
        ) {
            out.push(
                ...b.slice(1)
            );
        } else {
            out.push(
                ...b
            );
        }

        return out;
    }

    /* ============================================================
       CATEGORY
       ============================================================ */

    function normalizeCategory(value) {
        const v =
            String(value ?? "")
                .trim()
                .toLowerCase();

        if (
            [
                "all",
                "すべて",
                "全部"
            ].includes(v)
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
            ].includes(v)
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
            ].includes(v)
        ) {
            return "restaurant";
        }

        if (
            [
                "神社",
                "shrine",
                "신사"
            ].includes(v)
        ) {
            return "shrine";
        }

        if (
            [
                "登山",
                "ハイキング",
                "hiking",
                "trail",
                "산행"
            ].includes(v)
        ) {
            return "hiking";
        }

        if (
            [
                "交通",
                "transport",
                "station",
                "駅",
                "교통"
            ].includes(v)
        ) {
            return "transport";
        }

        if (
            [
                "トイレ",
                "便所",
                "toilet",
                "restroom",
                "화장실"
            ].includes(v)
        ) {
            return "toilet";
        }

        if (
            [
                "案内",
                "ガイド",
                "guide",
                "information",
                "안내"
            ].includes(v)
        ) {
            return "guide";
        }

        return (
            v || "guide"
        );
    }

    function categoryLabel(value) {
        return {
            all:
                "すべて",

            scenery:
                "景色・景観・展望",

            restaurant:
                "グルメ",

            shrine:
                "神社",

            hiking:
                "登山・ハイキング",

            transport:
                "交通",

            toilet:
                "トイレ",

            guide:
                "案内"

        }[
            normalizeCategory(
                value
            )
        ] ||
        String(value ?? "");
    }

    /* ============================================================
       ICON
       ============================================================ */

    function iconType(spot) {

        const raw =
            String(
                spot.iconType ||
                spot.icon ||
                spot.markerIcon ||
                ""
            )
            .trim()
            .toLowerCase();

        const aliases = {

            "景色":
                "viewpoint",

            "景観":
                "viewpoint",

            "展望":
                "viewpoint",

            "神社":
                "shrine",

            "登山":
                "hiking",

            "ハイキング":
                "hiking",

            "飲食店":
                "restaurant",

            "グルメ":
                "restaurant",

            "交通":
                "station-jr",

            "トイレ":
                "toilet",

            "案内":
                "guide",

            "駅":
                "station-jr"
        };

        if (aliases[raw]) {
            return aliases[raw];
        }

        if (raw) {
            return raw;
        }

        if (
            [
                "6",
                "13",
                "14"
            ].includes(
                String(spot.id)
            )
        ) {
            return "toilet";
        }

        if (
            String(spot.id) === "7"
        ) {
            return "station-keihan";
        }

        if (
            String(spot.id) === "8"
        ) {
            return "station-jr";
        }

        return {

            scenery:
                "viewpoint",

            restaurant:
                "restaurant",

            shrine:
                "shrine",

            hiking:
                "hiking",

            transport:
                "station-jr",

            toilet:
                "toilet",

            guide:
                "guide"

        }[
            normalizeCategory(
                spot.category
            )
        ] ||
        "guide";
    }

    function iconPath(
        type,
        gray
    ) {
        return (
            `${ICON_DIR}` +
            `${type}` +
            `${gray ? "-gray" : ""}` +
            `.svg`
        );
    }

    function markerZIndex(
        spot
    ) {

        const type =
            iconType(spot);

        const facilities = [

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
            "ostomate",

            "smoking",
            "exchange",
            "public-phone",
            "trash-box",

            "evacuation-shelter",
            "baggage-storage",
            "coin-locker",
            "rest-area"
        ];

        if (
            facilities.includes(
                type
            )
        ) {
            return 1400;
        }

        if (
            type === "station-jr" ||
            type === "station-keihan"
        ) {
            return 1200;
        }

        return 300;
    }

    /* ============================================================
       DATA
       ============================================================ */

    async function getJSON(
        url
    ) {

        const response =
            await fetch(
                `${url}?v=${encodeURIComponent(BUILD_ID)}`,
                {
                    cache:
                        "no-store"
                }
            );

        if (!response.ok) {
            throw new Error(
                `${url} の読み込みに失敗しました (${response.status})`
            );
        }

        return response.json();
    }

    async function loadData() {

        const [
            spotData,
            routeData
        ] =
            await Promise.all([
                getJSON(SPOTS_URL),
                getJSON(ROUTES_URL)
            ]);

        const spotArray =
            Array.isArray(
                spotData
            )
                ? spotData
                : (
                    spotData.spots ||
                    spotData.data ||
                    []
                );

        const routeArray =
            Array.isArray(
                routeData
            )
                ? routeData
                : (
                    routeData.routes ||
                    routeData.data ||
                    []
                );

        spots =
            spotArray
                .filter(
                    spot =>
                        spot &&
                        Number.isFinite(
                            Number(
                                spot.lat
                            )
                        ) &&
                        Number.isFinite(
                            Number(
                                spot.lng
                            )
                        )
                );

        routes =
            routeArray
                .map(route => {

                    const path =
                        (
                            route.path ||
                            []
                        )
                        .map(item => {

                            if (
                                Array.isArray(
                                    item
                                )
                            ) {
                                return [
                                    Number(
                                        item[0]
                                    ),
                                    Number(
                                        item[1]
                                    )
                                ];
                            }

                            return [
                                Number(
                                    item.lat
                                ),
                                Number(
                                    item.lng
                                )
                            ];
                        })
                        .filter(
                            p =>
                                Number.isFinite(
                                    p[0]
                                ) &&
                                Number.isFinite(
                                    p[1]
                                )
                        );

                    if (
                        !route.from ||
                        !route.to ||
                        path.length < 2
                    ) {
                        return null;
                    }

                    return {

                        from:
                            String(
                                route.from
                            ),

                        to:
                            String(
                                route.to
                            ),

                        name:
                            String(
                                route.name ||
                                ""
                            ),

                        path,

                        meters:
                            pathDistance(
                                path
                            )
                    };
                })
                .filter(Boolean);

        console.log(
            "routes source:",
            ROUTES_URL
        );

        console.log(
            `${BUILD_ID} routes loaded:`,
            routes.length
        );
    }

    /* ============================================================
       SELECTION
       ============================================================ */

    function loadSelected() {

        try {

            const ids =
                JSON.parse(
                    localStorage.getItem(
                        SELECTED_KEY
                    ) ||
                    "[]"
                );

            selectedSpots =
                Array.isArray(ids)
                    ? ids
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
                        .filter(Boolean)
                    : [];

        } catch (_) {

            selectedSpots = [];

        }
    }

    function saveSelected() {

        localStorage.setItem(
            SELECTED_KEY,
            JSON.stringify(
                selectedSpots.map(
                    spot =>
                        spot.id
                )
            )
        );
    }

    function isSelected(
        spot
    ) {

        return selectedSpots.some(
            item =>
                String(
                    item.id
                ) ===
                String(
                    spot.id
                )
        );
    }

    function selectedText() {

        const l =
            getLanguage();

        if (
            l === "en"
        ) {
            return "✓ Selected";
        }

        if (
            l === "zh"
        ) {
            return "✓ 已选择";
        }

        if (
            l === "ko"
        ) {
            return "✓ 선택됨";
        }

        return "✓ 選択中";
    }

    function toggleSpot(
        spot
    ) {

        const index =
            selectedSpots.findIndex(
                item =>
                    String(
                        item.id
                    ) ===
                    String(
                        spot.id
                    )
            );

        if (
            index >= 0
        ) {

            selectedSpots.splice(
                index,
                1
            );

        } else {

            selectedSpots.push(
                spot
            );
        }

        saveSelected();

        renderCards();

        updateSelectedList();

        updateInfo();

        refreshMarkers();

        renderRouteNumbers();

        updateNavigationPreview();
    }

    /* ============================================================
       CARDS
       ============================================================ */

    function photoHTML(spot,name) {
    const image = String(spot?.image || "").trim();

    if (!image) {
        return `
            <div class="planner-spot-photo">
                PHOTO
            </div>
        `;
    }

    const src = image.startsWith("http://") ||
                image.startsWith("https://")
        ? image
        : `./images/${encodeURIComponent(image)}`;

    return `
        <div class="planner-spot-photo">
            <img
                src="${escapeHTML(src)}"
                alt="${escapeHTML(name)}"
                loading="lazy"
                style="
                    display:block;
                    width:100%;
                    height:220px;
                    object-fit:cover;
                    border-radius:18px;
                "
                onerror="this.style.display='none'; this.parentElement.innerHTML='PHOTO';"
            >
        </div>
    `;
}

        const src =
            String(
                spot.image
            ).startsWith("http")
                ? String(
                    spot.image
                )
                : (
                    "./images/" +
                    encodeURIComponent(
                        String(
                            spot.image
                        )
                    )
                );

        return `
            <div
                class="planner-spot-photo"
            >
                <img
                    src="${escapeHTML(src)}"
                    alt="${escapeHTML(name)}"
                    loading="lazy"
                >
            </div>
        `;
    }

    function filteredSpots() {

        const q =
            String(
                els.search?.value ||
                ""
            )
            .trim()
            .toLowerCase();

        const activeButton =
            document.querySelector(
                ".category.active"
            );

        const active =
            normalizeCategory(
                activeButton?.dataset?.category ||
                activeButton?.textContent ||
                "all"
            );

        return spots.filter(
            spot => {

                const name =
                    localized(
                        spot.name
                    ).toLowerCase();

                const desc =
                    localized(
                        spot.description
                    ).toLowerCase();

                const cat =
                    normalizeCategory(
                        spot.category
                    );

                const searchOK =
                    !q ||
                    name.includes(q) ||
                    desc.includes(q) ||
                    String(
                        spot.category ||
                        ""
                    )
                    .toLowerCase()
                    .includes(q);

                const categoryOK =
                    active === "all" ||
                    cat === active;

                return (
                    searchOK &&
                    categoryOK
                );
            }
        );
    }

    function renderCards() {

        if (
            !els.spotList
        ) {
            return;
        }

        const list =
            filteredSpots();

        els.spotList.innerHTML =
            "";

        if (
            !list.length
        ) {

            els.spotList.innerHTML =
                `
                <p
                    style="
                        padding:12px;
                        color:#777;
                    "
                >
                    スポットが
                    見つかりませんでした。
                </p>
                `;

            return;
        }

        list.forEach(
            spot => {

                const card =
                    document.createElement(
                        "article"
                    );

                card.className =
                    "planner-spot-card" +
                    (
                        isSelected(
                            spot
                        )
                            ? " selected"
                            : ""
                    );

                card.dataset.spotId =
                    String(
                        spot.id
                    );

                const name =
                    localized(
                        spot.name
                    );

                const desc =
                    localized(
                        spot.description
                    );

                const site =
                    safeURL(
                        spot.url
                    );

                card.innerHTML = `
                    ${photoHTML(
                        spot,
                        name
                    )}

                    <div
                        class="
                            planner-spot-content
                        "
                    >

                        <h3>
                            ${escapeHTML(name)}
                        </h3>

                        <div
                            class="
                                planner-spot-category
                            "
                        >
                            ${escapeHTML(
                                categoryLabel(
                                    spot.category
                                )
                            )}
                        </div>

                        <p
                            class="
                                planner-spot-description
                            "
                        >
                            ${escapeHTML(
                                desc
                            )}
                        </p>

                        <p
                            class="
                                planner-spot-time
                            "
                        >
                            ⏱
                            ${escapeHTML(
                                spot.time ||
                                "-"
                            )}
                        </p>

                        ${
                            isSelected(
                                spot
                            )
                                ? `
                                <span
                                    class="
                                        planner-selected-label
                                    "
                                >
                                    ${escapeHTML(
                                        selectedText()
                                    )}
                                </span>
                                `
                                : ""
                        }

                        ${
                            site
                                ? `
                                <a
                                    href="${escapeHTML(site)}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style="
                                        display:inline-block;
                                        margin-top:9px;
                                        color:#A9441F;
                                        font-size:12px;
                                        font-weight:800;
                                        text-decoration:none;
                                    "
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
                    event => {

                        if (
                            event.target.closest(
                                "a"
                            )
                        ) {
                            return;
                        }

                        toggleSpot(
                            spot
                        );
                    }
                );

                els.spotList.appendChild(
                    card
                );
            }
        );
    }

    function updateSelectedList() {

        if (
            !els.selectedList
        ) {
            return;
        }

        els.selectedList.innerHTML =
            "";

        if (
            !selectedSpots.length
        ) {

            els.selectedList.innerHTML =
                `
                <p>
                    スポットを
                    選択してください。
                </p>
                `;

            return;
        }

        selectedSpots.forEach(
            (
                spot,
                index
            ) => {

                const row =
                    document.createElement(
                        "div"
                    );

                row.style.cssText =
                    `
                    display:flex;
                    align-items:center;
                    gap:10px;
                    padding:8px 0;
                    `;

                row.innerHTML = `
                    <strong
                        style="
                            color:${COLOR.pin};
                            font-size:18px;
                        "
                    >
                        ${index+1}
                    </strong>

                    <span
                        style="
                            flex:1;
                            font-weight:800;
                        "
                    >
                        ${escapeHTML(
                            localized(
                                spot.name
                            )
                        )}
                    </span>

                    <button
                        type="button"
                        aria-label="選択解除"
                        style="
                            border:0;
                            background:transparent;
                            color:#888;
                            font-size:20px;
                            cursor:pointer;
                        "
                    >
                        ×
                    </button>
                `;

                row
                    .querySelector(
                        "button"
                    )
                    .addEventListener(
                        "click",
                        event => {

                            event.stopPropagation();

                            selectedSpots =
                                selectedSpots.filter(
                                    item =>
                                        String(
                                            item.id
                                        ) !==
                                        String(
                                            spot.id
                                        )
                                );

                            saveSelected();

                            renderCards();

                            updateSelectedList();

                            updateInfo();

                            refreshMarkers();

                            renderRouteNumbers();

                            updateNavigationPreview();
                        }
                    );

                els.selectedList.appendChild(
                    row
                );
            }
        );
    }

    function updateInfo() {

        if (
            els.count
        ) {

            els.count.textContent =
                getLanguage() === "en"
                    ? `${selectedSpots.length} spots`
                    : `${selectedSpots.length}か所`;
        }

        if (
            els.stay
        ) {

            const stay =
                selectedSpots.reduce(
                    (
                        sum,
                        spot
                    ) =>
                        sum +
                        stayMinutes(
                            spot.time
                        ),
                    0
                );

            els.stay.textContent =
                formatMinutes(
                    stay
                );
        }
    }

    /* ============================================================
       MARKERS
       ============================================================ */

    function markerHTML(
        spot
    ) {

        const type =
            iconType(
                spot
            );

        const selected =
            isSelected(
                spot
            );

        return `
            <div
                class="
                    planner-marker-root
                    ${selected ? "selected" : ""}
                "
                data-marker-id="${escapeHTML(
                    String(
                        spot.id
                    )
                )}"
                role="button"
                tabindex="0"
                aria-label="${escapeHTML(
                    localized(
                        spot.name
                    )
                )}"
            >

                <div
                    class="
                        planner-marker-pin
                    "
                >

                    <img
                        class="
                            planner-marker-icon
                            gray
                        "
                        src="${escapeHTML(
                            iconPath(
                                type,
                                true
                            )
                        )}"
                        alt=""
                        draggable="false"
                    >

                    <img
                        class="
                            planner-marker-icon
                            color
                        "
                        src="${escapeHTML(
                            iconPath(
                                type,
                                false
                            )
                        )}"
                        alt=""
                        draggable="false"
                    >

                </div>

            </div>
        `;
    }

    function popupHTML(
        spot
    ) {

        const selected =
            isSelected(
                spot
            );

        const name =
            localized(
                spot.name
            );

        const desc =
            localized(
                spot.description
            );

        return `
            <div
                class="
                    planner-popup
                "
            >

                ${photoHTML(
                    spot,
                    name
                )}

                <h3>
                    ${escapeHTML(
                        name
                    )}
                </h3>

                <div
                    class="
                        planner-popup-category
                    "
                >
                    ${escapeHTML(
                        categoryLabel(
                            spot.category
                        )
                    )}
                </div>

                <p>
                    ${escapeHTML(
                        desc
                    )}
                </p>

                <p>
                    ⏱
                    ${escapeHTML(
                        spot.time ||
                        "-"
                    )}
                </p>

                <button
                    type="button"
                    class="
                        planner-popup-select
                        ${selected ? "selected" : ""}
                    "
                    data-popup-select="${escapeHTML(
                        String(
                            spot.id
                        )
                    )}"
                >
                    ${
                        selected
                            ? selectedText()
                            : getLanguage() === "en"
                                ? "Select this spot"
                                : getLanguage() === "zh"
                                    ? "选择此景点"
                                    : getLanguage() === "ko"
                                        ? "이 장소 선택"
                                        : "このスポットを選択"
                    }
                </button>

            </div>
        `;
    }

    function createMarker(
        spot
    ) {

        const marker =
            L.marker(
                pointOfSpot(
                    spot
                ),
                {

                    pane:
                        "plannerMarkerPane",

                    icon:
                        L.divIcon({

                            className:
                                "planner-marker-icon",

                            html:
                                markerHTML(
                                    spot
                                ),

                            iconSize:
                                [58,68],

                            iconAnchor:
                                [29,52],

                            popupAnchor:
                                [0,-50]
                        }),

                    zIndexOffset:
                        markerZIndex(
                            spot
                        ),

                    interactive:
                        true,

                    bubblingMouseEvents:
                        false,

                    riseOnHover:
                        true
                }
            );

        marker.bindPopup(
            popupHTML(
                spot
            ),
            {

                className:
                    "planner-liquid-popup",

                maxWidth:
                    340,

                minWidth:
                    250,

                autoPan:
                    true,

                closeButton:
                    true,

                closeOnClick:
                    false,

                autoClose:
                    true
            }
        );

        marker.on(
            "popupopen",
            () => {

                bindPopupButton(
                    marker,
                    spot
                );
            }
        );

        marker.on(
            "click",
            event => {

                if (
                    event?.originalEvent
                ) {

                    event
                        .originalEvent
                        .preventDefault?.();

                    event
                        .originalEvent
                        .stopPropagation?.();
                }

                marker.openPopup();
            }
        );

        marker.on(
            "add",
            () => {

                requestAnimationFrame(
                    () =>
                        attachNativeMarkerEvents(
                            marker,
                            spot
                        )
                );
            }
        );

        return marker;
    }

    function attachNativeMarkerEvents(
        marker,
        spot
    ) {

        const host =
            marker.getElement();

        if (!host) {
            return;
        }

        if (
            host.dataset
                .plannerBound ===
            "1"
        ) {
            return;
        }

        host.dataset
            .plannerBound = "1";

        host.style.pointerEvents =
            "auto";

        host.style.touchAction =
            "manipulation";

        const root =
            host.querySelector(
                `[data-marker-id="${CSS.escape(
                    String(
                        spot.id
                    )
                )}"]`
            );

        if (!root) {
            return;
        }

        const open =
            event => {

                event
                    .preventDefault?.();

                event
                    .stopPropagation?.();

                marker.openPopup();
            };

        root.addEventListener(
            "click",
            open,
            {
                passive:
                    false
            }
        );

        root.addEventListener(
            "touchend",
            open,
            {
                passive:
                    false
            }
        );

        root.addEventListener(
            "pointerup",
            open,
            {
                passive:
                    false
            }
        );

        root.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                        "Enter" ||
                    event.key ===
                        " "
                ) {
                    open(event);
                }
            }
        );
    }

    /*
       今回の最重要部分。

       Leaflet本体のクリックイベントだけではなく、
       地図のDOMをcapture=trueで監視する。

       そのため、
       ・PCクリック
       ・スマホタップ
       ・PointerEvent
       ・TouchEvent
       のいずれでもピンを開ける。
    */

    let lastDelegatedOpen =
        0;

    function delegatedMarkerOpen(
        event
    ) {

        const target =
            event.target;

        if (
            !target ||
            typeof target.closest !==
                "function"
        ) {
            return;
        }

        const root =
            target.closest(
                ".planner-marker-root"
            );

        if (!root) {
            return;
        }

        const id =
            root.getAttribute(
                "data-marker-id"
            );

        if (!id) {
            return;
        }

        const spot =
            spots.find(
                item =>
                    String(
                        item.id
                    ) ===
                    String(
                        id
                    )
            );

        const marker =
            markers.get(
                String(id)
            );

        if (
            !spot ||
            !marker
        ) {
            return;
        }

        const now =
            Date.now();

        if (
            now -
            lastDelegatedOpen <
                220
        ) {
            return;
        }

        lastDelegatedOpen =
            now;

        event
            .preventDefault?.();

        event
            .stopPropagation?.();

        marker.openPopup();
    }

    const mapContainer =
        map.getContainer();

    mapContainer.addEventListener(
        "pointerup",
        delegatedMarkerOpen,
        {
            capture:
                true,
            passive:
                false
        }
    );

    mapContainer.addEventListener(
        "click",
        delegatedMarkerOpen,
        {
            capture:
                true,
            passive:
                false
        }
    );

    mapContainer.addEventListener(
        "touchend",
        delegatedMarkerOpen,
        {
            capture:
                true,
            passive:
                false
        }
    );

    function bindPopupButton(
        marker,
        spot
    ) {

        const popupElement =
            marker
                .getPopup()
                ?.getElement();

        if (!popupElement) {
            return;
        }

        const button =
            popupElement.querySelector(
                `[data-popup-select="${CSS.escape(
                    String(
                        spot.id
                    )
                )}"]`
            );

        if (!button) {
            return;
        }

        if (
            button.dataset
                .bound ===
            "1"
        ) {
            return;
        }

        button.dataset
            .bound = "1";

        button.addEventListener(
            "click",
            event => {

                event
                    .preventDefault();

                event
                    .stopPropagation();

                toggleSpot(
                    spot
                );

                /*
                    toggleSpot()でマーカーが
                    再生成されるので、
                    新しいマーカーの
                    ポップアップを開き直す。
                */

                requestAnimationFrame(
                    () => {

                        const next =
                            markers.get(
                                String(
                                    spot.id
                                )
                            );

                        if (!next) {
                            return;
                        }

                        next.openPopup();

                        requestAnimationFrame(
                            () => {

                                bindPopupButton(
                                    next,
                                    spot
                                );
                            }
                        );
                    }
                );
            }
        );
    }

    function refreshMarkers() {

        markers.forEach(
            marker => {

                try {
                    marker.closePopup();
                } catch (_) {}

                map.removeLayer(
                    marker
                );
            }
        );

        markers.clear();

        filteredSpots().forEach(
            spot => {

                const marker =
                    createMarker(
                        spot
                    );

                marker.addTo(
                    map
                );

                markers.set(
                    String(
                        spot.id
                    ),
                    marker
                );

                requestAnimationFrame(
                    () =>
                        attachNativeMarkerEvents(
                            marker,
                            spot
                        )
                );
            }
        );
    }

    /* ============================================================
       CURRENT LOCATION
       ============================================================ */

    function currentLocationIcon() {

        return L.divIcon({

            className:
                "planner-current-icon",

            html:
                `
                <div
                    class="
                        planner-current
                    "
                >

                    <span
                        class="
                            planner-current-pulse
                        "
                    ></span>

                    <span
                        class="
                            planner-current-pulse
                            delay
                        "
                    ></span>

                    <span
                        class="
                            planner-current-core
                        "
                    ></span>

                </div>
                `,

            iconSize:
                [46,46],

            iconAnchor:
                [23,23]
        });
    }

    function setCurrentLocation(
        location,
        center = false
    ) {

        currentLocation =
            location;

        const latlng = [
            location.lat,
            location.lng
        ];

        if (
            !currentLocationMarker
        ) {

            currentLocationMarker =
                L.marker(
                    latlng,
                    {

                        pane:
                            "plannerCurrentPane",

                        icon:
                            currentLocationIcon(),

                        interactive:
                            false
                    }
                ).addTo(
                    map
                );

        } else {

            currentLocationMarker
                .setLatLng(
                    latlng
                );
        }

        if (
            currentAccuracyCircle
        ) {

            map.removeLayer(
                currentAccuracyCircle
            );
        }

        currentAccuracyCircle =
            null;

        if (
            Number(
                location.accuracy
            ) > 0
        ) {

            currentAccuracyCircle =
                L.circle(
                    latlng,
                    {

                        pane:
                            "plannerCurrentPane",

                        radius:
                            Math.min(
                                Math.max(
                                    Number(
                                        location.accuracy
                                    ),
                                    8
                                ),
                                80
                            ),

                        color:
                            COLOR.pin,

                        weight:
                            1,

                        opacity:
                            .23,

                        fillColor:
                            COLOR.pin,

                        fillOpacity:
                            .05,

                        interactive:
                            false
                    }
                ).addTo(
                    map
                );
        }

        if (
            center
        ) {

            map.setView(
                latlng,
                Math.max(
                    map.getZoom(),
                    17
                ),
                {
                    animate:
                        true
                }
            );
        }

        updateNavigationPreview();

        if (
            navigationActive
        ) {
            updateNavigationProgress();
        }
    }

    function getCurrentLocation(
        center = false,
        silent = false
    ) {

        if (
            !navigator.geolocation
        ) {

            if (!silent) {
                alert(
                    "このブラウザでは現在地を利用できません。"
                );
            }

            return Promise.reject(
                new Error(
                    "Geolocation unsupported"
                )
            );
        }

        if (
            locationPromise
        ) {
            return locationPromise;
        }

        locationPromise =
            new Promise(
                (
                    resolve,
                    reject
                ) => {

                    navigator.geolocation
                        .getCurrentPosition(

                            position => {

                                const location = {

                                    lat:
                                        position.coords.latitude,

                                    lng:
                                        position.coords.longitude,

                                    accuracy:
                                        position.coords.accuracy
                                };

                                setCurrentLocation(
                                    location,
                                    center
                                );

                                resolve(
                                    location
                                );
                            },

                            error => {

                                console.warn(
                                    "現在地取得エラー:",
                                    error
                                );

                                if (
                                    !silent
                                ) {

                                    alert(
                                        "現在地を取得できませんでした。ブラウザの位置情報許可を確認してください。"
                                    );
                                }

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
            )
            .finally(
                () =>
                    locationPromise =
                        null
            );

        return locationPromise;
    }

    function startWatch() {

        if (
            watchId !== null ||
            !navigator.geolocation
        ) {
            return;
        }

        watchId =
            navigator.geolocation
                .watchPosition(

                    position => {

                        setCurrentLocation(
                            {

                                lat:
                                    position.coords.latitude,

                                lng:
                                    position.coords.longitude,

                                accuracy:
                                    position.coords.accuracy
                            }
                        );
                    },

                    error =>
                        console.warn(
                            "位置追跡エラー:",
                            error
                        ),

                    {

                        enableHighAccuracy:
                            true,

                        timeout:
                            15000,

                        maximumAge:
                            5000
                    }
                );
    }

    function stopWatch() {

        if (
            watchId === null
        ) {
            return;
        }

        navigator.geolocation
            .clearWatch(
                watchId
            );

        watchId =
            null;
    }

    /* ============================================================
       GRAPH ROUTING
       ============================================================ */

    function buildGraph() {

        const graph =
            new Map();

        const add =
            (
                id,
                edge
            ) => {

                const key =
                    String(id);

                if (
                    !graph.has(
                        key
                    )
                ) {

                    graph.set(
                        key,
                        []
                    );
                }

                graph
                    .get(key)
                    .push(
                        edge
                    );
            };

        routes.forEach(
            route => {

                add(
                    route.from,
                    {

                        from:
                            route.from,

                        to:
                            route.to,

                        path:
                            route.path,

                        meters:
                            route.meters
                    }
                );

                add(
                    route.to,
                    {

                        from:
                            route.to,

                        to:
                            route.from,

                        path:
                            route.path
                                .slice()
                                .reverse(),

                        meters:
                            route.meters
                    }
                );
            }
        );

        return graph;
    }

    function edgeCost(
        edge,
        targetId
    ) {

        let cost =
            edge.meters;

        /*
            稲荷山山頂(ID 5)を
            目的地以外で通る場合は
            余計な山頂迂回を抑える。
        */

        if (
            String(edge.to) ===
                "5" &&
            String(targetId) !==
                "5"
        ) {

            cost +=
                1200;
        }

        if (
            String(edge.from) ===
                "5" &&
            String(targetId) !==
                "5"
        ) {

            cost +=
                350;
        }

        return cost;
    }

    function dijkstra(
        fromId,
        toId
    ) {

        const graph =
            buildGraph();

        const start =
            String(fromId);

        const target =
            String(toId);

        if (
            start === target
        ) {

            return {

                edges: [],

                meters: 0
            };
        }

        if (
            !graph.has(start) ||
            !graph.has(target)
        ) {

            return null;
        }

        const dist =
            new Map();

        const previous =
            new Map();

        const open =
            new Set(
                graph.keys()
            );

        graph.forEach(
            (_, id) =>
                dist.set(
                    id,
                    Infinity
                )
        );

        dist.set(
            start,
            0
        );

        while (
            open.size
        ) {

            let current =
                null;

            let best =
                Infinity;

            open.forEach(
                id => {

                    const value =
                        dist.get(id);

                    if (
                        value <
                        best
                    ) {

                        best =
                            value;

                        current =
                            id;
                    }
                }
            );

            if (
                current ===
                    null ||
                best === Infinity
            ) {
                break;
            }

            if (
                current ===
                target
            ) {
                break;
            }

            open.delete(
                current
            );

            for (
                const edge of
                    graph.get(
                        current
                    ) || []
            ) {

                if (
                    !open.has(
                        String(
                            edge.to
                        )
                    )
                ) {
                    continue;
                }

                const alt =
                    best +
                    edgeCost(
                        edge,
                        target
                    );

                if (
                    alt <
                    dist.get(
                        String(
                            edge.to
                        )
                    )
                ) {

                    dist.set(
                        String(
                            edge.to
                        ),
                        alt
                    );

                    previous.set(
                        String(
                            edge.to
                        ),
                        {

                            from:
                                current,

                            edge
                        }
                    );
                }
            }
        }

        if (
            !previous.has(
                target
            )
        ) {
            return null;
        }

        const edges =
            [];

        let cursor =
            target;

        while (
            cursor !==
            start
        ) {

            const item =
                previous.get(
                    cursor
                );

            if (!item) {
                return null;
            }

            edges.unshift(
                item.edge
            );

            cursor =
                item.from;
        }

        return {

            edges,

            meters:
                edges.reduce(
                    (
                        sum,
                        edge
                    ) =>
                        sum +
                        edge.meters,
                    0
                )
        };
    }

    function graphRoute(
        fromSpot,
        toSpot
    ) {

        const result =
            dijkstra(
                fromSpot.id,
                toSpot.id
            );

        if (!result) {
            return null;
        }

        let coordinates =
            [];

        result.edges.forEach(
            edge => {

                coordinates =
                    mergePath(
                        coordinates,
                        edge.path
                    );
            }
        );

        if (
            coordinates.length <
            2
        ) {
            return null;
        }

        return {

            coordinates,

            meters:
                pathDistance(
                    coordinates
                ),

            source:
                "ROUTES",

            edges:
                result.edges
        };
    }

    /* ============================================================
       OSRM
       ============================================================ */

    async function osrmRoute(
        from,
        to
    ) {

        const coords =
            `${from.lng},${from.lat};` +
            `${to.lng},${to.lat}`;

        const url =
            "https://router.project-osrm.org/" +
            `route/v1/foot/${coords}` +
            "?overview=full" +
            "&geometries=geojson";

        const response =
            await fetch(
                url,
                {
                    cache:
                        "no-store"
                }
            );

        if (
            !response.ok
        ) {

            throw new Error(
                `OSRM HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        const route =
            data?.routes?.[0];

        if (
            !route?.geometry?.coordinates
                ?.length
        ) {

            throw new Error(
                "OSRM徒歩ルートが見つかりませんでした。"
            );
        }

        const coordinates =
            route.geometry.coordinates.map(
                item =>
                    [
                        Number(
                            item[1]
                        ),
                        Number(
                            item[0]
                        )
                    ]
            );

        return {

            coordinates,

            meters:
                Number(
                    route.distance
                ) ||
                pathDistance(
                    coordinates
                ),

            source:
                "OSRM"
        };
    }

    function nearbyNetworkSpots(
        target
    ) {

        if (
            !currentLocation
        ) {
            return [];
        }

        const graph =
            buildGraph();

        const current =
            [
                currentLocation.lat,
                currentLocation.lng
            ];

        return Array.from(
            graph.keys()
        )
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
        .filter(Boolean)
        .filter(
            spot =>
                String(
                    spot.id
                ) !==
                String(
                    target.id
                )
        )
        .map(
            spot =>
                ({

                    spot,

                    distance:
                        map.distance(
                            current,
                            pointOfSpot(
                                spot
                            )
                        )
                })
        )
        .filter(
            item =>
                item.distance <=
                CONFIG.hybridRadius
        )
        .sort(
            (
                a,
                b
            ) =>
                a.distance -
                b.distance
        )
        .slice(
            0,
            CONFIG.hybridCandidates
        );
    }

    async function currentToFirst(
        target
    ) {

        const start = {

            lat:
                currentLocation.lat,

            lng:
                currentLocation.lng
        };

        let direct =
            null;

        try {

            direct =
                await osrmRoute(
                    start,
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

        } catch (
            error
        ) {

            console.warn(
                "現在地からOSRM取得失敗:",
                error
            );
        }

        let bestHybrid =
            null;

        for (
            const candidate of
                nearbyNetworkSpots(
                    target
                )
        ) {

            try {

                const network =
                    graphRoute(
                        candidate.spot,
                        target
                    );

                if (!network) {
                    continue;
                }

                const access =
                    await osrmRoute(
                        start,
                        {

                            lat:
                                Number(
                                    candidate.spot.lat
                                ),

                            lng:
                                Number(
                                    candidate.spot.lng
                                )
                        }
                    );

                const combined =
                    mergePath(
                        access.coordinates,
                        network.coordinates
                    );

                const meters =
                    pathDistance(
                        combined
                    );

                if (
                    !bestHybrid ||
                    meters <
                        bestHybrid.meters
                ) {

                    bestHybrid = {

                        coordinates:
                            combined,

                        meters,

                        source:
                            "HYBRID"
                    };
                }

            } catch (
                error
            ) {

                console.warn(
                    "Hybrid候補失敗:",
                    candidate.spot.id,
                    error
                );
            }
        }

        if (
            bestHybrid &&
            direct
        ) {

            const ratio =
                bestHybrid.meters /
                Math.max(
                    1,
                    direct.meters
                );

            if (
                ratio <= 1.45 ||
                ![
                    "7",
                    "8"
                ].includes(
                    String(
                        target.id
                    )
                )
            ) {

                return bestHybrid;
            }

            return direct;
        }

        if (
            bestHybrid
        ) {
            return bestHybrid;
        }

        if (
            direct
        ) {
            return direct;
        }

        throw new Error(
            "現在地から最初の目的地へのルートを取得できませんでした。"
        );
    }

    async function spotToSpot(
        from,
        to
    ) {

        const network =
            graphRoute(
                from,
                to
            );

        if (
            network
        ) {
            return network;
        }

        return osrmRoute(
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
    }

    async function buildNavigationLegs() {

        if (
            !selectedSpots.length
        ) {

            throw new Error(
                "1か所以上のスポットを選択してください。"
            );
        }

        if (
            !currentLocation
        ) {

            throw new Error(
                "現在地を取得できていません。"
            );
        }

        const legs =
            [];

        legs.push({

            target:
                selectedSpots[0],

            ...(
                await currentToFirst(
                    selectedSpots[0]
                )
            )
        });

        for (
            let i = 0;
            i <
            selectedSpots.length - 1;
            i++
        ) {

            legs.push({

                target:
                    selectedSpots[
                        i+1
                    ],

                ...(
                    await spotToSpot(
                        selectedSpots[i],
                        selectedSpots[i+1]
                    )
                )
            });
        }

        return legs;
    }

    /* ============================================================
       ROUTE DISPLAY
       ============================================================ */

    function clearRouteVisuals() {

        if (
            routeLine
        ) {

            map.removeLayer(
                routeLine
            );
        }

        routeLine =
            null;

        if (
            arrowLayer
        ) {

            map.removeLayer(
                arrowLayer
            );
        }

        arrowLayer =
            null;

        routeNumberMarkers.forEach(
            marker =>
                map.removeLayer(
                    marker
                )
        );

        routeNumberMarkers =
            [];
    }

    function bearing(
        a,
        b
    ) {

        const lat1 =
            a[0] *
            Math.PI /
            180;

        const lat2 =
            b[0] *
            Math.PI /
            180;

        const dLng =
            (
                b[1] -
                a[1]
            ) *
            Math.PI /
            180;

        const y =
            Math.sin(
                dLng
            ) *
            Math.cos(
                lat2
            );

        const x =
            Math.cos(
                lat1
            ) *
            Math.sin(
                lat2
            ) -
            Math.sin(
                lat1
            ) *
            Math.cos(
                lat2
            ) *
            Math.cos(
                dLng
            );

        return (
            Math.atan2(
                y,
                x
            ) *
            180 /
            Math.PI +
            360
        ) % 360;
    }

    function routeArrowPoints(
        path
    ) {

        const points =
            [];

        let traveled =
            0;

        let next =
            CONFIG.arrowSpacing;

        for (
            let i = 0;
            i < path.length - 1;
            i++
        ) {

            const a =
                path[i];

            const b =
                path[
                    i+1
                ];

            const segment =
                map.distance(
                    a,
                    b
                );

            if (
                segment <= 0
            ) {
                continue;
            }

            while (
                traveled +
                segment >=
                next
            ) {

                const ratio =
                    (
                        next -
                        traveled
                    ) /
                    segment;

                points.push({

                    point: [

                        a[0] +
                            (
                                b[0] -
                                a[0]
                            ) *
                            ratio,

                        a[1] +
                            (
                                b[1] -
                                a[1]
                            ) *
                            ratio
                    ],

                    angle:
                        bearing(
                            a,
                            b
                        )
                });

                next +=
                    CONFIG.arrowSpacing;
            }

            traveled +=
                segment;
        }

        return points;
    }

    function drawRoute(
        legs
    ) {

        clearRouteVisuals();

        let coordinates =
            [];

        legs.forEach(
            leg => {

                coordinates =
                    mergePath(
                        coordinates,
                        leg.coordinates
                    );
            }
        );

        if (
            coordinates.length <
            2
        ) {

            throw new Error(
                "ルート座標が不足しています。"
            );
        }

        routeLine =
            L.polyline(
                coordinates,
                {

                    pane:
                        "plannerRoutePane",

                    color:
                        COLOR.route,

                    weight:
                        6,

                    opacity:
                        .92,

                    lineCap:
                        "round",

                    lineJoin:
                        "round",

                    interactive:
                        false
                }
            ).addTo(
                map
            );

        arrowLayer =
            L.layerGroup()
                .addTo(
                    map
                );

        routeArrowPoints(
            coordinates
        ).forEach(
            item => {

                const marker =
                    L.marker(
                        item.point,
                        {

                            pane:
                                "plannerArrowPane",

                            interactive:
                                false,

                            icon:
                                L.divIcon({

                                    className:
                                        "planner-route-arrow-icon",

                                    html:
                                        `
                                        <span
                                            class="
                                                planner-route-arrow
                                            "
                                            style="
                                                transform:
                                                    rotate(
                                                        ${item.angle}deg
                                                    );
                                            "
                                        ></span>
                                        `,

                                    iconSize:
                                        [10,14],

                                    iconAnchor:
                                        [5,7]
                                })
                        }
                    );

                arrowLayer.addLayer(
                    marker
                );
            }
        );

        renderRouteNumbers();

        if (
            routeLine
                .getBounds()
                .isValid()
        ) {

            map.fitBounds(
                routeLine.getBounds(),
                {
                    padding:
                        [45,45]
                }
            );
        }

        const total =
            pathDistance(
                coordinates
            );

        if (
            els.distance
        ) {

            els.distance.textContent =
                formatDistance(
                    total
                );
        }

        if (
            els.walk
        ) {

            els.walk.textContent =
                formatMinutes(
                    total /
                    CONFIG.walkSpeed
                );
        }
    }

    function renderRouteNumbers() {

        routeNumberMarkers.forEach(
            marker =>
                map.removeLayer(
                    marker
                )
        );

        routeNumberMarkers =
            [];

        selectedSpots.forEach(
            (
                spot,
                index
            ) => {

                const marker =
                    L.marker(
                        pointOfSpot(
                            spot
                        ),
                        {

                            pane:
                                "plannerNumberPane",

                            interactive:
                                false,

                            icon:
                                L.divIcon({

                                    className:
                                        "planner-route-number-icon",

                                    html:
                                        `
                                        <div
                                            class="
                                                planner-route-number
                                            "
                                        >
                                            ${
                                                index +
                                                1
                                            }
                                        </div>
                                        `,

                                    iconSize:
                                        [31,31],

                                    iconAnchor:
                                        [15.5,15.5]
                                })
                        }
                    )
                    .addTo(
                        map
                    );

                routeNumberMarkers.push(
                    marker
                );
            }
        );
    }

    /* ============================================================
       NAVIGATION
       ============================================================ */

    function updateProgressUI() {

        nav.progress.innerHTML =
            "";

        const start =
            document.createElement(
                "span"
            );

        start.className =
            "planner-nav-step" +
            (
                navigationActive
                    ? ""
                    : " current"
            );

        start.textContent =
            "現在地";

        nav.progress.appendChild(
            start
        );

        selectedSpots.forEach(
            (
                spot,
                index
            ) => {

                const arrow =
                    document.createElement(
                        "span"
                    );

                arrow.textContent =
                    "↓";

                arrow.style.color =
                    "#999";

                nav.progress.appendChild(
                    arrow
                );

                const step =
                    document.createElement(
                        "span"
                    );

                step.className =
                    "planner-nav-step";

                step.textContent =
                    `${index+1} ${localized(
                        spot.name
                    )}`;

                if (
                    navigationActive &&
                    index ===
                        navigationLegIndex
                ) {

                    step.classList.add(
                        "current"
                    );
                }

                if (
                    navigationActive &&
                    index <
                        navigationLegIndex
                ) {

                    step.classList.add(
                        "done"
                    );
                }

                nav.progress.appendChild(
                    step
                );
            }
        );
    }

    function updateNavigationPreview() {

        if (
            !selectedSpots.length
        ) {

            hideNavigation();

            return;
        }

        showNavigation();

        if (
            !navigationActive
        ) {

            nav.status.textContent =
                currentLocation
                    ? "現在地取得済み"
                    : "現在地未取得";

            nav.title.textContent =
                localized(
                    selectedSpots[0].name
                );

            if (
                currentLocation
            ) {

                const d =
                    map.distance(
                        [
                            currentLocation.lat,
                            currentLocation.lng
                        ],
                        pointOfSpot(
                            selectedSpots[0]
                        )
                    );

                nav.meta.innerHTML = `
                    <span
                        class="
                            planner-nav-chip
                        "
                    >
                        現在地から 約
                        ${escapeHTML(
                            formatDistance(
                                d
                            )
                        )}
                    </span>
                `;

            } else {

                nav.meta.innerHTML = `
                    <span
                        class="
                            planner-nav-chip
                        "
                    >
                        現在地を
                        取得してください
                    </span>
                `;
            }
        }

        updateProgressUI();

        nav.start.disabled =
            !currentLocation ||
            navigationActive;
    }

    function nearestOnSegment(
        point,
        a,
        b
    ) {

        const latScale =
            111320 *
            Math.cos(
                point[0] *
                Math.PI /
                180
            );

        const lngScale =
            110540;

        const px =
            point[1] *
            latScale;

        const py =
            point[0] *
            lngScale;

        const ax =
            a[1] *
            latScale;

        const ay =
            a[0] *
            lngScale;

        const bx =
            b[1] *
            latScale;

        const by =
            b[0] *
            lngScale;

        const dx =
            bx - ax;

        const dy =
            by - ay;

        const denom =
            dx * dx +
            dy * dy;

        if (
            !denom
        ) {

            return {

                t:
                    0,

                distance:
                    map.distance(
                        point,
                        a
                    )
            };
        }

        const t =
            Math.max(
                0,
                Math.min(
                    1,
                    (
                        (
                            px -
                            ax
                        ) *
                        dx +
                        (
                            py -
                            ay
                        ) *
                        dy
                    ) /
                    denom
                )
            );

        const nearest =
            [

                a[0] +
                    (
                        b[0] -
                        a[0]
                    ) *
                    t,

                a[1] +
                    (
                        b[1] -
                        a[1]
                    ) *
                    t
            ];

        return {

            t,

            distance:
                map.distance(
                    point,
                    nearest
                )
        };
    }

    function remainingAlongPath(
        path,
        current
    ) {

        if (
            !current ||
            path.length <
                2
        ) {

            return pathDistance(
                path
            );
        }

        let best = {

            segment:
                0,

            t:
                0,

            distance:
                Infinity
        };

        for (
            let i = 0;
            i < path.length - 1;
            i++
        ) {

            const candidate =
                nearestOnSegment(
                    current,
                    path[i],
                    path[i+1]
                );

            if (
                candidate.distance <
                best.distance
            ) {

                best = {

                    segment:
                        i,

                    t:
                        candidate.t,

                    distance:
                        candidate.distance
                };
            }
        }

        let total =
            map.distance(
                path[
                    best.segment
                ],
                path[
                    best.segment + 1
                ]
            ) *
            (
                1 -
                best.t
            );

        for (
            let i =
                best.segment + 1;
            i <
                path.length - 1;
            i++
        ) {

            total +=
                map.distance(
                    path[i],
                    path[i+1]
                );
        }

        return Math.max(
            0,
            total
        );
    }

    function updateNavigationProgress() {

        if (
            !navigationActive ||
            !navigationLegs[
                navigationLegIndex
            ]
        ) {

            updateNavigationPreview();

            return;
        }

        const leg =
            navigationLegs[
                navigationLegIndex
            ];

        const current =
            currentLocation
                ? [
                    currentLocation.lat,
                    currentLocation.lng
                ]
                : null;

        const remaining =
            remainingAlongPath(
                leg.coordinates,
                current
            );

        if (
            current
        ) {

            const d =
                map.distance(
                    current,
                    pointOfSpot(
                        leg.target
                    )
                );

            if (
                d <=
                CONFIG.arrivalRadius
            ) {

                handleArrival();

                return;
            }
        }

        nav.status.textContent =
            "ナビ中";

        nav.title.textContent =
            localized(
                leg.target.name
            );

        nav.meta.innerHTML = `
            <span
                class="
                    planner-nav-chip
                "
            >
                残り
                ${escapeHTML(
                    formatDistance(
                        remaining
                    )
                )}
            </span>

            <span
                class="
                    planner-nav-chip
                "
            >
                徒歩 約
                ${escapeHTML(
                    formatMinutes(
                        remaining /
                        CONFIG.walkSpeed
                    )
                )}
            </span>

            <span
                class="
                    planner-nav-chip
                "
            >
                ${
                    leg.source ===
                        "ROUTES"
                        ? "参道ネットワーク"
                        : leg.source ===
                            "HYBRID"
                            ? "ハイブリッド"
                            : "一般道路"
                }
            </span>
        `;

        updateProgressUI();
    }

    async function createRoute() {

        if (
            !selectedSpots.length
        ) {

            alert(
                "1か所以上のスポットを選択してください。"
            );

            return;
        }

        if (
            !currentLocation
        ) {

            try {

                await getCurrentLocation(
                    false,
                    false
                );

            } catch (_) {

                return;
            }
        }

        const token =
            ++routeToken;

        showNavigation();

        nav.status.textContent =
            "ルート計算中";

        nav.title.textContent =
            "次の目的地";

        nav.meta.innerHTML = `
            <span
                class="
                    planner-nav-chip
                "
            >
                現在地から
                計算しています
            </span>
        `;

        try {

            const legs =
                await buildNavigationLegs();

            if (
                token !==
                routeToken
            ) {
                return;
            }

            navigationLegs =
                legs;

            navigationLegIndex =
                0;

            drawRoute(
                legs
            );

            updateNavigationPreview();

        } catch (
            error
        ) {

            console.error(
                "ルート作成エラー:",
                error
            );

            alert(
                error.message ||
                "徒歩ルートを作成できませんでした。"
            );
        }
    }

    async function startNavigation() {

        if (
            !selectedSpots.length
        ) {

            alert(
                "先にスポットを選択してください。"
            );

            return;
        }

        if (
            !navigationLegs.length
        ) {

            await createRoute();

            if (
                !navigationLegs.length
            ) {

                return;
            }
        }

        navigationActive =
            true;

        navigationLegIndex =
            0;

        startWatch();

        updateNavigationProgress();

        renderRouteNumbers();

        nav.start.disabled =
            true;

        nav.stop.disabled =
            false;
    }

    function handleArrival() {

        const arrived =
            navigationLegs[
                navigationLegIndex
            ]?.target;

        if (!arrived) {
            return;
        }

        nav.arrival.style.display =
            "block";

        nav.arrival.innerHTML = `
            <strong>
                ${escapeHTML(
                    localized(
                        arrived.name
                    )
                )}
                に到着
            </strong>

            目的地へ
            到着しました。
        `;

        navigationLegIndex += 1;

        if (
            navigationLegIndex >=
            navigationLegs.length
        ) {

            completeNavigation();

            return;
        }

        renderRouteNumbers();

        setTimeout(
            () => {

                nav.arrival.style.display =
                    "none";

                nav.arrival.innerHTML =
                    "";

                updateNavigationProgress();
            },
            450
        );
    }

    function getGoogleFormURL() {

        return (
            safeURL(
                document.body
                    ?.dataset
                    ?.googleFormUrl
            ) ||
            FORM_URL
        );
    }

    function openGoogleForm() {

        const url =
            getGoogleFormURL();

        window.location.href =
            url;
    }

    function completeNavigation() {

        navigationActive =
            false;

        stopWatch();

        navigationLegIndex =
            navigationLegs.length;

        renderRouteNumbers();

        nav.status.textContent =
            "ルート完了";

        nav.title.textContent =
            "ルート完了";

        nav.meta.innerHTML = `
            <span
                class="
                    planner-nav-chip
                "
            >
                ${selectedSpots.length}
                地点を巡りました
            </span>
        `;

        updateProgressUI();

        nav.arrival.style.display =
            "block";

        nav.arrival.innerHTML = `
            <strong>
                ルート完了
            </strong>
            アンケートへ進みます。
        `;

        setTimeout(
            openGoogleForm,
            650
        );
    }

    function stopNavigation(
        openForm = true
    ) {

        navigationActive =
            false;

        stopWatch();

        navigationLegIndex =
            0;

        nav.arrival.style.display =
            "none";

        nav.arrival.innerHTML =
            "";

        updateNavigationPreview();

        if (
            openForm
        ) {

            openGoogleForm();
        }
    }

    /* ============================================================
       EVENTS
       ============================================================ */

    nav.start.addEventListener(
        "click",
        startNavigation
    );

    nav.stop.addEventListener(
        "click",
        () =>
            stopNavigation(
                true
            )
    );

    if (
        els.location
    ) {

        els.location.addEventListener(
            "click",
            () =>
                getCurrentLocation(
                    true,
                    false
                ).catch(
                    () => {}
                )
        );
    }

    if (
        els.create
    ) {

        els.create.addEventListener(
            "click",
            createRoute
        );
    }

    if (
        els.clear
    ) {

        els.clear.addEventListener(
            "click",
            () => {

                routeToken += 1;

                stopNavigation(
                    false
                );

                clearRouteVisuals();

                navigationLegs =
                    [];

                navigationLegIndex =
                    0;

                selectedSpots =
                    [];

                saveSelected();

                renderCards();

                updateSelectedList();

                updateInfo();

                refreshMarkers();

                hideNavigation();
            }
        );
    }

    if (
        els.save
    ) {

        els.save.addEventListener(
            "click",
            () => {

                if (
                    !selectedSpots.length
                ) {

                    alert(
                        "保存するにはスポットを選択してください。"
                    );

                    return;
                }

                localStorage.setItem(
                    SAVED_ROUTE_KEY,
                    JSON.stringify({

                        createdAt:
                            new Date()
                                .toISOString(),

                        start:
                            "currentLocation",

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

    if (
        els.search
    ) {

        els.search.addEventListener(
            "input",
            () => {

                renderCards();

                refreshMarkers();
            }
        );
    }

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

                    renderCards();

                    refreshMarkers();
                }
            );
        }
    );

    window.addEventListener(
        "languagechange",
        () => {

            renderCards();

            refreshMarkers();

            updateSelectedList();

            updateInfo();

            updateNavigationPreview();
        }
    );

    window.addEventListener(
        "storage",
        event => {

            if (
                event.key ===
                "language"
            ) {

                renderCards();

                refreshMarkers();

                updateSelectedList();

                updateInfo();

                updateNavigationPreview();
            }
        }
    );

    /* ============================================================
       INIT
       ============================================================ */

    async function initialize() {

        try {

            await loadData();

            loadSelected();

            renderCards();

            updateSelectedList();

            updateInfo();

            refreshMarkers();

            updateNavigationPreview();

            /*
                起動時に現在地取得。
                許可されていない場合でも
                Planner自体は表示する。
            */

            getCurrentLocation(
                false,
                true
            ).catch(
                () => {

                    nav.status.textContent =
                        "現在地未取得";
                }
            );

            console.log(
                `[Fushimi Inari Smart Guide] ${BUILD_ID} initialized`,
                {
                    spots:
                        spots.length,

                    routes:
                        routes.length
                }
            );

        } catch (
            error
        ) {

            console.error(
                "planner初期化エラー:",
                error
            );

            if (
                els.spotList
            ) {

                els.spotList.innerHTML = `
                    <p
                        style="
                            padding:16px;
                            color:#777;
                            line-height:1.7;
                        "
                    >
                        Plannerの読み込みに
                        失敗しました。<br>
                        Live Serverで開いているか
                        確認してください。
                    </p>
                `;
            }
        }
    }

    initialize();
});
