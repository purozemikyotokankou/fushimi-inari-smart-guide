/* Fushimi Inari Smart Guide — Google Maps-like interaction layer (V155)
 * Keeps the Plan C MapLibre engine and route graph intact. Adds map-area search,
 * a gesture-driven sheet, a GPS accuracy halo, and quieter map marker labels.
 */
(() => {
  'use strict';

  const LANG = {
    ja: {
      searchArea: 'このエリアを検索', areaTitle: 'このエリアのスポット', close: '閉じる',
      direct: '直線距離', noResults: 'このエリアに表示できるスポットはありません。',
      categories: { sightseeing: '見どころ', food: '食べる', buy: '買う', transport: '交通', toilet: '施設' }
    },
    en: {
      searchArea: 'Search this area', areaTitle: 'Places in this area', close: 'Close',
      direct: 'Straight-line distance', noResults: 'No places match this category in this area.',
      categories: { sightseeing: 'Attractions', food: 'Food', buy: 'Shopping', transport: 'Transit', toilet: 'Facilities' }
    },
    zh: {
      searchArea: '搜索此区域', areaTitle: '此区域的地点', close: '关闭',
      direct: '直线距离', noResults: '此区域没有符合类别的地点。',
      categories: { sightseeing: '景点', food: '餐饮', buy: '购物', transport: '交通', toilet: '设施' }
    },
    ko: {
      searchArea: '이 지역 검색', areaTitle: '이 지역의 장소', close: '닫기',
      direct: '직선거리', noResults: '이 지역에 해당하는 장소가 없습니다.',
      categories: { sightseeing: '명소', food: '음식', buy: '쇼핑', transport: '교통', toilet: '시설' }
    }
  };

  const SPOT_NAMES = {
    '千本鳥居': { en: 'Senbon Torii (Thousand Torii Gates)', zh: '千本鸟居', ko: '센본 도리이(천 개의 도리이)' },
    '伏見稲荷大社 本殿': { en: 'Fushimi Inari Taisha Main Shrine', zh: '伏见稻荷大社本殿', ko: '후시미 이나리 타이샤 본전' },
    '奥社奉拝所（奥の院）': { en: 'Okusha Hohaisho (Inner Shrine)', zh: '奥社奉拜所（内院）', ko: '오쿠샤 호하이쇼(오쿠노인)' },
    '四ツ辻': { en: 'Yotsutsuji Junction Viewpoint', zh: '四之辻观景点', ko: '요쓰쓰지 전망 지점' },
    '一ノ峰': { en: 'Ichino-mine (First Peak)', zh: '一之峰', ko: '이치노미네(제1봉)' },
    'トイレ': { en: 'Restroom', zh: '洗手间', ko: '화장실' },
    '京阪電車伏見稲荷駅': { en: 'Keihan Fushimi-Inari Station', zh: '京阪电车伏见稻荷站', ko: '게이한 후시미이나리역' },
    'JR西日本奈良線稲荷駅': { en: 'JR Inari Station (Nara Line)', zh: 'JR西日本奈良线稻荷站', ko: 'JR 나라선 이나리역' },
    '伏見稲荷入口': { en: 'Fushimi Inari Shrine Entrance', zh: '伏见稻荷入口', ko: '후시미 이나리 입구' },
    'Vermillion-cafe': { en: 'Vermillion Cafe', zh: 'Vermillion 咖啡馆', ko: '버밀리온 카페' },
    'ちいかわ本舗': { en: 'Chiikawa Honpo', zh: '吉伊卡哇本铺', ko: '치이카와 혼포' },
    'eight': { en: 'Eight', zh: 'Eight 咖啡馆', ko: '에이트' },
    'トイレ②': { en: 'Restroom 2', zh: '洗手间②', ko: '화장실 ②' },
    'トイレ③': { en: 'Restroom 3', zh: '洗手间③', ko: '화장실 ③' },
    '京阪電車龍谷大前深草駅': { en: 'Keihan Ryukoku-daimae-fukakusa Station', zh: '京阪龙谷大前深草站', ko: '게이한 류코쿠다이마에후카쿠사역' },
    '二ノ峰': { en: 'Ni-no-mine (Second Peak)', zh: '二之峰', ko: '니노미네(제2봉)' },
    '三ノ峰': { en: 'San-no-mine (Third Peak)', zh: '三之峰', ko: '산노미네(제3봉)' },
    '御劔社': { en: 'Mitsurugisha Shrine', zh: '御剑社', ko: '미쓰루기샤' },
    'おせき大神': { en: 'Oseki Okami', zh: '御咳大神', ko: '오세키 오카미' },
    '薬力大神': { en: 'Yakuryoku Okami', zh: '药力大神', ko: '야쿠료쿠 오카미' }
  };
  const EARTH_RADIUS = 6371000;
  let mapInstance = null;
  let spotsPromise = null;
  let areaButton = null;
  let areaPanel = null;
  let areaList = null;
  let draggedByUser = false;
  let latestAccuracyFeature = null;
  let locationWatchId = null;
  let locationTrackingEnabled = false;
  let sheetTouchStartY = null;
  let sheetTouchStartX = null;
  let suppressHandleClickUntil = 0;
  let markerObserver = null;
  const wrappedNamespaces = new WeakMap();

  const language = () => {
    const value = document.getElementById('mapLanguage')?.value || localStorage.getItem('language') || 'ja';
    return LANG[value] ? value : 'ja';
  };
  const t = (key) => LANG[language()][key] || LANG.ja[key] || key;
  const tr = (key) => t('categories')[key] || key;

  function wrapMapLibreNamespace(moduleValue) {
    if (!moduleValue || typeof moduleValue.Map !== 'function') return moduleValue;
    if (wrappedNamespaces.has(moduleValue)) return wrappedNamespaces.get(moduleValue);

    const OriginalMap = moduleValue.Map;
    const api = Object.create(moduleValue);
    class CapturedMap extends OriginalMap {
      constructor(options) {
        super(options);
        mapInstance = this;
        window.fushimiSmartMap = this;
        attachMapEnhancements(this);
      }
    }
    Object.defineProperty(api, 'Map', {
      value: CapturedMap,
      enumerable: true,
      configurable: false,
      writable: false
    });
    wrappedNamespaces.set(moduleValue, api);
    return api;
  }

  // MapLibre is dynamically imported by the Plan C engine. Capture its Map
  // constructor before the app creates the map, without editing that engine.
  function captureMapLibre() {
    let current = window.maplibregl || null;
    try {
      Object.defineProperty(window, 'maplibregl', {
        configurable: true,
        enumerable: true,
        get() { return current; },
        set(value) { current = wrapMapLibreNamespace(value); }
      });
      if (current) current = wrapMapLibreNamespace(current);
    } catch (error) {
      console.warn('[Fushimi V155] Could not attach MapLibre capture:', error);
    }
  }

  function getSpots() {
    if (!spotsPromise) {
      spotsPromise = fetch('data/spots.json', { cache: 'force-cache' })
        .then((response) => {
          if (!response.ok) throw new Error(`spots.json HTTP ${response.status}`);
          return response.json();
        })
        .then((items) => Array.isArray(items) ? items.filter((spot) =>
          Number.isFinite(Number(spot?.lat)) && Number.isFinite(Number(spot?.lng))
        ) : [])
        .catch((error) => {
          console.warn('[Fushimi V155] Area search data unavailable:', error);
          return [];
        });
    }
    return spotsPromise;
  }

  function normalizeCategory(spot) {
    const name = String(spot?.name || '').toLowerCase();
    const category = String(spot?.category || '').toLowerCase();
    if (String(spot?.id) === '11' || /本舗|shop|store|souvenir|グッズ/.test(name)) return 'buy';
    if (/トイレ|toilet|restroom/.test(category + ' ' + name)) return 'toilet';
    if (/交通|transport|駅|station|railway|keihan|\bjr\b/.test(category + ' ' + name)) return 'transport';
    if (/飲食|restaurant|カフェ|cafe|bakery|food|coffee|eight|vermillion/.test(category + ' ' + name)) return 'food';
    return 'sightseeing';
  }

  function activeFilter() {
    const active = document.querySelector('#plannerCategoryTray .map-category.active, #plannerCategoryTray .map-category.is-active');
    return active?.dataset.filter || 'all';
  }

  function matchesFilter(spot, filter) {
    if (!filter || filter === 'all') return true;
    return normalizeCategory(spot) === filter;
  }

  function distanceMeters(a, b) {
    const p1 = a[0] * Math.PI / 180;
    const p2 = b[0] * Math.PI / 180;
    const dp = (b[0] - a[0]) * Math.PI / 180;
    const dl = (b[1] - a[1]) * Math.PI / 180;
    const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * EARTH_RADIUS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function formatDistance(meters) {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters)} m`;
  }

  function buildAreaUI(map) {
    const mapRoot = document.getElementById('smartMap');
    const explorePanel = document.getElementById('explorePanel');
    const nearbyList = document.getElementById('nearbySpotList');
    if (!mapRoot || !explorePanel || !nearbyList || document.getElementById('fushimiAreaSearch')) return;

    areaButton = document.createElement('button');
    areaButton.type = 'button';
    areaButton.id = 'fushimiAreaSearch';
    areaButton.className = 'fushimi-area-search';
    areaButton.setAttribute('aria-label', t('searchArea'));
    areaButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.3"/></svg><span></span>';
    areaButton.querySelector('span').textContent = t('searchArea');
    mapRoot.append(areaButton);

    areaPanel = document.createElement('section');
    areaPanel.id = 'fushimiAreaPanel';
    areaPanel.className = 'fushimi-area-panel';
    areaPanel.hidden = true;
    const heading = document.createElement('div');
    heading.className = 'fushimi-area-heading';
    const title = document.createElement('strong');
    title.textContent = t('areaTitle');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'fushimi-area-close';
    close.textContent = t('close');
    close.addEventListener('click', () => { areaPanel.hidden = true; });
    heading.append(title, close);
    areaList = document.createElement('div');
    areaList.className = 'fushimi-area-list';
    areaPanel.append(heading, areaList);
    nearbyList.insertAdjacentElement('afterend', areaPanel);

    areaButton.addEventListener('click', async () => {
      if (!map || !map.isStyleLoaded()) return;
      const center = map.getCenter();
      const bounds = map.getBounds();
      const spots = await getSpots();
      const filter = activeFilter();
      const eligible = spots.filter((spot) => matchesFilter(spot, filter));
      const visible = eligible.filter((spot) => bounds.contains([Number(spot.lng), Number(spot.lat)]));
      // When a very tight zoom has no pin inside the viewport, show the nearest
      // local places within 450 m instead of presenting an empty search screen.
      const pool = visible.length ? visible : eligible;
      const ranked = pool
        .map((spot) => ({ spot, distance: distanceMeters([center.lat, center.lng], [Number(spot.lat), Number(spot.lng)]) }))
        .filter((item) => visible.length || item.distance <= 450)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 12);
      renderAreaList(ranked);
      areaPanel.hidden = false;
      areaButton.classList.remove('is-visible');
      const sheet = document.getElementById('maplibreSheet');
      const handle = document.getElementById('sheetHandle');
      sheet?.classList.remove('is-collapsed');
      handle?.setAttribute('aria-expanded', 'true');
      areaPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    areaList.addEventListener('click', (event) => {
      const card = event.target.closest('[data-spot-name]');
      if (!card) return;
      const search = document.getElementById('destinationSearch');
      if (!search) return;
      areaPanel.hidden = true;
      search.value = card.dataset.spotName || '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
      window.setTimeout(() => {
        const firstResult = document.querySelector('#searchResults .search-result');
        if (firstResult) firstResult.click();
      }, 260);
    });
  }

  function renderAreaList(ranked) {
    if (!areaList) return;
    areaList.replaceChildren();
    if (!ranked.length) {
      const empty = document.createElement('p');
      empty.className = 'fushimi-area-empty';
      empty.textContent = t('noResults');
      areaList.append(empty);
      return;
    }

    ranked.forEach(({ spot, distance }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'fushimi-area-card';
      button.dataset.spotName = typeof spot.name === 'string' ? spot.name : (spot.name?.ja || '');
      const image = document.createElement('img');
      image.alt = '';
      image.loading = 'lazy';
      const imageName = String(spot.image || '').replace(/^\/+/, '');
      image.src = imageName && !imageName.includes('..') ? `images/${imageName}` : `images/icons/category-${normalizeCategory(spot) === 'toilet' ? 'facilities' : normalizeCategory(spot)}.svg`;
      image.onerror = () => {
        image.onerror = null;
        image.src = `images/icons/category-${normalizeCategory(spot) === 'toilet' ? 'facilities' : normalizeCategory(spot)}.svg`;
      };
      const copy = document.createElement('span');
      const name = document.createElement('strong');
      name.textContent = localizedName(spot);
      const meta = document.createElement('small');
      meta.textContent = `${tr(normalizeCategory(spot))} · ${t('direct')} ${formatDistance(distance)}`;
      copy.append(name, meta);
      button.append(image, copy);
      areaList.append(button);
    });
  }

  function setSheetCollapsed(collapsed) {
    const sheet = document.getElementById('maplibreSheet');
    const handle = document.getElementById('sheetHandle');
    if (!sheet || !handle) return;
    sheet.classList.toggle('is-collapsed', collapsed);
    handle.setAttribute('aria-expanded', String(!collapsed));
    window.dispatchEvent(new Event('resize'));
  }

  function bindSheetGestures() {
    const handle = document.getElementById('sheetHandle');
    if (!handle || handle.dataset.v155SwipeBound === '1') return;
    handle.dataset.v155SwipeBound = '1';
    handle.addEventListener('click', (event) => {
      if (Date.now() < suppressHandleClickUntil) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
    handle.addEventListener('touchstart', (event) => {
      const touch = event.touches?.[0];
      if (!touch) return;
      sheetTouchStartY = touch.clientY;
      sheetTouchStartX = touch.clientX;
    }, { passive: true });
    handle.addEventListener('touchend', (event) => {
      const touch = event.changedTouches?.[0];
      if (!touch || sheetTouchStartY === null) return;
      const dy = touch.clientY - sheetTouchStartY;
      const dx = touch.clientX - (sheetTouchStartX ?? touch.clientX);
      sheetTouchStartY = null;
      sheetTouchStartX = null;
      if (Math.abs(dy) < 35 || Math.abs(dy) < Math.abs(dx) * 1.25) return;
      suppressHandleClickUntil = Date.now() + 550;
      setSheetCollapsed(dy > 0);
    }, { passive: true });
  }

  function circleFeature(longitude, latitude, radiusMeters) {
    const latitudeRadians = latitude * Math.PI / 180;
    const coordinates = [];
    const angular = Math.max(5, Math.min(radiusMeters, 1000)) / EARTH_RADIUS;
    for (let i = 0; i <= 48; i += 1) {
      const bearing = i * Math.PI * 2 / 48;
      const lat1 = latitudeRadians;
      const lon1 = longitude * Math.PI / 180;
      const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing));
      const lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1), Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2));
      coordinates.push([lon2 * 180 / Math.PI, lat2 * 180 / Math.PI]);
    }
    return {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coordinates] } }]
    };
  }

  function ensureAccuracyLayer(map) {
    if (!map || !map.isStyleLoaded()) return;
    try {
      if (!map.getSource('fushimi-location-accuracy-v155')) {
        map.addSource('fushimi-location-accuracy-v155', {
          type: 'geojson',
          data: latestAccuracyFeature || { type: 'FeatureCollection', features: [] }
        });
      }
      if (!map.getLayer('fushimi-location-accuracy-fill-v155')) {
        map.addLayer({
          id: 'fushimi-location-accuracy-fill-v155',
          type: 'fill',
          source: 'fushimi-location-accuracy-v155',
          paint: { 'fill-color': '#1685e5', 'fill-opacity': 0.105 }
        });
      }
      if (!map.getLayer('fushimi-location-accuracy-line-v155')) {
        map.addLayer({
          id: 'fushimi-location-accuracy-line-v155',
          type: 'line',
          source: 'fushimi-location-accuracy-v155',
          paint: { 'line-color': '#1685e5', 'line-width': 1.35, 'line-opacity': 0.28 }
        });
      }
    } catch (error) {
      console.info('[Fushimi V155] GPS accuracy layer unavailable:', error);
    }
  }

  function updateAccuracy(position) {
    if (!position?.coords) return;
    const latitude = Number(position.coords.latitude);
    const longitude = Number(position.coords.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    const accuracy = Number(position.coords.accuracy);
    const radius = Number.isFinite(accuracy) && accuracy > 0 ? Math.max(5, Math.min(accuracy, 1000)) : 25;
    latestAccuracyFeature = circleFeature(longitude, latitude, radius);
    if (mapInstance?.isStyleLoaded()) {
      ensureAccuracyLayer(mapInstance);
      mapInstance.getSource('fushimi-location-accuracy-v155')?.setData(latestAccuracyFeature);
    }
  }

  function startAccuracyWatch() {
    if (!navigator.geolocation || locationWatchId !== null) return;
    locationTrackingEnabled = true;
    locationWatchId = navigator.geolocation.watchPosition(updateAccuracy, (error) => {
      if (error?.code === 1) {
        locationTrackingEnabled = false;
        stopAccuracyWatch();
        clearAccuracyOverlay();
      } else console.info('[Fushimi V155] GPS accuracy could not be updated:', error?.message || error);
    }, { enableHighAccuracy: true, maximumAge: 2500, timeout: 15000 });
  }

  function stopAccuracyWatch() {
    if (locationWatchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchId);
      locationWatchId = null;
    }
  }

  function clearAccuracyOverlay() {
    latestAccuracyFeature = null;
    mapInstance?.getSource('fushimi-location-accuracy-v155')?.setData({ type: 'FeatureCollection', features: [] });
  }

  function bindAccuracyControls() {
    const start = () => startAccuracyWatch();
    document.getElementById('locateMap')?.addEventListener('click', start, { passive: true });
    document.getElementById('startNavigation')?.addEventListener('click', start, { passive: true });
    document.getElementById('stopNavigation')?.addEventListener('click', () => {
      locationTrackingEnabled = false;
      stopAccuracyWatch();
      clearAccuracyOverlay();
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAccuracyWatch();
      else if (locationTrackingEnabled) startAccuracyWatch();
    });
  }

  function localizedName(spot) {
    const name = typeof spot?.name === 'string' ? spot.name : (spot?.name?.ja || '');
    return SPOT_NAMES[name]?.[language()] || name;
  }

  function observeMarkerLabels(map) {
    const root = document.getElementById('smartMap');
    if (!root || !window.MutationObserver) return;
    markerObserver?.disconnect();
    markerObserver = new MutationObserver(() => updateMarkerLabels(map));
    markerObserver.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-label'] });
    window.setTimeout(() => updateMarkerLabels(map), 0);
  }

  function updateMarkerLabels(map) {
    const zoom = map.getZoom();
    const root = document.getElementById('smartMap');
    if (!root) return;
    root.classList.toggle('fushimi-detail-zoom', zoom >= 17.0);
    root.querySelectorAll('.custom-spot-marker').forEach((marker) => {
      const label = marker.getAttribute('aria-label') || '';
      if (label) marker.dataset.mapLabel = label;
    });
  }

  function attachMapEnhancements(map) {
    if (!map || map.__fushimiV155Attached) return;
    map.__fushimiV155Attached = true;
    map.on('load', () => {
      buildAreaUI(map);
      bindSheetGestures();
      ensureAccuracyLayer(map);
      updateMarkerLabels(map);
      observeMarkerLabels(map);
    });
    map.on('dragstart', () => {
      draggedByUser = true;
      if (areaPanel) areaPanel.hidden = true;
      areaButton?.classList.remove('is-visible');
    });
    map.on('moveend', () => {
      if (!draggedByUser) return;
      draggedByUser = false;
      if (areaButton && !document.getElementById('guidanceCard')?.hidden) return;
      areaButton?.classList.add('is-visible');
    });
    map.on('zoomend', () => updateMarkerLabels(map));
    map.on('rotate', () => {
      const compass = document.getElementById('compassMap');
      if (compass) compass.style.transform = `rotate(${-map.getBearing()}deg)`;
    });
  }

  function bindLanguageRefresh() {
    document.getElementById('mapLanguage')?.addEventListener('change', () => {
      if (areaButton) {
        areaButton.querySelector('span').textContent = t('searchArea');
        areaButton.setAttribute('aria-label', t('searchArea'));
      }
      const title = areaPanel?.querySelector('.fushimi-area-heading strong');
      if (title) title.textContent = t('areaTitle');
      const close = areaPanel?.querySelector('.fushimi-area-close');
      if (close) close.textContent = t('close');
    });
  }

  function boot() {
    captureMapLibre();
    bindAccuracyControls();
    bindLanguageRefresh();
    bindSheetGestures();
    getSpots();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
