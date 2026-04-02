// ===== DASHBOARD =====
let dashPeriod = 'hoje';
let dashPrivacy = false;

function getDashDateRange(period) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  let ini, fim = today;
  if (period === 'hoje') {
    ini = today;
  } else if (period === 'ontem') {
    const y = new Date(now); y.setDate(y.getDate()-1);
    ini = fim = y.toISOString().split('T')[0];
  } else if (period === 'semana') {
    const s = new Date(now); s.setDate(s.getDate()-6);
    ini = s.toISOString().split('T')[0];
  } else {
    const ano = now.getFullYear(), mes = now.getMonth()+1;
    ini = `${ano}-${String(mes).padStart(2,'0')}-01`;
  }
  return {ini, fim};
}

function donutSVG(pct, color='#2563eb', size=80) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const safePct = Math.min(100, Math.max(0, pct));
  const dash = circ * (safePct/100);
  return `<svg width="${size}" height="${size}" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="40" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="10"/>
    <circle cx="40" cy="40" r="${r}" fill="none" stroke="${color}" stroke-width="10"
      stroke-dasharray="${dash.toFixed(2)} ${circ.toFixed(2)}" stroke-linecap="round"
      transform="rotate(-90 40 40)"/>
  </svg>`;
}

function donutSVG2(novos, antigos) {
  const total = novos + antigos;
  const r = 34;
  const circ = 2 * Math.PI * r;
  const novosArc = total > 0 ? (novos/total) * circ : 0;
  return `<svg width="92" height="92" viewBox="0 0 92 92" xmlns="http://www.w3.org/2000/svg">
    <circle cx="46" cy="46" r="${r}" fill="none" stroke="#bfdbfe" stroke-width="12"/>
    ${novosArc>0?`<circle cx="46" cy="46" r="${r}" fill="none" stroke="#2563eb" stroke-width="12"
      stroke-dasharray="${novosArc.toFixed(2)} ${circ.toFixed(2)}" stroke-linecap="round"
      transform="rotate(-90 46 46)"/>`:''}
  </svg>`;
}

function prvVal(val) {
  return dashPrivacy ? `<span class="prv-val">${val}</span>` : val;
}

async function renderDashboard() {
  const el = document.getElementById('content');
  el.innerHTML = `
    <div class="dash-period-bar">
      ${[['ontem','Ontem'],['hoje','Hoje'],['semana','Semana'],['mes','M�s']].map(([k,l])=>
        `<button class="period-btn${dashPeriod===k?' active':''}" onclick="dashPeriod='${k}';renderDashboard()">${l}</button>`
      ).join('')}
    </div>
    <div id="dash-body"><div class="loading" style="padding:48px;text-align:center">
      <div class="sk" style="height:200px;width:100%;border-radius:12px"></div>
    </div></div>`;
  setTimeout(()=>lucide.createIcons(),10);
  await loadDashboardData();
}

