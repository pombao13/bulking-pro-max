// ═══════════════════════════════════════════════════════════
// PWA — Install prompt, iOS detection, layout
// ═══════════════════════════════════════════════════════════
import { toast, applyLayoutClass } from './ui.js';

let _deferredPrompt = null;

// ── beforeinstallprompt ──────────────────────────────────
export function initPWA() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    showInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    _deferredPrompt = null;
    toast('✅ App instalado!');
    hideInstallBanner();
  });

  // iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (isIOS && !isStandalone) {
    showIOSGuide();
  }
}

function showInstallBanner() {
  const dismissed = localStorage.getItem('pwaDismissed');
  if (dismissed && Date.now() - parseInt(dismissed) < 86400000 * 7) return; // 7 days
  const el = document.getElementById('installHint');
  if (el) el.classList.add('show');
  const banner = document.getElementById('authInstallBanner');
  if (banner) banner.classList.add('show');
}

function hideInstallBanner() {
  document.getElementById('installHint')?.classList.remove('show');
  document.getElementById('authInstallBanner')?.classList.remove('show');
}

export async function installPWA() {
  if (_deferredPrompt) {
    _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    if (outcome === 'accepted') toast('✅ Instalando...');
    _deferredPrompt = null;
    return;
  }
  // Fallback: show iOS guide or generic
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    showIOSGuide();
  } else {
    toast('ℹ️ Use o menu do navegador → "Instalar aplicativo"');
  }
}

export function dismissPWA() {
  localStorage.setItem('pwaDismissed', Date.now());
  hideInstallBanner();
  const pwaOverlay = document.getElementById('pwaOverlay');
  if (pwaOverlay) pwaOverlay.classList.remove('show');
}

export function showPWA() {
  const pwaOverlay = document.getElementById('pwaOverlay');
  if (pwaOverlay) pwaOverlay.classList.add('show');
}

function showIOSGuide() {
  const guide = document.getElementById('iosGuide');
  if (guide) guide.classList.add('show');
  const aibIos = document.getElementById('aibIos');
  if (aibIos) aibIos.classList.add('show');
}

// ── Auth Install Banner shortcuts ────────────────────────
export function aibShow()    { document.getElementById('installHint')?.classList.add('show'); }
export function aibDismiss() { document.getElementById('installHint')?.classList.remove('show'); localStorage.setItem('pwaDismissed', Date.now()); }
export function aibInstall() { installPWA(); }

// ── Service Worker Registration ──────────────────────────
export function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('/sw.js').then(reg => {
    // Show update banner if SW is already waiting
    if (reg.waiting) showUpdateBanner();

    // Detect new SW installed
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      if (!newSW) return;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner();
        }
      });
    });

    // Poll for updates every 60 seconds
    setInterval(() => reg.update().catch(() => {}), 60000);
  }).catch(() => {});

  // Reload when new SW takes over
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

function showUpdateBanner() {
  const el = document.getElementById('updateBanner');
  if (el) el.classList.add('show');
}

// ── Update Banner ────────────────────────────────────────
export function applyUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(r => {
      if (r?.waiting) r.waiting.postMessage({ type: 'SKIP_WAITING' });
    });
  }
  window.location.reload();
}
