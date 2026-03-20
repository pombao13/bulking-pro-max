// ═══════════════════════════════════════════════════════════
// BULKING PRO MAX — Main Entry Point
// ═══════════════════════════════════════════════════════════
import './styles/main.css';

// ── Module imports ───────────────────────────────────────
import { TABS } from './config.js';
import { switchTab, applyLayoutClass, closeMod, selC, selIcon, toggleUserMenu, closeUserMenu, fmtMoneyInput, fmtHora } from './ui.js';
import { initAuth, doLogin, doRegister, doGoogleLogin, doLogout, showAuthTab, finishOnboard, loadUserData } from './auth.js';
import { loadMeals, openMeal, avancarFase, openAddMealModal, addNewMealIngr, salvarNewMeal } from './meals.js';
import { addAgua, addAguaCustom, resetAgua, renderAgua } from './water.js';
import { loadSupl, openSuplModal, salvarSupl } from './supplements.js';
import { renderIngredientes, savePriceFromModal, openIngrModal, salvarIngr, savePriceInline } from './ingredients.js';
import { renderCustos } from './costs.js';
import { salvarPeso, salvarMeta, renderGrafico, renderPesoHist, renderPesoStats } from './progress.js';
import { gPesos, _user } from './db.js';
import { impLoadFile, impParseText, impApply, impReset, confirmarResetDieta, downloadDieta, copySchema, toggleSchema, startQuiz, impDragOver, impDragLeave, impDrop } from './import.js';
import { toggleNotif, checkNotif, checkWaterNotif, checkSuplNotif, allowNotifFromPopup, closeNotifPopup } from './notifications.js';
import { initPWA, registerSW, installPWA, dismissPWA, showPWA, aibShow, aibDismiss, aibInstall, applyUpdate } from './pwa.js';
import { dbSaveFaseTipo } from './db.js';
import { updatePushSubFaseTipo } from './notifications.js';
import { setTabSwitchCallback } from './ui.js';

// ── Expose functions to inline HTML handlers ─────────────
const W = window;
W.switchTab         = switchTab;
W.closeMod          = closeMod;
W.selC              = selC;
W.selIcon           = selIcon;
W.toggleUserMenu    = toggleUserMenu;
W.closeUserMenu     = closeUserMenu;
W.fmtMoneyInput     = fmtMoneyInput;
W.fmtHora           = fmtHora;
W.doLogin           = doLogin;
W.doRegister        = doRegister;
W.doGoogleLogin     = doGoogleLogin;
W.doLogout          = doLogout;
W.showAuthTab       = showAuthTab;
W.finishOnboard     = finishOnboard;
W.loadMeals         = loadMeals;
W.openMeal          = openMeal;
W.avancarFase       = avancarFase;
W.openAddMealModal  = openAddMealModal;
W.addNewMealIngr    = addNewMealIngr;
W.salvarNewMeal     = salvarNewMeal;
W.addAgua           = addAgua;
W.addAguaCustom     = addAguaCustom;
W.resetAgua         = resetAgua;
W.loadSupl          = loadSupl;
W.openSuplModal     = openSuplModal;
W.salvarSupl        = salvarSupl;
W.renderIngredientes = renderIngredientes;
W.savePriceFromModal = savePriceFromModal;
W.openIngrModal     = openIngrModal;
W.salvarIngr        = salvarIngr;
W.savePriceInline   = savePriceInline;
W.renderCustos      = renderCustos;
W.salvarPeso        = salvarPeso;
W.salvarMeta        = salvarMeta;
W.impLoadFile       = (el) => { if (el.files?.[0]) impLoadFile(el.files[0]); };
W.impApply          = impApply;
W.impReset          = impReset;
W.confirmarResetDieta = confirmarResetDieta;
W.downloadDieta     = downloadDieta;
W.copySchema        = copySchema;
W.toggleSchema      = toggleSchema;
W.startQuiz         = startQuiz;
W.impDragOver       = impDragOver;
W.impDragLeave      = impDragLeave;
W.impDrop           = impDrop;
W.toggleNotif       = toggleNotif;
W.allowNotifFromPopup = allowNotifFromPopup;
W.closeNotifPopup   = closeNotifPopup;
W.installPWA        = installPWA;
W.dismissPWA        = dismissPWA;
W.showPWA           = showPWA;
W.aibShow           = aibShow;
W.aibDismiss        = aibDismiss;
W.aibInstall        = aibInstall;
W.applyUpdate       = applyUpdate;

// ── Tab Switch Callback ──────────────────────────────────
setTabSwitchCallback((id) => {
  if (id === 'agua')   renderAgua();
  if (id === 'supl')   loadSupl();
  if (id === 'ingr')   renderIngredientes();
  if (id === 'custos') renderCustos();
  if (id === 'prog')   { renderGrafico(); renderPesoHist(); renderPesoStats(gPesos()); }
});

