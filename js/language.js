// ========================================
// Fushimi Inari Smart Guide
// 多言語対応 JavaScript
// 対応言語：日本語 / English / 中文 / 한국어
// ========================================


// ----------------------------------------
// 翻訳データ
// ----------------------------------------

const translations = {

    ja: {

        // 共通
        home: "ホーム",
        map: "観光マップ",
        planner: "ルート作成",
        spots: "スポット",
        around: "周辺施設",
        support: "サポート",

        // 言語選択
        selectLanguage: "言語を選択してください",
        pleaseSelectLanguage: "Please Select Your Language",

        // ホーム
        heroTitle: "伏見稲荷をもっと楽しく。",
        heroDescription: "AI観光ルート × GPSマップ × 多言語対応",
        makePlan: "ルート作成",

        menuTitle: "メニュー",
        spotsDescription: "伏見稲荷のおすすめスポットを探す",
        plannerDescription: "自分だけの観光ルートを作る",
        aroundDescription: "周辺の飲食店や施設を探す",
        supportDescription: "使い方やよくある質問",

        popularTitle: "人気スポット",
        senbonDescription: "伏見稲荷を代表する美しい朱色の鳥居。",
        yotsutsujiDescription: "京都市内を見渡せる絶景スポット。",
        summitDescription: "稲荷山の頂上にあるパワースポット。",

        newsTitle: "お知らせ",
        news1: "多言語対応しました。",
        news2: "AI観光ルート作成機能を公開しました。",
        news3: "GPSマップ機能を利用できます。",

        footer: "Fushimi Inari Smart Guide",

        // ルート作成
        plannerTitle: "観光ルートを作成",
        plannerDescription: "行きたいスポットを選んで、自分だけの観光ルートを作りましょう。",

        searchPlaceholder: "スポットを検索...",

        all: "すべて",
        shrine: "神社",
        scenery: "景観",
        view: "展望",
        hiking: "登山",
        restaurant: "飲食店",
        transport: "交通",

        spotList: "スポット一覧",
        selectedSpots: "選択したスポット",
        noSelectedSpots: "まだスポットが選択されていません。",

        routeInfo: "ルート情報",
        numberOfSpots: "スポット数",
        estimatedTime: "所要時間",
        saveRoute: "ルートを保存"
    },


    en: {

        // Common
        home: "Home",
        map: "Map",
        planner: "Route Planner",
        spots: "Spots",
        around: "Nearby",
        support: "Support",

        // Language selection
        selectLanguage: "Please select your language",
        pleaseSelectLanguage: "Please Select Your Language",

        // Home
        heroTitle: "Make Your Fushimi Inari Visit More Fun.",
        heroDescription: "AI Tour Routes × GPS Map × Multilingual Support",
        makePlan: "Create Your Route",

        menuTitle: "Menu",
        spotsDescription: "Find recommended spots around Fushimi Inari",
        plannerDescription: "Create your own sightseeing route",
        aroundDescription: "Find restaurants and facilities nearby",
        supportDescription: "How to use and frequently asked questions",

        popularTitle: "Popular Spots",
        senbonDescription: "The beautiful vermilion torii gates that represent Fushimi Inari.",
        yotsutsujiDescription: "A spectacular viewpoint overlooking Kyoto.",
        summitDescription: "A spiritual spot at the summit of Mount Inari.",

        newsTitle: "News",
        news1: "Multilingual support is now available.",
        news2: "The AI sightseeing route feature is now available.",
        news3: "GPS map functionality is now available.",

        footer: "Fushimi Inari Smart Guide",

        // Route planner
        plannerTitle: "Create a Sightseeing Route",
        plannerDescription: "Choose the spots you want to visit and create your own sightseeing route.",

        searchPlaceholder: "Search spots...",

        all: "All",
        shrine: "Shrine",
        scenery: "Scenery",
        view: "Viewpoint",
        hiking: "Hiking",
        restaurant: "Restaurant",
        transport: "Transport",

        spotList: "Spot List",
        selectedSpots: "Selected Spots",
        noSelectedSpots: "No spots have been selected yet.",

        routeInfo: "Route Information",
        numberOfSpots: "Number of Spots",
        estimatedTime: "Estimated Time",
        saveRoute: "Save Route"
    },


    zh: {

        // 通用
        home: "首页",
        map: "观光地图",
        planner: "路线规划",
        spots: "景点",
        around: "周边设施",
        support: "帮助",

        // 语言选择
        selectLanguage: "请选择语言",
        pleaseSelectLanguage: "Please Select Your Language",

        // 首页
        heroTitle: "让伏见稻荷之旅更加有趣。",
        heroDescription: "AI观光路线 × GPS地图 × 多语言支持",
        makePlan: "创建路线",

        menuTitle: "菜单",
        spotsDescription: "寻找伏见稻荷推荐景点",
        plannerDescription: "创建属于自己的观光路线",
        aroundDescription: "寻找附近的餐厅和设施",
        supportDescription: "使用方法和常见问题",

        popularTitle: "热门景点",
        senbonDescription: "代表伏见稻荷的美丽朱红色鸟居。",
        yotsutsujiDescription: "可以眺望京都市区的绝佳景点。",
        summitDescription: "位于稻荷山山顶的能量景点。",

        newsTitle: "最新消息",
        news1: "现已支持多语言。",
        news2: "AI观光路线功能现已上线。",
        news3: "现在可以使用GPS地图功能。",

        footer: "Fushimi Inari Smart Guide",

        // 路线规划
        plannerTitle: "创建观光路线",
        plannerDescription: "选择想去的景点，创建属于自己的观光路线。",

        searchPlaceholder: "搜索景点...",

        all: "全部",
        shrine: "神社",
        scenery: "景观",
        view: "观景",
        hiking: "登山",
        restaurant: "餐厅",
        transport: "交通",

        spotList: "景点列表",
        selectedSpots: "已选择的景点",
        noSelectedSpots: "尚未选择任何景点。",

        routeInfo: "路线信息",
        numberOfSpots: "景点数量",
        estimatedTime: "预计时间",
        saveRoute: "保存路线"
    },


    ko: {

        // 공통
        home: "홈",
        map: "관광 지도",
        planner: "루트 만들기",
        spots: "관광지",
        around: "주변 시설",
        support: "도움말",

        // 언어 선택
        selectLanguage: "언어를 선택해주세요",
        pleaseSelectLanguage: "Please Select Your Language",

        // 홈
        heroTitle: "후시미이나리 여행을 더욱 즐겁게.",
        heroDescription: "AI 관광 루트 × GPS 지도 × 다국어 지원",
        makePlan: "루트 만들기",

        menuTitle: "메뉴",
        spotsDescription: "후시미이나리의 추천 관광지를 찾아보세요",
        plannerDescription: "나만의 관광 루트를 만들어보세요",
        aroundDescription: "주변 음식점과 시설을 찾아보세요",
        supportDescription: "사용 방법 및 자주 묻는 질문",

        popularTitle: "인기 관광지",
        senbonDescription: "후시미이나리를 대표하는 아름다운 주홍색 도리이.",
        yotsutsujiDescription: "교토 시내를 내려다볼 수 있는 절경 명소.",
        summitDescription: "이나리산 정상에 있는 파워 스팟.",

        newsTitle: "공지사항",
        news1: "다국어 지원이 시작되었습니다.",
        news2: "AI 관광 루트 만들기 기능이 공개되었습니다.",
        news3: "GPS 지도 기능을 사용할 수 있습니다.",

        footer: "Fushimi Inari Smart Guide",

        // 루트 만들기
        plannerTitle: "관광 루트 만들기",
        plannerDescription: "방문하고 싶은 관광지를 선택하여 나만의 관광 루트를 만들어보세요.",

        searchPlaceholder: "관광지 검색...",

        all: "전체",
        shrine: "신사",
        scenery: "경관",
        view: "전망",
        hiking: "등산",
        restaurant: "음식점",
        transport: "교통",

        spotList: "관광지 목록",
        selectedSpots: "선택한 관광지",
        noSelectedSpots: "아직 선택한 관광지가 없습니다.",

        routeInfo: "루트 정보",
        numberOfSpots: "관광지 수",
        estimatedTime: "예상 소요 시간",
        saveRoute: "루트 저장"
    }

};


