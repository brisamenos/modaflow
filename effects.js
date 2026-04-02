// ===== PREMIUM EFFECTS ENGINE =====

// Ripple effect em todos os botões
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn, .auth-btn, .btn-pdv-nav');
  if(!btn) return;
  const r = document.createElement('span');
  r.className = 'ripple';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
  btn.appendChild(r);
  setTimeout(() => r.remove(), 600);
});

// Mouse tracking nos stat-cards
document.addEventListener('mousemove', e => {
  document.querySelectorAll('.stat-card').forEach(card => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
    const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
    card.style.setProperty('--mx', x + '%');
    card.style.setProperty('--my', y + '%');
  });
});

// Animated counter para stat-cards
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    if(el._counted) return;
    el._counted = true;
    const target = parseFloat(el.dataset.count);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const isFloat = el.dataset.float === '1';
    const duration = 900;
    const start = performance.now();
    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      el.textContent = prefix + (isFloat
        ? current.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.')
        : Math.floor(current).toLocaleString('pt-BR')) + suffix;
      if(progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  });
}

// Stagger nas linhas de tabela
function staggerRows() {
  document.querySelectorAll('.data-table tbody tr').forEach((tr, i) => {
    tr.style.animationDelay = `${i * 28}ms`;
    tr.style.animationFillMode = 'both';
  });
}

// Progress bars animadas
function animateProgressBars() {
  document.querySelectorAll('.progress-bar[data-width]').forEach(bar => {
    if(bar._animated) return;
    bar._animated = true;
    bar.style.width = '0';
    setTimeout(() => { bar.style.width = bar.dataset.width; }, 120);
  });
}

// MutationObserver: re-roda efeitos ao conteúdo mudar
const _effectsObserver = new MutationObserver(() => {
  animateProgressBars();
  animateCounters();
  staggerRows();
});
const _contentEl = document.getElementById('content');
if(_contentEl) _effectsObserver.observe(_contentEl, {childList:true, subtree:false});
