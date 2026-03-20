// ── BUMPAR ESSE NÚMERO FORÇA LIMPEZA DE CACHE ──
const CACHE = "bulking-v10";
const ASSETS = ["/manifest.json", "/icon-192.png", "/icon-512.png", "/icon-notif.png"];
// index.html é EXCLUÍDO do ASSETS para nunca ser servido do cache

// ── Install: não cacheia index.html ──
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: apaga TODOS os caches antigos imediatamente ──
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => {
        console.log("[SW] Todos os caches limpos");
        return self.clients.claim();
      })
  );
});

// ── Fetch: network-first para HTML, cache-first para assets ──
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // HTML → SEMPRE busca da rede (nunca do cache)
  if (e.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname === "/") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Assets estáticos (ícones, manifest) → cache-first
  e.respondWith(
    caches.match(e.request).then(r =>
      r || fetch(e.request).then(res => {
        if (res.ok && e.request.method === "GET") {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
    ).catch(() => new Response("Offline", { status: 503 }))
  );
});

// ── Push (recebe do servidor) ──
self.addEventListener("push", e => {
  let data = { title: "🍽️ Bulking PRO", body: "Hora de comer!", icon: "/icon-192.png", badge: "/icon-notif.png", tag: "meal", url: "/" };
  if (e.data) { try { Object.assign(data, e.data.json()); } catch (_) {} }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, icon: data.icon, badge: data.badge,
      tag: data.tag, renotify: true, vibrate: [200, 100, 200, 100, 200],
      data: { url: data.url || "/" },
    })
  );
});

// ── Notification click ──
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ((c.url.includes("bulking") || c.url.endsWith("/")) && "focus" in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// ── Message ──
self.addEventListener("message", e => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (e.data?.type === "SHOW_NOTIFICATION") {
    const { title, body, tag } = e.data;
    self.registration.showNotification(title, {
      body, icon: "/icon-192.png", badge: "/icon-notif.png",
      tag: tag || "bulking", renotify: true, vibrate: [200, 100, 200],
    });
  }
});