async function loadDashboardData() {
  const {ini, fim} = getDashDateRange(dashPeriod);
  const now = new Date();
  const mesIni = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;

  const [vendasRes, clientesRes, contasPagRes, vendedoresRes, metaRes, agendaRes, changelogRes, configRes] = await Promise.all([
    sb.from('vendas').select('id,total,vendedor_id,cliente_id,vendedores(nome)')
      .gte('created_at',ini).lte('created_at',fim+'T23:59:59').eq('status','concluida'),
    sb.from('clientes').select('id,nome,celular,data_nascimento,created_at').eq('ativo',true),
    sb.from('contas_pagar').select('valor,fornecedor_id').eq('status','aberta'),
    sb.from('vendedores').select('id,nome').eq('ativo',true),
    sb.from('metas_vendas').select('valor_meta').eq('tipo','loja')
      .eq('mes',now.getMonth()+1).eq('ano',now.getFullYear()).limit(1),
    sb.from('agenda_tarefas').select('*').gte('data_tarefa',now.toISOString().split('T')[0])
      .eq('concluida',false).order('data_tarefa').limit(8),
    sb.from('changelog').select('*').order('data_lancamento',{ascending:false}).limit(10),
    sb.from('configuracoes').select('chave,valor')
  ]);

  const vendas = vendasRes.data || [];
  const clientes = clientesRes.data || [];
  const totalVendas = vendas.reduce((a,v)=>a+parseFloat(v.total||0),0);
  const qtyVendas = vendas.length;

  // Meta da loja
  const meta = metaRes.data?.[0]?.valor_meta || 0;
  const metaPct = meta > 0 ? Math.min(999, (totalVendas/meta)*100) : 0;
  const metaColor = metaPct >= 100 ? '#16a34a' : metaPct >= 70 ? '#d97706' : '#2563eb';

  // Contas a receber: credi�rio saldo + contas_receber
  const {data:credSaldo} = await sb.from('crediario').select('saldo_devedor').neq('status','quitado');
  const {data:contasRecData} = await sb.from('contas_receber').select('valor,origem').eq('status','aberta');
  const totalCredSaldo = (credSaldo||[]).reduce((a,c)=>a+parseFloat(c.saldo_devedor||0),0);
  const totalContasRec = (contasRecData||[]).reduce((a,c)=>a+parseFloat(c.valor||0),0);
  const totalCartao = (contasRecData||[]).filter(c=>c.origem==='cartao'||c.origem==='credito'||!c.origem).reduce((a,c)=>a+parseFloat(c.valor||0),0);
  const totalReceber = totalContasRec + totalCredSaldo;

  // Contas a pagar
  const contasPag = contasPagRes.data || [];
  const totalFornecedores = contasPag.filter(c=>c.fornecedor_id).reduce((a,c)=>a+parseFloat(c.valor||0),0);
  const totalDespesasLoja = contasPag.filter(c=>!c.fornecedor_id).reduce((a,c)=>a+parseFloat(c.valor||0),0);
  const totalPagar = contasPag.reduce((a,c)=>a+parseFloat(c.valor||0),0);

  // Aniversariantes hoje
  const today = now;
  const aniv = clientes.filter(c => {
    if(!c.data_nascimento) return false;
    const d = new Date(c.data_nascimento+'T00:00:00');
    return d.getDate()===today.getDate() && d.getMonth()===today.getMonth();
  });

  // Novos vs antigos no m�s
  const novosClientes = clientes.filter(c => c.created_at && c.created_at >= mesIni).length;
  const totalClientes = clientes.length;
  const antigosClientes = totalClientes - novosClientes;
  const novosPct = totalClientes > 0 ? Math.round((novosClientes/totalClientes)*100) : 0;
  const antigosPct = 100 - novosPct;

  // Top clients no per�odo
  const clienteMap = {};
  vendas.forEach(v => {
    if(v.cliente_id) clienteMap[v.cliente_id]=(clienteMap[v.cliente_id]||0)+parseFloat(v.total||0);
  });
  const topClientesList = Object.entries(clienteMap).sort((a,b)=>b[1]-a[1]).slice(0,5)
    .map(([id,total])=>({nome:clientes.find(c=>c.id===id)?.nome||'Cliente',total}));

  // Vendas por vendedor
  const vendedorMap = {};
  vendas.forEach(v=>{
    if(v.vendedor_id) {
      const n = v.vendedores?.nome||'Vendedor';
      vendedorMap[n]=(vendedorMap[n]||0)+parseFloat(v.total||0);
    }
  });
  const topVendedores = Object.entries(vendedorMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const maxVend = topVendedores[0]?.[1]||1;

  const agenda = agendaRes.data||[];
  const changelog = changelogRes.data||[];
  const configs = {}; (configRes.data||[]).forEach(c=>configs[c.chave]=c.valor);
  const referralLink = configs['referral_link'] || '';
  const pvBtn = `<button onclick="dashPrivacy=!dashPrivacy;loadDashboardData()" style="background:none;border:none;cursor:pointer;color:var(--text-2);display:flex;padding:2px;border-radius:4px" title="${dashPrivacy?'Mostrar valores':'Ocultar valores'}"><i data-lucide="${dashPrivacy?'eye-off':'eye'}" style="width:14px;height:14px"></i></button>`;

  const html = `
  <div class="dash-grid-new">
    <!-- ===== LEFT COLUMN ===== -->
    <div class="dash-left">
      <!-- Vendas -->
      <div class="card dash-widget">
        <div class="card-header" style="padding:14px 16px">
          <h3 style="font-size:13px">Vendas</h3>
          ${pvBtn}
        </div>
        <div class="card-body" style="padding:12px 16px">
          <div style="font-size:26px;font-weight:800;letter-spacing:-.5px;color:var(--text);margin-bottom:2px">${prvVal(fmt(totalVendas))}</div>
          <div style="color:var(--text-2);font-size:12px">${prvVal(qtyVendas+' vendas realizadas')}</div>
          <div style="font-size:10.5px;color:var(--text-3);margin-top:6px">De ${fmtDate(ini)} � ${fmtDate(fim)}</div>
        </div>
      </div>

      <!-- Meta de Vendas -->
      <div class="card dash-widget">
        <div class="card-header" style="padding:14px 16px">
          <h3 style="font-size:13px">Meta de vendas</h3>
          <span style="font-size:10px;color:var(--text-2)">Fixo: Do m�s atual</span>
        </div>
        <div class="card-body" style="padding:12px 16px;display:flex;gap:14px;align-items:center">
          <div style="position:relative;flex-shrink:0">
            ${donutSVG(metaPct, metaColor, 76)}
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text)">
              ${prvVal(metaPct.toFixed(0)+'%')}
            </div>
          </div>
          <div style="flex:1">
            <div style="font-size:11px;color:var(--text-2);margin-bottom:1px">J� vendeu</div>
            <div style="font-weight:700;font-size:13px;margin-bottom:8px">${prvVal(fmt(totalVendas))}</div>
            <div style="font-size:11px;color:var(--text-2);margin-bottom:1px">Da meta de</div>
            <div style="font-weight:700;font-size:13px">${prvVal(fmt(meta))}</div>
            ${!meta?`<button class="btn btn-sm btn-secondary" style="margin-top:8px;font-size:11px" onclick="navigate('metas')"><i data-lucide="target"></i>Definir meta</button>`:''}
          </div>
        </div>
      </div>

      <!-- Vendas por Vendedor -->
      <div class="card dash-widget">
        <div class="card-header" style="padding:14px 16px"><h3 style="font-size:13px">Vendas por vendedor</h3></div>
        <div class="card-body" style="padding:12px 16px">
          ${topVendedores.length ? topVendedores.map(([nome,val])=>`
            <div class="top-bar-row"><span class="top-bar-label">${nome}</span><span class="top-bar-val">${prvVal(fmt(val))}</span></div>
            <div class="top-bar-track"><div class="top-bar-fill" style="width:${((val/maxVend)*100).toFixed(1)}%;background:linear-gradient(90deg,#2563eb,#6366f1)"></div></div>
          `).join('') : `<div style="text-align:center;color:var(--text-3);font-size:12px;padding:12px">Nenhuma venda com vendedor</div>`}
        </div>
      </div>
    </div>

    <!-- ===== RIGHT MAIN ===== -->
    <div class="dash-right">

      <!-- Contas a Receber + Pagar -->
      <div class="dash-row-2">
        <div class="card">
          <div class="card-header" style="padding:14px 16px">
            <h3 style="font-size:13px">Contas a receber</h3>
            ${pvBtn}
          </div>
          <div class="card-body" style="padding:12px 16px">
            <div class="fin-card-val" style="color:var(--green)">${prvVal(fmt(totalReceber))}</div>
            <div class="fin-sub">
              <div class="fin-sub-item"><label>Cart�o de cr�dito:</label><span>${prvVal(fmt(totalCartao))}</span></div>
              <div class="fin-sub-item"><label>Credi�rio:</label><span>${prvVal(fmt(totalCredSaldo))}</span></div>
            </div>
            <div style="font-size:10.5px;color:var(--text-3);margin-top:8px">De ${fmtDate(ini)} � ${fmtDate(fim)}</div>
          </div>
          <div style="padding:8px 16px;border-top:1px solid var(--border);text-align:right">
            <button onclick="navigate('contas-receber')" style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:12px;font-weight:600;font-family:inherit">Ver mais >></button>
          </div>
        </div>
        <div class="card">
          <div class="card-header" style="padding:14px 16px">
            <h3 style="font-size:13px">Contas a pagar</h3>
            ${pvBtn}
          </div>
          <div class="card-body" style="padding:12px 16px">
            <div class="fin-card-val" style="color:var(--red)">${prvVal(fmt(totalPagar))}</div>
            <div class="fin-sub">
              <div class="fin-sub-item"><label>Fornecedores:</label><span>${prvVal(fmt(totalFornecedores))}</span></div>
              <div class="fin-sub-item"><label>Despesas da loja:</label><span>${prvVal(fmt(totalDespesasLoja))}</span></div>
            </div>
            <div style="font-size:10.5px;color:var(--text-3);margin-top:8px">De ${fmtDate(ini)} � ${fmtDate(fim)}</div>
          </div>
          <div style="padding:8px 16px;border-top:1px solid var(--border);text-align:right">
            <button onclick="navigate('contas-pagar')" style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:12px;font-weight:600;font-family:inherit">Ver mais >></button>
          </div>
        </div>
      </div>

      <!-- Top Categorias + Aniversariantes + Top Clientes -->
      <div class="dash-row-3">
        <!-- Top Categorias -->
        <div class="card">
          <div class="card-header" style="padding:14px 16px">
            <h3 style="font-size:13px">Top categorias vendidas</h3>
            <span style="font-size:10px;color:var(--text-2)">De ${fmtDate(ini)} � ${fmtDate(fim)}</span>
          </div>
          <div id="dash-top-cat" class="card-body" style="padding:12px 16px">
            <div style="color:var(--text-3);font-size:12px;text-align:center;padding:8px">Carregando...</div>
          </div>
        </div>

        <!-- Aniversariantes -->
        <div class="card">
          <div class="card-header" style="padding:14px 16px">
            <h3 style="font-size:13px">Clientes aniversariantes</h3>
            <span style="font-size:10px;color:var(--text-2)">Fixo: Do dia atual</span>
          </div>
          <div class="card-body" style="padding:6px 0">
            ${aniv.length === 0 ? `
              <div class="agenda-empty">
                <i data-lucide="cake" style="width:32px;height:32px;color:var(--text-3)"></i>
                <div style="font-size:12px;color:var(--text-3);margin-top:8px">Nenhum aniversariante hoje</div>
              </div>` :
              aniv.map(c=>`
                <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-bottom:1px solid var(--border)">
                  <div style="width:30px;height:30px;background:var(--purple-bg);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                    <i data-lucide="user" style="width:13px;height:13px;color:var(--purple)"></i>
                  </div>
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.nome}</div>
                    <div style="font-size:10.5px;color:var(--text-2)">${c.celular||'�'}</div>
                  </div>
                  ${c.celular?`<a href="https://wa.me/55${c.celular.replace(/\D/g,'')}" target="_blank" class="wap-btn">
                    <i data-lucide="message-circle" style="width:11px;height:11px"></i> Enviar
                  </a>`:''}
                </div>`).join('')}
          </div>
        </div>

        <!-- Top Clientes -->
        <div class="card">
          <div class="card-header" style="padding:14px 16px">
            <h3 style="font-size:13px">Top Clientes</h3>
            <span style="font-size:10px;color:var(--text-2)">De ${fmtDate(ini)} � ${fmtDate(fim)}</span>
          </div>
          <div class="card-body" style="padding:6px 0">
            ${topClientesList.length ? topClientesList.map((c,i)=>`
              <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-bottom:1px solid var(--border)">
                <div style="width:21px;height:21px;background:${i===0?'#fbbf24':i===1?'#9ca3af':i===2?'#b45309':'var(--bg)'};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${i<3?'white':'var(--text-2)'};flex-shrink:0">${i+1}</div>
                <div style="flex:1;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.nome}</div>
                <div style="font-size:12px;font-weight:700;color:var(--accent)">${prvVal(fmt(c.total))}</div>
              </div>`).join('') : `<div class="empty-state" style="padding:20px"><i data-lucide="users"></i><p>Sem compras no per�odo</p></div>`}
          </div>
        </div>
      </div>

      <!-- Indique e Ganhe + Agenda + Novos Clientes -->
      <div class="dash-row-3">
        <!-- Indique e Ganhe -->
        <div class="card referral-box">
          <div class="card-body" style="padding:16px;text-align:center">
            <div class="ref-title">Indique e Ganhe</div>
            <div class="ref-sub">Compartilhe seu link de indica��o e acompanhe suas indica��es aqui.</div>
            ${referralLink ? `
            <div class="ref-link-row">
              <input id="ref-link-input" value="${referralLink}" readonly>
              <button onclick="navigator.clipboard.writeText(document.getElementById('ref-link-input').value);toast('Link copiado!')" class="btn btn-sm" style="background:#1d4ed8;color:white;flex-shrink:0;font-size:11px">
                <i data-lucide="copy"></i>Copiar
              </button>
            </div>` : `
            <div style="font-size:12px;color:#1e40af;margin-bottom:10px">Nenhum link configurado ainda.</div>
            <button onclick="openConfigReferralModal()" class="btn btn-sm" style="background:#1d4ed8;color:white;font-size:11px">
              <i data-lucide="settings"></i>Configurar link
            </button>`}
          </div>
        </div>

        <!-- Agenda -->
        <div class="card">
          <div class="card-header" style="padding:14px 16px">
            <h3 style="font-size:13px">Agenda</h3>
            <div style="display:flex;gap:6px;align-items:center">
              <span style="font-size:10px;color:var(--text-2)">Fixo: Do dia atual</span>
              <button class="btn btn-sm btn-primary" style="padding:3px 8px;font-size:11px" onclick="openAgendaModal()"><i data-lucide="plus"></i></button>
            </div>
          </div>
          <div class="card-body" style="padding:0">
            ${agenda.length === 0 ? `
              <div class="agenda-empty">
                <svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" style="width:52px;height:52px;margin:0 auto 10px;opacity:.2">
                  <circle cx="40" cy="30" r="14" fill="#64748b"/>
                  <ellipse cx="40" cy="65" rx="20" ry="12" fill="#94a3b8"/>
                  <circle cx="65" cy="62" r="13" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
                  <polyline points="59,62 64,67 71,57" stroke="#94a3b8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                </svg>
                <div style="font-size:12px;color:var(--text-2)">N�o h� tarefas na agenda neste per�odo.</div>
              </div>` :
              agenda.map(t=>`
                <div style="display:flex;align-items:center;gap:8px;padding:9px 16px;border-bottom:1px solid var(--border)">
                  <button onclick="concluirTarefa('${t.id}')" style="width:16px;height:16px;border:1.5px solid var(--border-2);border-radius:3px;background:none;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center"></button>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:12px;font-weight:600">${t.titulo}</div>
                    ${t.descricao?`<div style="font-size:11px;color:var(--text-2)">${t.descricao}</div>`:''}
                  </div>
                  <div style="font-size:11px;color:var(--text-3)">${fmtDate(t.data_tarefa)}</div>
                </div>`).join('')}
          </div>
        </div>

        <!-- N�mero de Clientes Novos -->
        <div class="card">
          <div class="card-header" style="padding:14px 16px">
            <h3 style="font-size:13px">N�mero de clientes novos</h3>
            <span style="font-size:10px;color:var(--text-2)">Fixo: Do m�s atual</span>
          </div>
          <div class="card-body" style="padding:16px;display:flex;align-items:center;gap:16px">
            <div class="clients-donut-wrap">
              ${donutSVG2(novosClientes, antigosClientes)}
            </div>
            <div>
              <div class="clients-legend-row" style="margin-bottom:7px">
                <div class="clients-legend-dot" style="background:#2563eb"></div>
                <div class="clients-legend-num">${prvVal(novosClientes.toString())}</div>
                <div class="clients-legend-lbl">NOVOS ${novosPct}%</div>
              </div>
              <div class="clients-legend-row" style="margin-bottom:7px">
                <div class="clients-legend-dot" style="background:#bfdbfe"></div>
                <div class="clients-legend-num">${prvVal(antigosClientes.toString())}</div>
                <div class="clients-legend-lbl">ANTIGOS ${antigosPct}%</div>
              </div>
              <div class="clients-legend-row" style="margin-bottom:10px">
                <div class="clients-legend-dot" style="background:#94a3b8"></div>
                <div class="clients-legend-num">${prvVal(totalClientes.toString())}</div>
                <div class="clients-legend-lbl">TOTAL</div>
              </div>
              <button onclick="navigate('clientes')" class="clients-cta">Veja uma an�lise completa dos seus clientes</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Changelog -->
      <div class="card">
        <div class="card-header" style="padding:14px 20px">
          <h3>�ltimas atualiza��es</h3>
          <button class="btn btn-sm btn-primary" onclick="openChangelogModal()"><i data-lucide="plus"></i>Adicionar</button>
        </div>
        ${changelog.length ? `
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th style="width:110px">Data</th><th>Atualiza��o</th><th style="width:140px"></th></tr></thead>
            <tbody>${changelog.map(c=>`<tr>
              <td style="color:var(--text-2);font-size:12px">${c.data_lancamento?new Date(c.data_lancamento+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}):'�'}</td>
              <td style="font-size:13px">${c.descricao}</td>
              <td><a href="#" onclick="return false" class="changelog-link">Pergunte ao suporte</a></td>
            </tr>`).join('')}
            </tbody>
          </table></div>` : `
          <div class="card-body">
            <div class="empty-state"><i data-lucide="bell"></i><p>Nenhuma atualiza��o ainda</p>
              <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="openChangelogModal()"><i data-lucide="plus"></i>Adicionar atualiza��o</button>
            </div>
          </div>`}
      </div>

    </div>
  </div>`;

  document.getElementById('dash-body').innerHTML = html;
  setTimeout(()=>{lucide.createIcons();loadDashTopCategories(ini,fim);},10);
}

