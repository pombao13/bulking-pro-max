// ═══════════════════════════════════════════════════════════
// BULKING PRO MAX — Main Entry Point
// ═══════════════════════════════════════════════════════════
import './styles/main.css';

// ── Module imports ───────────────────────────────────────
import { switchTab, applyLayoutClass, closeMod, selC, selIcon, toggleUserMenu, closeUserMenu, fmtMoneyInput, fmtHora } from './ui.js';
import { initAuth, doLogin, doRegister, doGoogleLogin, doLogout, showAuthTab, finishOnboard } from './auth.js';
import { loadMeals, openMeal, avancarFase, openAddMealModal, addNewMealIngr, salvarNewMeal } from './meals.js';
import { addAgua, addAguaCustom, resetAgua, renderAgua } from './water.js';
import { loadSupl, openSuplModal, salvarSupl } from './supplements.js';
import { renderIngredientes, savePriceFromModal, openIngrModal, salvarIngr, savePriceInline } from './ingredients.js';
import { renderCustos } from './costs.js';
import { salvarPeso, salvarMeta, renderGrafico, renderPesoHist, renderPesoStats } from './progress.js';
import { gPesos } from './db.js';
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

  // Start auth — triggers onAuthStateChange
  initAuth();
});
