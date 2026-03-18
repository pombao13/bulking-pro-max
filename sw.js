// ═══════════════════════════════════════════════════════════════
// SERVICE WORKER v6 — Auto-update + Web Push
// ═══════════════════════════════════════════════════════════════
const CACHE_NAME = "bulking-v6";
const ASSETS = ["/", "/index.html", "/manifest.json", "/icon-192.png", "/icon-512.png", "/icon-notif.png"];

// ── INSTALL: baixa assets, ativa IMEDIATAMENTE ─────────────────
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting()) // <- ativa sem esperar aba fechar
  );
});

// ── ACTIVATE: limpa caches antigos e assume controle ──────────
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim()) // <- assume todas as abas abertas
  );
});

// ── FETCH: network-first para HTML, cache-first para assets ───
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  // Nunca faz cache de APIs externas
  const url = e.request.url;
  if (url.includes("supabase.co") || url.includes("anthropic.com") || url.includes("api.") || url.includes("fonts.")) return;

  // Para o próprio index.html: sempre tenta rede primeiro (garante update)
  if (url.endsWith("/") || url.includes("index.html")) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Atualiza cache com versão nova
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)) // fallback offline
    );
    return;
  }

  // Assets estáticos: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});

// ── PUSH: recebe notificação do servidor ──────────────────────
self.addEventListener("push", e => {
  let data = { title: "🍽️ Bulking PRO MAX", body: "Hora de comer!" };
  try { data = e.data.json(); } catch {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:     data.body,
      icon:     "/icon-192.png",
      badge:    "/icon-notif.png",
      vibrate:  [200, 100, 200],
      tag:      data.tag || "bulking",
      renotify: true,
      data:     { url: "/" }
    })
  );
});

// ── NOTIFICATION CLICK ────────────────────────────────────────
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) if (c.url.startsWith(self.registration.scope)) return c.focus();
      return clients.openWindow("/");
    })
  );
});

// ── MENSAGEM do app (SKIP_WAITING) ────────────────────────────
self.addEventListener("message", e => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});
