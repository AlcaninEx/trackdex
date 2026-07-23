const CACHE_NAME = 'trackdex-v149';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/shadow_icon.png',
  '/src/styles/styles.css',
  // JS modules - let them be fetched fresh, not cached by SW
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow('/');
  }));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // Skip Firebase/API requests - never cache
  if (url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('firebasedatabase') ||
      url.hostname.includes('pokeapi')) {
    e.respondWith(fetch(e.request));
    return;
  }
  
  // JS Modules - always fetch fresh, never cache (to avoid stale modules)
  if (url.pathname.endsWith('.js') && e.request.destination === 'script') {
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
})