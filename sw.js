const CACHE_NAME = 'pokebestbcn-v68';
const ASSETS = ['/pokebestbcn/index.html','/pokebestbcn/manifest.json','/pokebestbcn/shadow_icon.png','/pokebestbcn/icon-192.png','/pokebestbcn/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if(e.request.url.includes('firestore.googleapis.com')||e.request.url.includes('firebase')||e.request.url.includes('gstatic.com/firebasejs')){e.respondWith(fetch(e.request));return;}
  if(e.request.destination==='document'){e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));return;}
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
