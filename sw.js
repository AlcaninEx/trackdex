const CACHE_NAME = 'pokebestbcn-v93';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/shadow_icon.png',
  '/src/styles/styles.css',
  '/src/scripts/main.js',
  '/src/scripts/app.js',
  '/src/scripts/data-loader.js',
  '/src/scripts/firebase.js',
  '/src/scripts/storage.js',
  '/src/scripts/state.js',
  '/src/scripts/helpers.js',
  '/src/scripts/profile.js',
  '/src/scripts/main-screen.js',
  '/src/scripts/album.js',
  '/src/scripts/ranking.js',
  '/src/scripts/typechart.js',
  '/src/scripts/megaguide.js',
  '/src/scripts/legacy.js',
  '/src/scripts/diarias.js',
  '/src/scripts/pokeparadas.js',
  '/src/scripts/perfil.js',
  '/src/scripts/novedades.js',
  '/src/scripts/filtro.js',
  '/src/scripts/objetivo.js',
  '/src/data/types.json',
  '/src/data/rankings.json',
  '/src/data/dmax.json',
  '/src/data/pd.json',
  '/src/data/base_stats.json',
  '/src/data/pokedex.json',
  '/src/data/name_to_id.json',
  '/src/data/mega_list.json',
  '/src/data/pp_data.json',
  '/src/data/legacy_sprites.json',
  '/src/data/filtro_suffixes.json',
  '/src/data/type_eff.json',
  '/src/data/dmax_names.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Skip Firebase/API requests
  if (e.request.url.includes('firestore.googleapis.com') ||
      e.request.url.includes('firebase') ||
      e.request.url.includes('gstatic.com/firebasejs') ||
      e.request.url.includes('firebasedatabase') ||
      e.request.url.includes('pokeapi')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // HTML documents - network first
  if (e.request.destination === 'document') {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // Everything else - cache first
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});