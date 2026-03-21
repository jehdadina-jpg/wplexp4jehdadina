/* ============================================================
   RationNet — auth.js
   UI helpers: navbar, sidebar, toast, modal
   (Authentication removed)
   ============================================================ */

// ── Constants ──
const SHOP_NAME = 'Dadina Enterprises';
const SHOP_ID_DISPLAY = 'SHOP01 | Thane';

// ── No auth — pages are freely accessible ──
function requireAuth() {
  // Auth removed — always returns a dummy session object
  return { shopId: 'SHOP01', shopName: SHOP_NAME, district: 'Pune' };
}

// ── Populate navbar with hardcoded shop info ──
function populateNavbar(session) {
  const nameEl = document.getElementById('navbar-shop-name');
  const idEl = document.getElementById('navbar-shop-id');
  if (nameEl) nameEl.textContent = SHOP_NAME;
  if (idEl) idEl.textContent = SHOP_ID_DISPLAY;
}

// ── Sidebar toggle ──
function initSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('active');
    });
    overlay?.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }
}

// ── Toast system ──
function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span class="toast-msg">${message}</span>`;

  toast.addEventListener('click', () => dismissToast(toast));
  container.appendChild(toast);

  setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toast) {
  toast.classList.add('dismissing');
  setTimeout(() => toast.remove(), 300);
}

// ── Custom Modal ──
let _modalResolve = null;

function showModal({ icon = '⚠️', title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    _modalResolve = resolve;

    const overlay = document.getElementById('confirm-modal');
    if (!overlay) { resolve(false); return; }

    overlay.querySelector('.modal-icon').textContent = icon;
    overlay.querySelector('.modal-title').textContent = title;
    overlay.querySelector('.modal-message').innerHTML = message;

    const confirmBtn = overlay.querySelector('#modal-confirm-btn');
    const cancelBtn = overlay.querySelector('#modal-cancel-btn');

    confirmBtn.textContent = confirmText;
    confirmBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    cancelBtn.textContent = cancelText;

    overlay.classList.add('active');
  });
}

function resolveModal(result) {
  const overlay = document.getElementById('confirm-modal');
  overlay?.classList.remove('active');
  if (_modalResolve) {
    _modalResolve(result);
    _modalResolve = null;
  }
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  // Modal cancel/confirm
  document.getElementById('modal-cancel-btn')?.addEventListener('click', () => resolveModal(false));
  document.getElementById('modal-confirm-btn')?.addEventListener('click', () => resolveModal(true));
});
