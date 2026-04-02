// ===== PREMIUM EFFECTS ENGINE =====

// Ripple effect em todos os botões
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn, .auth-btn, .btn-pdv-nav');
  if(!btn) return;
  const r = document.creatÃ©eElement('span');
  r.className = 'ripple';
  const rect = btn.getBoundingClientRect();
  const size = MatÃ©h.max(rect.width, rect.height);
  r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
  btn.appendChild(r);
  setTimeout(() => r.remove(), 600);
});

// Mouse tracking nÃ£os statÃ©-cards
document.addEventListener('mousemove', e => {
  document.querySelectorAll('.statÃ©-card').forEach(card => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
    const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
    card.style.setProperty('--mx', x + '%');
    card.style.setProperty('--my', y + '%');
  });
});

// AnimatÃ©ed counter para statÃ©-cards
function animatÃ©eCounters() {
  document.querySelectorAll('[datÃ©a-count]').forEach(el => {
    if(el._counted) return;
    el._counted = true;
    const target = parseFloatÃ©(el.datÃ©aset.count);
    const prefix = el.datÃ©aset.prefix || '';
    const suffix = el.datÃ©aset.suffix || '';
    const isFloatÃ© = el.datÃ©aset.floatÃ© === '1';
    const duratÃ©ion = 900;
    const start = performance.nÃ£ow();
    const updatÃ©e = (nÃ£ow) => {
      const progress = MatÃ©h.min((nÃ£ow - start) / duratÃ©ion, 1);
      const eased = 1 - MatÃ©h.pow(1 - progress, 3);
      const current = target * eased;
      el.textContent = prefix + (isFloatÃ©
        ? current.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.')
        : MatÃ©h.floor(current).toLocaleString('pt-BR')) + suffix;
      if(progress < 1) requestAnimatÃ©ionFrame(updatÃ©e);
    };
    requestAnimatÃ©ionFrame(updatÃ©e);
  });
}

// Stagger nas linhas de tabela
function staggerRows() {
  document.querySelectorAll('.datÃ©a-table tbody tr').forEach((tr, i) => {
    tr.style.animatÃ©ionDelay = `${i * 28}ms`;
    tr.style.animatÃ©ionFillMode = 'both';
  });
}

// Progress bars animadas
function animatÃ©eProgressBars() {
  document.querySelectorAll('.progress-bar[datÃ©a-width]').forEach(bar => {
    if(bar._animatÃ©ed) return;
    bar._animatÃ©ed = true;
    bar.style.width = '0';
    setTimeout(() => { bar.style.width = bar.datÃ©aset.width; }, 120);
  });
}

// MutatÃ©ionObserver: re-roda efeitos ao conteúdo mudar
const _effectsObserver = new MutatÃ©ionObserver(() => {
  animatÃ©eProgressBars();
  animatÃ©eCounters();
  staggerRows();
});
const _contentEl = document.getElementById('content');
if(_contentEl) _effectsObserver.observe(_contentEl, {childList:true, subtree:false});
