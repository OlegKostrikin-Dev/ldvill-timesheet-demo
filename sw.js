/* Сервис-воркер LD Vill: оболочка приложения лежит в кэше, чтобы оно открывалось без сети.
   Свои файлы — «сначала сеть, при обрыве кэш» (правка макета видна сразу после выкладки).
   Внешние шрифт и библиотека QR — «сначала кэш», кладутся туда при первом запросе.
   Новая версия оболочки — поднять номер в CACHE. */
const CACHE = 'ldvill-v6';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];
const EXTERNAL = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (EXTERNAL.some((o) => url.origin === o)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  /* cache: 'no-cache' — мимо HTTP-кэша браузера (GitHub Pages отдаёт max-age=600): версия сверяется с сервером при каждом открытии */
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() =>
      caches.match(req, { ignoreSearch: true }).then((hit) =>
        hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())
      )
    )
  );
});