// ── Swipe Between Tabs ──────────────────────────────────
function initSwipeTabs() {
  const tw = document.getElementById('tw');
  if (!tw) return;
  let startX = 0, startY = 0, swiping = false;
  const THRESHOLD = 50;

  tw.addEventListener('touchstart', (e) => {
    // Don't interfere with inputs, buttons, selects, canvas, modals
    const tag = e.target.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'CANVAS'].includes(tag)) return;
    if (e.target.closest('.mov, .ov, .price-inp')) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    swiping = true;
  }, { passive: true });

  tw.addEventListener('touchmove', (e) => {
    if (!swiping) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    // Cancel if vertical scroll dominates
    if (Math.abs(dy) > Math.abs(dx)) { swiping = false; }
  }, { passive: true });

  tw.addEventListener('touchend', (e) => {
    if (!swiping) return;
    swiping = false;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) < THRESHOLD) return;

    const currentTab = localStorage.getItem('activeTab') || 'ref';
    const idx = TABS.indexOf(currentTab);
    if (idx < 0) return;

    if (dx < -THRESHOLD && idx < TABS.length - 1) {
      // Swipe left → next tab
      switchTab(TABS[idx + 1], 'left');
    } else if (dx > THRESHOLD && idx > 0) {
      // Swipe right → previous tab
      switchTab(TABS[idx - 1], 'right');
    }
  }, { passive: true });
}

// ── Pull-to-Refresh ─────────────────────────────────────
function initPullToRefresh() {
  const tw = document.getElementById('tw');
  if (!tw) return;

  let startY = 0, pulling = false, refreshing = false;
  const PTR_THRESHOLD = 70;

  function getActiveScroll() {
    const active = tw.querySelector('.tab.active .tc');
    return active;
  }

  tw.addEventListener('touchstart', (e) => {
    if (refreshing) return;
    const sc = getActiveScroll();
    if (!sc || sc.scrollTop > 5) return;
    startY = e.touches[0].clientY;
    pulling = true;
  }, { passive: true });

  tw.addEventListener('touchmove', (e) => {
    if (!pulling || refreshing) return;
    const sc = getActiveScroll();
    if (!sc || sc.scrollTop > 5) { pulling = false; return; }
    const dy = e.touches[0].clientY - startY;
    if (dy < 0) { pulling = false; return; }
    if (dy > 10) {
      // Show visual indicator via toast
    }
  }, { passive: true });

  tw.addEventListener('touchend', async (e) => {
    if (!pulling || refreshing) return;
    pulling = false;
    const dy = e.changedTouches[0].clientY - startY;
    if (dy < PTR_THRESHOLD) return;

    // Trigger refresh
    refreshing = true;
    const { toast } = await import('./ui.js');
    toast('🔄 Atualizando...');

    try {
      const { _user } = await import('./db.js');
      if (_user) {
        await loadUserData(_user);
        loadMeals();
        renderCustos();
        toast('✅ Dados atualizados!');
      } else {
        toast('⚠️ Faça login primeiro');
      }
    } catch (err) {
      toast('❌ Erro ao atualizar');
      console.error('PTR error:', err);
    }
    refreshing = false;
  }, { passive: true });
}

// ── App Initialization ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Hide app shell until auth resolves
  document.getElementById('appShell').style.visibility = 'hidden';

  // Fase/tipo change listeners
  const faseEl = document.getElementById('fase');
  const tipoEl = document.getElementById('tipo');
  if (faseEl) {
    faseEl.onchange = () => {
      loadMeals();
      dbSaveFaseTipo(faseEl.value, tipoEl?.value || 'trabalho');
      updatePushSubFaseTipo?.();
    };
  }
  if (tipoEl) {
    tipoEl.onchange = () => {
      loadMeals();
      dbSaveFaseTipo(faseEl?.value || '1', tipoEl.value);
      updatePushSubFaseTipo?.();
    };
  }

  // Header date
  const _d = new Date();
  const hdrDate = document.getElementById('hdrDate');
  if (hdrDate) {
    hdrDate.textContent = _d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
  }

  // Foreground notification intervals
  setInterval(checkNotif,      30000);
  setInterval(checkWaterNotif, 60000);
  setInterval(checkSuplNotif,  600000);

  // Layout
  applyLayoutClass();
  window.addEventListener('resize', applyLayoutClass);

  // Close user menu on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#userAvatar') && !e.target.closest('#userMenu')) closeUserMenu();
  });

  // PWA
  initPWA();
  registerSW();

  // Import drop zone
  const dropZone = document.getElementById('impDrop');
  if (dropZone) {
    dropZone.addEventListener('dragover', impDragOver);
    dropZone.addEventListener('dragleave', impDragLeave);
    dropZone.addEventListener('drop', impDrop);
    dropZone.addEventListener('click', () => document.getElementById('impFileInput')?.click());
  }

  // Swipe between tabs
  initSwipeTabs();

  // Pull-to-refresh
  initPullToRefresh();

  // Start auth — triggers onAuthStateChange
  initAuth();
});