async function loadDashTopCategories(ini, fim) {
  const el = document.getElementById('dash-top-cat');
  if(!el) return;
  try {
    const {data} = await sb.from('venda_itens')
      .select('quantidade,total,produto_id,produtos!inner(categorias(nome))')
      .gte('created_at',ini).lte('created_at',fim+'T23:59:59');

    if(!data||!data.length) {
      el.innerHTML=`<div class="empty-state" style="padding:16px"><i data-lucide="folder"></i><p>Sem dados no per�odo</p></div>`;
      lucide.createIcons(); return;
    }
    const catMap={};
    data.forEach(i=>{
      const cat=i.produtos?.categorias?.nome||'Sem categoria';
      catMap[cat]=catMap[cat]||{qty:0,total:0};
      catMap[cat].qty+=i.quantidade||0;
      catMap[cat].total+=parseFloat(i.total||0);
    });
    const sorted=Object.entries(catMap).sort((a,b)=>b[1].total-a[1].total).slice(0,5);
    const max=sorted[0]?.[1].total||1;
    el.innerHTML=sorted.map(([cat,v],i)=>`
      <div class="top-bar-row"><span class="top-bar-label">#${i+1} ${cat}</span><span class="top-bar-val">${fmt(v.total)}</span></div>
      <div class="top-bar-track"><div class="top-bar-fill" style="width:${((v.total/max)*100).toFixed(1)}%;background:linear-gradient(90deg,#7c3aed,#a855f7)"></div></div>
    `).join('');
    lucide.createIcons();
  } catch(e){
    el.innerHTML=`<div style="font-size:12px;color:var(--text-3);text-align:center;padding:8px">Sem dados dispon�veis</div>`;
  }
}

