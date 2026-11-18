document.addEventListener("DOMContentLoaded", function () {

    const DATA_URL = "./data/spots.json";

    let spots = [];
    let markers = [];
    let currentCategory = "all";
    let currentLocationMarker = null;

    const map = L.map("map").setView([34.9671, 135.7727], 16);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap contributors"
        }
    ).addTo(map);

    const spotList = document.getElementById("spotList");
    const searchBox = document.getElementById("searchBox");
    const searchButton = document.getElementById("searchButton");
    const locationButton = document.getElementById("locationButton");
    const spotDetail = document.getElementById("spotDetail");


    /* =========================
       言語関係
    ========================= */

    function getLanguage() {
        return localStorage.getItem("language") || "ja";
    }

    function tSafe(key, fallback) {
        if (typeof t === "function") {
            const value = t(key);

            if (value && value !== key) {
                return value;
            }
        }

        return fallback;
    }

    function localized(value) {
        if (value === null || value === undefined) {
            return "";
        }

        if (typeof value === "string") {
            return value;
        }

        const lang = getLanguage();

        return (
            value[lang] ||
            value.ja ||
            value.en ||
            value.zh ||
            value.ko ||
            ""
        );
    }


    /* =========================
       HTML安全化
    ========================= */

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =========================
       カテゴリ整理
    ========================= */

    function normalizeCategory(category) {

        const value = String(category || "").trim();

        // 景色系を全部まとめる
        if (
            [
                "景色",
                "景観",
                "展望",
                "Viewpoint",
                "Scenery"
            ].includes(value)
        ) {
            return "scenery";
        }

        // グルメ・飲食店をまとめる
        if (
            [
                "グルメ",
                "飲食店",
                "Restaurant"
            ].includes(value)
        ) {
            return "restaurant";
        }

        if (
            [
                "神社",
                "Shrine"
            ].includes(value)
        ) {
            return "shrine";
        }

        if (
            [
                "登山",
                "Hiking"
            ].includes(value)
        ) {
            return "hiking";
        }

        if (
            [
                "交通",
                "Transport"
            ].includes(value)
        ) {
            return "transport";
        }

        return value;
    }


    /* =========================
       カテゴリ名の表示
    ========================= */

    function getCategoryLabel(category) {

        const normalized = normalizeCategory(category);

        switch (normalized) {

            case "scenery":
                return tSafe("scenery", "景色");

            case "restaurant":
                return tSafe("restaurant", "グルメ");

            case "shrine":
                return tSafe("shrine", "神社");

            case "hiking":
                return tSafe("hiking", "登山");

            case "transport":
                return tSafe("transport", "交通");

            default:
                return localized(category);
        }
    }


    /* =========================
       マーカー
    ========================= */

    function createIcon() {

        return L.divIcon({

            className: "custom-spot-marker",

            html: `
                <div
                    style="
                        width:20px;
                        height:20px;
                        background:#c40018;
                        border:3px solid white;
                        border-radius:50% 50% 50% 0;
                        transform:rotate(-45deg);
                        box-shadow:0 2px 6px rgba(0,0,0,.35);
                    "
                ></div>
            `,

            iconSize: [20, 20],

            iconAnchor: [10, 20],

            popupAnchor: [0, -20]
        });
    }


    function clearMarkers() {

        markers.forEach(function (marker) {

            map.removeLayer(marker);

        });

        markers = [];
    }


    function createMarkers(list) {

        clearMarkers();

        list.forEach(function (spot) {

            const marker = L.marker(
                [spot.lat, spot.lng],
                {
                    icon: createIcon()
                }
            ).addTo(map);


            marker.bindPopup(`
                <div style="min-width:180px;">
                    <strong>
                        ${escapeHTML(localized(spot.name))}
                    </strong>
                </div>
            `);


            marker.on("click", function () {

                showDetail(spot);

                highlightCard(spot.id);

                map.setView(
                    [spot.lat, spot.lng],
                    18
                );
            });


            marker.spotId = spot.id;

            markers.push(marker);
        });
    }


    /* =========================
       一覧カードの強調
    ========================= */

    function highlightCard(id) {

        document
            .querySelectorAll(".spot-item")
            .forEach(function (card) {

                card.classList.remove("selected");

            });


        const target = document.querySelector(
            `.spot-item[data-id="${CSS.escape(String(id))}"]`
        );


        if (target) {

            target.classList.add("selected");

            target.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });
        }
    }


    /* =========================
       詳細表示
    ========================= */

    function showDetail(spot) {

        if (!spotDetail) {
            return;
        }


        const name = localized(spot.name);

        const category = getCategoryLabel(
            spot.category
        );

        const description = localized(
            spot.description
        );

        const time = localized(
            spot.time
        );


        let imageHTML = "";

        if (spot.image) {

            imageHTML = `
                <img
                    src="./images/${escapeHTML(spot.image)}"
                    alt="${escapeHTML(name)}"
                    class="spot-detail-image"
                    onerror="this.style.display='none';"
                >
            `;
        }


        let urlHTML = "";

        if (spot.url) {

            urlHTML = `
                <a
                    class="spot-link"
                    href="${escapeHTML(spot.url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    ${escapeHTML(
                        tSafe(
                            "officialSite",
                            "公式サイト"
                        )
                    )}
                </a>
            `;
        }


        spotDetail.innerHTML = `

            ${imageHTML}

            <h2>
                ${escapeHTML(name)}
            </h2>

            <p class="spot-category">
                ${escapeHTML(category)}
            </p>

            <p>
                ${escapeHTML(description)}
            </p>

            ${
                time
                    ? `
                        <p class="spot-time">
                            ⏱ ${escapeHTML(time)}
                        </p>
                    `
                    : ""
            }

            ${urlHTML}

        `;
    }


    /* =========================
       絞り込み
    ========================= */

    function getFilteredSpots() {

        const query =
            (searchBox?.value || "")
                .trim()
                .toLowerCase();


        return spots.filter(function (spot) {

            const name =
                localized(spot.name)
                    .toLowerCase();

            const description =
                localized(spot.description)
                    .toLowerCase();

            const category =
                localized(spot.category)
                    .toLowerCase();


            const matchesSearch =
                !query ||
                name.includes(query) ||
                description.includes(query) ||
                category.includes(query);


            const matchesCategory =
                currentCategory === "all" ||
                normalizeCategory(
                    spot.category
                ) === currentCategory;


            return (
                matchesSearch &&
                matchesCategory
            );
        });
    }


    /* =========================
       スポット一覧表示
    ========================= */

    function displaySpots(list) {

        if (!spotList) {
            return;
        }


        if (!list.length) {

            spotList.innerHTML = `
                <p class="no-results">
                    ${escapeHTML(
                        tSafe(
                            "noSpots",
                            "該当するスポットがありません。"
                        )
                    )}
                </p>
            `;

            createMarkers([]);

            return;
        }


        spotList.innerHTML = list.map(
            function (spot) {

                const name =
                    localized(spot.name);

                const category =
                    getCategoryLabel(
                        spot.category
                    );

                const description =
                    localized(
                        spot.description
                    );

                const time =
                    localized(spot.time);


                const imageHTML =
                    spot.image
                        ? `
                            <img
                                src="./images/${escapeHTML(spot.image)}"
                                alt="${escapeHTML(name)}"
                                onerror="this.style.display='none';"
                            >
                        `
                        : "";


                const urlHTML =
                    spot.url
                        ? `
                            <a
                                class="spot-link"
                                href="${escapeHTML(spot.url)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                onclick="event.stopPropagation();"
                            >
                                ${escapeHTML(
                                    tSafe(
                                        "officialSite",
                                        "公式サイト"
                                    )
                                )}
                            </a>
                        `
                        : "";


                return `

                    <article
                        class="spot-item"
                        data-id="${escapeHTML(spot.id)}"
                    >

                        ${imageHTML}

                        <h3>
                            ${escapeHTML(name)}
                        </h3>

                        <p class="spot-category">
                            ${escapeHTML(category)}
                        </p>

                        <p>
                            ${escapeHTML(description)}
                        </p>

                        ${
                            time
                                ? `
                                    <p class="spot-time">
                                        ⏱ ${escapeHTML(time)}
                                    </p>
                                `
                                : ""
                        }

                        ${urlHTML}

                        <br>

                        <button
                            type="button"
                            class="spot-select-button"
                        >
                            ${escapeHTML(
                                tSafe(
                                    "selectSpot",
                                    "このスポットを見る"
                                )
                            )}
                        </button>

                    </article>
                `;
            }
        ).join("");


        /*
         * カードクリック
         */
        spotList
            .querySelectorAll(".spot-item")
            .forEach(function (card) {

                card.addEventListener(
                    "click",
                    function () {

                        const id =
                            Number(
                                card.dataset.id
                            );


                        const spot =
                            spots.find(
                                function (item) {

                                    return (
                                        Number(item.id) === id
                                    );
                                }
                            );


                        if (!spot) {
                            return;
                        }


                        showDetail(spot);

                        highlightCard(spot.id);

                        map.setView(
                            [
                                spot.lat,
                                spot.lng
                            ],
                            18
                        );
                    }
                );
            });


        /*
         * 「このスポットを見る」ボタン
         */
        spotList
            .querySelectorAll(".spot-select-button")
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    function (event) {

                        event.stopPropagation();

                        const card =
                            button.closest(
                                ".spot-item"
                            );


                        if (!card) {
                            return;
                        }


                        const id =
                            Number(
                                card.dataset.id
                            );


                        const spot =
                            spots.find(
                                function (item) {

                                    return (
                                        Number(item.id) === id
                                    );
                                }
                            );


                        if (!spot) {
                            return;
                        }


                        showDetail(spot);

                        highlightCard(spot.id);

                        map.setView(
                            [
                                spot.lat,
                                spot.lng
                            ],
                            18
                        );
                    }
                );
            });


        /*
         * マーカー作成
         */
        createMarkers(list);
    }


    /* =========================
       再表示
    ========================= */

    function refresh() {

        displaySpots(
            getFilteredSpots()
        );
    }


    /* =========================
       データ読み込み
    ========================= */

    function loadSpots() {

        fetch(DATA_URL)

            .then(function (response) {

                if (!response.ok) {

                    throw new Error(
                        "spots.jsonの読み込みに失敗しました"
                    );
                }

                return response.json();
            })

            .then(function (data) {

                spots =
                    Array.isArray(data)
                        ? data
                        : [];


                refresh();
            })

            .catch(function (error) {

                console.error(error);


                if (spotList) {

                    spotList.innerHTML = `
                        <p class="error-message">
                            ${escapeHTML(
                                tSafe(
                                    "spotsLoadError",
                                    "スポット情報を読み込めませんでした。"
                                )
                            )}
                        </p>
                    `;
                }
            });
    }


    /* =========================
       検索
    ========================= */

    if (searchBox) {

        searchBox.addEventListener(
            "input",
            refresh
        );
    }


    if (searchButton) {

        searchButton.addEventListener(
            "click",
            refresh
        );
    }


    /*
     * Enterキーでも検索
     */
    if (searchBox) {

        searchBox.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {

                    event.preventDefault();

                    refresh();
                }
            }
        );
    }


    /* =========================
       カテゴリ
    ========================= */

    document
        .querySelectorAll(".category button")
        .forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    document
                        .querySelectorAll(
                            ".category button"
                        )
                        .forEach(function (item) {

                            item.classList.remove(
                                "active"
                            );
                        });


                    button.classList.add(
                        "active"
                    );


                    currentCategory =
                        normalizeCategory(
                            button.dataset.category
                        );


                    refresh();
                }
            );
        });


    /* =========================
       現在地
    ========================= */

    if (locationButton) {

        locationButton.addEventListener(
            "click",
            function () {

                if (!navigator.geolocation) {

                    alert(
                        tSafe(
                            "locationNotSupported",
                            "この端末では現在地を取得できません。"
                        )
                    );

                    return;
                }


                locationButton.disabled = true;


                navigator.geolocation.getCurrentPosition(

                    function (position) {

                        const lat =
                            position.coords.latitude;

                        const lng =
                            position.coords.longitude;


                        /*
                         * 前の現在地マーカーを削除
                         */
                        if (currentLocationMarker) {

                            map.removeLayer(
                                currentLocationMarker
                            );
                        }


                        /*
                         * 現在地マーカー
                         */
                        currentLocationMarker =
                            L.circleMarker(
                                [lat, lng],
                                {
                                    radius: 8,
                                    color: "#3388ff",
                                    fillColor: "#3388ff",
                                    fillOpacity: 0.8,
                                    weight: 3
                                }
                            ).addTo(map);


                        currentLocationMarker.bindPopup(
                            tSafe(
                                "currentLocation",
                                "現在地"
                            )
                        );


                        currentLocationMarker.openPopup();


                        /*
                         * 現在地へ移動
                         */
                        map.setView(
                            [lat, lng],
                            17
                        );


                        locationButton.disabled = false;
                    },


                    function () {

                        locationButton.disabled = false;

                        alert(
                            tSafe(
                                "locationError",
                                "現在地を取得できませんでした。"
                            )
                        );
                    },


                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            }
        );
    }


    /* =========================
       言語変更
    ========================= */

    window.addEventListener(
        "languageChanged",
        function () {

            refresh();

        }
    );


    /* =========================
       初期カテゴリ
    ========================= */

    const active =
        document.querySelector(
            '.category button[data-category="all"]'
        );


    if (active) {

        active.classList.add(
            "active"
        );
    }


    /* =========================
       初回読み込み
    ========================= */

    loadSpots();

});