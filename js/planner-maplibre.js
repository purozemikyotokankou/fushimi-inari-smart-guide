/* Fushimi Inari Smart Guide — MapLibre navigation (V148) */
(function () {
  'use strict';

  const LANGS = {
    ja: {
      search: 'スポット・場所を検索', all: 'すべて', sightseeing: '見どころ', food: '食べる', buy: '買う', transport: '交通', toilet: 'トイレ',
      explore: '伏見稲荷を探索', intro: 'スポットを選ぶと、参道に沿った徒歩ルートを検索できます。', near: '周辺のスポット',
      go: 'ここへ行く', walking: '徒歩ルート', start: 'ナビを開始', end: 'ナビを終了', distance: '距離', arrival: '到着予定', remaining: '残り距離',
      voiceOn: '音声案内 ON', voiceOff: '音声案内 OFF', routeLine: '参道に沿って進んでください', turnLeft: '左へ曲がる', turnRight: '右へ曲がる', straight: 'そのまま進む',
      locationWait: '現在地を取得しています…', locationDenied: '現在地を取得できません。位置情報を許可してください。', ready: '地図の準備ができました', loading: '地図とスポットを読み込んでいます…',
      noRoute: '登録済みの参道データ内で、安全につながるルートが見つかりませんでした。出発地点を少し変えて再検索してください。',
      offRoute: 'ルートから離れています。再検索しています…', rerouteFailed: '安全な代替ルートを見つけられませんでした。参道上の位置から再検索してください。', arrived: '目的地に到着しました',
      next: '次の案内', routeNote: '伏見稲荷の登録済み参道データを優先して案内します。参道の未登録区間は推測でつなぎません。', distanceUnit: 'm', min: '分', km: 'km',
      permission: '位置情報を許可すると、現在地からナビを開始できます。', routeUnavailable: '経路を検索できませんでした。', altSenbon: '千本鳥居経由', altYotsutsuji: '四ツ辻経由', fastest: '参道ルート',
      heading: '進行方向に追従中', north: '北を上に固定', location: '現在地', via: '経由', category: 'カテゴリー', save: '保存', saved: '保存済み', etaApprox: '到着予定は標準的な徒歩速度から算出した目安です。階段・坂道・混雑・休憩時間は反映されません。'
    },
    en: {
      search: 'Search places', all: 'All', sightseeing: 'Attractions', food: 'Food', buy: 'Shopping', transport: 'Transport', toilet: 'Restrooms',
      explore: 'Explore Fushimi Inari', intro: 'Choose a place to find a walking route along the shrine paths.', near: 'Nearby places',
      go: 'Directions', walking: 'Walking route', start: 'Start navigation', end: 'End navigation', distance: 'Distance', arrival: 'Arrival', remaining: 'Remaining',
      voiceOn: 'Voice ON', voiceOff: 'Voice OFF', routeLine: 'Continue along the path', turnLeft: 'Turn left', turnRight: 'Turn right', straight: 'Continue straight',
      locationWait: 'Getting your location…', locationDenied: 'Could not get your location. Please allow location access.', ready: 'Map is ready', loading: 'Loading map and places…',
      noRoute: 'No safe continuous route was found in the mapped shrine paths. Try a different starting point.',
      offRoute: 'You are off route. Trying to recalculate…', rerouteFailed: 'No safe alternative route was found. Try again from a mapped path.', arrived: 'You have arrived',
      next: 'Next instruction', routeNote: 'Navigation prioritizes mapped shrine paths. Missing path sections are never guessed or connected.', distanceUnit: 'm', min: 'min', km: 'km',
      permission: 'Allow location access to start navigation from your position.', routeUnavailable: 'Could not find a route.', altSenbon: 'Via Senbon Torii', altYotsutsuji: 'Via Yotsutsuji', fastest: 'Shrine path',
      heading: 'Following heading', north: 'North up', location: 'My location', via: 'Via', category: 'Category', save: 'Save', saved: 'Saved', etaApprox: 'Arrival time is an estimate based on a typical walking speed. Stairs, slopes, crowds and breaks are not included.'
    },
    zh: {
      search: '搜索景点或地点', all: '全部', sightseeing: '景点', food: '餐饮', buy: '购物', transport: '交通', toilet: '洗手间',
      explore: '探索伏见稻荷', intro: '选择地点，即可搜索沿参道行走的路线。', near: '附近景点',
      go: '前往这里', walking: '步行路线', start: '开始导航', end: '结束导航', distance: '距离', arrival: '预计到达', remaining: '剩余距离',
      voiceOn: '语音 ON', voiceOff: '语音 OFF', routeLine: '沿参道继续前进', turnLeft: '向左转', turnRight: '向右转', straight: '继续直行',
      locationWait: '正在获取当前位置…', locationDenied: '无法获取当前位置，请允许使用位置信息。', ready: '地图已准备就绪', loading: '正在加载地图和景点…',
      noRoute: '在已登记的参道数据中找不到安全连续的路线。请稍微调整出发位置后重试。',
      offRoute: '您已偏离路线，正在重新搜索…', rerouteFailed: '找不到安全的替代路线，请从已登记的参道位置重新搜索。', arrived: '已到达目的地',
      next: '下一步', routeNote: '优先使用已登记的伏见稻荷参道数据，不会猜测或连接未登记的道路。', distanceUnit: '米', min: '分钟', km: '公里',
      permission: '允许位置信息后，即可从当前位置开始导航。', routeUnavailable: '无法搜索路线。', altSenbon: '经千本鸟居', altYotsutsuji: '经四之辻', fastest: '参道路线',
      heading: '正在跟随前进方向', north: '北向上', location: '当前位置', via: '经由', category: '类别', save: '收藏', saved: '已收藏', etaApprox: '预计到达时间根据一般步行速度估算，未计入台阶、坡道、人流和休息时间。'
    },
    ko: {
      search: '장소 검색', all: '전체', sightseeing: '명소', food: '음식', buy: '쇼핑', transport: '교통', toilet: '화장실',
      explore: '후시미 이나리 둘러보기', intro: '장소를 선택하면 참배길을 따라 걷는 경로를 검색합니다.', near: '주변 장소',
      go: '여기로 안내', walking: '도보 경로', start: '내비게이션 시작', end: '내비게이션 종료', distance: '거리', arrival: '도착 예정', remaining: '남은 거리',
      voiceOn: '음성 안내 ON', voiceOff: '음성 안내 OFF', routeLine: '참배길을 따라 계속 이동하세요', turnLeft: '왼쪽으로 회전', turnRight: '오른쪽으로 회전', straight: '계속 직진',
      locationWait: '현재 위치를 확인하고 있습니다…', locationDenied: '현재 위치를 가져올 수 없습니다. 위치 권한을 허용해 주세요.', ready: '지도가 준비되었습니다', loading: '지도와 장소를 불러오는 중…',
      noRoute: '등록된 참배길 데이터에서 안전하게 연결된 경로를 찾지 못했습니다. 출발 위치를 조금 바꾸어 다시 검색해 주세요.',
      offRoute: '경로를 벗어났습니다. 다시 검색하고 있습니다…', rerouteFailed: '안전한 대체 경로를 찾지 못했습니다. 등록된 참배길에서 다시 검색해 주세요.', arrived: '목적지에 도착했습니다',
      next: '다음 안내', routeNote: '등록된 후시미 이나리 참배길을 우선 안내하며, 등록되지 않은 구간을 임의로 연결하지 않습니다.', distanceUnit: 'm', min: '분', km: 'km',
      permission: '위치 권한을 허용하면 현재 위치에서 내비게이션을 시작할 수 있습니다.', routeUnavailable: '경로를 찾지 못했습니다.', altSenbon: '센본 도리이 경유', altYotsutsuji: '요쓰쓰지 경유', fastest: '참배길 경로',
      heading: '이동 방향을 따라가는 중', north: '북쪽을 위로', location: '현재 위치', via: '경유', category: '분류', save: '저장', saved: '저장됨', etaApprox: '도착 예정 시간은 일반적인 보행 속도로 계산한 예상치이며 계단, 경사, 혼잡 및 휴식 시간은 반영되지 않습니다.'
    }
  };

  const $ = (id) => document.getElementById(id);
  const statusEl = $('maplibreStatus');
  const errorEl = $('maplibreError');
  const sheet = $('maplibreSheet');
  let language = (localStorage.getItem('language') || 'ja').slice(0, 2).toLowerCase();
  if (!LANGS[language]) language = 'ja';
  let map = null;
  let baseSpots = [];
  let spots = [];
  let routes = [];
  let baseRouteData = [];
  let preparedRouteGraph = null;
  let selectedSpot = null;
  let destinationSpot = null;
  let activeRoute = null;
  let routeCandidates = [];
  let currentLocation = null;
  let locationAccuracy = null;
  let locationMarker = null;
  let destinationMarker = null;
  let watchId = null;
  let compassHeading = null;
  let compassListenerAttached = false;
  let followMode = false;
  let voiceEnabled = true;
  let offRouteCount = 0;
  let isRerouting = false;
  let lastRerouteAt = 0;
  let selectedFilter = 'all';
  const SAVED_SPOTS_STORAGE_KEY = 'fushimiSavedSpotsV51';
  let currentLocationTimestamp = 0;
  let compassAnimationFrame = 0;
  let searchDebounce = null;
  let routeAnimationFrame = null;
  let routeRunnerMarkers = [];
  let lastSpokenStep = -1;
  let navStartedAt = 0;
  let mapLoaded = false;
  let attributionResizeObserver = null;
  let attributionMutationObserver = null;
  let firstMapLoadTimer = 0;
  const markerRecords = new Map();

  const t = (key) => LANGS[language][key] || LANGS.ja[key] || key;
  const getLocalized = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      const localized = value[language];
      if (localized !== null && localized !== undefined && String(localized).trim()) return String(localized);
      const fallback = value.ja || value.en || value.zh || value.ko || Object.values(value)[0] || '';
      return translateSpotText(String(fallback), language) || String(fallback);
    }
    const raw = String(value);
    const translated = translateSpotText(raw, language);
    return translated || raw;
  };
  const setStatus = (message) => { if (statusEl) statusEl.textContent = message || ''; };
  const showError = (message) => { if (!errorEl) return; errorEl.textContent = message || ''; errorEl.hidden = !message; };
  const setText = (id, value) => { const element = $(id); if (element) element.textContent = value; };
  const clearError = () => showError('');