// ===== AGENDA =====
async function openAgendaModal() {
  openModal(`
    <div class="modal-header"><h3>Nova Tarefa na Agenda</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>T�tulo *</label><input id="ag-titulo" placeholder="Ex: Ligar para fornecedor"></div>
      <div class="form-group"><label>Descri��o</label><textarea id="ag-desc" placeholder="Detalhes da tarefa..."></textarea></div>
      <div class="form-group"><label>Data *</label><input id="ag-data" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveTarefa()"><i data-lucide="save"></i>Salvar Tarefa</button>
    </div>`,'modal-md');
}

async function saveTarefa() {
  const titulo=document.getElementById('ag-titulo').value.trim();
  if(!titulo) return toast('T�tulo obrigat�rio','error');
  const {error}=await sb.from('agenda_tarefas').insert({
    titulo,
    descricao:document.getElementById('ag-desc').value,
    data_tarefa:document.getElementById('ag-data').value,
    concluida:false
  });
  if(error) return toast('Erro ao salvar: '+error.message,'error');
  closeModalDirect();
  toast('Tarefa salva na agenda');
  renderDashboard();
}

async function concluirTarefa(id) {
  await sb.from('agenda_tarefas').update({concluida:true}).eq('id',id);
  toast('Tarefa conclu�da!');
  loadDashboardData();
}