// ----------------------------------------
// 現在の言語を取得
// ----------------------------------------

function getLanguage() {

    return localStorage.getItem("language") || "ja";

}


// ----------------------------------------
// 翻訳文字列を取得
// ----------------------------------------

function t(key) {

    const language = getLanguage();

    if (
        translations[language] &&
        translations[language][key]
    ) {
        return translations[language][key];
    }

    // 翻訳がない場合は日本語を使用
    if (translations.ja[key]) {
        return translations.ja[key];
    }

    // それでもない場合
    return key;

}


// ----------------------------------------
// ページ内の翻訳を適用
// ----------------------------------------

function applyLanguage() {

    const language = getLanguage();

    // HTMLの言語を変更
    document.documentElement.lang = language;


    // data-i18n のある要素を翻訳
    document.querySelectorAll("[data-i18n]").forEach(function(element) {

        const key = element.getAttribute("data-i18n");

        element.textContent = t(key);

    });


    // placeholderを翻訳
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function(element) {

        const key = element.getAttribute("data-i18n-placeholder");

        element.placeholder = t(key);

    });


    // 言語選択ボックス
    const languageSelect = document.getElementById("languageSelect");

    if (languageSelect) {

        languageSelect.value = language;

        languageSelect.addEventListener("change", function() {

            changeLanguage(this.value);

        });

    }

}


// ----------------------------------------
// 言語を選択
// ----------------------------------------

function selectLanguage(language) {

    localStorage.setItem("language", language);

    window.location.href = "home.html";

}


// ----------------------------------------
// ページ上で言語を変更
// ----------------------------------------

function changeLanguage(language) {

    localStorage.setItem("language", language);

    location.reload();

}


// ----------------------------------------
// 言語選択をリセット
// ----------------------------------------

function resetLanguage() {

    localStorage.removeItem("language");

    window.location.href = "index.html";

}


// ----------------------------------------
// ページ読み込み時
// ----------------------------------------

document.addEventListener("DOMContentLoaded", function() {

    applyLanguage();

});
