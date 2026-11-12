const CACHE='pos-app-v3';
const FILES=['/','/index.html','/style.css','/app.js','/manifest.webmanifest','/icon.svg','/js/catalog-ui.js','/js/units.js','/js/customers.js','/js/bill-editor.js','/js/profit-report.js','/js/pwa.js','/js/boot.js','/js/network-info.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).pathname.startsWith('/api/'))return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response}).catch(()=>caches.match('/index.html'))))});





