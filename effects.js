// ===== STOREOS PREMIUM EFFECTS ENGINE v2.0 =====

// ─── Ripple Effect (all interactive elements) ───────────────────────────────
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn, .auth-btn, .btn-pdv-nav, .product-card, .size-btn, .pay-btn');
  if (!btn) return;
  const r = document.createElement('span');
  r.className = 'ripple';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.4;
  r.style.cssText = `
    width:${size}px;height:${size}px;
    left:${e.clientX - rect.left - size / 2}px;
    top:${e.clientY - rect.top - size / 2}px;
    position:absolute;pointer-events:none;
    border-radius:50%;
    background:rgba(255,255,255,0.3);
    transform:scale(0);
    animation:rippleAnim 0.55s linear;
  `;
  btn.style.position = btn.style.position || 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(r);
  setTimeout(() => r.remove(), 600);
});

// ─── Button Press Scale ─────────────────────────────────────────────────────
document.addEventListener('mousedown', e => {
  const btn = e.target.closest('.btn, .product-card');
  if (btn && !btn.disabled) {
    btn.style.transform = 'scale(0.97)';
  }
});
document.addEventListener('mouseup', () => {
  document.querySelectorAll('.btn, .product-card').forEach(el => {
    el.style.transform = '';
  });
});

// ─── Stat Card Mouse-Tracking Glow ─────────────────────────────────────────
document.addEventListener('mousemove', e => {
  document.querySelectorAll('.stat-card').forEach(card => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
    const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
    card.style.setProperty('--mx', x + '%');
    card.style.setProperty('--my', y + '%');
  });
});

// ─── Animated Counter (data-count) ─────────────────────────────────────────
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    if (el._counted) return;
    el._counted = true;
    const target = parseFloat(el.dataset.count);
    const prefix  = el.dataset.prefix || '';
    const suffix  = el.dataset.suffix || '';
    const isFloat = el.dataset.float === '1';
    const duration = 950;
    const start = performance.now();
    const update = now => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4); // ease-out quart
      const current = target * eased;
      el.textContent = prefix + (isFloat
        ? current.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        : Math.floor(current).toLocaleString('pt-BR')) + suffix;
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  });
}

// ─── Table Row Stagger Animations ──────────────────────────────────────────
function staggerRows() {
  document.querySelectorAll('.data-table tbody tr:not(._staggered)').forEach((tr, i) => {
    tr.classList.add('_staggered');
    tr.style.animationDelay = `${i * 22}ms`;
    tr.style.animationFillMode = 'both';
  });
}

// ─── Progress Bar Animation ─────────────────────────────────────────────────
function animateProgressBars() {
  document.querySelectorAll('.progress-bar[data-width]:not(._animated)').forEach(bar => {
    bar.classList.add('_animated');
    bar.style.width = '0';
    setTimeout(() => { bar.style.width = bar.dataset.width; }, 100);
  });
}

// ─── Page Transition Class ──────────────────────────────────────────────────
function triggerPageEnter() {
  const el = document.getElementById('content');
  if (!el) return;
  el.classList.remove('page-enter');
  void el.offsetWidth; // reflow
  el.classList.add('page-enter');
}

// ─── Mobile Menu / Sidebar ───────────────────────────────────────────────────
let _mobileMenuOpen = false;

function toggleMobileMenu() {
  _mobileMenuOpen = !_mobileMenuOpen;
  const overlay = document.getElementById('mobile-menu-overlay');
  const menu    = document.getElementById('mobile-menu');
  if (!overlay || !menu) return;

  overlay.classList.toggle('open', _mobileMenuOpen);
  menu.classList.toggle('sidebar-open', _mobileMenuOpen);

  if (_mobileMenuOpen) {
    lucide.createIcons();
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

function closeMobileMenu() {
  _mobileMenuOpen = false;
  const overlay = document.getElementById('mobile-menu-overlay');
  const menu    = document.getElementById('mobile-menu');
  if (overlay) overlay.classList.remove('open');
  if (menu)    menu.classList.remove('sidebar-open');
  document.body.style.overflow = '';
}

// Close mobile menu on ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _mobileMenuOpen) closeMobileMenu();
});

// ─── Bottom Nav Active State ─────────────────────────────────────────────────
function setBN(id) {
  document.querySelectorAll('.bottom-nav-item:not(.pdv-fab)').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('bn-' + id);
  if (el) el.classList.add('active');
  closeMobileMenu();
}

// ─── MutationObserver: Re-run effects on content change ─────────────────────
const _effectsObserver = new MutationObserver(() => {
  animateProgressBars();
  animateCounters();
  staggerRows();
  // Recreate lucide icons for any newly injected content
  setTimeout(() => lucide.createIcons(), 30);
});

const _contentEl = document.getElementById('content');
if (_contentEl) {
  _effectsObserver.observe(_contentEl, { childList: true, subtree: false });
}

// ─── Focus Ring Visibility (keyboard nav) ───────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Tab') document.body.classList.add('keyboard-nav');
});
document.addEventListener('mousedown', () => {
  document.body.classList.remove('keyboard-nav');
});

// ─── Smooth scroll to top on page navigate ──────────────────────────────────
(function patchNavigate() {
  const orig = window.navigate;
  if (typeof orig !== 'function') return;
  window.navigate = function(page) {
    const content = document.getElementById('content');
    if (content) content.scrollTo({ top: 0 });
    return orig(page);
  };
})();

console.log('%c⚡ StoreOS Effects Engine v2.0 loaded', 'color:#3b82f6;font-weight:700;font-size:13px');
