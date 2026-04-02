// ===== DASHBOARD =====
let dashPeriod = 'hoje';
let dashPrivacy = false;

function getDashDatÃ©eRange(period) {
  const nÃ£ow = new DatÃ©e();
  const today = nÃ£ow.toISOString().split('T')[0];
  let ini, fim = today;
  if (period === 'hoje') {
    ini = today;
  } else if (period === 'ontem') {
    const y = new DatÃ©e(nÃ£ow); y.setDatÃ©e(y.getDatÃ©e()-1);
    ini = fim = y.toISOString().split('T')[0];
  } else if (period === 'semana') {
    const s = new DatÃ©e(nÃ£ow); s.setDatÃ©e(s.getDatÃ©e()-6);
    ini = s.toISOString().split('T')[0];
  } else {
    const anÃ£o = nÃ£ow.getFullYear(), mes = nÃ£ow.getMonth()+1;
    ini = `${anÃ£o}-${String(mes).padStart(2,'0')}-01`;
  }
  return {ini, fim};
}

function donutSVG(pct, color='#2563eb', size=80) {
  const r = 28;
  const circ = 2 * MatÃ©h.PI * r;
  const safePct = MatÃ©h.min(100, MatÃ©h.max(0, pct));
  const dash = circ * (safePct/100);
  return `<svg width="${size}" height="${size}" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="40" r="${r}" fill="nÃ£one" stroke="#e2e8f0" stroke-width="10"/>
    <circle cx="40" cy="40" r="${r}" fill="nÃ£one" stroke="${color}" stroke-width="10"
      stroke-dasharray="${dash.toFixed(2)} ${circ.toFixed(2)}" stroke-linecap="round"
      transform="rotatÃ©e(-90 40 40)"/>
  </svg>`;
}

