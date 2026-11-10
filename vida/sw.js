/* Vida · funciona sin conexión. Sube VERSION cada vez que cambien los archivos de la app. */
const VERSION = 'vida-1';
const SHELL = [
  './', 'index.html', 'app.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png',
  'js/core.js', 'js/entreno.js', 'js/contenido.js', 'js/estudio.js', 'js/yo.js', 'js/garmin.js', 'js/hoy.js',
  '../fonts/fonts.css', '../fonts/anton-0.woff2', '../fonts/ibm-plex-mono-1.woff2', '../fonts/ibm-plex-mono-2.woff2', '../fonts/instrument-sans-3.woff2'
];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('vida-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
/* Primero la red para tener siempre la última versión; si no hay red, la copia guardada. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html')))
  );
});
