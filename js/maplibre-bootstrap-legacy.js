/* Legacy-browser bootstrap. MapLibre v5 is used when ES modules are unavailable. */
(function () {
    "use strict";
    window.FUSHIMI_MAPLIBRE_ROUNDED_CORNERS = false;
    window.FUSHIMI_MAPLIBRE_VERSION = "5.7.1-legacy-fallback";
    var scripts = [
        "https://unpkg.com/maplibre-gl@5.7.1/dist/maplibre-gl.js",
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
        "js/language.js?v=204-popup-pane-gesture-fix",
        "js/map-engine-maplibre.js?v=216-dom-ready-map-boot",
        "js/navigation-pdr.js?v=212-cluster-hidden",
        "js/planner.js?v=216-dom-ready-map-boot",
        "js/planner-weather.js?v=138",
        "js/planner-ambient-light.js?v=138"
    ];
    function next(index) {
        if (index >= scripts.length) return;
        var script = document.createElement("script");
        script.src = scripts[index];
        script.async = false;
        script.onload = function () { next(index + 1); };
        script.onerror = function () {
            var status = document.getElementById("maplibreStatus");
            var text = document.getElementById("maplibreStatusText");
            if (status) { status.hidden = false; status.classList.add("is-error"); }
            if (text) text.textContent = "地図の準備に失敗しました。通信環境を確認して再読み込みしてください。";
        };
        document.head.appendChild(script);
    }
    next(0);
})();
