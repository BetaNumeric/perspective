// Include the scope so other apps on the same GitHub Pages origin keep their caches.
const CACHE_PREFIX = `perspective-${encodeURIComponent(self.registration.scope)}-`;
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const APP_ASSETS = [
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './vendor/p5/p5.min.js',
  './js/config.js',
  './js/time.js',
  './js/layout.js',
  './js/data/common.js',
  './js/data/temperature.js',
  './js/data/co2.js',
  './js/data/comparisons.js',
  './js/data/solar.js',
  './js/data/sealevel.js',
  './js/plot.js',
  './js/timeline.js',
  './js/timeline-events.js',
  './js/timeline-ui.js',
  './js/touch.js',
  './js/ui.js',
  './js/pwa.js',
  './sketch.js',
  './data/orbit/zeebe2019orbital.txt',
  './data/temperature/phanda2024-percentiles.csv',
  './data/temperature/Table.txt',
  './data/temperature/snyder2016-gast.csv',
  './data/temperature/osman2021-gmst.csv',
  './data/temperature/Full_ensemble_median_and_95pct_range.txt',
  './data/temperature/GLB.Ts+dSST.txt',
  './data/co2/foster2017-loess.csv',
  './data/co2/cencopip2023-500kyr.csv',
  './data/co2/antarctica2015co2composite-noaa.txt',
  './data/co2/daily_in_situ_co2_mlo.csv',
  './data/co2/co2_daily_mlo.txt',
  './data/volcanic/SAOD_merged_HolVol-v1_eVolv2k_v3_CMIP6_v3_-9500_to_2014_global_mean.csv',
  './data/solar/SATIRE_M_TSI_14C_fc.csv',
  './data/solar/nnl_tsi_P1D.txt',
  './data/solar/tsis_tsi_24hr.txt',
  './data/sealevel/marcilly2024-modern-land.csv',
  './data/sealevel/miller2024-sealevel.txt',
  './data/sealevel/spratt2016-noaa.txt',
  './data/sealevel/lambeck2014-esl.csv',
  './data/sealevel/kopp2016-global-posterior.csv',
  './data/sealevel/gslGPChange2014.txt',
  './data/sealevel/gmsl_2026rel2_seasons_retained.txt',
  './data/sealevel/marcilly2024-correction.pdf',
  './data/population/population-long-run-with-projections.csv'
];

const appUrl = path => new URL(path, self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Installation succeeds only when every chart dependency is available offline.
    await cache.addAll(APP_ASSETS.map(path => new Request(appUrl(path), { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    // Check the deployed files on every load, including code and current observations.
    const response = await fetch(new Request(request, { cache: 'no-store' }));
    if (response.ok) {
      try { await cache.put(request, response.clone()); } catch { /* Storage limits must not block online use. */ }
    } else if (response.status >= 500) {
      const cached = await cache.match(request);
      if (cached) return cached;
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const page = await cache.match(appUrl('./index.html'));
      if (page) return page;
    }
    throw error;
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith(networkFirst(request));
});