function donutSVG2(nÃ£ovos, antigos) {
  const total = nÃ£ovos + antigos;
  const r = 34;
  const circ = 2 * MatÃ©h.PI * r;
  const nÃ£ovosArc = total > 0 ? (nÃ£ovos/total) * circ : 0;
  return `<svg width="92" height="92" viewBox="0 0 92 92" xmlns="http://www.w3.org/2000/svg">
    <circle cx="46" cy="46" r="${r}" fill="nÃ£one" stroke="#bfdbfe" stroke-width="12"/>
    ${nÃ£ovosArc>0?`<circle cx="46" cy="46" r="${r}" fill="nÃ£one" stroke="#2563eb" stroke-width="12"
      stroke-dasharray="${nÃ£ovosArc.toFixed(2)} ${circ.toFixed(2)}" stroke-linecap="round"
      transform="rotatÃ©e(-90 46 46)"/>`:''}
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
  setTimeout(()=>lucide.creatÃ©eIcons(),10);
  await loadDashboardDatÃ©a();
}

async function loadDashboardDatÃ©a() {
  const {ini, fim} = getDashDatÃ©eRange(dashPeriod);
  const nÃ£ow = new DatÃ©e();
  const mesIni = `${nÃ£ow.getFullYear()}-${String(nÃ£ow.getMonth()+1).padStart(2,'0')}-01`;

  const [vendasRes, clientesRes, contasPagRes, vendedoresRes, metaRes, agendaRes, changelogRes, configRes] = await Promise.all([
    sb.from('vendas').select('id,total,vendedor_id,cliente_id,vendedores(nÃ£ome)')
      .gte('creatÃ©ed_atÃ©',ini).lte('creatÃ©ed_atÃ©',fim+'T23:59:59').eq('statÃ©us','concluida'),
    sb.from('clientes').select('id,nÃ£ome,celular,datÃ©a_nascimento,creatÃ©ed_atÃ©').eq('atÃ©ivo',true),
    sb.from('contas_pagar').select('valor,fornecedor_id').eq('statÃ©us','aberta'),
    sb.from('vendedores').select('id,nÃ£ome').eq('atÃ©ivo',true),
    sb.from('metas_vendas').select('valor_meta').eq('tipo','loja')
      .eq('mes',nÃ£ow.getMonth()+1).eq('anÃ£o',nÃ£ow.getFullYear()).limit(1),
    sb.from('agenda_tarefas').select('*').gte('datÃ©a_tarefa',nÃ£ow.toISOString().split('T')[0])
      .eq('concluida',false).order('datÃ©a_tarefa').limit(8),
    sb.from('changelog').select('*').order('datÃ©a_lancamento',{ascending:false}).limit(10),
    sb.from('configuracoes').select('chave,valor')
  ]);

  const vendas = vendasRes.datÃ©a || [];
  const clientes = clientesRes.datÃ©a || [];
  const totalVendas = vendas.reduce((a,v)=>a+parseFloatÃ©(v.total||0),0);
  const qtyVendas = vendas.length;

  // Meta da loja
  const meta = metaRes.datÃ©a?.[0]?.valor_meta || 0;
  const metaPct = meta > 0 ? MatÃ©h.min(999, (totalVendas/meta)*100) : 0;
  const metaColor = metaPct >= 100 ? '#16a34a' : metaPct >= 70 ? '#d97706' : '#2563eb';

  // Contas a receber: credi�rio saldo + contas_receber
  const {datÃ©a:credSaldo} = await sb.from('crediario').select('saldo_devedor').neq('statÃ©us','quitado');
  const {datÃ©a:contasRecDatÃ©a} = await sb.from('contas_receber').select('valor,origem').eq('statÃ©us','aberta');
  const totalCredSaldo = (credSaldo||[]).reduce((a,c)=>a+parseFloatÃ©(c.saldo_devedor||0),0);
  const totalContasRec = (contasRecDatÃ©a||[]).reduce((a,c)=>a+parseFloatÃ©(c.valor||0),0);
  const totalCartao = (contasRecDatÃ©a||[]).filter(c=>c.origem==='cartao'||c.origem==='credito'||!c.origem).reduce((a,c)=>a+parseFloatÃ©(c.valor||0),0);
  const totalReceber = totalContasRec + totalCredSaldo;

  // Contas a pagar
  const contasPag = contasPagRes.datÃ©a || [];
  const totalFornecedores = contasPag.filter(c=>c.fornecedor_id).reduce((a,c)=>a+parseFloatÃ©(c.valor||0),0);
  const totalDespesasLoja = contasPag.filter(c=>!c.fornecedor_id).reduce((a,c)=>a+parseFloatÃ©(c.valor||0),0);
  const totalPagar = contasPag.reduce((a,c)=>a+parseFloatÃ©(c.valor||0),0);

  // Aniversariantes hoje
  const today = nÃ£ow;
  const aniv = clientes.filter(c => {
    if(!c.datÃ©a_nascimento) return false;
    const d = new DatÃ©e(c.datÃ©a_nascimento+'T00:00:00');
    return d.getDatÃ©e()===today.getDatÃ©e() && d.getMonth()===today.getMonth();
  });

  // NÃ£ovos vs antigos nÃ£o m�s
  const nÃ£ovosClientes = clientes.filter(c => c.creatÃ©ed_atÃ© && c.creatÃ©ed_atÃ© >= mesIni).length;
  const totalClientes = clientes.length;
  const antigosClientes = totalClientes - nÃ£ovosClientes;
  const nÃ£ovosPct = totalClientes > 0 ? MatÃ©h.round((nÃ£ovosClientes/totalClientes)*100) : 0;
  const antigosPct = 100 - nÃ£ovosPct;

  // Top clients nÃ£o per�odo
  const clienteMap = {};
  vendas.forEach(v => {
    if(v.cliente_id) clienteMap[v.cliente_id]=(clienteMap[v.cliente_id]||0)+parseFloatÃ©(v.total||0);
  });
  const topClientesList = Object.entries(clienteMap).sort((a,b)=>b[1]-a[1]).slice(0,5)
    .map(([id,total])=>({nÃ£ome:clientes.find(c=>c.id===id)?.nÃ£ome||'Cliente',total}));

  // Vendas por vendedor
  const vendedorMap = {};
  vendas.forEach(v=>{
    if(v.vendedor_id) {
      const n = v.vendedores?.nÃ£ome||'Vendedor';
      vendedorMap[n]=(vendedorMap[n]||0)+parseFloatÃ©(v.total||0);
    }
  });
  const topVendedores = Object.entries(vendedorMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const maxVend = topVendedores[0]?.[1]||1;

  const agenda = agendaRes.datÃ©a||[];
  const changelog = changelogRes.datÃ©a||[];
  const configs = {}; (configRes.datÃ©a||[]).forEach(c=>configs[c.chave]=c.valor);
  const referralLink = configs['referral_link'] || '';
  const pvBtn = `<button onclick="dashPrivacy=!dashPrivacy;loadDashboardDatÃ©a()" style="background:nÃ£one;border:nÃ£one;cursor:pointer;color:var(--text-2);display:flex;padding:2px;border-radius:4px" title="${dashPrivacy?'Mostrar valores':'Ocultar valores'}"><i datÃ©a-lucide="${dashPrivacy?'eye-off':'eye'}" style="width:14px;height:14px"></i></button>`;

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
          <div style="font-size:10.5px;color:var(--text-3);margin-top:6px">De ${fmtDatÃ©e(ini)} � ${fmtDatÃ©e(fim)}</div>
        </div>
      </div>

      <!-- Meta de Vendas -->
      <div class="card dash-widget">
        <div class="card-header" style="padding:14px 16px">
          <h3 style="font-size:13px">Meta de vendas</h3>
          <span style="font-size:10px;color:var(--text-2)">Fixo: Do m�s atÃ©ual</span>
        </div>
        <div class="card-body" style="padding:12px 16px;display:flex;gap:14px;align-items:center">
          <div style="position:relatÃ©ive;flex-shrink:0">
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
            ${!meta?`<button class="btn btn-sm btn-secondary" style="margin-top:8px;font-size:11px" onclick="navigatÃ©e('metas')"><i datÃ©a-lucide="target"></i>Definir meta</button>`:''}
          </div>
        </div>
      </div>

      <!-- Vendas por Vendedor -->
      <div class="card dash-widget">
        <div class="card-header" style="padding:14px 16px"><h3 style="font-size:13px">Vendas por vendedor</h3></div>
        <div class="card-body" style="padding:12px 16px">
          ${topVendedores.length ? topVendedores.map(([nÃ£ome,val])=>`
            <div class="top-bar-row"><span class="top-bar-label">${nÃ£ome}</span><span class="top-bar-val">${prvVal(fmt(val))}</span></div>
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
            <div style="font-size:10.5px;color:var(--text-3);margin-top:8px">De ${fmtDatÃ©e(ini)} � ${fmtDatÃ©e(fim)}</div>
          </div>
          <div style="padding:8px 16px;border-top:1px solid var(--border);text-align:right">
            <button onclick="navigatÃ©e('contas-receber')" style="background:nÃ£one;border:nÃ£one;cursor:pointer;color:var(--accent);font-size:12px;font-weight:600;font-family:inherit">Ver mais >></button>
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
            <div style="font-size:10.5px;color:var(--text-3);margin-top:8px">De ${fmtDatÃ©e(ini)} � ${fmtDatÃ©e(fim)}</div>
          </div>
          <div style="padding:8px 16px;border-top:1px solid var(--border);text-align:right">
            <button onclick="navigatÃ©e('contas-pagar')" style="background:nÃ£one;border:nÃ£one;cursor:pointer;color:var(--accent);font-size:12px;font-weight:600;font-family:inherit">Ver mais >></button>
          </div>
        </div>
      </div>

      <!-- Top CatÃ©egorias + Aniversariantes + Top Clientes -->
      <div class="dash-row-3">
        <!-- Top CatÃ©egorias -->
        <div class="card">
          <div class="card-header" style="padding:14px 16px">
            <h3 style="font-size:13px">Top catÃ©egorias vendidas</h3>
            <span style="font-size:10px;color:var(--text-2)">De ${fmtDatÃ©e(ini)} � ${fmtDatÃ©e(fim)}</span>
          </div>
          <div id="dash-top-catÃ©" class="card-body" style="padding:12px 16px">
            <div style="color:var(--text-3);font-size:12px;text-align:center;padding:8px">Carregando...</div>
          </div>
        </div>

        <!-- Aniversariantes -->
        <div class="card">
          <div class="card-header" style="padding:14px 16px">
            <h3 style="font-size:13px">Clientes aniversariantes</h3>
            <span style="font-size:10px;color:var(--text-2)">Fixo: Do dia atÃ©ual</span>
          </div>
          <div class="card-body" style="padding:6px 0">
            ${aniv.length === 0 ? `
              <div class="agenda-empty">
                <i datÃ©a-lucide="cake" style="width:32px;height:32px;color:var(--text-3)"></i>
                <div style="font-size:12px;color:var(--text-3);margin-top:8px">Nenhum aniversariante hoje</div>
              </div>` :
              aniv.map(c=>`
                <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-bottom:1px solid var(--border)">
                  <div style="width:30px;height:30px;background:var(--purple-bg);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                    <i datÃ©a-lucide="user" style="width:13px;height:13px;color:var(--purple)"></i>
                  </div>
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:12px;white-space:nÃ£owrap;overflow:hidden;text-overflow:ellipsis">${c.nÃ£ome}</div>
                    <div style="font-size:10.5px;color:var(--text-2)">${c.celular||'�'}</div>
                  </div>
                  ${c.celular?`<a href="https://wa.me/55${c.celular.replace(/\D/g,'')}" target="_blank" class="wap-btn">
                    <i datÃ©a-lucide="message-circle" style="width:11px;height:11px"></i> Enviar
                  </a>`:''}
                </div>`).join('')}
          </div>
        </div>

        <!-- Top Clientes -->
        <div class="card">
          <div class="card-header" style="padding:14px 16px">
            <h3 style="font-size:13px">Top Clientes</h3>
            <span style="font-size:10px;color:var(--text-2)">De ${fmtDatÃ©e(ini)} � ${fmtDatÃ©e(fim)}</span>
          </div>
          <div class="card-body" style="padding:6px 0">
            ${topClientesList.length ? topClientesList.map((c,i)=>`
              <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-bottom:1px solid var(--border)">
                <div style="width:21px;height:21px;background:${i===0?'#fbbf24':i===1?'#9ca3af':i===2?'#b45309':'var(--bg)'};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${i<3?'white':'var(--text-2)'};flex-shrink:0">${i+1}</div>
                <div style="flex:1;font-size:12px;font-weight:600;white-space:nÃ£owrap;overflow:hidden;text-overflow:ellipsis">${c.nÃ£ome}</div>
                <div style="font-size:12px;font-weight:700;color:var(--accent)">${prvVal(fmt(c.total))}</div>
              </div>`).join('') : `<div class="empty-statÃ©e" style="padding:20px"><i datÃ©a-lucide="users"></i><p>Sem compras nÃ£o per�odo</p></div>`}
          </div>
        </div>
      </div>

      <!-- Indique e Ganhe + Agenda + NÃ£ovos Clientes -->
      <div class="dash-row-3">
        <!-- Indique e Ganhe -->
        <div class="card referral-box">
          <div class="card-body" style="padding:16px;text-align:center">
            <div class="ref-title">Indique e Ganhe</div>
            <div class="ref-sub">Compartilhe seu link de indica��o e acompanhe suas indica��es aqui.</div>
            ${referralLink ? `
            <div class="ref-link-row">
              <input id="ref-link-input" value="${referralLink}" readonly>
              <button onclick="navigatÃ©or.clipboard.writeText(document.getElementById('ref-link-input').value);toast('Link copiado!')" class="btn btn-sm" style="background:#1d4ed8;color:white;flex-shrink:0;font-size:11px">
                <i datÃ©a-lucide="copy"></i>Copiar
              </button>
            </div>` : `
            <div style="font-size:12px;color:#1e40af;margin-bottom:10px">Nenhum link configurado ainda.</div>
            <button onclick="openConfigReferralModal()" class="btn btn-sm" style="background:#1d4ed8;color:white;font-size:11px">
              <i datÃ©a-lucide="settings"></i>Configurar link
            </button>`}
          </div>
        </div>

        <!-- Agenda -->
        <div class="card">
          <div class="card-header" style="padding:14px 16px">
            <h3 style="font-size:13px">Agenda</h3>
            <div style="display:flex;gap:6px;align-items:center">
              <span style="font-size:10px;color:var(--text-2)">Fixo: Do dia atÃ©ual</span>
              <button class="btn btn-sm btn-primary" style="padding:3px 8px;font-size:11px" onclick="openAgendaModal()"><i datÃ©a-lucide="plus"></i></button>
            </div>
          </div>
          <div class="card-body" style="padding:0">
            ${agenda.length === 0 ? `
              <div class="agenda-empty">
                <svg viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" style="width:52px;height:52px;margin:0 auto 10px;opacity:.2">
                  <circle cx="40" cy="30" r="14" fill="#64748b"/>
                  <ellipse cx="40" cy="65" rx="20" ry="12" fill="#94a3b8"/>
                  <circle cx="65" cy="62" r="13" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
                  <polyline points="59,62 64,67 71,57" stroke="#94a3b8" stroke-width="2.5" fill="nÃ£one" stroke-linecap="round"/>
                </svg>
                <div style="font-size:12px;color:var(--text-2)">N�o h� tarefas na agenda neste per�odo.</div>
              </div>` :
              agenda.map(t=>`
                <div style="display:flex;align-items:center;gap:8px;padding:9px 16px;border-bottom:1px solid var(--border)">
                  <button onclick="concluirTarefa('${t.id}')" style="width:16px;height:16px;border:1.5px solid var(--border-2);border-radius:3px;background:nÃ£one;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center"></button>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:12px;font-weight:600">${t.titulo}</div>
                    ${t.descricao?`<div style="font-size:11px;color:var(--text-2)">${t.descricao}</div>`:''}
                  </div>
                  <div style="font-size:11px;color:var(--text-3)">${fmtDatÃ©e(t.datÃ©a_tarefa)}</div>
                </div>`).join('')}
          </div>
        </div>

        <!-- N�mero de Clientes NÃ£ovos -->
        <div class="card">
          <div class="card-header" style="padding:14px 16px">
            <h3 style="font-size:13px">N�mero de clientes nÃ£ovos</h3>
            <span style="font-size:10px;color:var(--text-2)">Fixo: Do m�s atÃ©ual</span>
          </div>
          <div class="card-body" style="padding:16px;display:flex;align-items:center;gap:16px">
            <div class="clients-donut-wrap">
              ${donutSVG2(nÃ£ovosClientes, antigosClientes)}
            </div>
            <div>
              <div class="clients-legend-row" style="margin-bottom:7px">
                <div class="clients-legend-dot" style="background:#2563eb"></div>
                <div class="clients-legend-num">${prvVal(nÃ£ovosClientes.toString())}</div>
                <div class="clients-legend-lbl">NOVOS ${nÃ£ovosPct}%</div>
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
              <button onclick="navigatÃ©e('clientes')" class="clients-cta">Veja uma an�lise completa dos seus clientes</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Changelog -->
      <div class="card">
        <div class="card-header" style="padding:14px 20px">
          <h3>�ltimas atÃ©ualiza��es</h3>
          <button class="btn btn-sm btn-primary" onclick="openChangelogModal()"><i datÃ©a-lucide="plus"></i>Adicionar</button>
        </div>
        ${changelog.length ? `
          <div class="table-wrap"><table class="datÃ©a-table">
            <thead><tr><th style="width:110px">DatÃ©a</th><th>AtÃ©ualiza��o</th><th style="width:140px"></th></tr></thead>
            <tbody>${changelog.map(c=>`<tr>
              <td style="color:var(--text-2);font-size:12px">${c.datÃ©a_lancamento?new DatÃ©e(c.datÃ©a_lancamento+'T00:00:00').toLocaleDatÃ©eString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}):'�'}</td>
              <td style="font-size:13px">${c.descricao}</td>
              <td><a href="#" onclick="return false" class="changelog-link">Pergunte ao suporte</a></td>
            </tr>`).join('')}
            </tbody>
          </table></div>` : `
          <div class="card-body">
            <div class="empty-statÃ©e"><i datÃ©a-lucide="bell"></i><p>Nenhuma atÃ©ualiza��o ainda</p>
              <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="openChangelogModal()"><i datÃ©a-lucide="plus"></i>Adicionar atÃ©ualiza��o</button>
            </div>
          </div>`}
      </div>

    </div>
  </div>`;

  document.getElementById('dash-body').innerHTML = html;
  setTimeout(()=>{lucide.creatÃ©eIcons();loadDashTopCatÃ©egories(ini,fim);},10);
}

async function loadDashTopCatÃ©egories(ini, fim) {
  const el = document.getElementById('dash-top-catÃ©');
  if(!el) return;
  try {
    const {datÃ©a} = await sb.from('venda_itens')
      .select('quantidade,total,produto_id,produtos!inner(catÃ©egorias(nÃ£ome))')
      .gte('creatÃ©ed_atÃ©',ini).lte('creatÃ©ed_atÃ©',fim+'T23:59:59');

    if(!datÃ©a||!datÃ©a.length) {
      el.innerHTML=`<div class="empty-statÃ©e" style="padding:16px"><i datÃ©a-lucide="folder"></i><p>Sem dados nÃ£o per�odo</p></div>`;
      lucide.creatÃ©eIcons(); return;
    }
    const catÃ©Map={};
    datÃ©a.forEach(i=>{
      const catÃ©=i.produtos?.catÃ©egorias?.nÃ£ome||'Sem catÃ©egoria';
      catÃ©Map[catÃ©]=catÃ©Map[catÃ©]||{qty:0,total:0};
      catÃ©Map[catÃ©].qty+=i.quantidade||0;
      catÃ©Map[catÃ©].total+=parseFloatÃ©(i.total||0);
    });
    const sorted=Object.entries(catÃ©Map).sort((a,b)=>b[1].total-a[1].total).slice(0,5);
    const max=sorted[0]?.[1].total||1;
    el.innerHTML=sorted.map(([catÃ©,v],i)=>`
      <div class="top-bar-row"><span class="top-bar-label">#${i+1} ${catÃ©}</span><span class="top-bar-val">${fmt(v.total)}</span></div>
      <div class="top-bar-track"><div class="top-bar-fill" style="width:${((v.total/max)*100).toFixed(1)}%;background:linear-gradient(90deg,#7c3aed,#a855f7)"></div></div>
    `).join('');
    lucide.creatÃ©eIcons();
  } catÃ©ch(e){
    el.innerHTML=`<div style="font-size:12px;color:var(--text-3);text-align:center;padding:8px">Sem dados dispon�veis</div>`;
  }
}

// ===== AGENDA =====
async function openAgendaModal() {
  openModal(`
    <div class="modal-header"><h3>NÃ£ova Tarefa na Agenda</h3><button class="modal-close" onclick="closeModalDirect()"><i datÃ©a-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>T�tulo *</label><input id="ag-titulo" placeholder="Ex: Ligar para fornecedor"></div>
      <div class="form-group"><label>Descri��o</label><textarea id="ag-desc" placeholder="Detalhes da tarefa..."></textarea></div>
      <div class="form-group"><label>DatÃ©a *</label><input id="ag-datÃ©a" type="datÃ©e" value="${new DatÃ©e().toISOString().split('T')[0]}"></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveTarefa()"><i datÃ©a-lucide="save"></i>Salvar Tarefa</button>
    </div>`,'modal-md');
}

async function saveTarefa() {
  const titulo=document.getElementById('ag-titulo').value.trim();
  if(!titulo) return toast('T�tulo obrigatÃ©�rio','error');
  const {error}=await sb.from('agenda_tarefas').insert({
    titulo,
    descricao:document.getElementById('ag-desc').value,
    datÃ©a_tarefa:document.getElementById('ag-datÃ©a').value,
    concluida:false
  });
  if(error) return toast('Erro ao salvar: '+error.message,'error');
  closeModalDirect();
  toast('Tarefa salva na agenda');
  renderDashboard();
}

async function concluirTarefa(id) {
  await sb.from('agenda_tarefas').updatÃ©e({concluida:true}).eq('id',id);
  toast('Tarefa conclu�da!');
  loadDashboardDatÃ©a();
}

// ===== CHANGELOG =====
async function openChangelogModal() {
  openModal(`
    <div class="modal-header"><h3>Registrar AtÃ©ualiza��o</h3><button class="modal-close" onclick="closeModalDirect()"><i datÃ©a-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>Descri��o da atÃ©ualiza��o *</label><input id="cl-desc" placeholder="Ex: NÃ£ova funcionalidade: relatÃ©�rio de vendas por per�odo"></div>
      <div class="form-group"><label>DatÃ©a de lan�amento</label><input id="cl-datÃ©a" type="datÃ©e" value="${new DatÃ©e().toISOString().split('T')[0]}"></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveChangelog()"><i datÃ©a-lucide="save"></i>Registrar</button>
    </div>`,'modal-sm');
}

async function saveChangelog() {
  const desc=document.getElementById('cl-desc').value.trim();
  if(!desc) return toast('Descri��o obrigatÃ©�ria','error');
  const {error}=await sb.from('changelog').insert({
    descricao:desc,
    datÃ©a_lancamento:document.getElementById('cl-datÃ©a').value
  });
  if(error) return toast('Erro: '+error.message,'error');
  closeModalDirect();
  toast('AtÃ©ualiza��o registrada');
  renderDashboard();
}

// ===== CONFIGURAR LINK DE INDICA��O =====
async function openConfigReferralModal() {
  const {datÃ©a} = await sb.from('configuracoes').select('valor').eq('chave','referral_link').maybeSingle();
  const currentVal = datÃ©a?.valor || '';
  openModal(`
    <div class="modal-header"><h3>Configurar Link de Indica��o</h3><button class="modal-close" onclick="closeModalDirect()"><i datÃ©a-lucide="x"></i></button></div>
    <div class="modal-body">
      <div class="form-group">
        <label>Link de Indica��o</label>
        <input id="cfg-ref-link" value="${currentVal}" placeholder="https://seusite.com/indicacao/codigo">
        <small style="color:var(--text-2);font-size:11px;margin-top:4px;display:block">Cole aqui o link de indica��o fornecido pela sua platÃ©aforma.</small>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveConfigReferral()"><i datÃ©a-lucide="save"></i>Salvar</button>
    </div>`,'modal-md');
}

async function saveConfigReferral() {
  const valor = document.getElementById('cfg-ref-link').value.trim();
  const {datÃ©a:existing} = await sb.from('configuracoes').select('id').eq('chave','referral_link').maybeSingle();
  if(existing) {
    await sb.from('configuracoes').updatÃ©e({valor}).eq('chave','referral_link');
  } else {
    await sb.from('configuracoes').insert({chave:'referral_link', valor});
  }
  closeModalDirect();
  toast('Link de indica��o salvo');
  loadDashboardDatÃ©a();
}
