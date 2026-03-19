// ═══════════════════════════════════════════════════════════
// BULKING PRO MAX — Service Worker v2.0
// ═══════════════════════════════════════════════════════════
const CACHE_NAME = 'bulking-v3';

const PRECACHE = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-notif.png',
];

// ── Install: precache shell ─────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ──────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Network First for HTML, Cache First for assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET and external requests
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // HTML: Network first, fallback to cache
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const clone = r.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return r;
        })
        .catch(() => caches.match(e.request) || caches.match('/'))
    );
    return;
  }

  // JS/CSS/Assets: Network first, fallback to cache (ensures fresh bundles on update)
  if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const clone = r.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Static assets (icons, fonts): Cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// ── Push Notifications ──────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: '🍽️ Bulking PRO', body: 'Hora de comer!', icon: '/icon-192.png' };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch (_) {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-notif.png',
      tag: data.tag || 'bulking',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
    })
  );
});

// ── Notification Click ──────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

// ── Skip Waiting Message ────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
