// ===== DASHBOARD PREMIUM v2.0 =====
let dashPeriod  = 'hoje';
let dashPrivacy = false;

// ─── Date helpers ────────────────────────────────────────────────────────────
function getDashDateRange(period) {
  const now  = new Date();
  const today = now.toISOString().split('T')[0];
  let ini, fim = today;
  if (period === 'hoje')   { ini = today; }
  else if (period === 'ontem') {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    ini = fim = y.toISOString().split('T')[0];
  } else if (period === 'semana') {
    const s = new Date(now); s.setDate(s.getDate() - 6);
    ini = s.toISOString().split('T')[0];
  } else {
    const ano = now.getFullYear(), mes = now.getMonth() + 1;
    ini = `${ano}-${String(mes).padStart(2,'0')}-01`;
  }
  return { ini, fim };
}

function prvVal(val) {
  return dashPrivacy
    ? `<span style="filter:blur(8px);user-select:none">${val}</span>`
    : val;
}

// ─── SVG Utilities ───────────────────────────────────────────────────────────
function ringChart(pct, color, bg = '#e8edf3', size = 88, stroke = 11) {
  const r      = (size / 2) - stroke;
  const circ   = 2 * Math.PI * r;
  const safe   = Math.min(100, Math.max(0, pct));
  const dash   = circ * (safe / 100);
  const cx     = size / 2, cy = size / 2;
  const id     = 'ring-' + Math.random().toString(36).slice(2);
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${bg}" stroke-width="${stroke}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
        stroke-dasharray="0 ${circ.toFixed(2)}" stroke-linecap="round"
        transform="rotate(-90 ${cx} ${cy})" id="${id}">
        <animate attributeName="stroke-dasharray"
          from="0 ${circ.toFixed(2)}"
          to="${dash.toFixed(2)} ${circ.toFixed(2)}"
          dur="1.1s" begin="0.15s" fill="freeze" calcMode="spline"
          keyTimes="0;1" keySplines="0.25 0.1 0.25 1"/>
      </circle>
    </svg>`;
}

function sparkline(values, color = '#2563eb', h = 40, w = 100) {
  if (!values || values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values) || 1;
  const range = max - min || 1;
  const pad = 2;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = pad + ((max - v) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyPts = pts.join(' ');
  // Area fill path
  const areaPath = `M${pts[0]} ${pts.slice(1).map(p => 'L' + p).join(' ')} L${pts[pts.length-1].split(',')[0]},${h} L${pts[0].split(',')[0]},${h} Z`;
  const gradId = 'sg-' + Math.random().toString(36).slice(2);
  return `
    <svg viewBox="0 0 ${w} ${h}" style="overflow:visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#${gradId})"/>
      <polyline points="${polyPts}" fill="none" stroke="${color}" stroke-width="1.8"
        stroke-linecap="round" stroke-linejoin="round"
        style="stroke-dasharray:300;stroke-dashoffset:300;animation:drawLine 1.2s ease forwards 0.2s"/>
    </svg>`;
}

function hBar(pct, color) {
  return `
    <div style="height:6px;background:#e8edf3;border-radius:99px;overflow:hidden;margin-top:5px">
      <div style="height:100%;border-radius:99px;background:${color};width:0;transition:width 1s cubic-bezier(.25,.1,.25,1)"
           data-bar-width="${pct.toFixed(1)}%"></div>
    </div>`;
}

// ─── Main render ─────────────────────────────────────────────────────────────
async function renderDashboard() {
  const el = document.getElementById('content');
  el.innerHTML = `
    <div id="dash-root" style="animation:fadeUp .35s ease both">
      ${skeletonLoader()}
    </div>`;
  setTimeout(() => lucide.createIcons(), 10);
  await buildDashboard();
}

function skeletonLoader() {
  return `
    <div class="dash-kpi-grid">
      ${Array(4).fill('<div class="sk" style="height:108px;border-radius:14px"></div>').join('')}
    </div>
    <div class="dash-main-grid">
      <div class="sk" style="height:240px;border-radius:14px"></div>
      <div class="sk" style="height:240px;border-radius:14px"></div>
    </div>`;
}

async function buildDashboard() {
  const { ini, fim } = getDashDateRange(dashPeriod);
  const now    = new Date();
  const mesIni = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;

  // Parallel fetches
  const [
    vendasRes, todosClientesRes, contasPagRes,
    credSaldoRes, contasRecRes,
    metaRes, agendaRes, changelogRes, configRes,
    produtosEstoqueRes
  ] = await Promise.all([
    sb.from('vendas').select('id,total,vendedor_id,cliente_id,created_at,vendedores(nome)')
      .gte('created_at', ini).lte('created_at', fim + 'T23:59:59').eq('status','concluida'),
    sb.from('clientes').select('id,nome,celular,data_nascimento,created_at').eq('ativo',true),
    sb.from('contas_pagar').select('valor,fornecedor_id').eq('status','aberta'),
    sb.from('crediario').select('saldo_devedor').neq('status','quitado'),
    sb.from('contas_receber').select('valor,status').eq('status','aberta'),
    sb.from('metas_vendas').select('valor_meta').eq('tipo','loja')
      .eq('mes', now.getMonth()+1).eq('ano', now.getFullYear()).limit(1),
    sb.from('agenda_tarefas').select('*').gte('data_tarefa', now.toISOString().split('T')[0])
      .eq('concluida',false).order('data_tarefa').limit(6),
    sb.from('changelog').select('*').order('data_lancamento',{ascending:false}).limit(5),
    sb.from('configuracoes').select('chave,valor'),
    sb.from('produto_grades').select('estoque,produto_id').lte('estoque',3)
  ]);

  const vendas        = vendasRes.data || [];
  const clientes      = todosClientesRes.data || [];
  const contasPag     = contasPagRes.data || [];
  const credSaldo     = credSaldoRes.data || [];
  const contasRec     = contasRecRes.data || [];
  const agenda        = agendaRes.data || [];
  const changelog     = changelogRes.data || [];
  const configs       = {};
  (configRes.data || []).forEach(c => configs[c.chave] = c.valor);
  const lowStock      = (produtosEstoqueRes.data || []).length;

  // KPI calculations
  const totalVendas   = vendas.reduce((a,v) => a + parseFloat(v.total||0), 0);
  const qtyVendas     = vendas.length;
  const ticketMedio   = qtyVendas > 0 ? totalVendas / qtyVendas : 0;
  const meta          = metaRes.data?.[0]?.valor_meta || 0;
  const metaPct       = meta > 0 ? Math.min(999, (totalVendas/meta)*100) : 0;
  const metaColor     = metaPct >= 100 ? '#16a34a' : metaPct >= 70 ? '#d97706' : '#2563eb';
  const totalCredSaldo= (credSaldo||[]).reduce((a,c) => a + parseFloat(c.saldo_devedor||0), 0);
  const totalContasRec= (contasRec||[]).reduce((a,c) => a + parseFloat(c.valor||0), 0);
  const totalReceber  = totalContasRec + totalCredSaldo;
  const totalPagar    = contasPag.reduce((a,c) => a + parseFloat(c.valor||0), 0);

  // Birthday
  const aniv = clientes.filter(c => {
    if (!c.data_nascimento) return false;
    const d = new Date(c.data_nascimento + 'T00:00:00');
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
  });

  // Clientes stats
  const novosClientes    = clientes.filter(c => c.created_at && c.created_at >= mesIni).length;
  const totalClientes    = clientes.length;
  const antigosClientes  = totalClientes - novosClientes;
  const novosPct         = totalClientes > 0 ? Math.round((novosClientes/totalClientes)*100) : 0;

  // Vendas por vendedor
  const vendedorMap = {};
  vendas.forEach(v => {
    if (v.vendedor_id) {
      const n = v.vendedores?.nome || 'Vendedor';
      vendedorMap[n] = (vendedorMap[n]||0) + parseFloat(v.total||0);
    }
  });
  const topVendedores = Object.entries(vendedorMap).sort((a,b) => b[1]-a[1]).slice(0,6);
  const maxVend = topVendedores[0]?.[1] || 1;

  // Top clientes
  const clienteMap = {};
  vendas.forEach(v => {
    if (v.cliente_id) clienteMap[v.cliente_id] = (clienteMap[v.cliente_id]||0) + parseFloat(v.total||0);
  });
  const topClientes = Object.entries(clienteMap).sort((a,b) => b[1]-a[1]).slice(0,5)
    .map(([id,total]) => ({ nome: clientes.find(c=>c.id===id)?.nome||'Cliente', total }));

  // Sparkline: vendas por dia dos últimos 7 dias (ou período)
  const days = 7;
  const dayLabels = [], daySales = [];
  for (let i = days-1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    dayLabels.push(d.getDate());
    daySales.push(vendas.filter(v => v.created_at?.startsWith(ds)).reduce((a,v)=>a+parseFloat(v.total||0),0));
  }

  // Privacy toggle button
  const pvBtn = `
    <button onclick="dashPrivacy=!dashPrivacy;buildDashboard()"
      style="background:none;border:none;cursor:pointer;color:var(--text-3);display:flex;padding:4px;border-radius:6px;transition:color .15s"
      title="${dashPrivacy?'Mostrar':'Ocultar'} valores">
      <i data-lucide="${dashPrivacy?'eye-off':'eye'}" style="width:14px;height:14px"></i>
    </button>`;

  const referralLink = configs['referral_link'] || '';

  // ─── BUILD HTML ──────────────────────────────────────────────────────────────
  const html = `
  <style>
    @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
    @keyframes drawLine { to { stroke-dashoffset: 0; } }
    @keyframes ringPop { 0%{transform:scale(.85);opacity:0} 100%{transform:scale(1);opacity:1} }
    @keyframes pulseGreen { 0%,100%{box-shadow:0 0 0 0 rgba(22,163,74,.4)} 50%{box-shadow:0 0 0 7px rgba(22,163,74,0)} }
    @keyframes tickerIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
    .dash-kpi-card { background:#fff;border:1px solid #e8edf3;border-radius:14px;padding:20px;box-shadow:0 1px 3px rgba(15,23,42,.06),0 4px 12px rgba(15,23,42,.03);transition:all .2s;position:relative;overflow:hidden;cursor:default; }
    .dash-kpi-card:hover { border-color:rgba(37,99,235,.18);box-shadow:0 4px 20px rgba(15,23,42,.09);transform:translateY(-2px); }
    .dash-kpi-card .kpi-icon { width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
    .dash-kpi-card .kpi-icon svg { width:22px;height:22px; }
    .dash-kpi-card .kpi-val { font-family:'Sora',sans-serif;font-size:24px;font-weight:700;color:#0f172a;letter-spacing:-.8px;line-height:1.1; }
    .dash-kpi-card .kpi-label { font-size:11.5px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px; }
    .dash-kpi-card .kpi-delta { display:inline-flex;align-items:center;gap:3px;font-size:11.5px;font-weight:600;margin-top:8px;padding:3px 8px;border-radius:99px; }
    .dash-kpi-card .sparkline-wrap { position:absolute;bottom:0;right:0;width:90px;height:48px;opacity:.55; }
    .dash-widget-card { background:#fff;border:1px solid #e8edf3;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.06),0 4px 12px rgba(15,23,42,.03); }
    .dwc-head { padding:15px 18px;border-bottom:1px solid #e8edf3;display:flex;align-items:center;justify-content:space-between; }
    .dwc-head h3 { font-family:'Sora',sans-serif;font-size:13px;font-weight:700;color:#0f172a;letter-spacing:-.2px; }
    .dwc-head .dwc-meta { font-size:11px;color:#94a3b8;font-weight:500; }
    .dwc-body { padding:16px 18px; }
    .period-bar { display:flex;gap:4px;background:#f8fafc;border:1px solid #e8edf3;border-radius:10px;padding:3px;margin-bottom:20px;width:fit-content; }
    .period-btn { padding:7px 16px;border-radius:7px;font-size:12.5px;font-weight:600;cursor:pointer;border:none;background:none;color:#64748b;transition:all .15s;font-family:inherit; }
    .period-btn.active { background:#fff;color:#0f172a;box-shadow:0 1px 4px rgba(15,23,42,.1); }
    .area-chart { width:100%;height:140px;overflow:visible; }
    .chart-x-labels { display:flex;justify-content:space-between;padding:0 2px;margin-top:4px; }
    .chart-x-label { font-size:10px;color:#94a3b8;font-weight:500; }
    .vbar-row { display:flex;align-items:center;gap:10px;margin-bottom:10px; }
    .vbar-name { font-size:12.5px;font-weight:600;color:#1e293b;width:100px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0; }
    .vbar-track { flex:1;height:8px;background:#e8edf3;border-radius:99px;overflow:hidden; }
    .vbar-fill { height:100%;border-radius:99px;width:0;transition:width 1.1s cubic-bezier(.25,.1,.25,1); }
    .vbar-val { font-size:12px;font-weight:700;color:#0f172a;width:90px;text-align:right;flex-shrink:0; }
    .rank-badge { width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0; }
    .aniv-item { display:flex;align-items:center;gap:10px;padding:10px 18px;border-bottom:1px solid #e8edf3;animation:tickerIn .3s ease both; }
    .agenda-item { display:flex;align-items:center;gap:10px;padding:10px 18px;border-bottom:1px solid #e8edf3;transition:background .15s; }
    .agenda-item:hover { background:#f8fafc; }
    .agenda-checkbox { width:18px;height:18px;border:1.5px solid #cbd5e1;border-radius:4px;background:#fff;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .15s; }
    .agenda-checkbox:hover { border-color:#2563eb;background:rgba(37,99,235,.05); }
    .fin-row { display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9; }
    .fin-row:last-child { border:none; }
    .fin-row-label { font-size:12px;color:#64748b;font-weight:500; }
    .fin-row-val { font-size:13px;font-weight:700; }
    .cat-row { display:flex;align-items:center;gap:10px;margin-bottom:12px; }
    .cat-dot { width:9px;height:9px;border-radius:50%;flex-shrink:0; }
    .cat-name { font-size:12.5px;color:#1e293b;font-weight:500;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    .cat-bar-wrap { width:90px;height:6px;background:#e8edf3;border-radius:99px;overflow:hidden;flex-shrink:0; }
    .cat-bar-fill { height:100%;border-radius:99px;width:0;transition:width 1s cubic-bezier(.25,.1,.25,1); }
    .cat-val { font-size:12px;font-weight:700;color:#0f172a;width:80px;text-align:right;flex-shrink:0; }
    .wap-btn-pill { display:inline-flex;align-items:center;gap:5px;padding:5px 11px;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:99px;font-size:11.5px;font-weight:600;text-decoration:none;flex-shrink:0;transition:all .15s; }
    .wap-btn-pill:hover { background:#dcfce7; }
    .donut-legend-dot { width:10px;height:10px;border-radius:50%;flex-shrink:0; }
    .changelog-chip { display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:99px;font-size:10.5px;font-weight:600; }
    .alert-low-stock { display:flex;align-items:center;gap:10px;padding:12px 18px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;margin-bottom:16px;font-size:13px;color:#92400e;font-weight:500; }
    .alert-low-stock i svg { width:16px;height:16px;color:#d97706; }
  </style>

  <!-- Period selector + privacy toggle -->
  <div class="dash-period-wrap">
    <div class="period-bar">
      ${[['ontem','Ontem'],['hoje','Hoje'],['semana','7 dias'],['mes','Mês']].map(([k,l])=>
        `<button class="period-btn${dashPeriod===k?' active':''}" onclick="dashPeriod='${k}';buildDashboard()">${l}</button>`
      ).join('')}
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      ${pvBtn}
      <span style="font-size:12px;color:#94a3b8;font-weight:500">${dashPrivacy?'Valores ocultos':'Valores visíveis'}</span>
    </div>
  </div>

  <!-- Low stock alert -->
  ${lowStock > 0 ? `
    <div class="alert-low-stock" style="cursor:pointer" onclick="navigate('gestao-estoque')">
      <i data-lucide="alert-triangle" style="width:18px;height:18px;color:#d97706;flex-shrink:0"></i>
      <span><strong>${lowStock} variante${lowStock>1?'s':''}</strong> com estoque baixo (≤3 unidades) — <u style="cursor:pointer">ver estoque</u></span>
    </div>` : ''}

  <!-- ═══════════════ KPI ROW ═══════════════ -->
  <div class="dash-kpi-grid">

    <!-- Total Vendas -->
    <div class="dash-kpi-card" style="animation:fadeUp .35s ease .05s both">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div class="kpi-icon" style="background:#eff6ff">
          <i data-lucide="trending-up" style="width:22px;height:22px;color:#2563eb"></i>
        </div>
        <div style="font-size:10px;font-weight:700;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;padding:3px 8px;border-radius:99px">${qtyVendas} vendas</div>
      </div>
      <div class="kpi-label">Total em Vendas</div>
      <div class="kpi-val" data-count="${totalVendas.toFixed(2)}" data-prefix="R$ " data-float="1">${prvVal(fmt(totalVendas))}</div>
      <div class="sparkline-wrap">${sparkline(daySales,'#2563eb',48,90)}</div>
    </div>

    <!-- Ticket Médio -->
    <div class="dash-kpi-card" style="animation:fadeUp .35s ease .10s both">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div class="kpi-icon" style="background:#f5f3ff">
          <i data-lucide="receipt" style="width:22px;height:22px;color:#6d28d9"></i>
        </div>
        <div style="font-size:10px;font-weight:600;color:#64748b">Por venda</div>
      </div>
      <div class="kpi-label">Ticket Médio</div>
      <div class="kpi-val">${prvVal(fmt(ticketMedio))}</div>
      <div class="sparkline-wrap">${sparkline(daySales.map((v,i,a) => i>0?v/Math.max(a[i-1],1):1),'#6d28d9',48,90)}</div>
    </div>

    <!-- Contas a Receber -->
    <div class="dash-kpi-card" style="animation:fadeUp .35s ease .15s both;cursor:pointer" onclick="navigate('contas-receber')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div class="kpi-icon" style="background:#f0fdf4">
          <i data-lucide="arrow-down-circle" style="width:22px;height:22px;color:#16a34a"></i>
        </div>
        <i data-lucide="chevron-right" style="width:14px;height:14px;color:#94a3b8;margin-top:4px"></i>
      </div>
      <div class="kpi-label">A Receber</div>
      <div class="kpi-val" style="color:#16a34a">${prvVal(fmt(totalReceber))}</div>
      <div style="margin-top:8px;font-size:11.5px;color:#64748b;font-weight:500">Crediário: ${prvVal(fmt(totalCredSaldo))}</div>
    </div>

    <!-- Contas a Pagar -->
    <div class="dash-kpi-card" style="animation:fadeUp .35s ease .20s both;cursor:pointer" onclick="navigate('contas-pagar')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div class="kpi-icon" style="background:#fef2f2">
          <i data-lucide="arrow-up-circle" style="width:22px;height:22px;color:#dc2626"></i>
        </div>
        <i data-lucide="chevron-right" style="width:14px;height:14px;color:#94a3b8;margin-top:4px"></i>
      </div>
      <div class="kpi-label">A Pagar</div>
      <div class="kpi-val" style="color:#dc2626">${prvVal(fmt(totalPagar))}</div>
      <div style="margin-top:8px;font-size:11.5px;color:#64748b;font-weight:500">Em aberto</div>
    </div>
  </div>

  <!-- ═══════════════ MAIN GRID (2+1) ═══════════════ -->
  <div class="dash-main-grid">

    <!-- Left: Sales area chart + Vendedores -->
    <div style="display:flex;flex-direction:column;gap:16px">

      <!-- Area Chart — Vendas 7 dias -->
      <div class="dash-widget-card" style="animation:fadeUp .35s ease .25s both">
        <div class="dwc-head">
          <h3>Tendência de Vendas — 7 dias</h3>
          <span class="dwc-meta">R$ ${fmt(daySales.reduce((a,b)=>a+b,0))} no período</span>
        </div>
        <div class="dwc-body">
          ${areaChartSVG(daySales, dayLabels)}
        </div>
      </div>

      <!-- Vendas por Vendedor -->
      <div class="dash-widget-card" style="animation:fadeUp .35s ease .30s both">
        <div class="dwc-head">
          <h3>Vendas por Vendedor</h3>
          <span class="dwc-meta">${dashPeriod === 'mes' ? 'Mês atual' : dashPeriod === 'semana' ? '7 dias' : dashPeriod}</span>
        </div>
        <div class="dwc-body">
          ${topVendedores.length
            ? topVendedores.map(([nome,val], i) => {
                const colors = ['linear-gradient(90deg,#2563eb,#60a5fa)','linear-gradient(90deg,#6d28d9,#a78bfa)','linear-gradient(90deg,#0369a1,#38bdf8)','linear-gradient(90deg,#0f766e,#34d399)','linear-gradient(90deg,#b45309,#fbbf24)','linear-gradient(90deg,#dc2626,#f87171)'];
                const pct = ((val/maxVend)*100).toFixed(1);
                return `
                  <div class="vbar-row" style="animation:tickerIn .3s ease ${i*80}ms both">
                    <div class="vbar-name" title="${nome}">${nome}</div>
                    <div class="vbar-track"><div class="vbar-fill" data-bar-width="${pct}%" style="background:${colors[i%colors.length]}"></div></div>
                    <div class="vbar-val">${prvVal(fmt(val))}</div>
                  </div>`;
              }).join('')
            : emptyState('award', 'Nenhuma venda com vendedor no período')}
        </div>
      </div>

      <!-- Top Categorias + Top Clientes (side by side) -->
      <div class="dash-cat-cli-grid">

        <!-- Top Categorias -->
        <div class="dash-widget-card" style="animation:fadeUp .35s ease .35s both">
          <div class="dwc-head">
            <h3>Top Categorias</h3>
          </div>
          <div class="dwc-body" id="dash-top-cat">
            <div class="sk" style="height:120px;border-radius:8px"></div>
          </div>
        </div>

        <!-- Top Clientes -->
        <div class="dash-widget-card" style="animation:fadeUp .35s ease .40s both">
          <div class="dwc-head">
            <h3>Top Clientes</h3>
          </div>
          <div style="padding:4px 0">
            ${topClientes.length
              ? topClientes.map((c,i) => {
                  const medals = ['🥇','🥈','🥉'];
                  return `
                    <div style="display:flex;align-items:center;gap:10px;padding:9px 18px;border-bottom:1px solid #e8edf3;animation:tickerIn .3s ease ${i*60}ms both">
                      <span style="font-size:16px;flex-shrink:0">${medals[i]||`<span style='width:24px;height:24px;background:#f1f5f9;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#64748b'>${i+1}</span>`}</span>
                      <div style="flex:1;font-size:12.5px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.nome}</div>
                      <div style="font-size:13px;font-weight:700;color:#2563eb">${prvVal(fmt(c.total))}</div>
                    </div>`;
                }).join('')
              : `<div style="padding:28px 18px;text-align:center;color:#94a3b8;font-size:13px">Sem compras no período</div>`}
          </div>
        </div>
      </div>

    </div>

    <!-- Right column -->
    <div style="display:flex;flex-direction:column;gap:16px">

      <!-- Meta de Vendas Ring -->
      <div class="dash-widget-card" style="animation:fadeUp .35s ease .25s both">
        <div class="dwc-head">
          <h3>Meta do Mês</h3>
          <span class="dwc-meta">${new Date().toLocaleString('pt-BR',{month:'long'})}</span>
        </div>
        <div class="dwc-body" style="display:flex;flex-direction:column;align-items:center;padding:20px 18px">
          <div style="position:relative;flex-shrink:0;animation:ringPop .5s ease .4s both;opacity:0">
            ${ringChart(metaPct, metaColor, '#e8edf3', 120, 13)}
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
              <div style="font-family:'Sora',sans-serif;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-.5px">${prvVal(metaPct.toFixed(0)+'%')}</div>
              <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px">da meta</div>
            </div>
          </div>
          <div style="width:100%;margin-top:18px">
            <div class="fin-row">
              <span class="fin-row-label">Vendido</span>
              <span class="fin-row-val" style="color:#2563eb">${prvVal(fmt(totalVendas))}</span>
            </div>
            <div class="fin-row">
              <span class="fin-row-label">Meta</span>
              <span class="fin-row-val">${prvVal(fmt(meta))}</span>
            </div>
            <div class="fin-row">
              <span class="fin-row-label">Faltam</span>
              <span class="fin-row-val" style="color:${metaPct>=100?'#16a34a':'#dc2626'}">${prvVal(metaPct>=100?'✓ Atingida!':fmt(Math.max(0,meta-totalVendas)))}</span>
            </div>
          </div>
          ${!meta
            ? `<button class="btn btn-sm btn-secondary" style="margin-top:12px;width:100%;justify-content:center" onclick="navigate('metas')"><i data-lucide="target"></i>Definir meta</button>`
            : ''}
        </div>
      </div>

      <!-- Novos Clientes Ring -->
      <div class="dash-widget-card" style="animation:fadeUp .35s ease .30s both">
        <div class="dwc-head">
          <h3>Clientes</h3>
          <button class="btn btn-sm btn-secondary" style="padding:3px 9px;font-size:11px" onclick="navigate('clientes')">
            <i data-lucide="arrow-right" style="width:11px;height:11px"></i>
          </button>
        </div>
        <div class="dwc-body" style="display:flex;align-items:center;gap:16px">
          <div style="position:relative;flex-shrink:0;animation:ringPop .5s ease .5s both;opacity:0">
            ${ringChart(novosPct,'#2563eb','#bfdbfe',88,11)}
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Sora',sans-serif;font-size:16px;font-weight:800;color:#0f172a">${prvVal(novosClientes+'')}</div>
          </div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:8px">
              <div class="donut-legend-dot" style="background:#2563eb"></div>
              <div style="flex:1;font-size:12px;color:#475569">Novos (${novosPct}%)</div>
              <div style="font-size:13px;font-weight:700">${prvVal(novosClientes+'')}</div>
            </div>
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:12px">
              <div class="donut-legend-dot" style="background:#bfdbfe"></div>
              <div style="flex:1;font-size:12px;color:#475569">Antigos</div>
              <div style="font-size:13px;font-weight:700">${prvVal(antigosClientes+'')}</div>
            </div>
            <div style="padding-top:8px;border-top:1px solid #e8edf3;font-size:11px;color:#94a3b8;font-weight:600">Total: ${prvVal(totalClientes+' clientes')}</div>
          </div>
        </div>
      </div>

      <!-- Aniversariantes -->
      <div class="dash-widget-card" style="animation:fadeUp .35s ease .35s both">
        <div class="dwc-head">
          <h3>🎂 Aniversariantes</h3>
          <span class="dwc-meta">Hoje</span>
        </div>
        ${aniv.length === 0
          ? `<div style="padding:24px;text-align:center">
               <div style="font-size:30px;margin-bottom:8px">🎉</div>
               <div style="font-size:12.5px;color:#94a3b8">Nenhum aniversariante hoje</div>
             </div>`
          : aniv.map((c,i) => `
              <div class="aniv-item" style="animation-delay:${i*70}ms">
                <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #bbf7d0;display:flex;align-items:center;justify-content:center;font-weight:800;color:#16a34a;font-size:12px;flex-shrink:0">${c.nome.charAt(0)}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:12.5px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.nome}</div>
                  <div style="font-size:11px;color:#94a3b8">${c.celular||'—'}</div>
                </div>
                ${c.celular
                  ? `<a href="https://wa.me/55${c.celular.replace(/\D/g,'')}" target="_blank" class="wap-btn-pill">
                       <i data-lucide="message-circle" style="width:11px;height:11px"></i>WhatsApp
                     </a>`
                  : ''}
              </div>`).join('')}
      </div>

      <!-- Agenda -->
      <div class="dash-widget-card" style="animation:fadeUp .35s ease .40s both">
        <div class="dwc-head">
          <h3>Agenda</h3>
          <button class="btn btn-sm btn-primary" style="padding:4px 10px;font-size:11px" onclick="openAgendaModal()">
            <i data-lucide="plus"></i>Nova tarefa
          </button>
        </div>
        ${agenda.length === 0
          ? `<div style="padding:24px;text-align:center">
               <div style="font-size:26px;margin-bottom:6px">✅</div>
               <div style="font-size:12.5px;color:#94a3b8">Nenhuma tarefa pendente</div>
             </div>`
          : agenda.map(t => `
              <div class="agenda-item">
                <button class="agenda-checkbox" onclick="concluirTarefa('${t.id}');this.innerHTML='<i data-lucide=\'check\' style=\'width:10px;height:10px;color:#16a34a\'></i>';this.style.borderColor='#16a34a';lucide.createIcons()">
                </button>
                <div style="flex:1;min-width:0">
                  <div style="font-size:12.5px;font-weight:600;color:#1e293b">${t.titulo}</div>
                  ${t.descricao ? `<div style="font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.descricao}</div>` : ''}
                </div>
                <div style="font-size:11px;color:#94a3b8;white-space:nowrap">${fmtDate(t.data_tarefa)}</div>
              </div>`).join('')}
      </div>

    </div>
  </div>

  <!-- ═══════════════ BOTTOM ROW: Changelog + Referral ═══════════════ -->
  <div class="dash-bottom-grid">

    <!-- Changelog -->
    <div class="dash-widget-card" style="animation:fadeUp .35s ease .5s both">
      <div class="dwc-head">
        <h3>Últimas Atualizações</h3>
        <button class="btn btn-sm btn-secondary" onclick="openChangelogModal()">
          <i data-lucide="plus"></i>Adicionar
        </button>
      </div>
      ${changelog.length
        ? `<div>
             ${changelog.map((c,i) => `
               <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 18px;border-bottom:1px solid #e8edf3;animation:tickerIn .3s ease ${i*60}ms both">
                 <div style="width:8px;height:8px;border-radius:50%;background:#2563eb;flex-shrink:0;margin-top:5px"></div>
                 <div style="flex:1">
                   <div style="font-size:13px;font-weight:500;color:#1e293b">${c.descricao}</div>
                   <div style="font-size:11px;color:#94a3b8;margin-top:2px">${c.data_lancamento ? new Date(c.data_lancamento+'T00:00:00').toLocaleDateString('pt-BR') : '—'}</div>
                 </div>
               </div>`).join('')}
           </div>`
        : `<div style="padding:32px;text-align:center">
             <i data-lucide="bell" style="width:28px;height:28px;color:#cbd5e1;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto"></i>
             <div style="font-size:12.5px;color:#94a3b8">Nenhuma atualização registrada</div>
             <button class="btn btn-sm btn-primary" style="margin-top:12px" onclick="openChangelogModal()"><i data-lucide="plus"></i>Registrar</button>
           </div>`}
    </div>

    <!-- Indique e Ganhe -->
    <div class="dash-widget-card" style="animation:fadeUp .35s ease .55s both;background:linear-gradient(145deg,#0f172a 0%,#1e3a5f 100%)">
      <div style="padding:24px">
        <div style="font-size:24px;margin-bottom:10px">🚀</div>
        <div style="font-family:'Sora',sans-serif;font-size:16px;font-weight:700;color:#fff;margin-bottom:6px">Indique e Ganhe</div>
        <div style="font-size:12.5px;color:rgba(255,255,255,.55);line-height:1.5;margin-bottom:16px">Compartilhe seu link e acompanhe as indicações diretamente aqui.</div>
        ${referralLink
          ? `<div style="display:flex;gap:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px 10px;align-items:center">
               <input id="ref-link-input" value="${referralLink}" readonly style="flex:1;background:none;border:none;color:rgba(255,255,255,.8);font-size:11.5px;outline:none">
               <button onclick="navigator.clipboard.writeText(document.getElementById('ref-link-input').value);toast('Link copiado!')" style="background:rgba(255,255,255,.15);border:none;color:white;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:11.5px;font-weight:600;font-family:inherit;display:flex;align-items:center;gap:4px;flex-shrink:0;transition:background .15s" onmouseover="this.style.background='rgba(255,255,255,.25)'" onmouseout="this.style.background='rgba(255,255,255,.15)'">
                 <i data-lucide="copy" style="width:11px;height:11px"></i>Copiar
               </button>
             </div>`
          : `<button onclick="openConfigReferralModal()" style="width:100%;padding:10px;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.2);color:white;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;transition:all .15s" onmouseover="this.style.background='rgba(255,255,255,.2)'" onmouseout="this.style.background='rgba(255,255,255,.12)'">
               Configurar link de indicação
             </button>`}
      </div>
    </div>
  </div>
  `;

  document.getElementById('dash-root').innerHTML = html;
  setTimeout(() => {
    lucide.createIcons();
    animateBars();
    loadDashTopCategories(ini, fim);
  }, 30);
}

// ─── Area Chart SVG ──────────────────────────────────────────────────────────
function areaChartSVG(values, labels) {
  const W = 560, H = 130, padL = 42, padR = 12, padT = 12, padB = 20;
  const iW = W - padL - padR, iH = H - padT - padB;
  const max = Math.max(...values, 1);
  const min = 0;

  const pts = values.map((v, i) => ({
    x: padL + (i / (values.length - 1)) * iW,
    y: padT + (1 - (v - min) / (max - min)) * iH
  }));

  // Smooth bezier path
  function smooth(pts) {
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const c1x = (pts[i-1].x + pts[i].x) / 2, c1y = pts[i-1].y;
      const c2x = (pts[i-1].x + pts[i].x) / 2, c2y = pts[i].y;
      d += ` C${c1x},${c1y} ${c2x},${c2y} ${pts[i].x},${pts[i].y}`;
    }
    return d;
  }
  const linePath = smooth(pts);
  const areaPath = linePath + ` L${pts[pts.length-1].x},${padT+iH} L${pts[0].x},${padT+iH} Z`;

  // Y grid lines
  const gridLines = [0,.25,.5,.75,1].map(f => {
    const y = padT + (1-f) * iH;
    const val = (max * f);
    return `
      <line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#e8edf3" stroke-width="1" stroke-dasharray="3,3"/>
      <text x="${padL-6}" y="${y+4}" text-anchor="end" font-size="9" fill="#94a3b8">${val>=1000?'R$'+(val/1000).toFixed(0)+'k':'R$'+val.toFixed(0)}</text>`;
  }).join('');

  // X labels (every other)
  const xLabels = labels.map((l, i) => {
    const x = padL + (i / (labels.length - 1)) * iW;
    return i % 2 === 0
      ? `<text x="${x}" y="${H-2}" text-anchor="middle" font-size="9" fill="#94a3b8">${l}</text>`
      : '';
  }).join('');

  // Data points
  const dots = pts.map((p, i) => values[i] > 0
    ? `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#fff" stroke="#2563eb" stroke-width="2"
         style="animation:fadeUp .3s ease ${i*60}ms both"/>
       <title>R$ ${fmt(values[i])}</title>`
    : ''
  ).join('');

  const gradId = 'ag' + Math.random().toString(36).slice(2,6);

  return `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;overflow:visible" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2563eb" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#2563eb" stop-opacity="0.01"/>
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${areaPath}" fill="url(#${gradId})"/>
      <path d="${linePath}" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
        style="stroke-dasharray:1000;stroke-dashoffset:1000;animation:drawLine 1.4s ease .1s forwards"/>
      ${dots}
      ${xLabels}
    </svg>`;
}

// ─── Top Categorias async ────────────────────────────────────────────────────
async function loadDashTopCategories(ini, fim) {
  const el = document.getElementById('dash-top-cat');
  if (!el) return;
  try {
    const { data } = await sb.from('venda_itens')
      .select('quantidade,total,produto_id,produtos!inner(categorias(nome))')
      .gte('created_at', ini).lte('created_at', fim + 'T23:59:59');

    if (!data || !data.length) {
      el.innerHTML = `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:12.5px">Sem dados no período</div>`;
      return;
    }

    const catMap = {};
    data.forEach(i => {
      const cat = i.produtos?.categorias?.nome || 'Sem categoria';
      catMap[cat] = catMap[cat] || { qty:0, total:0 };
      catMap[cat].qty   += i.quantidade || 0;
      catMap[cat].total += parseFloat(i.total || 0);
    });

    const sorted = Object.entries(catMap).sort((a,b) => b[1].total - a[1].total).slice(0,5);
    const max    = sorted[0]?.[1].total || 1;
    const palette= ['#2563eb','#6d28d9','#0369a1','#0f766e','#d97706'];

    el.innerHTML = sorted.map(([cat,v],i) => `
      <div class="cat-row" style="animation:tickerIn .3s ease ${i*70}ms both">
        <div class="cat-dot" style="background:${palette[i%palette.length]}"></div>
        <div class="cat-name" title="${cat}">${cat}</div>
        <div class="cat-bar-wrap">
          <div class="cat-bar-fill" data-bar-width="${((v.total/max)*100).toFixed(1)}%" style="background:${palette[i%palette.length]}"></div>
        </div>
        <div class="cat-val">${fmt(v.total)}</div>
      </div>`).join('');

    animateBars();
    lucide.createIcons();
  } catch(e) {
    el.innerHTML = `<div style="font-size:12px;color:#94a3b8;text-align:center;padding:12px">Sem dados disponíveis</div>`;
  }
}

// ─── Animate all bar fills ───────────────────────────────────────────────────
function animateBars() {
  document.querySelectorAll('[data-bar-width]').forEach(el => {
    if (el._barDone) return;
    el._barDone = true;
    const target = el.dataset.barWidth;
    requestAnimationFrame(() => { el.style.width = target; });
  });
}

// ─── Empty state helper ──────────────────────────────────────────────────────
function emptyState(icon, msg) {
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:28px;color:#94a3b8">
    <i data-lucide="${icon}" style="width:28px;height:28px;opacity:.35"></i>
    <div style="font-size:12.5px">${msg}</div>
  </div>`;
}

// ─── Agenda ─────────────────────────────────────────────────────────────────
async function openAgendaModal() {
  openModal(`
    <div class="modal-header"><h3>Nova Tarefa</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>Título *</label><input id="ag-titulo" placeholder="Ex: Ligar para fornecedor"></div>
      <div class="form-group"><label>Descrição</label><textarea id="ag-desc" placeholder="Detalhes..."></textarea></div>
      <div class="form-group"><label>Data *</label><input id="ag-data" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveTarefa()"><i data-lucide="save"></i>Salvar</button>
    </div>`,'modal-md');
}

async function saveTarefa() {
  const titulo = document.getElementById('ag-titulo').value.trim();
  if (!titulo) return toast('Título obrigatório','error');
  const { error } = await sb.from('agenda_tarefas').insert({
    titulo,
    descricao: document.getElementById('ag-desc').value,
    data_tarefa: document.getElementById('ag-data').value,
    concluida: false
  });
  if (error) return toast('Erro: ' + error.message,'error');
  closeModalDirect(); toast('Tarefa salva!'); renderDashboard();
}

async function concluirTarefa(id) {
  await sb.from('agenda_tarefas').update({ concluida: true }).eq('id', id);
  toast('Tarefa concluída! ✓');
  setTimeout(() => buildDashboard(), 600);
}

// ─── Changelog ──────────────────────────────────────────────────────────────
async function openChangelogModal() {
  openModal(`
    <div class="modal-header"><h3>Registrar Atualização</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>Descrição *</label><input id="cl-desc" placeholder="Ex: Nova funcionalidade adicionada..."></div>
      <div class="form-group"><label>Data</label><input id="cl-data" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveChangelog()"><i data-lucide="save"></i>Registrar</button>
    </div>`,'modal-sm');
}

async function saveChangelog() {
  const desc = document.getElementById('cl-desc').value.trim();
  if (!desc) return toast('Descrição obrigatória','error');
  const { error } = await sb.from('changelog').insert({
    descricao: desc, data_lancamento: document.getElementById('cl-data').value
  });
  if (error) return toast('Erro: ' + error.message,'error');
  closeModalDirect(); toast('Atualização registrada'); renderDashboard();
}

// ─── Referral config ─────────────────────────────────────────────────────────
async function openConfigReferralModal() {
  const { data } = await sb.from('configuracoes').select('valor').eq('chave','referral_link').maybeSingle();
  openModal(`
    <div class="modal-header"><h3>Link de Indicação</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body">
      <div class="form-group">
        <label>Link</label>
        <input id="cfg-ref-link" value="${data?.valor||''}" placeholder="https://seusite.com/indicacao/codigo">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveConfigReferral()"><i data-lucide="save"></i>Salvar</button>
    </div>`,'modal-md');
}

async function saveConfigReferral() {
  const valor = document.getElementById('cfg-ref-link').value.trim();
  const { data: existing } = await sb.from('configuracoes').select('id').eq('chave','referral_link').maybeSingle();
  if (existing) await sb.from('configuracoes').update({ valor }).eq('chave','referral_link');
  else await sb.from('configuracoes').insert({ chave:'referral_link', valor });
  closeModalDirect(); toast('Link salvo'); buildDashboard();
}
