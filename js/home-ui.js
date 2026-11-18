/* Home navigation + deferred hero playback. */
/* =========================================================
           現在のページを自動判定してLiquid Glassを付ける
        ========================================================= */
        document.addEventListener("DOMContentLoaded", function () {
            const current =
                (window.location.pathname.split("/").pop() || "home.html").toLowerCase();

            document
                .querySelectorAll(".liquid-nav-link")
                .forEach(function (link) {
                    const target =
                        (link.getAttribute("href") || "").toLowerCase();

                    const isActive = target === current;

                    link.classList.toggle("active", isActive);

                    if (isActive) {
                        link.setAttribute("aria-current", "page");
                    } else {
                        link.removeAttribute("aria-current");
                    }
                });
        });

/* =========================================================
           動画の準備ができたらヒーロー文字を表示
        ========================================================= */
        document.addEventListener("DOMContentLoaded", function () {
            const hero = document.querySelector(".home-hero");
            const video = document.querySelector(".home-hero-video");

            if (!hero) return;

            function showHero() {
                hero.classList.add("is-ready");
            }

            if (!video) {
                showHero();
                return;
            }

            if (video.readyState >= 2) {
                requestAnimationFrame(showHero);
                return;
            }

            video.addEventListener("loadeddata", showHero, { once: true });

            /* 動画読み込みが遅い環境でも文字を消したままにしない */
            window.setTimeout(showHero, 1200);

            // Start the decorative video only after the page has loaded and the browser is idle.
            // This keeps the language/home UI responsive on slower mobile connections.
            const startHeroPlayback = () => {
                if (document.hidden) return;
                const playAttempt = video.play();
                if (playAttempt && typeof playAttempt.catch === "function") playAttempt.catch(() => {});
            };
            const scheduleHeroPlayback = () => {
                if ("requestIdleCallback" in window) {
                    window.requestIdleCallback(startHeroPlayback, { timeout: 2500 });
                } else {
                    window.setTimeout(startHeroPlayback, 1200);
                }
            };
            if (document.readyState === "complete") scheduleHeroPlayback();
            else window.addEventListener("load", scheduleHeroPlayback, { once: true });

            // Do not spend decode/GPU time looping the background video in a hidden tab.
            const syncHeroPlayback = () => {
                if (document.hidden) {
                    video.pause();
                } else if (video.paused) {
                    const playAttempt = video.play();
                    if (playAttempt && typeof playAttempt.catch === "function") playAttempt.catch(() => {});
                }
            };
            document.addEventListener("visibilitychange", syncHeroPlayback, { passive: true });
        });
