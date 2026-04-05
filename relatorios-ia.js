// ── helpers de fetch (usa token do localStorage) ──
function iaHeader() {
  const t = localStorage.getItem('loja_token') || '';
  return { 'Authorization': 'Bearer ' + t, 'Content-Type': 'application/json' };
}
async function apiGet(url) {
  const r = await fetch(url, { headers: iaHeader() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiPost(url, body) {
  const r = await fetch(url, { method: 'POST', headers: iaHeader(), body: JSON.stringify(body) });
  if (!r.ok) {
    let msg = await r.text();
    try { msg = JSON.parse(msg).message || msg; } catch(e){}
    throw new Error(msg);
  }
  return r.json();
}

// ═══════════════════════════════════════════════════════
//  RELATÓRIOS IA — ModaFlow
//  Configuração de notificações WhatsApp + IA Assistente
// ═══════════════════════════════════════════════════════

let _iaConfig = {};
let _iaSSE = null;
let _iaResumo = null;

const IAR = {
  fmt: v => 'R$ ' + Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2}),
  fmtN: v => Number(v||0).toLocaleString('pt-BR'),

  async loadConfig() {
    try {
      const r = await apiGet('/api/ia/config');
      _iaConfig = r;
    } catch(e) { _iaConfig = {}; }
  },

  async loadResumo() {
    try {
      _iaResumo = await apiGet('/api/ia/resumo');
    } catch(e) { _iaResumo = null; }
  },

  connectSSE() {
    if (_iaSSE) { _iaSSE.close(); _iaSSE = null; }
    const slug = window._slug || '';
    _iaSSE = new EventSource(`/api/ia/sse?slug=${slug}`);
    _iaSSE.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        IAR.onSSEEvent(ev);
      } catch(_) {}
    };
  },

  onSSEEvent(ev) {
    const feed = document.getElementById('ia-feed');
    if (!feed) return;

    const icons = {
      nova_venda:    { icon: '💰', cor: '#10b981', label: 'Nova Venda' },
      estoque_baixo: { icon: '⚠️', cor: '#f59e0b', label: 'Estoque Baixo' },
      novo_cliente:  { icon: '👤', cor: '#3b82f6', label: 'Novo Cliente' },
      relatorio:     { icon: '📊', cor: '#8b5cf6', label: 'Relatório' },
    };
    const info = icons[ev.type] || { icon: '🔔', cor: '#6b7280', label: 'Notificação' };
    const hora = new Date(ev.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});

    const item = document.createElement('div');
    item.className = 'ia-feed-item ia-feed-new';
    item.innerHTML = `
      <div class="ia-feed-icon" style="background:${info.cor}22;color:${info.cor}">${info.icon}</div>
      <div class="ia-feed-body">
        <div class="ia-feed-label" style="color:${info.cor}">${info.label}</div>
        <div class="ia-feed-msg">${ev.data?.mensagem || JSON.stringify(ev.data)}</div>
      </div>
      <div class="ia-feed-time">${hora}</div>`;

    const empty = feed.querySelector('.ia-feed-empty');
    if (empty) empty.remove();
    feed.insertBefore(item, feed.firstChild);
    setTimeout(() => item.classList.remove('ia-feed-new'), 50);

    // Atualiza chat e log
    setTimeout(() => IAR.loadHistorico(), 500);
    setTimeout(() => IAR.loadLogAcoes && IAR.loadLogAcoes(), 800);
  },

  async save() {
    const num   = document.getElementById('ia-numero')?.value?.trim() || '';
    const btn   = document.getElementById('ia-save-btn');
    const orig  = btn?.innerHTML;
    if (btn) { btn.innerHTML = '<span class="ia-spinner"></span> Salvando...'; btn.disabled = true; }

    const payload = {
      numero:              num,

      notify_nova_venda:   document.getElementById('ia-n-venda')?.checked ? '1':'0',
      notify_estoque:      document.getElementById('ia-n-estoque')?.checked ? '1':'0',
      notify_novo_cliente: document.getElementById('ia-n-cliente')?.checked ? '1':'0',
      notify_relatorio:    document.getElementById('ia-n-relatorio')?.checked ? '1':'0',
      relatorio_horario:   document.getElementById('ia-horario')?.value || '08:00',
      relatorio_periodo:   document.getElementById('ia-periodo')?.value || 'diario',
      horario_inicio:      document.getElementById('ia-h-inicio')?.value || '00:00',
      horario_fim:         document.getElementById('ia-h-fim')?.value    || '23:59',
      ia_enabled:          document.getElementById('ia-toggle')?.checked ? '1':'0',
    };

    try {
      await apiPost('/api/ia/config', payload);
      _iaConfig = { ..._iaConfig, ...payload };

      toast('Configuração salva! ✅', 'success');

      IAR.updateStatus();
      setTimeout(() => IAR.checkPollingStatus && IAR.checkPollingStatus(), 600);
    } catch(e) {
      toast('Erro ao salvar: ' + e.message, 'error');
    } finally {
      if (btn) { btn.innerHTML = orig; btn.disabled = false; }
    }
  },

  updateStatus() {
    const pill = document.getElementById('ia-status-pill');
    const on = _iaConfig.ia_enabled === '1';
    if (pill) {
      pill.className = 'ia-status-pill ' + (on ? 'ia-status-on' : 'ia-status-off');
      pill.innerHTML = on
        ? '<span class="ia-dot"></span> IA Ativa'
        : '<span class="ia-dot"></span> IA Inativa';
    }
  },

  async sendTestMsg() {
    const btn = document.getElementById('ia-test-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Enviando...'; }
    try {
      const num = _iaConfig.numero;
      if (!num) { toast('Cadastre um número primeiro.','error'); return; }
      await apiPost('/api/ia/send-whatsapp', {
        numero: num,
        mensagem: `🤖 *ModaFlow IA* — Olá! Sua integração está funcionando corretamente.\n\nVocê receberá notificações e poderá consultar relatórios por aqui. 🎉`
      });
      toast('Mensagem de teste enviada!','success');
    } catch(e) {
      toast('Erro: '+e.message,'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '📱 Enviar Teste'; }
    }
  },

  renderKPIs() {
    if (!_iaResumo) return '<div class="ia-kpi-empty">Carregando dados...</div>';
    const r = _iaResumo;
    return `
      <div class="ia-kpi-grid">
        <div class="ia-kpi ia-kpi-green">
          <div class="ia-kpi-icon">💰</div>
          <div class="ia-kpi-val">${IAR.fmt(r.vendas_hoje?.total)}</div>
          <div class="ia-kpi-label">Faturamento Hoje</div>
          <div class="ia-kpi-sub">${IAR.fmtN(r.vendas_hoje?.qtd)} vendas</div>
        </div>
        <div class="ia-kpi ia-kpi-blue">
          <div class="ia-kpi-icon">📅</div>
          <div class="ia-kpi-val">${IAR.fmt(r.vendas_mes?.total)}</div>
          <div class="ia-kpi-label">Faturamento do Mês</div>
          <div class="ia-kpi-sub">${IAR.fmtN(r.vendas_mes?.qtd)} vendas</div>
        </div>
        <div class="ia-kpi ia-kpi-purple">
          <div class="ia-kpi-icon">🎯</div>
          <div class="ia-kpi-val">${IAR.fmt(r.ticket_medio)}</div>
          <div class="ia-kpi-label">Ticket Médio Hoje</div>
          <div class="ia-kpi-sub">média por venda</div>
        </div>
        <div class="ia-kpi ${r.estoque_baixo > 0 ? 'ia-kpi-amber' : 'ia-kpi-green'}">
          <div class="ia-kpi-icon">${r.estoque_baixo > 0 ? '⚠️' : '✅'}</div>
          <div class="ia-kpi-val">${IAR.fmtN(r.estoque_baixo)}</div>
          <div class="ia-kpi-label">Estoque Crítico</div>
          <div class="ia-kpi-sub">itens ≤ 3 unidades</div>
        </div>
        <div class="ia-kpi ia-kpi-teal">
          <div class="ia-kpi-icon">👥</div>
          <div class="ia-kpi-val">${IAR.fmtN(r.clientes_mes)}</div>
          <div class="ia-kpi-label">Novos Clientes</div>
          <div class="ia-kpi-sub">no mês atual</div>
        </div>
        <div class="ia-kpi ia-kpi-indigo">
          <div class="ia-kpi-icon">📈</div>
          <div class="ia-kpi-val">${IAR.fmt(r.vendas_semana?.total)}</div>
          <div class="ia-kpi-label">Faturamento Semana</div>
          <div class="ia-kpi-sub">${IAR.fmtN(r.vendas_semana?.qtd)} vendas</div>
        </div>
      </div>`;
  }
};

