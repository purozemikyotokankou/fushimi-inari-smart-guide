# OpenRouteService connector (optional)

The new MapLibre page uses the hand-curated `data/routes.json` graph for paths inside Fushimi Inari. This Worker is only an optional connector from a GPS position outside the mapped shrine paths to a known entrance/station node. The secret is never placed in GitHub Pages JavaScript.

## Deploy the Worker

1. Create or sign in to a Cloudflare account and install/authenticate Wrangler.
2. In a terminal, change directory to `workers/ors-proxy`.
3. Run `npx wrangler login` if Wrangler is not authenticated.
4. Create an API key in the OpenRouteService account dashboard.
5. Create a current HeiGIT API key for openrouteservice, then store it as a Worker secret (do not paste it into a source file):

   ```sh
   npx wrangler secret put ORS_API_KEY
   ```

6. Deploy:

   ```sh
   npx wrangler deploy
   ```

7. In the Cloudflare Worker settings, add a rate limit for `POST /walking-route`. Keep the region and 6 km validation in `worker.js` enabled.

The Worker calls the current HeiGIT-hosted endpoint at `api.heigit.org/openrouteservice/v2/...`; it does not use the retired `api.openrouteservice.org` host.

The Worker currently accepts requests only from:

`https://purozemikyotokankou.github.io`

## Connect the web app

After deployment, Cloudflare will show a Worker URL similar to `https://fushimi-walking-route-proxy.<account>.workers.dev`.

Edit `js/planner-map-config.js` and set the base URL (without `/walking-route`):

```js
window.FUSHIMI_ROUTING_PROXY_URL = "https://fushimi-walking-route-proxy.<account>.workers.dev";
```

Upload that file to GitHub Pages. Never add `ORS_API_KEY` to this file, `planner-maplibre.js`, or any other browser-delivered file.

## Important limits

- ORS is optional. When this URL is empty, local shrine paths still work whenever GPS is within 12 m of the mapped route network. If it cannot safely connect, the page offers Google Maps as an external fallback.
- The Worker only accepts coordinate pairs inside its configured Fushimi Inari service bounds and limits the direct connector to 6 km.
- ORS availability, account quotas, terms, and rate limits are controlled by HeiGIT and may change. Check the current HeiGIT API dashboard and documentation before public launch: https://api.heigit.org/ and https://playground.heigit.org/.
- The ORS connector does not replace or overwrite the hand-drawn shrine paths in `data/routes.json`.
