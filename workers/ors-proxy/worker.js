/**
 * Optional OpenRouteService walking connector for the Fushimi Inari guide.
 * Deploy separately to Cloudflare Workers; never put ORS_API_KEY in client files.
 */
const ALLOWED_ORIGIN = 'https://purozemikyotokankou.github.io';
const ORS_ENDPOINT = 'https://api.heigit.org/openrouteservice/v2/directions/foot-walking/geojson';
const REGION = { minLat: 34.94, maxLat: 34.99, minLng: 135.75, maxLng: 135.81 };
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin'
};
function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
function inRegion(point) {
  return Array.isArray(point) && point.length === 2 &&
    Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
    point[0] >= REGION.minLng && point[0] <= REGION.maxLng &&
    point[1] >= REGION.minLat && point[1] <= REGION.maxLat;
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (origin !== ALLOWED_ORIGIN) return new Response('Origin not allowed', { status: 403 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/walking-route') return json({ error: 'Not found' }, 404);
    if (!env.ORS_API_KEY) return json({ error: 'Routing API key is not configured' }, 503);
    const length = Number(request.headers.get('Content-Length') || 0);
    if (length > 2048) return json({ error: 'Request too large' }, 413);
    let body;
    try { body = await request.json(); } catch (_) { return json({ error: 'Invalid JSON' }, 400); }
    const { start, end } = body || {};
    if (!inRegion(start) || !inRegion(end)) return json({ error: 'Coordinates are outside the Fushimi Inari service area' }, 400);
    const approxDistance = Math.hypot((end[0] - start[0]) * 91000, (end[1] - start[1]) * 111000);
    if (approxDistance > 6000) return json({ error: 'Walking connector is limited to 6 km' }, 400);
    try {
      const upstream = await fetch(ORS_ENDPOINT, {
        method: 'POST',
        headers: { 'Authorization': env.ORS_API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/geo+json, application/json' },
        body: JSON.stringify({ coordinates: [start, end], instructions: false, preference: 'recommended', units: 'm', geometry: true })
      });
      const text = await upstream.text();
      let data;
      try { data = JSON.parse(text); } catch (_) { data = null; }
      if (!upstream.ok) {
        return json({ error: 'Walking route provider returned an error', providerStatus: upstream.status, detail: data?.error?.message || data?.message || 'No detail' }, 502);
      }
      const feature = data?.features?.[0];
      if (!feature?.geometry?.coordinates || feature.geometry.coordinates.length < 2) return json({ error: 'No walkable route found' }, 404);
      return json({ type: 'FeatureCollection', features: [feature] });
    } catch (_) {
      return json({ error: 'Walking route provider is temporarily unavailable' }, 502);
    }
  }
};
