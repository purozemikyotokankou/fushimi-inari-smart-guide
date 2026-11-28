/* Fushimi Inari Smart Guide — MapLibre module bridge (V215)
 * Prefer MapLibre GL JS 6 for rounded 3D building corners.
 * Keep a v5 fallback for WebGL1-only devices or CDN/module failures.
 * Load legacy global scripts sequentially so their dependency order is deterministic.
 */
(async function () {
    "use strict";

    const MAPLIBRE_V6_URL = "https://unpkg.com/maplibre-gl@6.20.0/dist/maplibre-gl.mjs";
    const MAPLIBRE_V5_URL = "https://unpkg.com/maplibre-gl@5.7.1/dist/maplibre-gl.js";

    function supportsWebGL2() {
        try {
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("webgl2");
            if (!context) return false;
            context.getExtension("WEBGL_lose_context")?.loseContext();
            return true;
        } catch (_) {
            return false;
        }
    }

    function showBootstrapError(message) {
        const status = document.getElementById("maplibreStatus");
        const text = document.getElementById("maplibreStatusText");
        if (status) {
            status.hidden = false;
            status.classList.add("is-error");
            status.setAttribute("aria-label", message);
        }
        if (text) text.textContent = message;
        console.error("[Fushimi Map] Bootstrap failed:", message);
    }

    function loadClassicScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = false;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`スクリプトを読み込めません: ${src}`));
            document.head.appendChild(script);
        });
    }

    async function prepareMapLibre() {
        if (supportsWebGL2()) {
            try {
                const library = await import(MAPLIBRE_V6_URL);
                if (!library || typeof library.Map !== "function" || !library.MercatorCoordinate) {
                    throw new Error("MapLibre GL JS 6 の必要な機能が見つかりません。");
                }
                window.maplibregl = library;
                window.FUSHIMI_MAPLIBRE_ROUNDED_CORNERS = true;
                window.FUSHIMI_MAPLIBRE_VERSION = "6.20.0";
                console.info("[Fushimi Map] MapLibre GL JS 6.20.0 loaded; rounded building corners enabled.");
                return;
            } catch (error) {
                console.warn("[Fushimi Map] MapLibre v6 unavailable; trying the compatible v5 fallback.", error);
            }
        } else {
            console.warn("[Fushimi Map] WebGL2 is unavailable; using the compatible v5 map renderer.");
        }

        await loadClassicScript(MAPLIBRE_V5_URL);
        if (!window.maplibregl || typeof window.maplibregl.Map !== "function") {
            throw new Error("新旧どちらの地図エンジンも起動できませんでした。");
        }
        window.FUSHIMI_MAPLIBRE_ROUNDED_CORNERS = false;
        window.FUSHIMI_MAPLIBRE_VERSION = "5.7.1-fallback";
    }

    async function boot() {
        try {
            await prepareMapLibre();
            const orderedScripts = [
                "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
                "js/language.js?v=204-popup-pane-gesture-fix",
                "js/map-engine-maplibre.js?v=215-auto-angle-rounded-buildings",
                "js/navigation-pdr.js?v=212-cluster-hidden",
                "js/planner.js?v=213-clean-status",
                "js/planner-weather.js?v=138",
                "js/planner-ambient-light.js?v=138"
            ];
            for (const src of orderedScripts) {
                await loadClassicScript(src);
            }
        } catch (error) {
            showBootstrapError("地図の準備に失敗しました。通信環境を確認してページを再読み込みしてください。");
        }
    }

    await boot();
})();
