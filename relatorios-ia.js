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
      if (btn) { btn.disabled = false; btn.innerHTML = 'Enviar Teste'; }
    }
  },

  renderKPIs() {
    if (!_iaResumo) return '<div class="ia-kpi-empty">Carregando dados...</div>';
    const r = _iaResumo;
    return `
      <div class="ia-kpi-grid">
        <div class="ia-kpi">
          <div class="ia-kpi-stripe" style="background:var(--ia-green)"></div>
          <div class="ia-kpi-label" style="margin-bottom:6px;margin-top:4px">Faturamento Hoje</div>
          <div class="ia-kpi-val" style="color:var(--ia-green)">${IAR.fmt(r.vendas_hoje?.total)}</div>
          <div class="ia-kpi-sub">${IAR.fmtN(r.vendas_hoje?.qtd)} vendas</div>
        </div>
        <div class="ia-kpi">
          <div class="ia-kpi-stripe" style="background:var(--ia-blue)"></div>
          <div class="ia-kpi-label" style="margin-bottom:6px;margin-top:4px">Faturamento do Mês</div>
          <div class="ia-kpi-val" style="color:var(--ia-blue)">${IAR.fmt(r.vendas_mes?.total)}</div>
          <div class="ia-kpi-sub">${IAR.fmtN(r.vendas_mes?.qtd)} vendas</div>
        </div>
        <div class="ia-kpi">
          <div class="ia-kpi-stripe" style="background:var(--ia-accent)"></div>
          <div class="ia-kpi-label" style="margin-bottom:6px;margin-top:4px">Ticket Médio</div>
          <div class="ia-kpi-val" style="color:var(--ia-accent)">${IAR.fmt(r.ticket_medio)}</div>
          <div class="ia-kpi-sub">média por venda hoje</div>
        </div>
        <div class="ia-kpi">
          <div class="ia-kpi-stripe" style="background:${r.estoque_baixo > 0 ? 'var(--ia-amber)' : 'var(--ia-green)'}"></div>
          <div class="ia-kpi-label" style="margin-bottom:6px;margin-top:4px">Estoque Crítico</div>
          <div class="ia-kpi-val" style="color:${r.estoque_baixo > 0 ? 'var(--ia-amber)' : 'var(--ia-green)'}">${IAR.fmtN(r.estoque_baixo)}</div>
          <div class="ia-kpi-sub">itens com ≤ 3 unidades</div>
        </div>
        <div class="ia-kpi">
          <div class="ia-kpi-stripe" style="background:var(--ia-teal)"></div>
          <div class="ia-kpi-label" style="margin-bottom:6px;margin-top:4px">Novos Clientes</div>
          <div class="ia-kpi-val" style="color:var(--ia-teal)">${IAR.fmtN(r.clientes_mes)}</div>
          <div class="ia-kpi-sub">neste mês</div>
        </div>
        <div class="ia-kpi">
          <div class="ia-kpi-stripe" style="background:#ff7eb3"></div>
          <div class="ia-kpi-label" style="margin-bottom:6px;margin-top:4px">Faturamento Semana</div>
          <div class="ia-kpi-val" style="color:#ff7eb3">${IAR.fmt(r.vendas_semana?.total)}</div>
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
/* ── IA REPORTS PAGE — HIGH CONTRAST REDESIGN ── */
:root {
  --ia-bg:       #0d0d1a;
  --ia-s1:       #13132a;
  --ia-s2:       #1a1a35;
  --ia-s3:       #22224a;
  --ia-border:   rgba(255,255,255,.1);
  --ia-border2:  rgba(255,255,255,.16);
  --ia-text:     #f0f0ff;
  --ia-text2:    #b8b8d8;
  --ia-text3:    #7878a8;
  --ia-accent:   #6d5fff;
  --ia-green:    #00d68f;
  --ia-blue:     #4da6ff;
  --ia-amber:    #ffb830;
  --ia-red:      #ff5e7a;
  --ia-teal:     #00c9c9;
}

.ia-page { max-width: 1140px; margin: 0 auto; padding: 4px 0 48px; }

/* ── Hero ── */
.ia-hero {
  background: linear-gradient(135deg, #10103a 0%, #1a1060 60%, #10103a 100%);
  border: 1px solid rgba(109,95,255,.25);
  border-radius: 18px;
  padding: 28px 32px;
  margin-bottom: 24px;
  position: relative; overflow: hidden;
}
.ia-hero::before {
  content: '';
  position: absolute; top: -80px; right: -80px;
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(109,95,255,.18) 0%, transparent 70%);
  pointer-events: none;
}
.ia-hero-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.ia-hero-left { display: flex; align-items: center; gap: 16px; }
.ia-hero-orb {
  width: 52px; height: 52px;
  background: linear-gradient(135deg, var(--ia-accent), #4f46e5);
  border-radius: 15px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 28px rgba(109,95,255,.45);
  flex-shrink: 0;
}
.ia-hero-title { font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -.4px; }
.ia-hero-sub   { font-size: 13px; color: #9898cc; margin-top: 3px; }

.ia-status-pill {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 6px 14px; border-radius: 99px;
  font-size: 12px; font-weight: 700;
}
.ia-status-on  { background: rgba(0,214,143,.15); color: #00d68f; border: 1px solid rgba(0,214,143,.3); }
.ia-status-off { background: rgba(120,120,168,.12); color: #9898cc; border: 1px solid rgba(120,120,168,.2); }
.ia-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; animation: iaPulse 2s infinite; }
@keyframes iaPulse { 0%,100%{opacity:1} 50%{opacity:.4} }

/* ── KPI Grid ── */
.ia-kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; margin-bottom: 24px; }
.ia-kpi {
  background: var(--ia-s1);
  border: 1px solid var(--ia-border2);
  border-radius: 14px; padding: 18px 16px;
  transition: transform .2s, border-color .2s;
  position: relative; overflow: hidden;
}
.ia-kpi:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.22); }
.ia-kpi-val   { font-size: 19px; font-weight: 800; color: #fff; letter-spacing: -.5px; margin-bottom: 5px; }
.ia-kpi-label { font-size: 11px; color: var(--ia-text3); font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
.ia-kpi-sub   { font-size: 11px; color: var(--ia-text3); margin-top: 3px; }
.ia-kpi-icon  { font-size: 20px; margin-bottom: 10px; }
.ia-kpi-stripe { position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 14px 14px 0 0; }

/* ── Two-col grid ── */
.ia-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px; }
@media(max-width: 760px) { .ia-cols { grid-template-columns: 1fr; } }

/* ── Cards ── */
.ia-card {
  background: var(--ia-s1);
  border: 1px solid var(--ia-border);
  border-radius: 16px; overflow: hidden;
  margin-bottom: 18px;
}
.ia-card-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--ia-border);
  background: rgba(255,255,255,.02);
}
.ia-card-head-left { display: flex; align-items: center; gap: 10px; }
.ia-card-head-icon {
  width: 34px; height: 34px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
}
.ia-card-title { font-size: 13px; font-weight: 700; color: var(--ia-text); }
.ia-card-sub   { font-size: 11px; color: var(--ia-text3); margin-top: 2px; }
.ia-card-body  { padding: 20px; }

/* ── Form ── */
.ia-field { margin-bottom: 16px; }
.ia-label {
  display: block; font-size: 11px; font-weight: 700;
  color: var(--ia-text2); text-transform: uppercase;
  letter-spacing: .7px; margin-bottom: 7px;
}
.ia-input {
  width: 100%;
  background: var(--ia-s2);
  border: 1px solid var(--ia-border2);
  border-radius: 9px;
  padding: 11px 14px;
  color: var(--ia-text); font-family: inherit; font-size: 14px;
  outline: none; transition: all .2s;
}
.ia-input:focus { border-color: var(--ia-accent); background: rgba(109,95,255,.07); box-shadow: 0 0 0 3px rgba(109,95,255,.15); }
.ia-input::placeholder { color: var(--ia-text3); }
.ia-select {
  width: 100%;
  background: var(--ia-s2);
  border: 1px solid var(--ia-border2);
  border-radius: 9px; padding: 11px 14px;
  color: var(--ia-text); font-family: inherit; font-size: 14px;
  outline: none; cursor: pointer; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237878a8' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px;
}
.ia-select option { background: #1a1a35; }

/* ── Master Toggle ── */
.ia-master-toggle {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(109,95,255,.08);
  border: 1px solid rgba(109,95,255,.2);
  border-radius: 12px; padding: 14px 18px; margin-bottom: 18px;
}
.ia-master-toggle-left { display: flex; align-items: center; gap: 12px; }
.ia-master-icon {
  width: 40px; height: 40px; border-radius: 11px;
  background: rgba(109,95,255,.18);
  display: flex; align-items: center; justify-content: center; font-size: 18px;
}
.ia-master-title { font-size: 14px; font-weight: 700; color: var(--ia-text); }
.ia-master-desc  { font-size: 11px; color: var(--ia-text3); margin-top: 2px; }

/* ── Switches ── */
.ia-switch-lg { position: relative; width: 52px; height: 28px; }
.ia-switch-lg input { opacity: 0; width: 0; height: 0; }
.ia-switch-lg-track {
  position: absolute; inset: 0; border-radius: 99px; cursor: pointer;
  background: var(--ia-s3); transition: background .25s;
}
.ia-switch-lg input:checked + .ia-switch-lg-track { background: var(--ia-accent); box-shadow: 0 0 14px rgba(109,95,255,.4); }
.ia-switch-lg-track::after {
  content: ''; position: absolute;
  width: 20px; height: 20px; background: #fff; border-radius: 50%;
  top: 4px; left: 4px; transition: transform .25s;
  box-shadow: 0 2px 6px rgba(0,0,0,.3);
}
.ia-switch-lg input:checked + .ia-switch-lg-track::after { transform: translateX(24px); }

.ia-switch { position: relative; width: 42px; height: 23px; }
.ia-switch input { opacity: 0; width: 0; height: 0; }
.ia-switch-track {
  position: absolute; inset: 0; border-radius: 99px; cursor: pointer;
  background: var(--ia-s3); transition: background .25s;
}
.ia-switch input:checked + .ia-switch-track { background: var(--ia-accent); }
.ia-switch-track::after {
  content: ''; position: absolute;
  width: 17px; height: 17px; background: #fff; border-radius: 50%;
  top: 3px; left: 3px; transition: transform .25s; box-shadow: 0 2px 4px rgba(0,0,0,.3);
}
.ia-switch input:checked + .ia-switch-track::after { transform: translateX(19px); }

/* ── Toggle rows ── */
.ia-toggle-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 11px 0; border-bottom: 1px solid rgba(255,255,255,.05);
}
.ia-toggle-row:last-child { border-bottom: none; }
.ia-toggle-info { display: flex; align-items: center; gap: 10px; }
.ia-toggle-icon {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ia-toggle-name { font-size: 13px; font-weight: 600; color: var(--ia-text); }
.ia-toggle-desc { font-size: 11px; color: var(--ia-text3); margin-top: 2px; }

/* ── Numero display ── */
.ia-numero-display {
  background: var(--ia-s2);
  border: 1px solid var(--ia-border2);
  border-radius: 11px; padding: 13px 16px;
  display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
}
.ia-numero-label { font-size: 10px; color: var(--ia-text3); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
.ia-numero-val   { font-size: 15px; font-weight: 700; color: var(--ia-text); }
.ia-numero-val.empty { color: var(--ia-text3); font-size: 13px; font-style: italic; font-weight: 400; }

/* ── Buttons ── */
.ia-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 18px; border: none; border-radius: 9px;
  font-family: inherit; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all .18s;
}
.ia-btn-primary {
  background: var(--ia-accent); color: #fff;
  box-shadow: 0 4px 16px rgba(109,95,255,.35);
}
.ia-btn-primary:hover { background: #7c6fff; box-shadow: 0 6px 22px rgba(109,95,255,.5); transform: translateY(-1px); }
.ia-btn-ghost {
  background: var(--ia-s2); color: var(--ia-text2);
  border: 1px solid var(--ia-border2);
}
.ia-btn-ghost:hover { background: var(--ia-s3); color: var(--ia-text); border-color: rgba(255,255,255,.22); }
.ia-btn:disabled { opacity: .45; cursor: not-allowed; transform: none !important; }
.ia-btn-row { display: flex; gap: 9px; flex-wrap: wrap; margin-top: 4px; }

/* ── Status polling ── */
#ia-polling-status {
  display: flex; align-items: center; gap: 8px;
  margin: 14px 0; padding: 11px 15px;
  border-radius: 10px;
  background: var(--ia-s2);
  border: 1px solid var(--ia-border2);
}

/* ── Feed / Chat ── */
.ia-feed-container {
  max-height: 340px; overflow-y: auto;
  padding: 4px;
}
.ia-feed-container::-webkit-scrollbar { width: 3px; }
.ia-feed-container::-webkit-scrollbar-thumb { background: var(--ia-s3); border-radius: 99px; }

.ia-feed-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  margin-bottom: 5px;
  background: var(--ia-s2);
  border: 1px solid var(--ia-border);
}
.ia-feed-icon {
  width: 34px; height: 34px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; flex-shrink: 0;
}
.ia-feed-body  { flex: 1; min-width: 0; }
.ia-feed-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; }
.ia-feed-msg   { font-size: 12px; color: var(--ia-text2); margin-top: 3px; line-height: 1.45; }
.ia-feed-time  { font-size: 10px; color: var(--ia-text3); white-space: nowrap; flex-shrink: 0; margin-top: 2px; }
.ia-feed-empty { text-align: center; padding: 36px 20px; color: var(--ia-text3); font-size: 13px; }
.ia-feed-empty-icon { font-size: 32px; margin-bottom: 10px; opacity: .35; }

/* ── Quick action buttons ── */
.ia-quick-btn {
  display: flex; align-items: center; gap: 12px;
  width: 100%; padding: 12px 14px;
  background: var(--ia-s2); border: 1px solid var(--ia-border2);
  border-radius: 11px; cursor: pointer; transition: all .18s;
  text-align: left;
}
.ia-quick-btn:hover { background: var(--ia-s3); border-color: rgba(255,255,255,.2); transform: translateX(2px); }
.ia-quick-icon {
  width: 38px; height: 38px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.ia-quick-title { font-size: 13px; font-weight: 700; color: var(--ia-text); }
.ia-quick-sub   { font-size: 11px; color: var(--ia-text3); margin-top: 2px; }

/* ── Info box ── */
.ia-info-box {
  background: rgba(77,166,255,.08);
  border: 1px solid rgba(77,166,255,.2);
  border-radius: 10px; padding: 12px 14px;
  font-size: 12px; color: #90c8ff; line-height: 1.6;
}
.ia-info-box strong { color: #bddeff; }

/* ── Rows ── */
.ia-row   { display: flex; gap: 12px; }
.ia-row > * { flex: 1; }
@media(max-width: 560px) { .ia-row { flex-direction: column; } }

/* ── Badge ── */
.ia-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 99px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
}
.ia-badge-purple { background: rgba(109,95,255,.15); color: #b0a5ff; border: 1px solid rgba(109,95,255,.25); }

/* ── Spinner ── */
.ia-spinner {
  display: inline-block; width: 12px; height: 12px;
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
        <div class="ia-hero-orb"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" width="26" height="26"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 11V7"/><circle cx="12" cy="5" r="2"/><path d="M8 15h.01M16 15h.01"/></svg></div>
        <div>
          <div class="ia-hero-title">IA & Relatórios</div>
          <div class="ia-hero-sub">Assistente inteligente conectado à sua loja via WhatsApp</div>
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
          <div class="ia-card-head-icon" style="background:rgba(0,214,143,.12)"><svg viewBox="0 0 24 24" fill="none" stroke="#00d68f" stroke-width="2" width="17" height="17"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg></div>
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
            <div class="ia-master-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#b0a5ff" stroke-width="2" width="20" height="20"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
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
          <div style="width:36px;height:36px;border-radius:9px;background:rgba(0,214,143,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg viewBox="0 0 24 24" fill="none" stroke="#00d68f" stroke-width="2" width="18" height="18"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg></div>
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
          <strong>Número exclusivo:</strong> apenas este número poderá conversar com a IA e receber notificações. Outros números serão ignorados automaticamente.
        </div>

        <!-- Status da conexão (apenas leitura para o cliente) -->
        <div id="ia-polling-status" style="display:flex;align-items:center;gap:8px;margin:16px 0;padding:12px 16px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)">
          <div id="ia-poll-dot" style="width:8px;height:8px;border-radius:50%;background:#64748b;flex-shrink:0"></div>
          <span id="ia-poll-label" style="font-size:12px;color:#64748b">Verificando conexão...</span>
        </div>

        <div class="ia-btn-row">
          <button class="ia-btn ia-btn-primary" id="ia-save-btn" onclick="IAR.save()">
            Salvar configuração
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
          <div class="ia-card-head-icon" style="background:rgba(109,95,255,.12)"><svg viewBox="0 0 24 24" fill="none" stroke="#b0a5ff" stroke-width="2" width="17" height="17"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
          <div>
            <div class="ia-card-title">Notificações</div>
            <div class="ia-card-sub">Escolha o que deseja receber via WhatsApp</div>
          </div>
        </div>
      </div>
      <div class="ia-card-body">
        <div class="ia-toggle-row">
          <div class="ia-toggle-info">
            <div class="ia-toggle-icon" style="background:rgba(0,214,143,.12)"><svg viewBox="0 0 24 24" fill="none" stroke="#00d68f" stroke-width="2" width="16" height="16"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
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
            <div class="ia-toggle-icon" style="background:rgba(255,184,48,.12)"><svg viewBox="0 0 24 24" fill="none" stroke="#ffb830" stroke-width="2" width="16" height="16"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
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
            <div class="ia-toggle-icon" style="background:rgba(77,166,255,.12)"><svg viewBox="0 0 24 24" fill="none" stroke="#4da6ff" stroke-width="2" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
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
            <div class="ia-toggle-icon" style="background:rgba(109,95,255,.12)"><svg viewBox="0 0 24 24" fill="none" stroke="#b0a5ff" stroke-width="2" width="16" height="16"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
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
          <div class="ia-card-head-icon" style="background:rgba(109,95,255,.15)"><svg viewBox="0 0 24 24" fill="none" stroke="#b0a5ff" stroke-width="2" width="17" height="17"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
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
          <button class="ia-quick-btn" onclick="IAR.sendRelatorio('hoje')">
            <div class="ia-quick-icon" style="background:rgba(0,214,143,.12)"><svg viewBox="0 0 24 24" fill="none" stroke="#00d68f" stroke-width="2" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
            <div><div class="ia-quick-title">Resumo de hoje</div><div class="ia-quick-sub">Vendas, faturamento e ticket médio</div></div>
          </button>
          <button class="ia-quick-btn" onclick="IAR.sendRelatorio('semana')">
            <div class="ia-quick-icon" style="background:rgba(77,166,255,.12)"><svg viewBox="0 0 24 24" fill="none" stroke="#4da6ff" stroke-width="2" width="18" height="18"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>
            <div><div class="ia-quick-title">Resumo semanal</div><div class="ia-quick-sub">Desempenho dos últimos 7 dias</div></div>
          </button>
          <button class="ia-quick-btn" onclick="IAR.sendRelatorio('mes')">
            <div class="ia-quick-icon" style="background:rgba(109,95,255,.12)"><svg viewBox="0 0 24 24" fill="none" stroke="#b0a5ff" stroke-width="2" width="18" height="18"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
            <div><div class="ia-quick-title">Resumo do mês</div><div class="ia-quick-sub">Faturamento mensal e novos clientes</div></div>
          </button>
          <button class="ia-quick-btn" onclick="IAR.sendRelatorio('estoque')">
            <div class="ia-quick-icon" style="background:rgba(255,184,48,.12)"><svg viewBox="0 0 24 24" fill="none" stroke="#ffb830" stroke-width="2" width="18" height="18"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
            <div><div class="ia-quick-title">Alertas de estoque</div><div class="ia-quick-sub">Itens com estoque crítico</div></div>
          </button>
        </div>

        <div style="margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,.06)">
          <div class="ia-info-box">
            <strong>Converse com a IA:</strong> salve seu número e envie uma mensagem. A IA acessa seus dados em tempo real e pode até alterar estoque.
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Log de ações da IA -->
  <div class="ia-card" style="margin-top:0">
    <div class="ia-card-head">
      <div class="ia-card-head-left">
        <div class="ia-card-head-icon" style="background:rgba(0,214,143,.12)"><svg viewBox="0 0 24 24" fill="none" stroke="#00d68f" stroke-width="2" width="17" height="17"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></div>
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
        label.textContent = 'Preencha URL, API Key e Instância e salve';
      } else if (!d.campos.numero) {
        dot.style.background = '#f59e0b';
        label.style.color = '#fbbf24';
        label.textContent = 'Cadastre o número WhatsApp e salve';
      } else if (!d.campos.ia_enabled) {
        dot.style.background = '#64748b';
        label.style.color = '#64748b';
        label.textContent = 'IA desativada — ative o toggle para começar';
      } else if (d.errors > 5) {
        dot.style.background = '#ef4444';
        label.style.color = '#f87171';
        label.textContent = 'Erro ao conectar na Evolution API — verifique URL e chave';
      } else {
        dot.style.background = '#10b981';
        dot.style.boxShadow = '0 0 8px #10b981';
        label.style.color = '#34d399';
        label.textContent = 'Conectado — IA ativa e respondendo mensagens';
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