// ===== CHANGELOG =====
async function openChangelogModal() {
  openModal(`
    <div class="modal-header"><h3>Registrar Atualiza��o</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>Descri��o da atualiza��o *</label><input id="cl-desc" placeholder="Ex: Nova funcionalidade: relat�rio de vendas por per�odo"></div>
      <div class="form-group"><label>Data de lan�amento</label><input id="cl-data" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveChangelog()"><i data-lucide="save"></i>Registrar</button>
    </div>`,'modal-sm');
}

async function saveChangelog() {
  const desc=document.getElementById('cl-desc').value.trim();
  if(!desc) return toast('Descri��o obrigat�ria','error');
  const {error}=await sb.from('changelog').insert({
    descricao:desc,
    data_lancamento:document.getElementById('cl-data').value
  });
  if(error) return toast('Erro: '+error.message,'error');
  closeModalDirect();
  toast('Atualiza��o registrada');
  renderDashboard();
}

// ===== CONFIGURAR LINK DE INDICA��O =====
async function openConfigReferralModal() {
  const {data} = await sb.from('configuracoes').select('valor').eq('chave','referral_link').maybeSingle();
  const currentVal = data?.valor || '';
  openModal(`
    <div class="modal-header"><h3>Configurar Link de Indica��o</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body">
      <div class="form-group">
        <label>Link de Indica��o</label>
        <input id="cfg-ref-link" value="${currentVal}" placeholder="https://seusite.com/indicacao/codigo">
        <small style="color:var(--text-2);font-size:11px;margin-top:4px;display:block">Cole aqui o link de indica��o fornecido pela sua plataforma.</small>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveConfigReferral()"><i data-lucide="save"></i>Salvar</button>
    </div>`,'modal-md');
}

async function saveConfigReferral() {
  const valor = document.getElementById('cfg-ref-link').value.trim();
  const {data:existing} = await sb.from('configuracoes').select('id').eq('chave','referral_link').maybeSingle();
  if(existing) {
    await sb.from('configuracoes').update({valor}).eq('chave','referral_link');
  } else {
    await sb.from('configuracoes').insert({chave:'referral_link', valor});
  }
  closeModalDirect();
  toast('Link de indica��o salvo');
  loadDashboardData();
}