async function renderRelatoriosIA() {
  await Promise.all([IAR.loadConfig(), IAR.loadResumo()]);
  IAR.connectSSE();
  setTimeout(() => IAR.loadHistorico(), 300);
  setTimeout(() => IAR.loadLogAcoes && IAR.loadLogAcoes(), 600);
  setTimeout(() => IAR.checkPollingStatus(), 800);

  const c = document.getElementById('content');
  const on = _iaConfig.ia_enabled === '1';
  const num = _iaConfig.numero || '';

  c.innerHTML = `
<style>
/* ── IA REPORTS PAGE ── */
.ia-page { max-width: 1100px; margin: 0 auto; padding: 8px 0 40px; }

/* Header hero */
.ia-hero {
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
  border: 1px solid rgba(139,92,246,.2);
  border-radius: 20px;
  padding: 32px 36px;
  margin-bottom: 28px;
  position: relative;
  overflow: hidden;
}
.ia-hero::before {
  content: '';
  position: absolute;
  top: -60px; right: -60px;
  width: 280px; height: 280px;
  background: radial-gradient(circle, rgba(139,92,246,.15) 0%, transparent 70%);
  pointer-events: none;
}
.ia-hero::after {
  content: '';
  position: absolute;
  bottom: -40px; left: 40px;
  width: 200px; height: 200px;
  background: radial-gradient(circle, rgba(59,130,246,.08) 0%, transparent 70%);
  pointer-events: none;
}
.ia-hero-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}
.ia-hero-left { display: flex; align-items: center; gap: 18px; }
.ia-hero-orb {
  width: 60px; height: 60px;
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px;
  box-shadow: 0 8px 32px rgba(124,58,237,.4);
  flex-shrink: 0;
}
.ia-hero-title { font-size: 22px; font-weight: 800; letter-spacing: -.5px; }
.ia-hero-sub { font-size: 13px; color: #94a3b8; margin-top: 3px; }
.ia-status-pill {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 14px; border-radius: 99px;
  font-size: 12px; font-weight: 700; letter-spacing: .5px;
  transition: all .3s;
}
.ia-status-on  { background: rgba(16,185,129,.15); color: #34d399; border: 1px solid rgba(16,185,129,.3); }
.ia-status-off { background: rgba(100,116,139,.12); color: #64748b;  border: 1px solid rgba(100,116,139,.2); }
.ia-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: currentColor;
  animation: iaPulse 2s infinite;
}
@keyframes iaPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }

/* KPI Cards */
.ia-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
  margin-bottom: 28px;
}
.ia-kpi {
  background: var(--s2, #141420);
  border: 1px solid var(--border, rgba(255,255,255,.06));
  border-radius: 16px;
  padding: 18px 16px;
  transition: transform .2s, box-shadow .2s;
  position: relative; overflow: hidden;
}
.ia-kpi::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(circle at 80% 20%, var(--ia-kpi-glow, transparent) 0%, transparent 60%);
  pointer-events: none;
}
.ia-kpi:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,.4); }
.ia-kpi-green  { --ia-kpi-glow: rgba(16,185,129,.08); }
.ia-kpi-blue   { --ia-kpi-glow: rgba(59,130,246,.08); }
.ia-kpi-purple { --ia-kpi-glow: rgba(139,92,246,.08); }
.ia-kpi-amber  { --ia-kpi-glow: rgba(245,158,11,.08); }
.ia-kpi-teal   { --ia-kpi-glow: rgba(20,184,166,.08); }
.ia-kpi-indigo { --ia-kpi-glow: rgba(99,102,241,.08); }
.ia-kpi-icon { font-size: 22px; margin-bottom: 10px; }
.ia-kpi-val  { font-size: 18px; font-weight: 800; letter-spacing: -.5px; margin-bottom: 4px; }
.ia-kpi-label{ font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
.ia-kpi-sub  { font-size: 11px; color: #475569; margin-top: 3px; }

/* Two column layout */
.ia-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
@media(max-width:800px){ .ia-cols { grid-template-columns: 1fr; } }

/* Cards */
.ia-card {
  background: var(--s2, #141420);
  border: 1px solid var(--border, rgba(255,255,255,.06));
  border-radius: 18px;
  overflow: hidden;
}
.ia-card-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border, rgba(255,255,255,.06));
}
.ia-card-head-left { display: flex; align-items: center; gap: 10px; }
.ia-card-head-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
}
.ia-card-title { font-size: 14px; font-weight: 700; }
.ia-card-sub   { font-size: 11px; color: #64748b; margin-top: 2px; }
.ia-card-body  { padding: 22px; }

/* Form elements */
.ia-field { margin-bottom: 18px; }
.ia-label { display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 8px; }
.ia-input {
  width: 100%;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 10px;
  padding: 12px 14px;
  color: var(--text, #f0f0fa);
  font-family: inherit; font-size: 14px;
  outline: none; transition: all .2s;
}
.ia-input:focus { border-color: #7c3aed; background: rgba(124,58,237,.05); box-shadow: 0 0 0 3px rgba(124,58,237,.12); }
.ia-input::placeholder { color: #475569; }
.ia-select {
  width: 100%;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 10px;
  padding: 12px 14px;
  color: var(--text, #f0f0fa);
  font-family: inherit; font-size: 14px;
  outline: none; cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2364748b' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
}
.ia-select:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,.12); }
.ia-select option { background: #1e1b4b; }

/* Toggle switches */
.ia-toggle-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,.04);
}
.ia-toggle-row:last-child { border-bottom: none; }
.ia-toggle-info { display: flex; align-items: center; gap: 10px; }
.ia-toggle-emoji { font-size: 18px; width: 28px; text-align: center; }
.ia-toggle-name  { font-size: 13px; font-weight: 600; }
.ia-toggle-desc  { font-size: 11px; color: #64748b; margin-top: 2px; }
.ia-switch { position: relative; width: 44px; height: 24px; flex-shrink: 0; }
.ia-switch input { opacity: 0; width: 0; height: 0; }
.ia-switch-track {
  position: absolute; inset: 0;
  background: rgba(255,255,255,.1);
  border-radius: 99px;
  cursor: pointer;
  transition: background .25s;
}
.ia-switch input:checked + .ia-switch-track { background: linear-gradient(135deg,#7c3aed,#4f46e5); }
.ia-switch-track::after {
  content: '';
  position: absolute;
  width: 18px; height: 18px;
  background: #fff;
  border-radius: 50%;
  top: 3px; left: 3px;
  transition: transform .25s;
  box-shadow: 0 2px 6px rgba(0,0,0,.3);
}
.ia-switch input:checked + .ia-switch-track::after { transform: translateX(20px); }

/* Main toggle */
.ia-master-toggle {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(124,58,237,.07);
  border: 1px solid rgba(124,58,237,.2);
  border-radius: 14px;
  padding: 16px 20px;
  margin-bottom: 18px;
}
.ia-master-toggle-left { display: flex; align-items: center; gap: 12px; }
.ia-master-icon {
  width: 42px; height: 42px;
  background: linear-gradient(135deg, rgba(124,58,237,.25), rgba(79,70,229,.25));
  border: 1px solid rgba(124,58,237,.3);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px;
}
.ia-master-title { font-size: 14px; font-weight: 700; }
.ia-master-desc  { font-size: 12px; color: #64748b; margin-top: 2px; }
.ia-switch-lg { position: relative; width: 56px; height: 30px; }
.ia-switch-lg input { opacity: 0; width: 0; height: 0; }
.ia-switch-lg-track {
  position: absolute; inset: 0;
  background: rgba(255,255,255,.1);
  border-radius: 99px;
  cursor: pointer;
  transition: background .25s;
}
.ia-switch-lg input:checked + .ia-switch-lg-track { background: linear-gradient(135deg,#7c3aed,#4f46e5); box-shadow: 0 0 16px rgba(124,58,237,.4); }
.ia-switch-lg-track::after {
  content: '';
  position: absolute;
  width: 22px; height: 22px;
  background: #fff;
  border-radius: 50%;
  top: 4px; left: 4px;
  transition: transform .25s;
  box-shadow: 0 2px 8px rgba(0,0,0,.3);
}
.ia-switch-lg input:checked + .ia-switch-lg-track::after { transform: translateX(26px); }

/* Buttons */
.ia-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 20px;
  border: none; border-radius: 10px;
  font-family: inherit; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all .2s;
}
.ia-btn-primary {
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  color: #fff;
  box-shadow: 0 4px 16px rgba(124,58,237,.35);
}
.ia-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(124,58,237,.5); }
.ia-btn-ghost {
  background: rgba(255,255,255,.06);
  color: #94a3b8;
  border: 1px solid rgba(255,255,255,.1);
}
.ia-btn-ghost:hover { background: rgba(255,255,255,.1); color: #f0f0fa; }
.ia-btn:disabled { opacity: .5; cursor: not-allowed; transform: none !important; }
.ia-btn-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 6px; }

/* Number display */
.ia-numero-display {
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 12px;
  padding: 14px 18px;
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 18px;
}
.ia-numero-icon { font-size: 24px; }
.ia-numero-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
.ia-numero-val { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
.ia-numero-val.empty { color: #475569; font-size: 13px; font-style: italic; font-weight: 400; }

/* SSE Feed */
.ia-feed-container {
  max-height: 360px; overflow-y: auto;
  padding: 6px 4px;
}
.ia-feed-container::-webkit-scrollbar { width: 3px; }
.ia-feed-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 99px; }
.ia-feed-item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  margin-bottom: 6px;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.05);
  transition: all .4s;
  animation: iaFeedIn .35s cubic-bezier(.16,1,.3,1);
}
@keyframes iaFeedIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
.ia-feed-new { border-color: rgba(124,58,237,.3); background: rgba(124,58,237,.07); }
.ia-feed-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; flex-shrink: 0;
}
.ia-feed-body { flex: 1; min-width: 0; }
.ia-feed-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
.ia-feed-msg   { font-size: 13px; color: #94a3b8; margin-top: 3px; line-height: 1.4; }
.ia-feed-time  { font-size: 11px; color: #475569; white-space: nowrap; flex-shrink: 0; margin-top: 2px; }
.ia-feed-empty { text-align: center; padding: 40px 20px; color: #475569; font-size: 13px; }
.ia-feed-empty-icon { font-size: 36px; margin-bottom: 10px; opacity: .4; }

/* Spinner */
.ia-spinner {
  display: inline-block; width: 12px; height: 12px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: iaSpin .7s linear infinite;
}
@keyframes iaSpin { to{transform:rotate(360deg)} }

/* Row + col utils */
.ia-row   { display: flex; gap: 14px; }
.ia-row > * { flex: 1; }
@media(max-width:600px){ .ia-row { flex-direction: column; } }

/* Info box */
.ia-info-box {
  background: rgba(59,130,246,.07);
  border: 1px solid rgba(59,130,246,.2);
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 12px;
  color: #93c5fd;
  line-height: 1.6;
  margin-bottom: 0;
}
.ia-info-box strong { color: #bfdbfe; }

/* Badge */
.ia-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .5px;
}
.ia-badge-purple { background: rgba(124,58,237,.15); color: #c4b5fd; }
</style>

<div class="ia-page">

  <!-- Hero Header -->
  <div class="ia-hero">
    <div class="ia-hero-top">
      <div class="ia-hero-left">
        <div class="ia-hero-orb">🤖</div>
        <div>
          <div class="ia-hero-title">Relatórios & IA</div>
          <div class="ia-hero-sub">Notificações inteligentes via WhatsApp + Assistente de IA</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div id="ia-status-pill" class="ia-status-pill ${on ? 'ia-status-on' : 'ia-status-off'}">
          <span class="ia-dot"></span> ${on ? 'IA Ativa' : 'IA Inativa'}
        </div>
        <span class="ia-badge ia-badge-purple">✨ Beta</span>
      </div>
    </div>
  </div>

  <!-- KPIs -->
  ${IAR.renderKPIs()}

  <!-- Two columns -->
  <div class="ia-cols">

    <!-- LEFT: Configuração do número -->
    <div class="ia-card">
      <div class="ia-card-head">
        <div class="ia-card-head-left">
          <div class="ia-card-head-icon" style="background:rgba(16,185,129,.12);color:#34d399">📱</div>
          <div>
            <div class="ia-card-title">Número WhatsApp</div>
            <div class="ia-card-sub">Número que recebe notificações e interage com a IA</div>
          </div>
        </div>
      </div>
      <div class="ia-card-body">

        <!-- Toggle master -->
        <div class="ia-master-toggle">
          <div class="ia-master-toggle-left">
            <div class="ia-master-icon">⚡</div>
            <div>
              <div class="ia-master-title">Ativar IA & Notificações</div>
              <div class="ia-master-desc">Ligar para começar a receber alertas</div>
            </div>
          </div>
          <label class="ia-switch-lg">
            <input type="checkbox" id="ia-toggle" ${on ? 'checked' : ''}>
            <span class="ia-switch-lg-track"></span>
          </label>
        </div>

        <!-- Número atual -->
        <div class="ia-numero-display">
          <div class="ia-numero-icon">📲</div>
          <div>
            <div class="ia-numero-label">Número cadastrado</div>
            <div class="ia-numero-val ${num ? '' : 'empty'}">${num || 'Nenhum número cadastrado'}</div>
          </div>
        </div>

        <div class="ia-field">
          <label class="ia-label">Novo número (com DDD)</label>
          <input class="ia-input" id="ia-numero" placeholder="85999999999" value="${num}"
            oninput="this.value=this.value.replace(/[^0-9+]/g,'')">
        </div>

        <div class="ia-info-box" style="margin-bottom:18px">
          <strong>🔒 Número exclusivo:</strong> apenas este número poderá conversar com a IA e receber notificações. Outros números serão ignorados automaticamente.
        </div>

        <!-- Status da conexão (apenas leitura para o cliente) -->
        <div id="ia-polling-status" style="display:flex;align-items:center;gap:8px;margin:16px 0;padding:12px 16px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)">
          <div id="ia-poll-dot" style="width:8px;height:8px;border-radius:50%;background:#64748b;flex-shrink:0"></div>
          <span id="ia-poll-label" style="font-size:12px;color:#64748b">Verificando conexão...</span>
        </div>

        <div class="ia-btn-row">
          <button class="ia-btn ia-btn-primary" id="ia-save-btn" onclick="IAR.save()">
            💾 Salvar configuração
          </button>
          <button class="ia-btn ia-btn-ghost" id="ia-test-btn" onclick="IAR.sendTestMsg()">
            📱 Enviar Teste
          </button>
          <button class="ia-btn ia-btn-ghost" onclick="IAR.pollTest()" title="Diagnóstico completo da conexão">
            🔍 Diagnóstico
          </button>
        </div>
      </div>
    </div>

    <!-- RIGHT: Preferências de notificação -->
    <div class="ia-card">
      <div class="ia-card-head">
        <div class="ia-card-head-left">
          <div class="ia-card-head-icon" style="background:rgba(139,92,246,.12);color:#a78bfa">🔔</div>
          <div>
            <div class="ia-card-title">Notificações</div>
            <div class="ia-card-sub">Escolha o que deseja receber via WhatsApp</div>
          </div>
        </div>
      </div>
      <div class="ia-card-body">
        <div class="ia-toggle-row">
          <div class="ia-toggle-info">
            <div class="ia-toggle-emoji">💰</div>
            <div>
              <div class="ia-toggle-name">Nova venda realizada</div>
              <div class="ia-toggle-desc">Alerta imediato a cada venda</div>
            </div>
          </div>
          <label class="ia-switch">
            <input type="checkbox" id="ia-n-venda" ${_iaConfig.notify_nova_venda !== '0' ? 'checked' : ''}>
            <span class="ia-switch-track"></span>
          </label>
        </div>
        <div class="ia-toggle-row">
          <div class="ia-toggle-info">
            <div class="ia-toggle-emoji">⚠️</div>
            <div>
              <div class="ia-toggle-name">Estoque crítico</div>
              <div class="ia-toggle-desc">Itens com 3 ou menos unidades</div>
            </div>
          </div>
          <label class="ia-switch">
            <input type="checkbox" id="ia-n-estoque" ${_iaConfig.notify_estoque !== '0' ? 'checked' : ''}>
            <span class="ia-switch-track"></span>
          </label>
        </div>
        <div class="ia-toggle-row">
          <div class="ia-toggle-info">
            <div class="ia-toggle-emoji">👤</div>
            <div>
              <div class="ia-toggle-name">Novo cliente cadastrado</div>
              <div class="ia-toggle-desc">Quando um cliente é registrado</div>
            </div>
          </div>
          <label class="ia-switch">
            <input type="checkbox" id="ia-n-cliente" ${_iaConfig.notify_novo_cliente !== '0' ? 'checked' : ''}>
            <span class="ia-switch-track"></span>
          </label>
        </div>
        <div class="ia-toggle-row">
          <div class="ia-toggle-info">
            <div class="ia-toggle-emoji">📊</div>
            <div>
              <div class="ia-toggle-name">Relatório automático</div>
              <div class="ia-toggle-desc">Resumo programado de vendas</div>
            </div>
          </div>
          <label class="ia-switch">
            <input type="checkbox" id="ia-n-relatorio" ${_iaConfig.notify_relatorio === '1' ? 'checked' : ''}>
            <span class="ia-switch-track"></span>
          </label>
        </div>

        <!-- Programação do relatório -->
        <div style="margin-top:18px;padding-top:18px;border-top:1px solid rgba(255,255,255,.06)">
          <div class="ia-row">
            <div class="ia-field" style="margin-bottom:0">
              <label class="ia-label">Período</label>
              <select class="ia-select" id="ia-periodo">
                <option value="diario"  ${_iaConfig.relatorio_periodo==='diario' ?'selected':''}>Diário</option>
                <option value="semanal" ${_iaConfig.relatorio_periodo==='semanal'?'selected':''}>Semanal</option>
                <option value="mensal"  ${_iaConfig.relatorio_periodo==='mensal' ?'selected':''}>Mensal</option>
              </select>
            </div>
            <div class="ia-field" style="margin-bottom:0">
              <label class="ia-label">Horário de envio</label>
              <input class="ia-input" id="ia-horario" type="time" value="${_iaConfig.relatorio_horario || '08:00'}">
            </div>
          </div>
        </div>

        <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.06)">
          <div class="ia-label" style="margin-bottom:8px">🌙 Horário de atendimento da IA</div>
          <div class="ia-row">
            <div class="ia-field" style="margin-bottom:0">
              <label class="ia-label">Das</label>
              <input class="ia-input" id="ia-h-inicio" type="time" value="${_iaConfig.horario_inicio || '08:00'}">
            </div>
            <div class="ia-field" style="margin-bottom:0">
              <label class="ia-label">Até</label>
              <input class="ia-input" id="ia-h-fim" type="time" value="${_iaConfig.horario_fim || '22:00'}">
            </div>
          </div>
          <div style="font-size:11px;color:#64748b;margin-top:6px">Fora deste horário a IA não responde nem envia notificações</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom row: Feed SSE + Quick actions -->
  <div class="ia-cols">

    <!-- Conversa com a IA -->
    <div class="ia-card">
      <div class="ia-card-head">
        <div class="ia-card-head-left">
          <div class="ia-card-head-icon" style="background:rgba(124,58,237,.15);color:#a78bfa">💬</div>
          <div>
            <div class="ia-card-title">Conversa com a IA</div>
            <div class="ia-card-sub">Histórico de mensagens via WhatsApp</div>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="ia-btn ia-btn-ghost" style="padding:5px 10px;font-size:11px" onclick="IAR.loadHistorico()">🔄</button>
          <button class="ia-btn ia-btn-ghost" style="padding:5px 10px;font-size:11px" onclick="IAR.limparHistorico()">🗑</button>
        </div>
      </div>
      <div class="ia-card-body" style="padding:12px">
        <div class="ia-feed-container" id="ia-chat-container">
          <div id="ia-feed" style="display:flex;flex-direction:column;gap:4px">
            <div class="ia-feed-empty">
              <div class="ia-feed-empty-icon">💬</div>
              Nenhuma conversa ainda
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Ações rápidas -->
    <div class="ia-card">
      <div class="ia-card-head">
        <div class="ia-card-head-left">
          <div class="ia-card-head-icon" style="background:rgba(245,158,11,.12);color:#fbbf24">⚡</div>
          <div>
            <div class="ia-card-title">Relatórios Rápidos</div>
            <div class="ia-card-sub">Envie relatórios agora para o WhatsApp</div>
          </div>
        </div>
      </div>
      <div class="ia-card-body">
        <div style="display:flex;flex-direction:column;gap:10px">
          <button class="ia-btn ia-btn-ghost" style="justify-content:flex-start;width:100%" onclick="IAR.sendRelatorio('hoje')">
            <span style="font-size:18px">📅</span>
            <div style="text-align:left">
              <div style="font-size:13px;font-weight:700;color:#f0f0fa">Resumo de hoje</div>
              <div style="font-size:11px;color:#64748b;font-weight:400">Vendas, faturamento e ticket médio</div>
            </div>
          </button>
          <button class="ia-btn ia-btn-ghost" style="justify-content:flex-start;width:100%" onclick="IAR.sendRelatorio('semana')">
            <span style="font-size:18px">📈</span>
            <div style="text-align:left">
              <div style="font-size:13px;font-weight:700;color:#f0f0fa">Resumo semanal</div>
              <div style="font-size:11px;color:#64748b;font-weight:400">Desempenho dos últimos 7 dias</div>
            </div>
          </button>
          <button class="ia-btn ia-btn-ghost" style="justify-content:flex-start;width:100%" onclick="IAR.sendRelatorio('mes')">
            <span style="font-size:18px">🗓️</span>
            <div style="text-align:left">
              <div style="font-size:13px;font-weight:700;color:#f0f0fa">Resumo do mês</div>
              <div style="font-size:11px;color:#64748b;font-weight:400">Faturamento mensal e novos clientes</div>
            </div>
          </button>
          <button class="ia-btn ia-btn-ghost" style="justify-content:flex-start;width:100%" onclick="IAR.sendRelatorio('estoque')">
            <span style="font-size:18px">📦</span>
            <div style="text-align:left">
              <div style="font-size:13px;font-weight:700;color:#f0f0fa">Alertas de estoque</div>
              <div style="font-size:11px;color:#64748b;font-weight:400">Itens com estoque crítico</div>
            </div>
          </button>
        </div>

        <div style="margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,.06)">
          <div class="ia-info-box">
            <strong>💬 Converse com a IA:</strong> salve seu número e envie uma mensagem. A IA acessa seus dados em tempo real e pode até alterar estoque.
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Log de ações da IA -->
  <div class="ia-card" style="margin-top:0">
    <div class="ia-card-head">
      <div class="ia-card-head-left">
        <div class="ia-card-head-icon" style="background:rgba(16,185,129,.12);color:#34d399">📋</div>
        <div>
          <div class="ia-card-title">Log de Ações da IA</div>
          <div class="ia-card-sub">Notificações enviadas, relatórios, alterações de estoque</div>
        </div>
      </div>
      <button class="ia-btn ia-btn-ghost" style="padding:5px 10px;font-size:11px" onclick="IAR.loadLogAcoes()">🔄 Atualizar</button>
    </div>
    <div class="ia-card-body" style="padding:8px">
      <div id="ia-log-acoes" style="max-height:220px;overflow-y:auto">
        <div class="ia-feed-empty" style="padding:24px">
          <div class="ia-feed-empty-icon">📋</div>
          Nenhuma ação registrada ainda
        </div>
      </div>
    </div>
  </div>

</div>`;

  // checkPollingStatus function
  IAR.checkPollingStatus = async function() {
    const dot   = document.getElementById('ia-poll-dot');
    const label = document.getElementById('ia-poll-label');
    if (!dot) return;
    try {
      const d = await apiGet('/api/ia/polling-status');
      if (!d.campos.evo_url || !d.campos.evo_key || !d.campos.evo_instance) {
        dot.style.background = '#f59e0b';
        label.style.color = '#fbbf24';
        label.textContent = '⚠️ Preencha URL, API Key e Instância acima e salve';
      } else if (!d.campos.numero) {
        dot.style.background = '#f59e0b';
        label.style.color = '#fbbf24';
        label.textContent = '⚠️ Cadastre o número WhatsApp acima e salve';
      } else if (!d.campos.ia_enabled) {
        dot.style.background = '#64748b';
        label.style.color = '#64748b';
        label.textContent = '⏸ IA desativada — ligue o toggle para começar';
      } else if (d.errors > 5) {
        dot.style.background = '#ef4444';
        label.style.color = '#f87171';
        label.textContent = '❌ Erro ao conectar na Evolution API — verifique URL e Key';
      } else {
        dot.style.background = '#10b981';
        dot.style.boxShadow = '0 0 8px #10b981';
        label.style.color = '#34d399';
        label.textContent = '✅ Webhook registrado — IA ativa e respondendo mensagens';
      }
    } catch(e) {
      label.textContent = 'Erro ao verificar status';
    }
  };

  // sendRelatorio function
  IAR.sendRelatorio = async function(tipo) {
    const num = _iaConfig.numero;
    if (!num) { toast('Cadastre e salve um número primeiro.', 'error'); return; }
    if (!_iaResumo) { toast('Dados ainda carregando, tente novamente.', 'info'); return; }
    const r = _iaResumo;
    const fmtMoeda = v => 'R$ ' + Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2});
    const hoje = new Date().toLocaleDateString('pt-BR');

    let msg = '';
    if (tipo === 'hoje') {
      msg = `📊 *Resumo de Hoje — ${hoje}*\n\n💰 Faturamento: ${fmtMoeda(r.vendas_hoje?.total)}\n🛍️ Vendas: ${r.vendas_hoje?.qtd || 0}\n🎯 Ticket Médio: ${fmtMoeda(r.ticket_medio)}\n\n_ModaFlow IA_ 🤖`;
    } else if (tipo === 'semana') {
      msg = `📈 *Resumo Semanal*\n\n💰 Faturamento: ${fmtMoeda(r.vendas_semana?.total)}\n🛍️ Vendas: ${r.vendas_semana?.qtd || 0}\n\n_ModaFlow IA_ 🤖`;
    } else if (tipo === 'mes') {
      msg = `🗓️ *Resumo do Mês*\n\n💰 Faturamento: ${fmtMoeda(r.vendas_mes?.total)}\n🛍️ Vendas: ${r.vendas_mes?.qtd || 0}\n👤 Novos Clientes: ${r.clientes_mes || 0}\n\n_ModaFlow IA_ 🤖`;
    } else if (tipo === 'estoque') {
      msg = `📦 *Alerta de Estoque*\n\n⚠️ Itens com estoque crítico (≤3): *${r.estoque_baixo || 0} itens*\n\nAcesse o sistema para conferir os produtos.\n\n_ModaFlow IA_ 🤖`;
    }

    try {
      toast('Enviando relatório...', 'info');
      await apiPost('/api/ia/send-whatsapp', { numero: num, mensagem: msg });
      toast('Relatório enviado com sucesso! ✅', 'success');
      // Emit local SSE event for feed
      IAR.onSSEEvent({ type:'relatorio', data:{ mensagem: `Relatório "${tipo}" enviado para ${num}` }, ts: Date.now() });
    } catch(e) {
      toast('Erro ao enviar: ' + e.message, 'error');
    }
  };

  IAR.updateStatus();
  setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
}