const SPOT_TEXT_TRANSLATIONS = {
        "千本鳥居": {
            en: "Senbon Torii (Thousand Torii Gates)",
            zh: "千本鸟居",
            ko: "센본 도리이(천 개의 도리이)"
        },
        "伏見稲荷大社 本殿": {
            en: "Fushimi Inari Taisha Main Shrine",
            zh: "伏见稻荷大社本殿",
            ko: "후시미 이나리 타이샤 본전"
        },
        "奥社奉拝所（奥の院）": {
            en: "Okusha Hohaisho (Inner Shrine)",
            zh: "奥社奉拜所（内院）",
            ko: "오쿠샤 호하이쇼(오쿠노인)"
        },
        "四ツ辻": {
            en: "Yotsutsuji Junction Viewpoint",
            zh: "四之辻观景点",
            ko: "요쓰쓰지 전망 지점"
        },
        "稲荷山 山頂（一ノ峰）": {
            en: "Mount Inari Summit (Ichinomine)",
            zh: "稻荷山山顶（一之峰）",
            ko: "이나리산 정상(이치노미네)"
        },
        "一ノ峰": {
            en: "Ichino-mine (First Peak)",
            zh: "一之峰",
            ko: "이치노미네(제1봉)"
        },
        "トイレ": {
            en: "Restroom",
            zh: "洗手间",
            ko: "화장실"
        },
        "京阪電車伏見稲荷駅": {
            en: "Keihan Fushimi-Inari Station",
            zh: "京阪电车伏见稻荷站",
            ko: "게이한 후시미이나리역"
        },
        "JR西日本奈良線稲荷駅": {
            en: "JR Inari Station (Nara Line)",
            zh: "JR西日本奈良线稻荷站",
            ko: "JR 나라선 이나리역"
        },
        "JR奈良線の駅です。": {
            en: "A station on the JR Nara Line.",
            zh: "这是JR奈良线的车站。",
            ko: "JR 나라선의 역입니다."
        },
        "伏見稲荷入口": {
            en: "Fushimi Inari Shrine Entrance",
            zh: "伏见稻荷入口",
            ko: "후시미 이나리 입구"
        },
        "Vermillion-cafe": {
            en: "Vermillion Cafe",
            zh: "Vermillion 咖啡馆",
            ko: "버밀리온 카페"
        },
        "ちいかわ本舗": {
            en: "Chiikawa Honpo",
            zh: "吉伊卡哇本铺",
            ko: "치이카와 혼포"
        },
        "eight": {
            en: "Eight",
            zh: "Eight 咖啡馆",
            ko: "에이트"
        },
        "伏見稲荷を代表する朱色の鳥居が連なる人気スポットです。写真撮影にもおすすめです。": {
            en: "A popular spot featuring rows of vermilion torii gates, one of Fushimi Inari's signature sights. Great for photos.",
            zh: "这里排列着成排的朱红色鸟居，是伏见稻荷的代表性景点之一，也很适合拍照。",
            ko: "후시미 이나리를 대표하는 주홍색 도리이가 줄지어 있는 인기 명소입니다. 사진 촬영에도 좋습니다."
        },
        "伏見稲荷大社の中心となる場所です。参拝の際はまず訪れることをおすすめします。": {
            en: "The main sanctuary of Fushimi Inari Taisha. It is a recommended first stop for visitors paying their respects.",
            zh: "这里是伏见稻荷大社的中心区域，建议参拜时首先到访。",
            ko: "후시미 이나리 타이샤의 중심이 되는 곳입니다. 참배할 때 먼저 방문하는 것을 추천합니다."
        },
        "千本鳥居を抜けた先にある重要な参拝場所です。おもかる石でも有名です。": {
            en: "An important place of worship beyond the Senbon Torii gates, famous for the Omokaru Stone.",
            zh: "穿过千本鸟居后即可到达的重要参拜场所，也以“重轻石”闻名。",
            ko: "센본 도리이를 지나면 나오는 중요한 참배 장소이며, 오모카루 돌로도 유명합니다."
        },
        "京都市街を見渡せる展望スポットです。休憩場所としても利用できます。": {
            en: "A viewpoint with sweeping views over Kyoto. It is also a good place to take a break.",
            zh: "这里可以俯瞰京都市区，也适合稍作休息。",
            ko: "교토 시내를 한눈에 내려다볼 수 있는 전망 명소로, 휴식 장소로도 이용할 수 있습니다."
        },
        "稲荷山の頂上にある神聖な場所です。山歩きコースの終点になります。": {
            en: "A sacred site at the summit of Mount Inari and the endpoint of the mountain walking route.",
            zh: "这里是稻荷山山顶的神圣场所，也是登山步行路线的终点。",
            ko: "이나리산 정상에 있는 신성한 장소로, 산책 코스의 종점입니다."
        },
        "車いす対応トイレあり": {
            en: "Wheelchair-accessible restroom available.",
            zh: "设有无障碍洗手间。",
            ko: "휠체어 이용 가능 화장실이 있습니다."
        },
        "京阪電車の最寄り駅です。伏見稲荷観光のスタート地点として便利です。": {
            en: "The nearest Keihan Railway station, convenient as a starting point for visiting Fushimi Inari.",
            zh: "这是最近的京阪电车车站，适合作为游览伏见稻荷的起点。",
            ko: "가까운 게이한 전철역으로, 후시미 이나리 관광을 시작하기에 편리합니다."
        },
        "JR奈良線の最寄り駅です。京都駅からアクセスできます。": {
            en: "The nearest station on the JR Nara Line, with access from Kyoto Station.",
            zh: "这是最近的JR奈良线车站，可从京都站前往。",
            ko: "가까운 JR 나라선 역으로, 교토역에서 이동할 수 있습니다."
        },
        "伏見稲荷大社へ向かう参道入口です。ここから楼門・本殿方面へ進みます。": {
            en: "The entrance to the approach leading to Fushimi Inari Taisha. Continue from here toward the Romon Gate and main shrine.",
            zh: "这是通往伏见稻荷大社参道的入口，从这里可前往楼门和本殿方向。",
            ko: "후시미 이나리 타이샤로 이어지는 참배길 입구입니다. 여기서 누문과 본전 방향으로 이동합니다."
        },
        "伏見稲荷の緑に囲まれたカフェ。コーヒーやブランチ、スイーツを楽しめます。": {
            en: "A cafe surrounded by the greenery of Fushimi Inari, serving coffee, brunch, and sweets.",
            zh: "一家被伏见稻荷绿意环绕的咖啡馆，可享用咖啡、早午餐和甜点。",
            ko: "후시미 이나리의 푸른 자연에 둘러싸인 카페로, 커피와 브런치, 디저트를 즐길 수 있습니다."
        },
        "トイレ②": { en: "Restroom 2", zh: "洗手间②", ko: "화장실 ②" },
        "トイレ③": { en: "Restroom 3", zh: "洗手间③", ko: "화장실 ③" },
        "京阪電車龍谷大前深草駅": { en: "Keihan Ryukoku-daimae-fukakusa Station", zh: "京阪龙谷大前深草站", ko: "게이한 류코쿠다이마에후카쿠사역" },
        "二ノ峰": { en: "Ni-no-mine (Second Peak)", zh: "二之峰", ko: "니노미네(제2봉)" },
        "三ノ峰": { en: "San-no-mine (Third Peak)", zh: "三之峰", ko: "산노미네(제3봉)" },
        "御劔社": { en: "Mitsurugisha Shrine", zh: "御剑社", ko: "미쓰루기샤" },
        "おせき大神": { en: "Oseki Okami", zh: "御咳大神", ko: "오세키 오카미" },
        "薬力大神": { en: "Yakuryoku Okami", zh: "药力大神", ko: "야쿠료쿠 오카미" },
        "伏見稲荷周辺のトイレです。": {
            en: "A restroom near Fushimi Inari.", zh: "伏见稻荷周边的洗手间。", ko: "후시미 이나리 주변에 있는 화장실입니다."
        },
        "伏見稲荷のお山側にあるトイレです。": {
            en: "A restroom on the Mount Inari side of the shrine.", zh: "位于伏见稻荷山一侧的洗手间。", ko: "후시미 이나리 산 쪽에 있는 화장실입니다."
        },
        "京阪電車の駅です。": {
            en: "A Keihan Railway station.", zh: "京阪电车车站。", ko: "게이한 전철역입니다."
        },
        "稲荷山の三つの峰の一つで、山頂付近にお社がある参拝スポットです。": {
            en: "One of the three peaks of Mount Inari, with a small shrine near the summit.",
            zh: "稻荷山三峰之一，山顶附近设有小社，是一处参拜地点。",
            ko: "이나리산 세 봉우리 중 하나로, 정상 부근에 사당이 있는 참배 장소입니다."
        },
        "商売繁盛や五穀豊穣を願い、古くから多くの人々に信仰されてきた場所です。": {
            en: "A place long visited by worshippers praying for business prosperity and abundant harvests.",
            zh: "这里长期受到人们信仰，大家在此祈求生意兴隆和五谷丰登。",
            ko: "장사 번창과 풍년을 기원하는 사람들이 오래전부터 찾아온 신앙의 장소입니다."
        },
        "ものづくりや仕事の成功を願う人々から、古くから信仰されてきた場所です。": {
            en: "A shrine traditionally visited by people praying for success in craftsmanship and work.",
            zh: "这里自古以来受到祈求手艺精进与工作成功的人们信仰。",
            ko: "기술과 일의 성공을 기원하는 사람들이 예로부터 참배해 온 곳입니다."
        },
        "喉に関してご利益がある神様です。": {
            en: "A deity traditionally associated with blessings for throat ailments.",
            zh: "以保佑喉咙健康、缓解咽喉疾病而闻名的神明。",
            ko: "목 건강과 목 관련 질환의 쾌유에 영험이 있다고 전해지는 신입니다."
        },
        "健康長寿や病気の回復、家族の健康を願う人々が訪れる、健康にまつわる信仰で知られる神社です。": {
            en: "A shrine known for prayers for longevity, recovery from illness, and the health of family members.",
            zh: "这里以祈求健康长寿、病愈康复和家人健康而闻名。",
            ko: "장수와 병의 회복, 가족의 건강을 기원하는 사람들이 찾는 신사입니다."
        },
        "「もぐもぐ（食べる）」と「和」をテーマにした、人気キャラクター「ちいかわ」の常設オフィシャルグッズショップ": {
            en: "The permanent official Chiikawa merchandise shop, themed around food and Japanese-style culture.",
            zh: "以“吃吃”和“和风”为主题的人气角色吉伊卡哇常设官方周边商店。",
            ko: "먹는 즐거움과 일본의 정서를 테마로 한 인기 캐릭터 치이카와의 상설 공식 굿즈 매장입니다."
        },
        "「eight（エイト）」は、伏見の名水と高加水・低温長時間発酵にこだわり、ハード系からスイーツ系まで毎日約50種類の焼き立てパンを届ける、京都・伏見稲荷の路地裏にある大人気ベーカリーです。": {
            en: "Eight is a popular bakery tucked away in Fushimi Inari, known for its use of Fushimi's fine water and about 50 freshly baked breads each day.",
            zh: "Eight是伏见稻荷小巷中的人气面包店，讲究伏见名水、高含水量及低温长时间发酵，每天供应约50种新鲜面包。",
            ko: "Eight는 후시미의 좋은 물과 고수분·저온 장시간 발효를 고집하며 매일 약 50종의 갓 구운 빵을 선보이는 후시미 이나리의 인기 베이커리입니다."
        }
    };


  function translateSpotText(text, lang) {
    if (!text || lang === 'ja') return '';
    const entry = SPOT_TEXT_TRANSLATIONS[String(text).trim()];
    return entry && entry[lang] ? entry[lang] : '';
  }

  function normalizeSpotCategory(spot) {
    const name = getLocalized(spot.name).toLowerCase();
    const raw = String(spot.category || '').toLowerCase();
    if (String(spot.id) === '11' || /本舗|honpo|shop|store|souvenir|グッズ/.test(name)) return 'buy';
    if (raw.includes('トイレ') || raw.includes('toilet') || /トイレ|restroom|toilet/.test(name)) return 'toilet';
    if (raw.includes('交通') || raw.includes('transport') || /駅|station|railway|keihan|\bjr\b/.test(name)) return 'transport';
    if (raw.includes('飲食') || raw.includes('restaurant') || /カフェ|cafe|bakery|food|coffee|eight|vermillion/.test(name)) return 'food';
    return 'sightseeing';
  }

  function iconPath(spot) {
    const cat = normalizeSpotCategory(spot);
    if (cat === 'toilet') return 'images/icons/toilet.svg';
    if (cat === 'transport') return 'images/icons/category-transport.svg';
    if (cat === 'buy') return 'images/icons/category-buy.svg';
    if (cat === 'food') return 'images/icons/category-food.svg';
    if (cat === 'sightseeing') return 'images/icons/category-sightseeing.svg';
    return 'images/icons/category-all.svg';
  }

  function setLanguage(next) {
    language = LANGS[next] ? next : 'ja';
    try { localStorage.setItem('language', language); } catch (_) { /* Storage may be disabled; language still works for this page. */ }
    if (document.documentElement) document.documentElement.lang = language;

    // Text-only labels are optional so a cached/older HTML shell cannot stop the
    // whole map script just because one paragraph or label is absent.
    const search = $('destinationSearch');
    if (search) {
      search.placeholder = t('search');
      search.setAttribute('aria-label', t('search'));
    }
    setText('exploreHeading', t('explore'));
    setText('exploreIntro', t('intro'));
    setText('routeToSpot', t('go'));
    setText('routeKicker', t('walking'));
    setText('startNavigation', t('start'));
    setText('stopNavigation', t('end'));
    setText('navRemainingLabel', t('remaining'));
    setText('navArrivalTimeLabel', t('arrival'));
    setText('toggleVoice', voiceEnabled ? t('voiceOn') : t('voiceOff'));
    const labels = {all:'all',sightseeing:'sightseeing',food:'food',buy:'buy',transport:'transport',toilet:'toilet'};
    document.querySelectorAll('[data-label]').forEach(el => { el.textContent = t(labels[el.dataset.label] || el.dataset.label); });
    if (selectedSpot) renderSpotPanel(selectedSpot);
    renderNearbyList();
    renderMarkers();
    if (activeRoute) renderRouteSummary(activeRoute);
  }

  function haversine(a, b) {
    const R = 6371000, rad = Math.PI / 180;
    const p1 = a[0] * rad, p2 = b[0] * rad;
    const dp = (b[0] - a[0]) * rad, dl = (b[1] - a[1]) * rad;
    const h = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
  }

  function categoryLabel(spot) {
    const key = normalizeSpotCategory(spot);
    return t(key);
  }

  function formatDistance(meters) {
    if (!Number.isFinite(meters)) return '--';
    return meters >= 1000 ? `${(meters/1000).toFixed(1)} ${t('km')}` : `${Math.round(meters)} ${t('distanceUnit')}`;
  }
  function formatMinutes(meters) {
    const minutes = Math.max(1, Math.ceil(meters / 55));
    return `${minutes}${t('min')}`;
  }
  function formatTime(date) {
    return new Intl.DateTimeFormat(language === 'ja' ? 'ja-JP' : language === 'zh' ? 'zh-CN' : language === 'ko' ? 'ko-KR' : 'en-GB', {hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tokyo'}).format(date);
  }
  function coordsToGeoJSON(paths) {
    return { type:'FeatureCollection', features: paths.map((path, index) => ({type:'Feature',properties:{index},geometry:{type:'LineString',coordinates:path.map(p=>[p[1],p[0]])}})) };
  }
  function getSpotById(id) { return baseSpots.find(s => String(s.id) === String(id)) || null; }
  function getSavedSpotIds() {
    try {
      const value = JSON.parse(localStorage.getItem(SAVED_SPOTS_STORAGE_KEY) || '[]');
      return new Set(Array.isArray(value) ? value.map(String) : []);
    } catch (_) { return new Set(); }
  }
  function updateSaveSpotButton() {
    const button = $('saveSpotButton');
    if (!button || !selectedSpot) return;
    const saved = getSavedSpotIds().has(String(selectedSpot.id));
    button.classList.toggle('is-saved', saved);
    button.setAttribute('aria-pressed', String(saved));
    button.textContent = saved ? `★ ${t('saved')}` : `☆ ${t('save')}`;
  }
  function toggleSavedSpot() {
    if (!selectedSpot) return;
    const ids = getSavedSpotIds();
    const id = String(selectedSpot.id);
    if (ids.has(id)) ids.delete(id); else ids.add(id);
    try { localStorage.setItem(SAVED_SPOTS_STORAGE_KEY, JSON.stringify(Array.from(ids))); } catch (error) { console.warn('[Fushimi MapLibre] Could not save spot:', error); }
    updateSaveSpotButton();
  }
  function showPanel(name) {
    $('explorePanel').hidden = name !== 'explore';
    $('spotPanel').hidden = name !== 'spot';
    $('routePanel').hidden = name !== 'route';
    $('activeNavigationPanel').hidden = name !== 'nav';
    sheet.classList.remove('is-collapsed');
    $('sheetHandle').setAttribute('aria-expanded','true');
    positionMapAttribution();
  }

  function renderNearbyList() {
    const host = $('nearbySpotList');
    if (!host) return;
    const source = baseSpots.filter(s => selectedFilter === 'all' || normalizeSpotCategory(s) === selectedFilter);
    const center = currentLocation || [34.96705,135.7743];
    const ordered = source.slice().sort((a,b) => haversine(center,[a.lat,a.lng])-haversine(center,[b.lat,b.lng])).slice(0,12);
    host.innerHTML = '';
    ordered.forEach(spot => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'nearby-spot-card';
      const img = document.createElement('img'); img.src = iconPath(spot); img.alt = '';
      const copy = document.createElement('span');
      const strong = document.createElement('strong'); strong.textContent = getLocalized(spot.name);
      const small = document.createElement('small'); small.textContent = `${categoryLabel(spot)} · ${formatDistance(haversine(center,[spot.lat,spot.lng]))}`;
      copy.append(strong,small); button.append(img,copy); button.addEventListener('click',()=>selectSpot(spot)); host.append(button);
    });
  }

  function makeSpotMarker(spot) {
    const el = document.createElement('button');
    el.type='button'; el.className='custom-spot-marker'; el.setAttribute('aria-label',getLocalized(spot.name));
    const img=document.createElement('img'); img.src=iconPath(spot); img.alt=''; el.append(img);
    el.addEventListener('click',(event)=>{event.stopPropagation();selectSpot(spot);});
    const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([spot.lng,spot.lat]).addTo(map);
    markerRecords.set(String(spot.id),{marker,element:el,spot});
  }
  function renderMarkers() {
    if (!map || !mapLoaded) return;
    markerRecords.forEach(record=>record.marker.remove()); markerRecords.clear();
    baseSpots.filter(s=>selectedFilter==='all'||normalizeSpotCategory(s)===selectedFilter).forEach(makeSpotMarker);
    if (selectedSpot) markerRecords.get(String(selectedSpot.id))?.element.classList.add('is-selected');
  }
  function selectSpot(spot) {
    selectedSpot = spot; renderSpotPanel(spot); showPanel('spot'); clearError();
    markerRecords.forEach(record=>record.element.classList.toggle('is-selected',String(record.spot.id)===String(spot.id)));
    map.easeTo({center:[spot.lng,spot.lat],zoom:Math.max(map.getZoom(),17.2),duration:650,offset:[0,-90]});
  }
  function renderSpotPanel(spot) {
    $('spotPanelName').textContent=getLocalized(spot.name);
    $('spotPanelDescription').textContent=getLocalized(spot.description);
    $('spotCategoryLabel').textContent=t(normalizeSpotCategory(spot));
    const photo=$('spotPhoto');
    if (spot.image) { photo.src=`images/${String(spot.image).replace(/^\/+/, '')}`; photo.hidden=false; photo.onerror=()=>{photo.hidden=true;}; }
    else photo.hidden=true;
    updateSaveSpotButton();
  }

  function filterByCategory(category) {
    selectedFilter=category;
    document.querySelectorAll('.map-category').forEach(btn=>{const active=btn.dataset.filter===category;btn.classList.toggle('is-active',active);btn.setAttribute('aria-pressed',String(active));});
    renderMarkers(); renderNearbyList();
  }

  function showSearchResults(query) {
    const host=$('searchResults'); host.innerHTML='';
    if (!query.trim()) {host.hidden=true;return;}
    const q=query.toLocaleLowerCase();
    const hits=baseSpots.filter(s=>[getLocalized(s.name),String(s.name||''),getLocalized(s.description),String(s.category||'')].join(' ').toLocaleLowerCase().includes(q)).slice(0,8);
    hits.forEach(s=>{
      const btn=document.createElement('button');btn.type='button';btn.className='search-result';
      const img=document.createElement('img');img.src=iconPath(s);img.alt='';
      const label=document.createElement('span');label.textContent=getLocalized(s.name);btn.append(img,label);
      btn.addEventListener('click',()=>{$('destinationSearch').value=getLocalized(s.name);host.hidden=true;selectSpot(s);});host.append(btn);
    });
    host.hidden=hits.length===0;
  }

  function prepareGraph(extraSpots=[]) {
    spots=baseSpots.concat(extraSpots);
    routes=baseRouteData.slice();
    preparedRouteGraph=null;
    prepareRouteGraph();
  }

    function normalizeRouteObject(
        route,
        index
    ) {

        if (!route || typeof route !== "object") return null;

        const declaredFrom = String(route.from ?? "").trim();
        const declaredTo = String(route.to ?? "").trim();
        if (!declaredFrom || !declaredTo || !Array.isArray(route.path)) return null;

        const path = route.path.map(function (point) {
            const lat = Number(point?.lat);
            const lng = Number(point?.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
            return [lat, lng];
        }).filter(Boolean);
        if (path.length < 2) return null;

        // routes.json の from/to は編集時の目安として残しつつ、実際の端点が
        // スポットから離れている場合は、そのスポットIDで誤接続しない。
        // 8m以内ならスポット接続として扱い、3m以内だけ座標を微調整する。
        // それより離れた端点は一時ノードにして、後段で他の参道線との幾何接続を探す。
        const endpointSpotMatchLimitMeters = 8;
        const endpointGeometrySnapLimitMeters = 8;
        const routeKey = Number.isFinite(Number(index)) ? Number(index) : 0;

        function resolveEndpoint(pointIndex, declaredId, side) {
            const spot = spots.find(item => String(item.id) === declaredId);
            if (!spot || !Number.isFinite(Number(spot.lat)) || !Number.isFinite(Number(spot.lng))) {
                return `__route_endpoint_${routeKey}_${side}`;
            }
            const spotPoint = [Number(spot.lat), Number(spot.lng)];
            const distance = distanceBetweenLatLngMeters(path[pointIndex], spotPoint);
            if (distance <= endpointSpotMatchLimitMeters) {
                if (distance <= endpointGeometrySnapLimitMeters) path[pointIndex] = spotPoint;
                return declaredId;
            }
            return `__route_endpoint_${routeKey}_${side}`;
        }

        const from = resolveEndpoint(0, declaredFrom, "start");
        const to = resolveEndpoint(path.length - 1, declaredTo, "end");
        const oneWayValue = route.oneway ?? route.oneWay ?? route.one_way ?? route.one_way_only;
        const oneWay = oneWayValue === true ||
            ["yes", "true", "1", "oneway", "one-way"].includes(String(oneWayValue ?? "").trim().toLowerCase());

        return {
            from: from,
            to: to,
            declaredFrom: declaredFrom,
            declaredTo: declaredTo,
            name: String(route.name || `${declaredFrom} → ${declaredTo}`),
            path: path,
            index: routeKey,
            priority: Number.isFinite(Number(route.priority)) ? Number(route.priority) : 0,
            type: String(route.type || "").trim().toLowerCase(),
            oneway: oneWay,
            direction: String(route.direction || "").trim().toLowerCase()
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
                distanceBetweenLatLngMeters(path[i], path[i + 1]);
        }

        return (
            totalMeters / 1000
        );
    }

    // ============================================================
    // 近くのスポットを既存参道へ自動接続
    // ============================================================

    // 実際の参道から35m以内にあるスポットだけを自動接続する。
    // 35mを超える場所は、道を横切る危険があるため自動では結ばない。
    const AUTO_SPOT_ROUTE_CONNECT_LIMIT_METERS = 35;

    function distanceBetweenLatLngMeters(a, b) {
        const earthRadius = 6371000;
        const lat1 = Number(a[0]) * Math.PI / 180;
        const lat2 = Number(b[0]) * Math.PI / 180;
        const deltaLat = (Number(b[0]) - Number(a[0])) * Math.PI / 180;
        const deltaLng = (Number(b[1]) - Number(a[1])) * Math.PI / 180;
        const h = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
    }

    // Spotを線分へ正射影する。伏見稲荷周辺の狭い範囲なので局所平面近似で十分な精度。
    function projectSpotToRouteSegment(point, a, b) {
        const latitudeRadians = point[0] * Math.PI / 180;
        const metersPerLng = 111320 * Math.cos(latitudeRadians);
        const metersPerLat = 110540;

        const ax = (a[1] - point[1]) * metersPerLng;
        const ay = (a[0] - point[0]) * metersPerLat;
        const bx = (b[1] - point[1]) * metersPerLng;
        const by = (b[0] - point[0]) * metersPerLat;
        const dx = bx - ax;
        const dy = by - ay;
        const denominator = dx * dx + dy * dy;
        const ratio = denominator === 0
            ? 0
            : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / denominator));

        const projectedX = ax + dx * ratio;
        const projectedY = ay + dy * ratio;
        return {
            distanceMeters: Math.hypot(projectedX, projectedY),
            point: [
                point[0] + projectedY / metersPerLat,
                point[1] + projectedX / metersPerLng
            ],
            ratio: ratio
        };
    }

    function getRoutePointAtMeasure(path, measure) {
        const maxMeasure = path.length - 1;
        const safeMeasure = Math.max(0, Math.min(maxMeasure, measure));
        if (safeMeasure <= 0) return path[0].slice();
        if (safeMeasure >= maxMeasure) return path[path.length - 1].slice();

        const segmentIndex = Math.floor(safeMeasure);
        const ratio = safeMeasure - segmentIndex;
        const a = path[segmentIndex];
        const b = path[segmentIndex + 1];
        return [
            a[0] + (b[0] - a[0]) * ratio,
            a[1] + (b[1] - a[1]) * ratio
        ];
    }

    function getRouteSubPath(path, startMeasure, endMeasure) {
        const points = [getRoutePointAtMeasure(path, startMeasure)];
        for (let index = 1; index < path.length - 1; index++) {
            if (index > startMeasure + 1e-8 && index < endMeasure - 1e-8) {
                points.push(path[index].slice());
            }
        }
        points.push(getRoutePointAtMeasure(path, endMeasure));

        // Remove duplicate consecutive coordinates while keeping at least two points.
        const cleaned = [];
        points.forEach(function (point) {
            if (!cleaned.length || distanceBetweenLatLngMeters(cleaned[cleaned.length - 1], point) > 0.05) {
                cleaned.push(point);
            }
        });
        if (cleaned.length === 1) cleaned.push(cleaned[0].slice());
        return cleaned;
    }

    function addAutomaticSpotConnections(baseRoutes) {
        if (!Array.isArray(spots) || !spots.length || !baseRoutes.length) {
            return { routes: baseRoutes, connections: [] };
        }

        const explicitEndpointIds = new Set();
        const endpointRouteCounts = new Map();
        baseRoutes.forEach(function (route) {
            [String(route.from), String(route.to)].forEach(function (id) {
                explicitEndpointIds.add(id);
                endpointRouteCounts.set(id, (endpointRouteCounts.get(id) || 0) + 1);
            });
        });

        // A regular spot may attach within 35 m. A spot that already has exactly
        // one route edge may also rejoin a nearby shared trace within 8 m. This
        // prevents a single endpoint spur (for example, a toilet spur) from
        // forcing every route to travel back to that spur's original junction.
        const AUTO_SPOT_REJOIN_LIMIT_METERS = 8;
        const SHARED_TRACE_TOLERANCE_METERS = 1.5;
        const candidatesByRoute = new Map();
        const outsideLimit = [];
        const spotRecords = [];

        spots.forEach(function (spot) {
            const spotId = String(spot.id);
            const incidentRouteCount = endpointRouteCounts.get(spotId) || 0;
            const isSingleEdgeEndpoint = explicitEndpointIds.has(spotId) && incidentRouteCount === 1;

            // Spots already connected to several explicit route edges are
            // intentionally left alone; their topology is already defined.
            if (explicitEndpointIds.has(spotId) && !isSingleEdgeEndpoint) return;

            const lat = Number(spot.lat);
            const lng = Number(spot.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

            const spotPoint = [lat, lng];
            const projections = [];

            baseRoutes.forEach(function (route, routeIndex) {
                // For a one-edge endpoint, preserve its existing edge and search
                // only for an additional, nearby trace to rejoin.
                if (isSingleEdgeEndpoint &&
                    (String(route.from) === spotId || String(route.to) === spotId)) {
                    return;
                }

                for (let segmentIndex = 0; segmentIndex < route.path.length - 1; segmentIndex++) {
                    const projection = projectSpotToRouteSegment(
                        spotPoint,
                        route.path[segmentIndex],
                        route.path[segmentIndex + 1]
                    );
                    projections.push({
                        routeIndex: routeIndex,
                        segmentIndex: segmentIndex,
                        measure: segmentIndex + projection.ratio,
                        distanceMeters: projection.distanceMeters,
                        point: projection.point
                    });
                }
            });

            if (!projections.length) return;
            projections.sort(function (a, b) { return a.distanceMeters - b.distanceMeters; });
            const nearest = projections[0];
            // A live GPS point must be much closer than a stored spot before we draw a
            // straight connector. This avoids routing across walls, roads or private areas.
            const isLiveGpsPoint = spotId === '__current_user__';
            const connectionLimit = isLiveGpsPoint
                ? 12
                : (isSingleEdgeEndpoint ? AUTO_SPOT_REJOIN_LIMIT_METERS : AUTO_SPOT_ROUTE_CONNECT_LIMIT_METERS);

            if (nearest.distanceMeters > connectionLimit) {
                if (nearest.distanceMeters <= 60) {
                    outsideLimit.push({
                        id: spotId,
                        name: spot.name || spotId,
                        distanceMeters: Math.round(nearest.distanceMeters * 10) / 10,
                        limitMeters: connectionLimit
                    });
                }
                return;
            }

            // Several routes.json edges can describe the same physical trace.
            // Attach this spot to every coincident copy, not just the first
            // match returned by the nearest-segment search. This is important
            // when two hand-drawn traces overlap but lead to different nodes.
            const matchingByRoute = new Map();
            projections.forEach(function (candidate) {
                if (candidate.distanceMeters > nearest.distanceMeters + SHARED_TRACE_TOLERANCE_METERS) return;
                if (distanceBetweenLatLngMeters(candidate.point, nearest.point) > SHARED_TRACE_TOLERANCE_METERS) return;

                const previous = matchingByRoute.get(candidate.routeIndex);
                if (!previous || candidate.distanceMeters < previous.distanceMeters) {
                    matchingByRoute.set(candidate.routeIndex, candidate);
                }
            });

            if (!matchingByRoute.size) return;
            spotRecords.push({
                spot: spot,
                spotPoint: spotPoint,
                nearest: nearest,
                matches: Array.from(matchingByRoute.values()),
                joinCluster: null
            });
        });

        // Give geometrically coincident spot connections one shared graph node.
        // This also keeps nearby spot connectors from creating parallel, almost
        // identical junctions on the same path.
        const joinClusters = [];
        spotRecords.sort(function (a, b) {
            return a.nearest.distanceMeters - b.nearest.distanceMeters;
        });

        spotRecords.forEach(function (record) {
            let cluster = null;
            for (const candidateCluster of joinClusters) {
                if (distanceBetweenLatLngMeters(candidateCluster.point, record.nearest.point) <= SHARED_TRACE_TOLERANCE_METERS) {
                    cluster = candidateCluster;
                    break;
                }
            }
            if (!cluster) {
                cluster = {
                    point: record.nearest.point.slice(),
                    nodeId: `__auto_spot_route_join_${joinClusters.length + 1}`
                };
                joinClusters.push(cluster);
            }
            record.joinCluster = cluster;
        });

        // If a matched trace meets an existing graph endpoint exactly, reuse
        // that endpoint ID as the shared node rather than creating a duplicate.
        spotRecords.forEach(function (record) {
            for (const match of record.matches) {
                const route = baseRoutes[match.routeIndex];
                if (distanceBetweenLatLngMeters(match.point, route.path[0]) <= 1) {
                    record.joinCluster.nodeId = String(route.from);
                    break;
                }
                if (distanceBetweenLatLngMeters(match.point, route.path[route.path.length - 1]) <= 1) {
                    record.joinCluster.nodeId = String(route.to);
                    break;
                }
            }
        });

        spotRecords.forEach(function (record) {
            record.matches.forEach(function (match) {
                if (!candidatesByRoute.has(match.routeIndex)) {
                    candidatesByRoute.set(match.routeIndex, []);
                }
                candidatesByRoute.get(match.routeIndex).push({
                    spot: record.spot,
                    spotPoint: record.spotPoint,
                    point: match.point,
                    measure: match.measure,
                    distanceMeters: match.distanceMeters,
                    joinCluster: record.joinCluster
                });
            });
        });

        const expandedRoutes = [];
        const connectionLog = [];

        baseRoutes.forEach(function (route, routeIndex) {
            const candidates = (candidatesByRoute.get(routeIndex) || []).slice()
                .sort(function (a, b) { return a.measure - b.measure; });

            if (!candidates.length) {
                expandedRoutes.push(route);
                return;
            }

            // One boundary per shared graph node on this route. If multiple
            // nearby spots use the same junction, their connector edges still
            // point to the same node and the route itself is split only once.
            const uniqueCandidates = [];
            candidates.forEach(function (candidate) {
                const existing = uniqueCandidates.find(function (item) {
                    return item.joinCluster === candidate.joinCluster;
                });
                if (!existing) {
                    uniqueCandidates.push(candidate);
                } else if (candidate.distanceMeters < existing.distanceMeters) {
                    existing.measure = candidate.measure;
                    existing.point = candidate.point;
                    existing.distanceMeters = candidate.distanceMeters;
                }
            });
            uniqueCandidates.sort(function (a, b) { return a.measure - b.measure; });

            const boundaries = [{
                measure: 0,
                nodeId: String(route.from)
            }];
            uniqueCandidates.forEach(function (candidate) {
                boundaries.push({
                    measure: candidate.measure,
                    nodeId: candidate.joinCluster.nodeId
                });
            });
            boundaries.push({
                measure: route.path.length - 1,
                nodeId: String(route.to)
            });
            boundaries.sort(function (a, b) { return a.measure - b.measure; });

            for (let partIndex = 0; partIndex < boundaries.length - 1; partIndex++) {
                const start = boundaries[partIndex];
                const end = boundaries[partIndex + 1];
                if (end.measure - start.measure < 1e-9 && start.nodeId === end.nodeId) continue;
                const segmentPath = getRouteSubPath(route.path, start.measure, end.measure);
                expandedRoutes.push({
                    from: start.nodeId,
                    to: end.nodeId,
                    name: `${route.name}（自動接続分割${partIndex + 1}）`,
                    path: segmentPath,
                    index: route.index,
                    priority: route.priority,
                    type: route.type,
                    oneway: !!route.oneway,
                    direction: route.direction || ""
                });
            }
        });

        // Add one real connector per spot. All coincident route copies above
        // share its destination node, so the router can choose the shortest
        // continuation without jumping to an unrelated branch.
        spotRecords.forEach(function (record) {
            const nodeId = record.joinCluster.nodeId;
            const targetPoint = record.nearest.point.slice();
            expandedRoutes.push({
                from: String(record.spot.id),
                to: nodeId,
                name: `${record.spot.name || record.spot.id}から既存参道への自動接続`,
                path: [record.spotPoint.slice(), targetPoint],
                priority: 0,
                type: "auto-connector"
            });
            connectionLog.push({
                id: String(record.spot.id),
                name: record.spot.name || String(record.spot.id),
                distanceMeters: Math.round(record.nearest.distanceMeters * 10) / 10,
                matchedRoutes: record.matches.map(match => baseRoutes[match.routeIndex].name)
            });
        });

        if (connectionLog.length) {
            console.info("近くの参道へ自動接続したスポット:", connectionLog);
        }
        if (outsideLimit.length) {
            console.info("接続距離の上限を超えたため自動接続しなかったスポット:", outsideLimit);
        }

        return {
            routes: expandedRoutes,
            connections: connectionLog
        };
    }

    // ============================================================
    // 参道ネットワークの幾何接続
    //  - ルート端点が別ルートの途中にある場合、その線を分割して接続
    //  - 線同士の実交差も共通ノードにする
    //  - 近接端点も接続（ただし別スポット同士は勝手に統合しない）
    //  - one-way は分割後の全区間へ引き継ぐ
    // ============================================================

    const ROUTE_ENDPOINT_JOIN_LIMIT_METERS = 4;
    const ROUTE_JUNCTION_CLUSTER_LIMIT_METERS = 1.5;
    const ROUTE_INTERSECTION_GRID_CELL_METERS = 12;

    function connectRouteNetworkJunctions(inputRoutes) {
        if (!Array.isArray(inputRoutes) || inputRoutes.length < 2) {
            return { routes: inputRoutes || [], junctionCount: 0, splitRouteCount: 0, addedEdgeCount: 0 };
        }

        const workingRoutes = inputRoutes.map(function (route) {
            return {
                ...route,
                path: route.path.map(point => point.slice()),
                oneway: !!route.oneway
            };
        });
        const spotIdSet = new Set((spots || []).map(spot => String(spot.id)));
        const endpointRecords = [];
        const candidates = [];

        function pushCandidate(point, occurrences, source) {
            if (!point || !Array.isArray(occurrences) || occurrences.length < 2) return;
            candidates.push({ point: point.slice(), occurrences: occurrences, source: source || "" });
        }

        function getEndpointNode(route, side) {
            return String(side === "start" ? route.from : route.to);
        }

        workingRoutes.forEach(function (route, routeIndex) {
            if (route.type === "auto-connector") {
                // 自動接続線は作成時点で target node を持つ。
                // その到着端だけを幾何接続に参加させ、スポット側の直線部分は
                // 交差判定に使わない（地面を横切る誤接続を防止）。
                endpointRecords.push({
                    routeIndex: routeIndex,
                    side: "end",
                    point: route.path[route.path.length - 1].slice(),
                    nodeId: getEndpointNode(route, "end")
                });
                return;
            }
            endpointRecords.push({
                routeIndex: routeIndex,
                side: "start",
                point: route.path[0].slice(),
                nodeId: getEndpointNode(route, "start")
            });
            endpointRecords.push({
                routeIndex: routeIndex,
                side: "end",
                point: route.path[route.path.length - 1].slice(),
                nodeId: getEndpointNode(route, "end")
            });
        });

        // 1) ルート端点 → 別のルートの途中／端点を検索。
        // 同じターゲットルート内で最も近い1か所を採用し、ほぼ同じ場所に重なる
        // 複数のルートコピーだけを同じ接続点へまとめる。
        endpointRecords.forEach(function (endpoint) {
            const bestByRoute = [];
            workingRoutes.forEach(function (targetRoute, targetRouteIndex) {
                if (targetRouteIndex === endpoint.routeIndex || targetRoute.type === "auto-connector") return;
                let best = null;
                for (let segmentIndex = 0; segmentIndex < targetRoute.path.length - 1; segmentIndex++) {
                    const projection = projectSpotToRouteSegment(
                        endpoint.point,
                        targetRoute.path[segmentIndex],
                        targetRoute.path[segmentIndex + 1]
                    );
                    if (!best || projection.distanceMeters < best.distanceMeters) {
                        best = {
                            routeIndex: targetRouteIndex,
                            measure: segmentIndex + projection.ratio,
                            distanceMeters: projection.distanceMeters,
                            point: projection.point
                        };
                    }
                }
                if (best) bestByRoute.push(best);
            });

            bestByRoute.sort((a, b) => a.distanceMeters - b.distanceMeters);
            if (!bestByRoute.length || bestByRoute[0].distanceMeters > ROUTE_ENDPOINT_JOIN_LIMIT_METERS) return;

            const nearest = bestByRoute[0];
            const selected = bestByRoute.filter(function (item) {
                return item.distanceMeters <= nearest.distanceMeters + 0.5 &&
                    distanceBetweenLatLngMeters(item.point, nearest.point) <= 0.75;
            });
            const occurrences = [{
                routeIndex: endpoint.routeIndex,
                measure: endpoint.side === "start" ? 0 : workingRoutes[endpoint.routeIndex].path.length - 1,
                side: endpoint.side
            }];
            selected.forEach(function (item) {
                occurrences.push({
                    routeIndex: item.routeIndex,
                    measure: item.measure,
                    side: null
                });
            });
            pushCandidate(nearest.point, occurrences, "endpoint-to-line");
        });

        // 2) 端点同士が近接している場合も接続する。
        // 異なる実スポットID同士は距離だけで統合しない。
        for (let i = 0; i < endpointRecords.length; i++) {
            for (let j = i + 1; j < endpointRecords.length; j++) {
                const a = endpointRecords[i];
                const b = endpointRecords[j];
                if (a.routeIndex === b.routeIndex) continue;
                if (distanceBetweenLatLngMeters(a.point, b.point) > ROUTE_ENDPOINT_JOIN_LIMIT_METERS) continue;
                if (spotIdSet.has(a.nodeId) && spotIdSet.has(b.nodeId) && a.nodeId !== b.nodeId) continue;
                const midpoint = [(a.point[0] + b.point[0]) / 2, (a.point[1] + b.point[1]) / 2];
                pushCandidate(midpoint, [
                    { routeIndex: a.routeIndex, measure: a.side === "start" ? 0 : workingRoutes[a.routeIndex].path.length - 1, side: a.side },
                    { routeIndex: b.routeIndex, measure: b.side === "start" ? 0 : workingRoutes[b.routeIndex].path.length - 1, side: b.side }
                ], "endpoint-to-endpoint");
            }
        }

        // 3) 線同士の実交差を検出する。空間グリッドで候補区間だけ比較するため、
        // 広い範囲の全区間を総当たりしない。
        const allCoordinates = workingRoutes.flatMap(route => route.path);
        const originLat = allCoordinates.reduce((sum, point) => sum + point[0], 0) / allCoordinates.length;
        const originLng = allCoordinates.reduce((sum, point) => sum + point[1], 0) / allCoordinates.length;
        const metersPerLng = 111320 * Math.cos(originLat * Math.PI / 180);
        const metersPerLat = 110540;
        function toXY(point) {
            return {
                x: (point[1] - originLng) * metersPerLng,
                y: (point[0] - originLat) * metersPerLat
            };
        }
        function toLatLng(point) {
            return [originLat + point.y / metersPerLat, originLng + point.x / metersPerLng];
        }
        function cross(ax, ay, bx, by) {
            return ax * by - ay * bx;
        }
        function getSegmentIntersection(a, b, c, d) {
            const rx = b.x - a.x;
            const ry = b.y - a.y;
            const sx = d.x - c.x;
            const sy = d.y - c.y;
            const denominator = cross(rx, ry, sx, sy);
            if (Math.abs(denominator) < 1e-8) return null; // parallel / collinear
            const qpx = c.x - a.x;
            const qpy = c.y - a.y;
            const t = cross(qpx, qpy, sx, sy) / denominator;
            const u = cross(qpx, qpy, rx, ry) / denominator;
            const epsilon = 1e-8;
            if (t < -epsilon || t > 1 + epsilon || u < -epsilon || u > 1 + epsilon) return null;
            const safeT = Math.max(0, Math.min(1, t));
            return {
                t: safeT,
                u: Math.max(0, Math.min(1, u)),
                point: { x: a.x + rx * safeT, y: a.y + ry * safeT }
            };
        }

        const segments = [];
        workingRoutes.forEach(function (route, routeIndex) {
            if (route.type === "auto-connector") return;
            const localPath = route.path.map(toXY);
            for (let segmentIndex = 0; segmentIndex < localPath.length - 1; segmentIndex++) {
                const a = localPath[segmentIndex];
                const b = localPath[segmentIndex + 1];
                if (Math.hypot(b.x - a.x, b.y - a.y) < 0.01) continue;
                segments.push({
                    routeIndex: routeIndex,
                    segmentIndex: segmentIndex,
                    a: a,
                    b: b,
                    minX: Math.min(a.x, b.x),
                    maxX: Math.max(a.x, b.x),
                    minY: Math.min(a.y, b.y),
                    maxY: Math.max(a.y, b.y)
                });
            }
        });

        const grid = new Map();
        const cellSize = ROUTE_INTERSECTION_GRID_CELL_METERS;
        segments.forEach(function (segment, segmentId) {
            const minCellX = Math.floor(segment.minX / cellSize);
            const maxCellX = Math.floor(segment.maxX / cellSize);
            const minCellY = Math.floor(segment.minY / cellSize);
            const maxCellY = Math.floor(segment.maxY / cellSize);
            for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
                for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
                    const key = `${cellX}:${cellY}`;
                    if (!grid.has(key)) grid.set(key, []);
                    grid.get(key).push(segmentId);
                }
            }
        });

        const comparedPairs = new Set();
        grid.forEach(function (segmentIds) {
            for (let aIndex = 0; aIndex < segmentIds.length; aIndex++) {
                for (let bIndex = aIndex + 1; bIndex < segmentIds.length; bIndex++) {
                    let firstId = segmentIds[aIndex];
                    let secondId = segmentIds[bIndex];
                    if (firstId === secondId) continue;
                    if (firstId > secondId) [firstId, secondId] = [secondId, firstId];
                    const pairKey = `${firstId}:${secondId}`;
                    if (comparedPairs.has(pairKey)) continue;
                    comparedPairs.add(pairKey);

                    const first = segments[firstId];
                    const second = segments[secondId];
                    if (first.routeIndex === second.routeIndex) continue;
                    if (first.maxX < second.minX || second.maxX < first.minX ||
                        first.maxY < second.minY || second.maxY < first.minY) continue;

                    const intersection = getSegmentIntersection(first.a, first.b, second.a, second.b);
                    if (!intersection) continue;

                    // 近似・平均化された線が平行に近いまま交差した場合、
                    // GPSの微小な揺れで生じた見かけの交差である可能性が高い。
                    // 端点が別の線に接続するケースは上の端点接続処理で拾うため、
                    // ここでは角度のはっきりした線同士の交差だけを分岐点にする。
                    const firstDx = first.b.x - first.a.x;
                    const firstDy = first.b.y - first.a.y;
                    const secondDx = second.b.x - second.a.x;
                    const secondDy = second.b.y - second.a.y;
                    const firstLength = Math.hypot(firstDx, firstDy);
                    const secondLength = Math.hypot(secondDx, secondDy);
                    if (firstLength < 0.05 || secondLength < 0.05) continue;
                    const cosine = Math.min(1, Math.abs(
                        (firstDx * secondDx + firstDy * secondDy) / (firstLength * secondLength)
                    ));
                    const crossingAngle = Math.acos(cosine) * 180 / Math.PI;
                    if (crossingAngle < 18) continue;

                    // 線の端同士・端点上の分岐は、4m以内の端点接続で処理する。
                    // 交差処理で同じ場所に微小な別ノードを重ねない。
                    if (intersection.t < 0.015 || intersection.t > 0.985 ||
                        intersection.u < 0.015 || intersection.u > 0.985) continue;

                    const point = toLatLng(intersection.point);
                    pushCandidate(point, [
                        { routeIndex: first.routeIndex, measure: first.segmentIndex + intersection.t, side: null },
                        { routeIndex: second.routeIndex, measure: second.segmentIndex + intersection.u, side: null }
                    ], "line-intersection");
                }
            }
        });

        if (!candidates.length) {
            return { routes: workingRoutes, junctionCount: 0, splitRouteCount: 0, addedEdgeCount: 0 };
        }

        // 4) 同じ物理的な接続点として検出された候補をクラスタリングする。
        const parent = candidates.map((_, index) => index);
        function findRoot(value) {
            let node = value;
            while (parent[node] !== node) {
                parent[node] = parent[parent[node]];
                node = parent[node];
            }
            return node;
        }
        function unionRoots(a, b) {
            const rootA = findRoot(a);
            const rootB = findRoot(b);
            if (rootA !== rootB) parent[rootB] = rootA;
        }
        function getCandidateSpotIds(candidate) {
            const ids = new Set();
            candidate.occurrences.forEach(function (occurrence) {
                if (!occurrence.side) return;
                const route = workingRoutes[occurrence.routeIndex];
                const nodeId = String(occurrence.side === "start" ? route.from : route.to);
                if (spotIdSet.has(nodeId)) ids.add(nodeId);
            });
            return ids;
        }
        const candidateSpotIds = candidates.map(getCandidateSpotIds);
        // 分岐候補を距離1.5mの空間グリッドでまとめる。
        // 候補点を全件総当たりすると交差の多いGPSデータで初期化が重くなるため、
        // 近傍セルだけを比較して同じ分岐点をクラスタ化する。
        const candidateGrid = new Map();
        const candidateCellSize = ROUTE_JUNCTION_CLUSTER_LIMIT_METERS;
        for (let i = 0; i < candidates.length; i++) {
            const xy = toXY(candidates[i].point);
            const cellX = Math.floor(xy.x / candidateCellSize);
            const cellY = Math.floor(xy.y / candidateCellSize);
            for (let offsetX = -1; offsetX <= 1; offsetX++) {
                for (let offsetY = -1; offsetY <= 1; offsetY++) {
                    const bucket = candidateGrid.get(`${cellX + offsetX}:${cellY + offsetY}`);
                    if (!bucket) continue;
                    for (const j of bucket) {
                        if (distanceBetweenLatLngMeters(candidates[i].point, candidates[j].point) > ROUTE_JUNCTION_CLUSTER_LIMIT_METERS) continue;
                        const idsA = candidateSpotIds[i];
                        const idsB = candidateSpotIds[j];
                        if (idsA.size && idsB.size && [...idsA].some(id => !idsB.has(id))) continue;
                        unionRoots(i, j);
                    }
                }
            }
            const key = `${cellX}:${cellY}`;
            if (!candidateGrid.has(key)) candidateGrid.set(key, []);
            candidateGrid.get(key).push(i);
        }

        const candidateGroups = new Map();
        candidates.forEach(function (candidate, index) {
            const root = findRoot(index);
            if (!candidateGroups.has(root)) candidateGroups.set(root, []);
            candidateGroups.get(root).push(candidate);
        });

        const splitBoundaries = new Map();
        let junctionIndex = 0;
        candidateGroups.forEach(function (group) {
            const uniqueSpotIds = new Set();
            const existingNodeIds = new Set();
            let pointLat = 0;
            let pointLng = 0;
            group.forEach(function (candidate) {
                pointLat += candidate.point[0];
                pointLng += candidate.point[1];
                candidate.occurrences.forEach(function (occurrence) {
                    if (!occurrence.side) return;
                    const route = workingRoutes[occurrence.routeIndex];
                    const nodeId = String(occurrence.side === "start" ? route.from : route.to);
                    existingNodeIds.add(nodeId);
                    if (spotIdSet.has(nodeId)) uniqueSpotIds.add(nodeId);
                });
            });
            pointLat /= group.length;
            pointLng /= group.length;
            const junctionPoint = [pointLat, pointLng];
            let nodeId;
            if (uniqueSpotIds.size === 1) {
                nodeId = [...uniqueSpotIds][0];
            } else if (uniqueSpotIds.size > 1) {
                // 別スポットIDが同じ位置に重なったデータは自動統合しない。
                nodeId = `__route_junction_${++junctionIndex}`;
            } else if (existingNodeIds.size === 1) {
                nodeId = [...existingNodeIds][0];
            } else {
                nodeId = `__route_junction_${++junctionIndex}`;
            }

            const seenOccurrences = new Set();
            group.forEach(function (candidate) {
                candidate.occurrences.forEach(function (occurrence) {
                    const route = workingRoutes[occurrence.routeIndex];
                    if (occurrence.side) {
                        const key = `${occurrence.routeIndex}:${occurrence.side}`;
                        if (seenOccurrences.has(key)) return;
                        seenOccurrences.add(key);
                        if (occurrence.side === "start") {
                            route.from = nodeId;
                            route.path[0] = junctionPoint.slice();
                        } else {
                            route.to = nodeId;
                            route.path[route.path.length - 1] = junctionPoint.slice();
                        }
                    } else {
                        const key = `${occurrence.routeIndex}:${occurrence.measure.toFixed(6)}`;
                        if (seenOccurrences.has(key)) return;
                        seenOccurrences.add(key);
                        if (!splitBoundaries.has(occurrence.routeIndex)) splitBoundaries.set(occurrence.routeIndex, []);
                        splitBoundaries.get(occurrence.routeIndex).push({
                            measure: occurrence.measure,
                            nodeId: nodeId,
                            point: junctionPoint.slice()
                        });
                    }
                });
            });
        });

        // 5) 接続点で線を分割する。onewayは向きを変えず、全分割区間に継承する。
        const expandedRoutes = [];
        let splitRouteCount = 0;
        workingRoutes.forEach(function (route, routeIndex) {
            const internal = (splitBoundaries.get(routeIndex) || []).slice()
                .sort((a, b) => a.measure - b.measure);
            const boundaries = [{
                measure: 0,
                nodeId: String(route.from),
                point: route.path[0].slice()
            }];
            internal.forEach(function (boundary) {
                const previous = boundaries[boundaries.length - 1];
                if (previous && Math.abs(previous.measure - boundary.measure) < 1e-6 && previous.nodeId === boundary.nodeId) {
                    previous.point = boundary.point.slice();
                    return;
                }
                boundaries.push(boundary);
            });
            boundaries.push({
                measure: route.path.length - 1,
                nodeId: String(route.to),
                point: route.path[route.path.length - 1].slice()
            });
            boundaries.sort((a, b) => a.measure - b.measure);

            const routeParts = [];
            for (let partIndex = 0; partIndex < boundaries.length - 1; partIndex++) {
                const start = boundaries[partIndex];
                const end = boundaries[partIndex + 1];
                if (end.measure - start.measure < 1e-8 || start.nodeId === end.nodeId) continue;
                const segmentPath = getRouteSubPath(route.path, start.measure, end.measure);
                if (start.point) segmentPath[0] = start.point.slice();
                if (end.point) segmentPath[segmentPath.length - 1] = end.point.slice();
                if (segmentPath.length < 2 || routePathDistanceKm(segmentPath) < 0.000001) continue;
                routeParts.push({
                    from: start.nodeId,
                    to: end.nodeId,
                    name: boundaries.length > 2 ? `${route.name}（接続区間${partIndex + 1}）` : route.name,
                    path: segmentPath,
                    index: route.index,
                    priority: route.priority,
                    type: route.type,
                    oneway: !!route.oneway,
                    direction: route.direction || ""
                });
            }
            if (routeParts.length > 1) splitRouteCount++;
            expandedRoutes.push(...routeParts);
        });

        const addedEdgeCount = expandedRoutes.length - workingRoutes.length;
        console.info("[参道ネットワーク] 幾何接続を構築しました", {
            originalEdges: workingRoutes.length,
            graphEdges: expandedRoutes.length,
            junctions: candidateGroups.size,
            splitRoutes: splitRouteCount,
            addedEdges: addedEdgeCount,
            oneWayEdges: expandedRoutes.filter(route => route.oneway).length
        });
        return {
            routes: expandedRoutes,
            junctionCount: candidateGroups.size,
            splitRouteCount: splitRouteCount,
            addedEdgeCount: addedEdgeCount
        };
    }

    function prepareRouteGraph() {
        const baseRoutes = routes
            .map(normalizeRouteObject)
            .filter(Boolean);
        const connected = addAutomaticSpotConnections(baseRoutes);
        const network = connectRouteNetworkJunctions(connected.routes);
        routes = network.routes;
        // 参道データは初期化後に変化しないため、経路検索ごとにグラフを
        // 作り直さず、ここで一度だけ組み立てて共有する。
        preparedRouteGraph = buildGraph();

        console.log(
            "V136 routes loaded:",
            baseRoutes.length,
            "base routes /",
            routes.length,
            "graph edges /",
            connected.connections.length,
            "auto spot connections /",
            network.junctionCount,
            "geometric junctions /",
            network.splitRouteCount,
            "split routes /",
            preparedRouteGraph.size,
            "graph nodes /",
            routes.filter(route => route.oneway).length,
            "one-way segments"
        );
    }

    function getEdgeCost(route) {
        // Physical distance is the primary route cost. Route priority/type must
        // not make a longer detour win over a shorter walkable trace.
        return routePathDistanceKm(route.path);
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

                // 一方通行は routes.json の path 順（from → to）だけを許可する。
                if (!route.oneway) {
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
            }
        );

        return graph;
    }

    // ============================================================
    // 最適ルート探索
    // ============================================================

    function findGraphRoute(fromId, toId) {
        const start = String(fromId);
        const goal = String(toId);

        if (start === goal) {
            return {
                coordinates: [],
                paths: [],
                distanceKm: 0,
                legs: []
            };
        }

        const graph = preparedRouteGraph || buildGraph();
        if (!graph.has(start) || !graph.has(goal)) return null;

        const distances = new Map();
        const segmentCounts = new Map();
        const previous = new Map();
        const queue = [];
        const DISTANCE_TIE_TOLERANCE_KM = 0.0005; // 0.5 m: treat as the same practical distance.

        graph.forEach(function (_, node) {
            distances.set(node, Infinity);
            segmentCounts.set(node, Infinity);
        });
        distances.set(start, 0);
        segmentCounts.set(start, 0);
        queue.push({ node: start, distance: 0, segmentCount: 0 });

        function isBetterRoute(nextDistance, nextCount, currentDistance, currentCount) {
            if (!Number.isFinite(currentDistance)) return true;
            if (nextDistance < currentDistance - DISTANCE_TIE_TOLERANCE_KM) return true;
            return Math.abs(nextDistance - currentDistance) <= DISTANCE_TIE_TOLERANCE_KM && nextCount < currentCount;
        }

        while (queue.length > 0) {
            queue.sort(function (a, b) {
                const difference = a.distance - b.distance;
                if (Math.abs(difference) > DISTANCE_TIE_TOLERANCE_KM) return difference;
                return a.segmentCount - b.segmentCount;
            });

            const current = queue.shift();
            if (!current) break;

            const knownDistance = distances.get(current.node) ?? Infinity;
            const knownCount = segmentCounts.get(current.node) ?? Infinity;
            if (Math.abs(current.distance - knownDistance) > DISTANCE_TIE_TOLERANCE_KM ||
                current.segmentCount !== knownCount) {
                continue;
            }

            if (current.node === goal) break;

            const edges = graph.get(current.node) || [];
            edges.forEach(function (edge) {
                const nextDistance = current.distance + edge.cost;
                const nextCount = current.segmentCount + 1;
                const knownNextDistance = distances.get(edge.to) ?? Infinity;
                const knownNextCount = segmentCounts.get(edge.to) ?? Infinity;

                if (!isBetterRoute(nextDistance, nextCount, knownNextDistance, knownNextCount)) return;

                distances.set(edge.to, nextDistance);
                segmentCounts.set(edge.to, nextCount);
                previous.set(edge.to, {
                    previousNode: current.node,
                    edge: edge
                });
                queue.push({
                    node: edge.to,
                    distance: nextDistance,
                    segmentCount: nextCount
                });
            });
        }

        if (!previous.has(goal)) return null;

        const pathEdges = [];
        let cursor = goal;
        while (cursor !== start) {
            const record = previous.get(cursor);
            if (!record) return null;
            pathEdges.push(record.edge);
            cursor = record.previousNode;
        }
        pathEdges.reverse();

        const paths = [];
        let totalDistanceKm = 0;
        pathEdges.forEach(function (edge) {
            const points = edge.path.map(point => point.slice());
            const previousPath = paths[paths.length - 1];

            if (previousPath && points.length >= 2 &&
                distanceBetweenLatLngMeters(previousPath[previousPath.length - 1], points[0]) <= 1.5) {
                previousPath.push(...points.slice(1));
            } else if (points.length >= 2) {
                // Preserve genuine geometry gaps; never draw an invented bridge.
                paths.push(points);
            }
            totalDistanceKm += routePathDistanceKm(edge.path);
        });

        return {
            coordinates: paths.length === 1 ? paths[0].slice() : (paths[0] || []),
            paths: paths,
            distanceKm: totalDistanceKm,
            segmentCount: pathEdges.length,
            legs: pathEdges
        };
    }

    // ============================================================
    // スポット検索
    // ============================================================



  function flattenRoutePaths(paths) {
    const flattened=[];
    (paths||[]).forEach(path=>path.forEach(point=>{
      if (!flattened.length || haversine(flattened[flattened.length-1],point)>0.2) flattened.push(point.slice());
    }));
    return flattened;
  }
  function pathDistance(paths) { return (paths||[]).reduce((sum,path)=>sum+routePathDistanceKm(path)*1000,0); }
  function validatePaths(paths) {
    if (!Array.isArray(paths)||!paths.length) return false;
    return paths.every(path=>Array.isArray(path)&&path.length>=2&&path.every(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1])));
  }

  function addRouteLayers() {
    if (map.getSource('active-route')) return;
    map.addSource('active-route',{type:'geojson',data:coordsToGeoJSON([]),lineMetrics:true});
    map.addLayer({id:'active-route-casing',type:'line',source:'active-route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ffffff','line-width':9,'line-opacity':0.96}});
    map.addLayer({id:'active-route-line',type:'line',source:'active-route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#FF9900','line-width':['interpolate',['linear'],['zoom'],14,4,19,6],'line-opacity':1}});
  }
  function drawRoute(route) {
    if (!mapLoaded) return;
    addRouteLayers();
    map.getSource('active-route').setData(coordsToGeoJSON(route.paths));
    const points=flattenRoutePaths(route.paths);
    if (points.length) {
      const bounds=points.reduce((b,p)=>b.extend([p[1],p[0]]),new maplibregl.LngLatBounds([points[0][1],points[0][0]],[points[0][1],points[0][0]]));
      map.fitBounds(bounds,{padding:{top:150,bottom:300,left:45,right:45},maxZoom:18.5,duration:700});
    }
    stopRouteAnimation();
    if (points.length>1) animateRouteRunner(points);
  }
  function stopRouteAnimation() {
    if (routeAnimationFrame) cancelAnimationFrame(routeAnimationFrame);
    routeAnimationFrame=null;
    routeRunnerMarkers.forEach(marker=>marker.remove());
    routeRunnerMarkers=[];
  }
  function pointAndBearingAtDistance(path, measure) {
    let walked=0;
    for(let i=1;i<path.length;i++){
      const segment=haversine(path[i-1],path[i]);
      if(walked+segment>=measure){
        const ratio=segment?Math.max(0,Math.min(1,(measure-walked)/segment)):0;
        return {point:[path[i-1][0]+(path[i][0]-path[i-1][0])*ratio,path[i-1][1]+(path[i][1]-path[i-1][1])*ratio],bearing:bearingBetween(path[i-1],path[i])};
      }
      walked+=segment;
    }
    return {point:path[path.length-1],bearing:bearingBetween(path[path.length-2],path[path.length-1])};
  }
  function animateRouteRunner(path) {
    const total=pathDistance([path]); if (!total || path.length<2) return;
    const makeRunner=(kind)=>{
      const el=document.createElement('div');el.className=`route-runner-marker ${kind}`;
      if(kind==='route-runner-beam'){const beam=document.createElement('span');beam.className='route-runner-beam-core';el.append(beam);}
      const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([path[0][1],path[0][0]]).addTo(map);
      routeRunnerMarkers.push(marker);return {marker,element:el};
    };
    const runners=[makeRunner('route-runner-beam'),makeRunner('route-runner-trail'),makeRunner('route-runner-trail faint')];
    const start=performance.now();
    const cycle=Math.max(7600,total*58);
    const offsets=[0,12,25];
    const tick=(now)=>{
      if (!routeRunnerMarkers.length || !activeRoute) return;
      const target=total*(((now-start)%cycle)/cycle);
      runners.forEach((runner,index)=>{
        const distance=(target-offsets[index]+total)%total;
        const sample=pointAndBearingAtDistance(path,distance);
        runner.marker.setLngLat([sample.point[1],sample.point[0]]);
        const beam=runner.element.querySelector('.route-runner-beam-core');
        if(beam)beam.style.transform=`rotate(${sample.bearing-(map?.getBearing?.()||0)}deg)`;
      });
      routeAnimationFrame=requestAnimationFrame(tick);
    };
    routeAnimationFrame=requestAnimationFrame(tick);
  }

  function makeRouteCandidate(label, route, viaLabel='') {
    if (!route || !validatePaths(route.paths)) return null;
    const distance=pathDistance(route.paths);
    const gaps=[];
    for(let i=1;i<route.paths.length;i++) gaps.push(haversine(route.paths[i-1].at(-1),route.paths[i][0]));
    if(gaps.some(g=>g>4)) return null;
    return {label,viaLabel,paths:route.paths,distanceMeters:distance,steps:buildTurnSteps(route.paths),source:'local'};
  }

  async function getCurrentPositionOnce() {
    if (!('geolocation' in navigator)) throw new Error(t('locationDenied'));
    setStatus(t('locationWait'));
    return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(pos=>{
      const c=[pos.coords.latitude,pos.coords.longitude];
      currentLocation=c;currentLocationTimestamp=Date.now();locationAccuracy=pos.coords.accuracy||null;updateUserMarker(c);resolve({coords:c,accuracy:locationAccuracy});
    },err=>reject(new Error(err.code===1?t('permission'):t('locationDenied'))),{enableHighAccuracy:true,timeout:15000,maximumAge:5000}));
  }

  function graphRouteFromCurrent(destination, startCoords) {
    const pseudo={id:'__current_user__',name:'Current location',lat:startCoords[0],lng:startCoords[1],category:'guide'};
    prepareGraph([pseudo]);
    return findGraphRoute(pseudo.id,destination.id);
  }

  async function calculateRoute(destination, startCoords=currentLocation) {
    clearError();
    destinationSpot = destination;
    activeRoute = null;
    routeCandidates = [];
    stopRouteAnimation();
    if (mapLoaded && map.getSource('active-route')) map.getSource('active-route').setData(coordsToGeoJSON([]));
    if(!startCoords) await getCurrentPositionOnce().then(v=>{startCoords=v.coords;});
    currentLocation=startCoords;
    const direct=graphRouteFromCurrent(destination,startCoords);
    const directCandidate=makeRouteCandidate(t('fastest'),direct);
    const candidates=[];
    if(directCandidate) candidates.push(directCandidate);

    // Additional scenic options are computed from the same manually mapped path graph.
    // Only expose them when the complete route is continuous and not a disproportionate detour.
    const viaStops=[{id:1,label:t('altSenbon')},{id:4,label:t('altYotsutsuji')}].filter(v=>String(v.id)!==String(destination.id));
    for(const via of viaStops){
      const first=findGraphRoute('__current_user__',via.id);
      const second=findGraphRoute(via.id,destination.id);
      if(!first||!second) continue;
      const mergedPaths=[...(first.paths||[]),...(second.paths||[])];
      const candidate=makeRouteCandidate(via.label,{paths:mergedPaths},via.label);
      if(candidate && (!directCandidate || candidate.distanceMeters>directCandidate.distanceMeters*1.015) && (!directCandidate || candidate.distanceMeters<directCandidate.distanceMeters*1.65)) candidates.push(candidate);
    }

    if(!candidates.length){
      showError(t('noRoute'));
      $('startNavigation').disabled = true;
      $('routeOptions').innerHTML = '';
      $('routeEta').textContent = '--';
      $('routeDistance').textContent = '--';
      $('routeArrival').textContent = '--:--';
      showPanel('route');
      return;
    }
    candidates.sort((a,b)=>a.distanceMeters-b.distanceMeters);
    routeCandidates=candidates;
    activeRoute=routeCandidates[0];destinationSpot=destination;
    $('startNavigation').disabled = false;
    renderRouteSummary(activeRoute);drawRoute(activeRoute);showPanel('route');
  }

  function renderRouteSummary(route) {
    const mins=Math.max(1,Math.ceil(route.distanceMeters/55));
    $('routeDestinationTitle').textContent=getLocalized(destinationSpot?.name||'');
    $('routeEta').textContent=`${mins}${t('min')}`;
    $('routeEtaLabel').textContent=t('walking');
    $('routeDistance').textContent=formatDistance(route.distanceMeters);
    $('routeDistanceLabel').textContent=t('distance');
    $('routeArrival').textContent=formatTime(new Date(Date.now()+mins*60000));
    $('routeArrivalLabel').textContent=t('arrival');
    $('routeQualityNote').textContent = t('routeNote');
    $('routeEtaDisclaimer').textContent=t('etaApprox');
    const host=$('routeOptions');host.innerHTML='';
    routeCandidates.forEach((candidate,index)=>{
      const btn=document.createElement('button');btn.type='button';btn.className=`route-option${candidate===route?' is-active':''}`;btn.textContent=candidate.label;
      btn.addEventListener('click',()=>{activeRoute=candidate;renderRouteSummary(candidate);drawRoute(candidate);});host.append(btn);
    });
  }

  function bearingBetween(a,b) {
    const rad=Math.PI/180, p1=a[0]*rad,p2=b[0]*rad,dl=(b[1]-a[1])*rad;
    const y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);
    return (Math.atan2(y,x)*180/Math.PI+360)%360;
  }
  function signedAngle(a,b) { return ((b-a+540)%360)-180; }
  function pointAtDistance(path, measure) {
    if (!path.length) return null;
    if (measure <= 0) return path[0];
    let passed = 0;
    for (let i=1;i<path.length;i++) {
      const length = haversine(path[i-1],path[i]);
      if (passed + length >= measure) {
        const ratio = length ? (measure-passed)/length : 0;
        return [path[i-1][0]+(path[i][0]-path[i-1][0])*ratio,path[i-1][1]+(path[i][1]-path[i-1][1])*ratio];
      }
      passed += length;
    }
    return path[path.length-1];
  }
  function pathLengthMeters(path) {
    let total=0;for(let i=1;i<path.length;i++)total+=haversine(path[i-1],path[i]);return total;
  }
  function buildTurnSteps(paths) {
    const steps=[];
    let routeOffset=0;
    (paths||[]).forEach(path=>{
      if(path.length<2)return;
      const length=pathLengthMeters(path);
      let previousBearing=bearingBetween(pointAtDistance(path,0),pointAtDistance(path,Math.min(14,length)));
      let lastTurnAt=0;
      for(let d=8;d<length-14;d+=6){
        const a=pointAtDistance(path,Math.max(0,d-7));
        const b=pointAtDistance(path,Math.min(length,d+7));
        const currentBearing=bearingBetween(a,b);
        const delta=signedAngle(previousBearing,currentBearing);
        if(d-lastTurnAt>=22 && Math.abs(delta)>=52){
          steps.push({atMeters:routeOffset+d,turn:delta>0?'right':'left',bearing:currentBearing});
          lastTurnAt=d;
          previousBearing=currentBearing;
        } else if(Math.abs(delta)<28) {
          // Slowly adapt the reference heading on gentle curves, without announcing turns.
          previousBearing=(previousBearing+delta*0.22+360)%360;
        }
      }
      routeOffset+=length;
    });
    return [{atMeters:0,turn:'start'},...steps];
  }

  function getNearestProgress(position,paths) {
    let best={distance:Infinity,along:0};let accumulated=0;
    for(const path of paths){
      for(let i=1;i<path.length;i++){
        const a=path[i-1],b=path[i];
        const latScale=111320, lngScale=111320*Math.cos(position[0]*Math.PI/180);
        const ax=(a[1]-position[1])*lngScale,ay=(a[0]-position[0])*latScale;
        const bx=(b[1]-position[1])*lngScale,by=(b[0]-position[0])*latScale;
        const dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy;
        const r=den?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/den)):0;
        const dist=Math.hypot(ax+dx*r,ay+dy*r);
        const length=haversine(a,b);
        if(dist<best.distance)best={distance:dist,along:accumulated+length*r};
        accumulated+=length;
      }
    }
    return {...best,total:accumulated};
  }

  function updateGuidance(along,remaining) {
    const upcomingIndex = activeRoute.steps.findIndex((step,index)=>index>0 && step.atMeters>along+4);
    const upcoming = upcomingIndex>=0 ? activeRoute.steps[upcomingIndex] : null;
    const toStep = upcoming ? Math.max(0,upcoming.atMeters-along) : remaining;
    let instruction=t('straight');
    if(upcoming && toStep<=24){
      instruction=upcoming.turn==='left'?t('turnLeft'):upcoming.turn==='right'?t('turnRight'):t('straight');
      if(voiceEnabled && toStep<=18 && lastSpokenStep!==upcomingIndex){speak(instruction);lastSpokenStep=upcomingIndex;}
    } else if(!upcoming) instruction=t('straight');
    $('guidanceKicker').textContent=t('next');
    $('guidanceInstruction').textContent=instruction;
    $('guidanceDistance').textContent=formatDistance(toStep);
    $('guidanceRoad').textContent=t('walking');
    $('guidanceCard').hidden=false;
    $('navRemaining').textContent=formatDistance(remaining);
    const mins=Math.max(1,Math.ceil(remaining/55));
    $('navArrivalTime').textContent=formatTime(new Date(Date.now()+mins*60000));
    $('navStatusText').textContent=locationAccuracy?`GPS ±${Math.round(locationAccuracy)} m`:'';
  }

  function speak(text) {
    if(!('speechSynthesis' in window)||!voiceEnabled)return;
    try{window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang=({ja:'ja-JP',en:'en-US',zh:'zh-CN',ko:'ko-KR'})[language];utterance.rate=0.94;window.speechSynthesis.speak(utterance);}catch(_){/* voice not available */}
  }

  async function startNavigation() {
    if(!activeRoute||!destinationSpot)return;
    try{
      if(!navigator.geolocation)throw new Error(t('locationDenied'));
      const previousLocation = currentLocation ? currentLocation.slice() : null;
      // Request iOS compass permission synchronously from this tap before waiting on GPS.
      const compassPermission = requestCompassPermission();
      if(!currentLocation || Date.now()-currentLocationTimestamp>20000) await getCurrentPositionOnce();
      await compassPermission;
      if(previousLocation && currentLocation && haversine(previousLocation,currentLocation)>18){
        const refreshed = makeRouteCandidate(t('fastest'),graphRouteFromCurrent(destinationSpot,currentLocation));
        if(refreshed){routeCandidates=[refreshed];activeRoute=refreshed;renderRouteSummary(activeRoute);drawRoute(activeRoute);}
      }
      showPanel('nav');followMode=true;lastSpokenStep=-1;offRouteCount=0;navStartedAt=Date.now();
      $('guidanceCard').hidden=false;
      if(map){map.easeTo({pitch:Math.max(map.getPitch(),42),duration:520});$('tiltMap').classList.add('is-active');ensure3DBuildings();}
      watchId=navigator.geolocation.watchPosition(onPositionUpdate,error=>{console.warn('[Fushimi MapLibre] GPS watch:',error);$('navStatusText').textContent=t('locationDenied');},{enableHighAccuracy:true,timeout:15000,maximumAge:1500});
      if(currentLocation)focusCamera(currentLocation,true);
      scheduleCompassCameraUpdate();
    }catch(error){showError(error.message||t('locationDenied'));}
  }
  async function requestCompassPermission() {
    const DOE=window.DeviceOrientationEvent;
    if(DOE && typeof DOE.requestPermission==='function'){
      try{const result=await DOE.requestPermission();if(result!=='granted')return;}catch(_){return;}
    }
    if(DOE && !compassListenerAttached){
      window.addEventListener('deviceorientationabsolute',onDeviceOrientation,{passive:true});
      window.addEventListener('deviceorientation',onDeviceOrientation,{passive:true});
      compassListenerAttached=true;
    }
  }
  function scheduleCompassCameraUpdate() {
    if (!followMode || !map || !Number.isFinite(compassHeading) || compassAnimationFrame) return;
    compassAnimationFrame = requestAnimationFrame(() => {
      compassAnimationFrame = 0;
      if (!followMode || !map || !Number.isFinite(compassHeading)) return;
      const current = map.getBearing();
      const delta = signedAngle(current, compassHeading);
      if (Math.abs(delta) < 0.8) return;
      // Apply a small heading correction per frame instead of restarting an easeTo
      // animation for every compass event (which causes camera jitter).
      map.setBearing(current + Math.max(-12, Math.min(12, delta * 0.22)));
    });
  }
  function onDeviceOrientation(event) {
    if(typeof event.webkitCompassHeading==='number' && Number.isFinite(event.webkitCompassHeading))compassHeading=(event.webkitCompassHeading+360)%360;
    else if(event.absolute && typeof event.alpha==='number' && Number.isFinite(event.alpha))compassHeading=(360-event.alpha+360)%360;
    scheduleCompassCameraUpdate();
  }
  function focusCamera(coords,zoomIn=false) {
    if(!map)return;
    const bearing=map.getBearing();
    map.easeTo({center:[coords[1],coords[0]],zoom:Math.max(map.getZoom(),zoomIn?18:17),bearing,pitch:map.getPitch(),duration:420,essential:true,offset:[0,90]});
    if (followMode) scheduleCompassCameraUpdate();
  }
  function updateUserMarker(coords) {
    if(!map||!mapLoaded)return;
    if(!locationMarker){
      const wrapper=document.createElement('div');wrapper.className='user-location-marker-wrap';
      const el=document.createElement('div');el.className='user-location-marker';wrapper.append(el);
      locationMarker=new maplibregl.Marker({element:wrapper,anchor:'center'}).setLngLat([coords[1],coords[0]]).addTo(map);
    } else locationMarker.setLngLat([coords[1],coords[0]]);
    const dot=locationMarker.getElement().querySelector('.user-location-marker');
    if(dot && Number.isFinite(compassHeading)){
      dot.classList.add('has-heading');
      dot.style.transform=`rotate(${compassHeading-map.getBearing()}deg)`;
    } else if(dot) {
      dot.classList.remove('has-heading');
      dot.style.transform='none';
    }
  }
  async function onPositionUpdate(position) {
    currentLocation=[position.coords.latitude,position.coords.longitude];currentLocationTimestamp=Date.now();locationAccuracy=position.coords.accuracy||null;
    if(typeof position.coords.heading==='number'&&Number.isFinite(position.coords.heading)){compassHeading=(position.coords.heading+360)%360;scheduleCompassCameraUpdate();}
    updateUserMarker(currentLocation);
    if(!activeRoute)return;
    const progress=getNearestProgress(currentLocation,activeRoute.paths);
    const offRouteLimit = Math.max(38, Math.min(65, (locationAccuracy || 20) * 0.75));
    if(progress.distance>offRouteLimit){
      offRouteCount++;
      if(offRouteCount>=3 && !isRerouting && Date.now()-lastRerouteAt>12000){
        isRerouting=true;lastRerouteAt=Date.now();$('navStatusText').textContent=t('offRoute');
        try{await calculateRoute(destinationSpot,currentLocation);if(activeRoute){showPanel('nav');offRouteCount=0;}else{stopNavigation(false);showPanel('route');$('routeQualityNote').textContent=t('rerouteFailed');}}catch(_){stopNavigation(false);showPanel('route');$('routeQualityNote').textContent=t('rerouteFailed');}finally{isRerouting=false;}
      }
      return;
    }
    offRouteCount=0;
    const remaining=Math.max(0,progress.total-progress.along);
    updateGuidance(progress.along,remaining);
    const arrivalLimit = Math.max(20, Math.min(40, (locationAccuracy || 20) * 0.55));
    const destinationDistance = destinationSpot ? haversine(currentLocation,[destinationSpot.lat,destinationSpot.lng]) : Infinity;
    const destinationRadius = Math.max(18, Math.min(35, (locationAccuracy || 20) * 0.8));
    if(remaining<arrivalLimit && destinationDistance<destinationRadius){$('guidanceInstruction').textContent=t('arrived');speak(t('arrived'));stopNavigation(false);stopRouteAnimation();showPanel('nav');}
    if(followMode)focusCamera(currentLocation,false);
  }
  function stopNavigation(clearRoute=true) {
    if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null;}
    window.removeEventListener('deviceorientation',onDeviceOrientation);window.removeEventListener('deviceorientationabsolute',onDeviceOrientation);
    if (compassAnimationFrame) cancelAnimationFrame(compassAnimationFrame); compassAnimationFrame=0;
    if(window.speechSynthesis)window.speechSynthesis.cancel();followMode=false;
    if(clearRoute){activeRoute=null;routeCandidates=[];destinationSpot=null;stopRouteAnimation();if(mapLoaded&&map.getSource('active-route'))map.getSource('active-route').setData(coordsToGeoJSON([]));$('guidanceCard').hidden=true;$('locateMap').classList.remove('is-active');$('tiltMap').classList.remove('is-active');if(map)map.easeTo({bearing:0,pitch:0,duration:450});showPanel('explore');}
    else showPanel('explore');
  }

  const CARTO_ATTRIBUTION_HTML =
    '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>, ' +
    '© <a href="https://carto.com/attribution/" target="_blank" rel="noopener noreferrer">CARTO</a>';

  async function ensureMapLibreLoaded() {
    if (window.maplibregl && window.maplibregl.Map) return;

    // MapLibre GL JS v6 is ESM-only: the old maplibre-gl.js UMD bundle
    // does not exist and returns 404. Import the official .mjs module instead.
    const moduleUrls = [
      'https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.mjs',
      'https://cdn.jsdelivr.net/npm/maplibre-gl@6.18.0/dist/maplibre-gl.mjs'
    ];
    const failures = [];
    for (const url of moduleUrls) {
      try {
        const module = await import(url);
        if (!module || typeof module.Map !== 'function' || typeof module.Marker !== 'function') {
          throw new Error('MapLibre module is missing required exports.');
        }
        // Existing navigation code uses the global namespace. Expose the
        // imported module without changing the rest of the application.
        window.maplibregl = module;
        return;
      } catch (error) {
        failures.push(new URL(url).hostname + ': ' + String(error && error.message || error));
      }
    }
    throw new Error('MapLibre GL JS v6のESモジュールを読み込めませんでした。通信制限・CDNブロックを確認してください。' + (failures.length ? ' (' + failures.join(' / ') + ')' : ''));
  }

  function describeMapError(error) {
    const status = Number(error?.status || error?.statusCode || 0);
    const raw = String(error?.message || error || 'Unknown map error');
    if (status === 401 || status === 403) {
      return 'CARTOがAPIキーを受け付けていません（HTTP ' + status + '）。js/carto-config.jsのキーと、CARTOダッシュボードの参照元制限に「purozemikyotokankou.github.io」が登録されているか確認してください。キー自体はこの画面に表示しません。';
    }
    if (status === 429) {
      return 'CARTOの利用上限またはリクエスト制限に達した可能性があります（HTTP 429）。CARTOダッシュボードの利用状況を確認してください。';
    }
    if (/webgl|context creation|gpu/i.test(raw)) {
      return 'このブラウザーまたは端末でWebGLを利用できません。ハードウェアアクセラレーションを有効にするか、従来の地図を開いてください。';
    }
    if (/failed to fetch|network|load failed|timeout|cors/i.test(raw)) {
      return '地図タイルへの通信に失敗しました。インターネット接続、広告・通信ブロッカー、学校や公共Wi-Fiの接続制限を確認してください。';
    }
    const safe = raw.replace(/([?&]key=)[^&\s]+/gi, '$1[非表示]');
    return safe.slice(0, 220);
  }

  function showMapFailure(message) {
    const panel = $('maplibreMapFailure');
    const detail = $('maplibreMapFailureText');
    if (detail) detail.textContent = message || '通信状況を確認して、もう一度お試しください。';
    if (panel) panel.hidden = false;
    setStatus('');
  }

  function positionMapAttribution() {
    const control = document.querySelector('.maplibregl-ctrl-bottom-right');
    if (!control || !sheet) return;
    if (sheet.classList.contains('is-collapsed')) {
      control.style.bottom = 'calc(136px + env(safe-area-inset-bottom, 0px))';
    } else {
      control.style.bottom = `${Math.ceil(sheet.getBoundingClientRect().height + 8)}px`;
    }
    if (!attributionResizeObserver && window.ResizeObserver) {
      attributionResizeObserver = new ResizeObserver(positionMapAttribution);
      attributionResizeObserver.observe(sheet);
    }
    if (!attributionMutationObserver && window.MutationObserver) {
      attributionMutationObserver = new MutationObserver(positionMapAttribution);
      attributionMutationObserver.observe(sheet, { attributes: true, attributeFilter: ['class'] });
    }
  }

  async function initMap() {
    await ensureMapLibreLoaded();
    if (!window.maplibregl) throw new Error('MapLibre GL JS failed to load.');
    const key = String(window.FUSHIMI_CARTO_BASEMAP_API_KEY || '').trim();
    if (!key) throw new Error('js/carto-config.jsにCARTO APIキーが設定されていません。');

    // Use the same official CARTO Positron raster endpoint already used by the working Leaflet map.
    // This avoids depending on the vector-style JSON and its separate tile/glyph/sprite requests.
    const tileUrl = 'https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png?key=' + encodeURIComponent(key);
    const cartoStyle = {
      version: 8,
      name: 'CARTO Positron',
      sources: {
        'carto-positron': {
          type: 'raster',
          tiles: [tileUrl],
          tileSize: 256,
          minzoom: 0,
          maxzoom: 18
        }
      },
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#f5f6f8' } },
        { id: 'carto-positron', type: 'raster', source: 'carto-positron', minzoom: 0, maxzoom: 22, paint: { 'raster-opacity': 1 } }
      ]
    };

    let cartoTileErrorCount = 0;
    map = new maplibregl.Map({
      container: 'smartMap',
      style: cartoStyle,
      center: [135.7743, 34.96705],
      zoom: 16.2,
      minZoom: 13,
      maxZoom: 20,
      maxBounds: [[135.759, 34.9502], [135.809, 34.9862]],
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      cooperativeGestures: false,
      dragRotate: true,
      touchPitch: true,
      fadeDuration: 150
    });
    map.addControl(new maplibregl.AttributionControl({ compact: false, customAttribution: CARTO_ATTRIBUTION_HTML }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric', maxWidth: 100 }), 'bottom-left');
    positionMapAttribution();
    if (firstMapLoadTimer) clearTimeout(firstMapLoadTimer);
    firstMapLoadTimer = window.setTimeout(() => {
      if (!mapLoaded) showMapFailure('地図の初回読み込みが時間内に完了しませんでした。ネットワーク制限を確認して再読み込みしてください。');
    }, 12000);

    map.on('load', () => {
      if (firstMapLoadTimer) clearTimeout(firstMapLoadTimer);
      firstMapLoadTimer = 0;
      mapLoaded = true;
      addRouteLayers();
      applyBasemapLanguage();
      ensure3DBuildings();
      renderMarkers();
      clearError();
      if (!cartoTileErrorCount) $('maplibreMapFailure').hidden = true;
      setStatus(t('ready'));
      if (currentLocation) updateUserMarker(currentLocation);
      setTimeout(() => { if (statusEl.textContent === t('ready')) setStatus(''); }, 3500);
    });

    map.on('error', event => {
      const error = event?.error || event;
      const status = Number(error?.status || error?.statusCode || 0);
      const message = String(error?.message || '');
      const isCartoError = event?.sourceId === 'carto-positron' || /basemaps\.cartocdn\.com/i.test(message) || status === 401 || status === 403 || status === 429;
      if (!isCartoError) {
        console.warn('[Fushimi MapLibre]', describeMapError(error));
        return;
      }
      cartoTileErrorCount += 1;
      console.warn('[Fushimi CARTO tile error]', describeMapError(error));
      if ([401, 403, 429].includes(status) || cartoTileErrorCount >= 3) {
        showMapFailure(describeMapError(error));
      }
    });
    map.on('dragstart', () => {
      if (followMode) { followMode = false; $('locateMap').classList.remove('is-active'); }
    });
    map.on('rotate', () => {
      $('compassMap').style.transform = `rotate(${-map.getBearing()}deg)`;
      if (locationMarker && Number.isFinite(compassHeading)) {
        const dot = locationMarker.getElement().querySelector('.user-location-marker');
        if (dot) dot.style.transform = `rotate(${compassHeading - map.getBearing()}deg)`;
      }
    });
  }

  function applyBasemapLanguage() {
    if (!map || !mapLoaded) return;
    const languageFields = {
      ja: ['name:ja', 'name_ja', 'name'],
      en: ['name:en', 'name_en', 'name:latin', 'name'],
      zh: ['name:zh-Hans', 'name:zh', 'name_zh', 'name'],
      ko: ['name:ko', 'name_ko', 'name']
    };
    const fields = languageFields[language] || languageFields.ja;
    const expression = ['coalesce', ...fields.map(field => ['get', field])];
    (map.getStyle()?.layers || []).forEach(layer => {
      if (layer.type !== 'symbol' || !layer.layout || !Object.prototype.hasOwnProperty.call(layer.layout, 'text-field')) return;
      const current = JSON.stringify(layer.layout['text-field']).toLowerCase();
      // Only replace label fields that are name-based; preserve shields and symbol-only labels.
      if (!/name/.test(current)) return;
      try { map.setLayoutProperty(layer.id, 'text-field', expression); } catch (_) { /* Keep the provider style if a layer rejects the override. */ }
    });
  }

  let has3DBuildings = false;
  function ensure3DBuildings() {
    if (!map || has3DBuildings) return;
    const layers = map.getStyle()?.layers || [];
    const building = layers.find(layer => layer.type === 'fill' && /building/i.test(layer.id) && layer.source && layer['source-layer']);
    if (!building) return;
    try {
      const firstSymbol = layers.find(layer => layer.type === 'symbol');
      map.addLayer({
        id: 'fushimi-3d-buildings-v145', type: 'fill-extrusion',
        source: building.source, 'source-layer': building['source-layer'],
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#d8d7d2',
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 16, ['to-number', ['coalesce', ['get', 'render_height'], ['get', 'height'], 0]]],
          'fill-extrusion-base': ['to-number', ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0]],
          'fill-extrusion-opacity': 0.78
        }
      }, firstSymbol?.id);
      has3DBuildings = true;
    } catch (error) {
      console.info('[Fushimi MapLibre] 3D building extrusion is not available in this style; pitch-only view remains enabled.', error);
    }
  }

  function validateMapPage() {
    const requiredIds = [
      'smartMap', 'maplibreStatus', 'maplibreSheet', 'mapLanguage',
      'destinationSearch', 'clearSearch', 'searchResults', 'sheetHandle',
      'nearbySpotList', 'explorePanel', 'spotPanel', 'routePanel',
      'activeNavigationPanel', 'guidanceCard', 'guidanceKicker',
      'guidanceInstruction', 'guidanceDistance', 'guidanceRoad',
      'navRemaining', 'navArrivalTime', 'navRemainingLabel',
      'navArrivalTimeLabel', 'navStatusText', 'closeSpotPanel',
      'closeRoutePanel', 'spotPanelName', 'spotPanelDescription',
      'spotCategoryLabel', 'spotPhoto', 'routeToSpot', 'saveSpotButton',
      'routeKicker', 'routeDestinationTitle', 'routeOptions', 'routeEta',
      'routeEtaLabel', 'routeDistance', 'routeDistanceLabel', 'routeArrival',
      'routeArrivalLabel', 'routeQualityNote', 'routeEtaDisclaimer',
      'startNavigation', 'stopNavigation', 'toggleVoice', 'locateMap',
      'compassMap', 'zoomInMap', 'zoomOutMap', 'tiltMap', 'retryMapLoad'
    ];
    const missing = requiredIds.filter(id => !$(id));
    if (!missing.length) return true;
    const message = `地図画面のHTMLとJavaScriptの版が一致していません。不足している要素: ${missing.join(', ')}。planner-next.html と js/planner-maplibre.js を同じ版のファイルで上書きしてください。`;
    console.error('[Fushimi MapLibre] Page/script version mismatch:', missing);
    showMapFailure(message);
    setStatus(message);
    return false;
  }

  function bindUI() {
    $('mapLanguage').value=language;
    $('mapLanguage').addEventListener('change',e=>setLanguage(e.target.value));
    document.querySelectorAll('.map-category').forEach(btn=>btn.addEventListener('click',()=>filterByCategory(btn.dataset.filter)));
    $('destinationSearch').addEventListener('input',e=>{clearTimeout(searchDebounce);searchDebounce=setTimeout(()=>showSearchResults(e.target.value),120);$('clearSearch').hidden=!e.target.value;} );
    $('destinationSearch').addEventListener('keydown',e=>{if(e.key==='Escape'){$('searchResults').hidden=true;e.target.blur();}if(e.key==='Enter'){const first=$('searchResults').querySelector('button');first?.click();}});
    $('clearSearch').addEventListener('click',()=>{$('destinationSearch').value='';$('searchResults').hidden=true;$('clearSearch').hidden=true;});
    $('sheetHandle').addEventListener('click',()=>{const collapsed=sheet.classList.toggle('is-collapsed');$('sheetHandle').setAttribute('aria-expanded',String(!collapsed));positionMapAttribution();});
    $('closeSpotPanel').addEventListener('click',()=>{selectedSpot=null;renderMarkers();showPanel('explore');});
    $('closeRoutePanel').addEventListener('click',()=>{stopRouteAnimation();if(mapLoaded&&map.getSource('active-route'))map.getSource('active-route').setData(coordsToGeoJSON([]));activeRoute=null;routeCandidates=[];showPanel('explore');});
    $('routeToSpot').addEventListener('click',()=>{if(selectedSpot){destinationSpot=selectedSpot;calculateRoute(selectedSpot).catch(e=>showError(e.message||t('routeUnavailable')));}});
    $('saveSpotButton').addEventListener('click',toggleSavedSpot);
    $('startNavigation').addEventListener('click',startNavigation);
    $('retryMapLoad').addEventListener('click', async () => {
      $('maplibreMapFailure').hidden = true;
      setStatus(t('loading'));
      if (firstMapLoadTimer) clearTimeout(firstMapLoadTimer);
      firstMapLoadTimer = 0;
      if (attributionResizeObserver) { attributionResizeObserver.disconnect(); attributionResizeObserver = null; }
      if (attributionMutationObserver) { attributionMutationObserver.disconnect(); attributionMutationObserver = null; }
      if (map) { try { map.remove(); } catch (_) {} map = null; }
      mapLoaded = false;
      markerRecords.clear();
      locationMarker = null;
      try { await initMap(); } catch (error) { console.error('[Fushimi MapLibre] Retry failed:', error); showMapFailure(describeMapError(error)); }
    });
    $('stopNavigation').addEventListener('click',()=>stopNavigation(true));
    $('toggleVoice').addEventListener('click',()=>{voiceEnabled=!voiceEnabled;$('toggleVoice').textContent=voiceEnabled?t('voiceOn'):t('voiceOff');$('toggleVoice').setAttribute('aria-pressed',String(voiceEnabled));if(!voiceEnabled&&window.speechSynthesis)window.speechSynthesis.cancel();});
    $('locateMap').addEventListener('click',async()=>{try{const compassPermission=requestCompassPermission();await getCurrentPositionOnce();await compassPermission;followMode=true;$('locateMap').classList.add('is-active');focusCamera(currentLocation,true);scheduleCompassCameraUpdate();}catch(e){showError(e.message);}});
    $('compassMap').addEventListener('click',()=>{if(!map)return;if(Math.abs(map.getBearing())>0.5){followMode=false;map.easeTo({bearing:0,duration:550});}else{requestCompassPermission().then(()=>{if(Number.isFinite(compassHeading)){followMode=true;map.easeTo({bearing:compassHeading,duration:550});}});}});
    $('zoomInMap').addEventListener('click',()=>map?.easeTo({zoom:Math.min(20,map.getZoom()+1),duration:280}));
    $('zoomOutMap').addEventListener('click',()=>map?.easeTo({zoom:Math.max(13,map.getZoom()-1),duration:280}));
    $('tiltMap').addEventListener('click',()=>{if(!map)return;const tilted=map.getPitch()<20;map.easeTo({pitch:tilted?52:0,zoom:tilted?Math.max(15.8,map.getZoom()):map.getZoom(),duration:650});$('tiltMap').classList.toggle('is-active',tilted);if(tilted)ensure3DBuildings();});
  }

  async function boot() {
    if (!validateMapPage()) return;
    setLanguage(language);bindUI();setStatus(t('loading'));
    try{
      const [spotsResponse,routesResponse]=await Promise.all([fetch('data/spots.json',{cache:'no-cache'}),fetch('data/routes.json',{cache:'no-cache'})]);
      if(!spotsResponse.ok||!routesResponse.ok)throw new Error('spots.json / routes.json could not be loaded');
      const [spotData,routeData]=await Promise.all([spotsResponse.json(),routesResponse.json()]);
      if(!Array.isArray(spotData)||!Array.isArray(routeData))throw new Error('Invalid spot or route data');
      baseSpots=spotData.filter(s=>Number.isFinite(Number(s.lat))&&Number.isFinite(Number(s.lng)));
      baseRouteData=routeData;
      prepareGraph();
      renderNearbyList();
      await initMap();
    }catch(error){console.error('[Fushimi MapLibre] Initialization failed:', error);showMapFailure(describeMapError(error));showError(error.message||'Map initialization failed');}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