// ── HISTÓRICO DE CONVERSA ──────────────────────────────
IAR.loadHistorico = async function() {
  try {
    const msgs = await apiGet('/api/ia/historico');
    const feed = document.getElementById('ia-feed');
    if (!feed) return;

    if (!msgs.length) {
      feed.innerHTML = '<div class="ia-feed-empty"><div class="ia-feed-empty-icon">💬</div>Nenhuma conversa ainda</div>';
      return;
    }

    feed.innerHTML = msgs.map(m => {
      const hora   = new Date(m.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      const isUser = m.role === 'user';
      const txt    = String(m.content).replace(/</g,'&lt;').replace(/\n/g,'<br>');
      return `<div style="display:flex;flex-direction:column;align-items:${isUser?'flex-end':'flex-start'};margin-bottom:6px">
        <div style="font-size:10px;color:#64748b;margin-bottom:3px;padding:0 4px">${isUser?'Você':'🤖 IA'}</div>
        <div style="padding:10px 14px;border-radius:${isUser?'14px 14px 4px 14px':'14px 14px 14px 4px'};max-width:85%;font-size:12px;line-height:1.6;word-break:break-word;
          background:${isUser?'linear-gradient(135deg,rgba(124,58,237,.25),rgba(79,70,229,.15))':'rgba(255,255,255,.06)'};
          color:${isUser?'#e2d9ff':'#cbd5e1'}">${txt}</div>
        <div style="font-size:10px;color:#475569;margin-top:3px;padding:0 4px">${hora}</div>
      </div>`;
    }).join('');

    const container = document.getElementById('ia-chat-container');
    if (container) container.scrollTop = container.scrollHeight;
  } catch(e) {}
};

IAR.loadLogAcoes = async function() {
  const el = document.getElementById('ia-log-acoes');
  if (!el) return;
  try {
    const logs = await apiGet('/api/ia/log-acoes');
    if (!logs.length) {
      el.innerHTML = '<div class="ia-feed-empty" style="padding:24px"><div class="ia-feed-empty-icon">📋</div>Nenhuma ação ainda</div>';
      return;
    }
    const cores = {
      notificacao: { bg:'rgba(16,185,129,.15)', color:'#34d399', label:'Notificação' },
      relatorio:   { bg:'rgba(99,102,241,.15)',  color:'#818cf8', label:'Relatório' },
      boas_vindas: { bg:'rgba(245,158,11,.15)',  color:'#fbbf24', label:'Boas-vindas' },
      acao_ia:     { bg:'rgba(239,68,68,.15)',   color:'#f87171', label:'Ação' },
    };
    el.innerHTML = logs.map(l => {
      const c    = cores[l.tipo] || { bg:'rgba(255,255,255,.08)', color:'#94a3b8', label: l.tipo };
      const hora = new Date(l.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
      return `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.04)">
        <span style="background:${c.bg};color:${c.color};font-size:9px;font-weight:700;padding:2px 8px;border-radius:99px;white-space:nowrap;margin-top:2px">${c.label}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;color:#cbd5e1">${l.descricao}</div>
        </div>
        <div style="font-size:10px;color:#475569;white-space:nowrap">${hora}</div>
      </div>`;
    }).join('');
  } catch(e) { el.innerHTML = '<div style="padding:16px;color:#f87171;font-size:12px">Erro ao carregar</div>'; }
};

IAR.limparHistorico = async function() {
  if (!confirm('Limpar todo o histórico de conversa com a IA?')) return;
  try {
    await fetch('/api/ia/historico', { method:'DELETE', headers: iaHeader() });
    document.getElementById('ia-feed').innerHTML = '<div class="ia-feed-empty"><div class="ia-feed-empty-icon">📭</div>Histórico limpo</div>';
    toast('Histórico apagado', 'info');
  } catch(e) { toast('Erro: '+e.message,'error'); }
};
