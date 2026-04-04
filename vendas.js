// ===== RELACAO DE VENDAS =====
async function renderRelacaoVendas() {
  const now = new Date();
  const ini = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  const fim = now.toISOString().split('T')[0];
  document.getElementById('content').innerHTML = `
    <div class="card">
      <div class="filters">
        <input type="date" class="filter-input" id="rv-ini" value="${ini}" style="min-width:140px">
        <input type="date" class="filter-input" id="rv-fim" value="${fim}" style="min-width:140px">
        <select class="filter-select" id="rv-status"><option value="">Todos status</option><option>concluida</option><option>cancelada</option></select>
        <button class="btn btn-primary btn-sm" onclick="loadRelacaoVendas()"><i data-lucide="search"></i>Filtrar</button>
      </div>
      <div id="rv-table"><div class="loading">Carregando...</div></div>
    </div>`;
  lucide.createIcons();
  await loadRelacaoVendas();
}

async function loadRelacaoVendas() {
  const ini=document.getElementById('rv-ini')?.value;
  const fim=document.getElementById('rv-fim')?.value;
  const st=document.getElementById('rv-status')?.value;
  let q=sb.from('vendas').select('*,clientes(nome),vendedores(nome)').order('created_at',{ascending:false});
  if(ini) q=q.gte('created_at',ini);
  if(fim) q=q.lte('created_at',fim+'T23:59:59');
  if(st) q=q.eq('status',st);
  const {data} = await q;
  const total=(data||[]).filter(v=>v.status==='concluida').reduce((a,v)=>a+parseFloat(v.total||0),0);
  document.getElementById('rv-table').innerHTML = `
    <div style="padding:12px 20px;background:var(--accent-light);border-bottom:1px solid var(--border)">
      <strong style="color:var(--accent)">${(data||[]).length} vendas | Total: ${fmt(total)}</strong>
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>#</th><th>Data</th><th>Cliente</th><th>Vendedor</th><th>Forma Pag.</th><th>Total</th><th>Status</th><th>Acoes</th></tr></thead>
      <tbody>${(data||[]).map(v=>`<tr>
        <td><strong>#${v.numero_venda}</strong></td>
        <td>${fmtDatetime(v.created_at)}</td>
        <td>${v.clientes?.nome||'Consumidor'}</td>
        <td>${v.vendedores?.nome||'\u2014'}</td>
        <td style="text-transform:capitalize">${v.forma_pagamento||'\u2014'}</td>
        <td><strong>${fmt(v.total)}</strong></td>
        <td>${badgeStatus(v.status)}</td>
        <td><div class="actions">
          <button class="btn btn-sm btn-secondary" onclick="verVenda('${v.id}')"><i data-lucide="eye"></i></button>
          ${v.status==='concluida'?`<button class="btn btn-sm btn-danger" onclick="cancelarVenda('${v.id}')"><i data-lucide="x-circle"></i></button>`:''}
        </div></td>
      </tr>`).join('')||'<tr><td colspan="8" style="text-align:center;color:var(--text-2)">Nenhuma venda</td></tr>'}
      </tbody>
    </table></div>`;
  lucide.createIcons();
}

async function verVenda(id) {
  const [{data:v},{data:itens}] = await Promise.all([
    sb.from('vendas').select('*,clientes(nome),vendedores(nome)').eq('id',id).single(),
    sb.from('venda_itens').select('*').eq('venda_id',id)
  ]);
  openModal(`
    <div class="modal-header"><h3>Venda #${v?.numero_venda}</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body">
      <div class="form-row" style="margin-bottom:16px">
        <div><strong>Cliente:</strong> ${v?.clientes?.nome||'Consumidor'}</div>
        <div><strong>Vendedor:</strong> ${v?.vendedores?.nome||'\u2014'}</div>
        <div><strong>Data:</strong> ${fmtDatetime(v?.created_at)}</div>
        <div><strong>Status:</strong> ${badgeStatus(v?.status)}</div>
      </div>
      <table class="data-table">
        <thead><tr><th>Produto</th><th>Tam.</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead>
        <tbody>${(itens||[]).map(i=>`<tr><td>${i.produto_nome}</td><td>${i.tamanho||'\u2014'}</td><td>${i.quantidade}</td><td>${fmt(i.preco_unitario)}</td><td>${fmt(i.total)}</td></tr>`).join('')}</tbody>
      </table>
      <div style="margin-top:16px;text-align:right">
        <div>Subtotal: <strong>${fmt(v?.subtotal)}</strong></div>
        <div>Desconto: <strong>${fmt(v?.desconto)}</strong></div>
        <div style="font-size:16px;font-weight:700;color:var(--accent)">Total: ${fmt(v?.total)}</div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModalDirect()">Fechar</button></div>`,'modal-lg');
}

async function cancelarVenda(id) {
  if(!confirm('Cancelar esta venda?')) return;
  await sb.from('vendas').update({status:'cancelada'}).eq('id',id);
  toast('Venda cancelada');loadRelacaoVendas();
}

// ===== CONSULTA VENDAS - VISAO GERAL (Layout Phibo) =====
let _cvChart = null;
let _cvCompChart = null;

async function renderConsultaVendas() {
  const ano = new Date().getFullYear();
  document.getElementById('topbar-actions').innerHTML = '';
  document.getElementById('content').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px">
      <span style="font-size:13px;font-weight:600;color:var(--text-1)">Informe o Ano:</span>
      <select id="cv-ano" onchange="loadVisaoGeral()" style="padding:7px 14px;border:1.5px solid #d1d5db;border-radius:6px;font-size:13px;background:white;font-family:inherit;min-width:100px">
        ${[ano-2,ano-1,ano,ano+1].map(y=>`<option value="${y}" ${y===ano?'selected':''}>${y}</option>`).join('')}
      </select>
    </div>
    <div class="tabs" id="cv-tabs">
      <div class="tab active" data-tab="cv-ano" onclick="switchCVTab('cv-ano')">Ano</div>
      <div class="tab" data-tab="cv-comp" onclick="switchCVTab('cv-comp')">Comparativo Ano Anterior</div>
    </div>
    <div id="cv-ano-panel" class="tab-panel active">
      <div class="card">
        <div class="card-header" style="text-align:center"><h3>Total Vendas</h3></div>
        <div class="card-body" style="padding:12px 20px">
          <div style="position:relative;width:100%;height:380px">
            <canvas id="cv-chart-canvas"></canvas>
          </div>
        </div>
      </div>
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-top:16px" id="cv-stats"></div>
      <div class="card" style="margin-top:16px">
        <div class="card-header"><h3>Detalhamento Mensal</h3></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Mes</th><th>Qtd Vendas</th><th>Total Vendas</th><th>Ticket Medio</th><th>% do Ano</th></tr></thead>
          <tbody id="cv-detail-tbody"></tbody>
          <tfoot id="cv-detail-tfoot"></tfoot>
        </table></div>
      </div>
    </div>
    <div id="cv-comp-panel" class="tab-panel">
      <div class="card">
        <div class="card-header" style="text-align:center"><h3>Comparativo Ano Anterior</h3></div>
        <div class="card-body" style="padding:12px 20px">
          <div style="position:relative;width:100%;height:380px">
            <canvas id="cv-comp-canvas"></canvas>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-header"><h3>Comparativo Detalhado</h3></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Mes</th><th>Vendas Ano Anterior</th><th>Vendas Ano Atual</th><th>Variacao</th></tr></thead>
          <tbody id="cv-comp-tbody"></tbody>
        </table></div>
      </div>
    </div>`;
  lucide.createIcons();
  await loadVisaoGeral();
}

function switchCVTab(id) {
  document.querySelectorAll('#cv-tabs .tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===id));
  ['cv-ano-panel','cv-comp-panel'].forEach(pid=>{
    const el = document.getElementById(pid);
    if(el) el.classList.toggle('active', pid===id+'-panel');
  });
}

async function loadVisaoGeral() {
  const ano = parseInt(document.getElementById('cv-ano')?.value || new Date().getFullYear());
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  const [{data:vsAno},{data:vsAnterior}] = await Promise.all([
    sb.from('vendas').select('total,created_at').gte('created_at',`${ano}-01-01`).lte('created_at',`${ano}-12-31T23:59:59`).eq('status','concluida'),
    sb.from('vendas').select('total,created_at').gte('created_at',`${ano-1}-01-01`).lte('created_at',`${ano-1}-12-31T23:59:59`).eq('status','concluida')
  ]);

  const mensal = Array(12).fill(null).map(()=>({total:0,qtd:0}));
  const mensalAnt = Array(12).fill(null).map(()=>({total:0,qtd:0}));
  (vsAno||[]).forEach(v=>{const m=new Date(v.created_at).getMonth();mensal[m].total+=parseFloat(v.total||0);mensal[m].qtd++;});
  (vsAnterior||[]).forEach(v=>{const m=new Date(v.created_at).getMonth();mensalAnt[m].total+=parseFloat(v.total||0);mensalAnt[m].qtd++;});

  const vendas = mensal.map(m=>m.total);
  const tickets = mensal.map(m=>m.qtd>0?m.total/m.qtd:0);
  const totalAno = vendas.reduce((a,b)=>a+b,0);
  const qtdAno = mensal.reduce((a,m)=>a+m.qtd,0);
  const ticketMedioAno = qtdAno>0?totalAno/qtdAno:0;
  const maxVenda = Math.max(...vendas,1);

  // Stats cards
  const statsEl = document.getElementById('cv-stats');
  if(statsEl) statsEl.innerHTML = `
    <div class="stat-card"><div class="stat-value">${fmt(totalAno)}</div><div class="stat-label">Faturamento ${ano}</div></div>
    <div class="stat-card"><div class="stat-value">${qtdAno}</div><div class="stat-label">Total de Vendas</div></div>
    <div class="stat-card"><div class="stat-value">${fmt(ticketMedioAno)}</div><div class="stat-label">Ticket Medio</div></div>
    <div class="stat-card"><div class="stat-value">${fmt(maxVenda)}</div><div class="stat-label">Melhor Mes</div></div>`;

  // Detail table
  const tbody = document.getElementById('cv-detail-tbody');
  const tfoot = document.getElementById('cv-detail-tfoot');
  if(tbody) tbody.innerHTML = mensal.map((m,i)=>{
    const pct = totalAno>0?((m.total/totalAno)*100).toFixed(1):'0.0';
    const tk = m.qtd>0?m.total/m.qtd:0;
    return `<tr>
      <td><strong>${meses[i]}</strong></td>
      <td style="text-align:center">${m.qtd}</td>
      <td style="text-align:right"><strong>${fmt(m.total)}</strong></td>
      <td style="text-align:right">${fmt(tk)}</td>
      <td style="text-align:center">${pct}%</td>
    </tr>`;
  }).join('');
  if(tfoot) tfoot.innerHTML = `<tr style="font-weight:700;background:var(--bg-2)">
    <td>Total</td><td style="text-align:center">${qtdAno}</td>
    <td style="text-align:right">${fmt(totalAno)}</td>
    <td style="text-align:right">${fmt(ticketMedioAno)}</td>
    <td style="text-align:center">100%</td>
  </tr>`;

  // Chart.js - Combined Bar + Line (Phibo style)
  if(_cvChart) { _cvChart.destroy(); _cvChart=null; }
  const ctx = document.getElementById('cv-chart-canvas');
  if(ctx) {
    _cvChart = new Chart(ctx, {
      type:'bar',
      data:{
        labels: meses.map((m,i)=>(i+1)),
        datasets:[
          {
            label:'Vendas',
            data:vendas,
            backgroundColor:'rgba(59,130,246,0.7)',
            borderColor:'#3b82f6',
            borderWidth:1,
            borderRadius:3,
            order:2,
            yAxisID:'y'
          },
          {
            label:'Ticket Medio',
            data:tickets,
            type:'line',
            borderColor:'#f59e0b',
            backgroundColor:'rgba(245,158,11,0.15)',
            pointBackgroundColor:'#f59e0b',
            pointRadius:5,
            pointHoverRadius:7,
            borderWidth:2.5,
            tension:0.3,
            order:1,
            yAxisID:'y1'
          }
        ]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        interaction:{ mode:'index', intersect:false },
        plugins:{
          legend:{ position:'top', labels:{ usePointStyle:true, padding:16, font:{size:12,family:'DM Sans'} } },
          tooltip:{ callbacks:{ label:function(ctx){return ctx.dataset.label+': R$ '+parseFloat(ctx.raw||0).toFixed(2).replace('.',',')} } }
        },
        scales:{
          x:{ grid:{display:false}, ticks:{font:{size:12,family:'DM Sans'}} },
          y:{ position:'left', title:{display:true,text:'Valor das Vendas',font:{size:12,family:'DM Sans'}}, grid:{color:'#f1f5f9'}, ticks:{font:{size:11},callback:function(v){return 'R$'+v.toLocaleString('pt-BR')}} },
          y1:{ position:'right', title:{display:true,text:'Valor Ticket Medio',font:{size:12,family:'DM Sans'}}, grid:{drawOnChartArea:false}, ticks:{font:{size:11},callback:function(v){return 'R$'+v.toFixed(0)}} }
        }
      }
    });
  }

  // Comparativo chart
  if(_cvCompChart) { _cvCompChart.destroy(); _cvCompChart=null; }
  const compCtx = document.getElementById('cv-comp-canvas');
  if(compCtx) {
    const vendasAnt = mensalAnt.map(m=>m.total);
    _cvCompChart = new Chart(compCtx, {
      type:'bar',
      data:{
        labels: meses.map((m,i)=>(i+1)),
        datasets:[
          { label:(ano-1).toString(), data:vendasAnt, backgroundColor:'rgba(156,163,175,0.5)', borderColor:'#9ca3af', borderWidth:1, borderRadius:3 },
          { label:ano.toString(), data:vendas, backgroundColor:'rgba(59,130,246,0.7)', borderColor:'#3b82f6', borderWidth:1, borderRadius:3 }
        ]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        plugins:{
          legend:{ position:'top', labels:{ usePointStyle:true, padding:16, font:{size:12,family:'DM Sans'} } },
          tooltip:{ callbacks:{ label:function(ctx){return ctx.dataset.label+': R$ '+parseFloat(ctx.raw||0).toFixed(2).replace('.',',')} } }
        },
        scales:{
          x:{ grid:{display:false} },
          y:{ grid:{color:'#f1f5f9'}, ticks:{callback:function(v){return 'R$'+v.toLocaleString('pt-BR')}} }
        }
      }
    });
  }

  // Comparativo detail table
  const compTbody = document.getElementById('cv-comp-tbody');
  if(compTbody) compTbody.innerHTML = meses.map((m,i)=>{
    const ant = mensalAnt[i].total, atual = mensal[i].total;
    const variacao = ant>0?((atual-ant)/ant*100).toFixed(1):(atual>0?'100.0':'0.0');
    const cor = atual>=ant?'var(--green,#16a34a)':'var(--red,#dc2626)';
    return `<tr>
      <td><strong>${m}</strong></td>
      <td style="text-align:right">${fmt(ant)}</td>
      <td style="text-align:right"><strong>${fmt(atual)}</strong></td>
      <td style="text-align:center;color:${cor};font-weight:700">${variacao}%</td>
    </tr>`;
  }).join('');
}

// ===== RELACAO DE TROCAS (sub-page - Layout Phibo) =====
async function renderRelacaoTrocas() {
  const now = new Date();
  const anoAtual = now.getFullYear();
  const mesAtual = now.getMonth()+1;
  const mesesNomes = ['','Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  document.getElementById('topbar-actions').innerHTML = '';
  document.getElementById('content').innerHTML=`
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <span style="font-size:13px;font-weight:600;color:var(--text-1)">Informe o Ano / Mes:</span>
      <select id="rt-ano" onchange="loadRelacaoTrocas()" style="padding:7px 14px;border:1.5px solid #d1d5db;border-radius:6px;font-size:13px;background:white;font-family:inherit;min-width:90px">
        ${[anoAtual-2,anoAtual-1,anoAtual].map(y=>`<option value="${y}" ${y===anoAtual?'selected':''}>${y}</option>`).join('')}
      </select>
      <select id="rt-mes" onchange="loadRelacaoTrocas()" style="padding:7px 14px;border:1.5px solid #d1d5db;border-radius:6px;font-size:13px;background:white;font-family:inherit;min-width:120px">
        ${mesesNomes.slice(1).map((m,i)=>`<option value="${i+1}" ${(i+1)===mesAtual?'selected':''}>${m}</option>`).join('')}
      </select>
    </div>
    <div id="rt-content"><div class="loading">Carregando...</div></div>`;
  await loadRelacaoTrocas();
}

async function loadRelacaoTrocas() {
  const ano = parseInt(document.getElementById('rt-ano')?.value||new Date().getFullYear());
  const mes = parseInt(document.getElementById('rt-mes')?.value||(new Date().getMonth()+1));
  const mesStr = String(mes).padStart(2,'0');
  const ini = `${ano}-${mesStr}-01`;
  const lastDay = new Date(ano,mes,0).getDate();
  const fim = `${ano}-${mesStr}-${lastDay}T23:59:59`;

  const {data:trocas} = await sb.from('trocas').select('*,clientes(nome)').gte('created_at',ini).lte('created_at',fim).order('created_at',{ascending:false});

  // Separar: produtos trocados vs cashback/creditos
  const produtos = (trocas||[]).filter(t=>t.produto_nome || t.produto_id);
  const cashbacks = (trocas||[]).filter(t=>parseFloat(t.valor_credito||0)>0);

  const totalQtd = produtos.length;
  const totalVlrVenda = produtos.reduce((a,t)=>a+parseFloat(t.valor||0),0);
  const totalDesconto = 0;
  const totalVlrTotal = produtos.reduce((a,t)=>a+parseFloat(t.valor||0),0);
  const totalCashback = cashbacks.reduce((a,t)=>a+parseFloat(t.valor_credito||0),0);
  const totalGeral = totalVlrTotal + totalCashback;

  const container = document.getElementById('rt-content');
  if(!container) return;

  container.innerHTML = `
    <!-- Tabela 1: Relação de produtos trocados -->
    <div class="card">
      <div class="card-header" style="text-align:center;background:var(--bg-2)">
        <h3 style="font-size:14px;margin:0">Relacao de produtos trocados</h3>
      </div>
      <div class="table-wrap"><table class="data-table" style="font-size:12px">
        <thead><tr>
          <th>EAN</th><th>Fornecedor</th><th>Descricao Produto</th><th>Grade</th><th>Cor</th><th>Qtde</th><th>Vlr Un Venda</th><th>Descto Un</th><th>Vlr Total</th>
        </tr></thead>
        <tbody>${produtos.length ? produtos.map(t=>{
          const vlr = parseFloat(t.valor||0);
          return `<tr>
            <td>${t.ean||'\u2014'}</td>
            <td>${t.fornecedor||'\u2014'}</td>
            <td>${t.produto_nome||'\u2014'}</td>
            <td>${t.tamanho||'\u2014'}</td>
            <td>${t.cor||'\u2014'}</td>
            <td style="text-align:center">1</td>
            <td style="text-align:right">${fmtNum(vlr)}</td>
            <td style="text-align:right">0,00</td>
            <td style="text-align:right">${fmtNum(vlr)}</td>
          </tr>`;
        }).join('') : '<tr><td colspan="9" style="text-align:left;color:var(--text-2);padding:10px 14px">Nenhuma troca foi identificada no periodo.</td></tr>'}</tbody>
        <tfoot>
          <tr style="font-weight:700;background:var(--bg-2)">
            <td colspan="5" style="text-align:right">Total de produtos:</td>
            <td style="text-align:center">${totalQtd}</td>
            <td style="text-align:right">${fmtNum(totalVlrVenda)}</td>
            <td style="text-align:right">0,00</td>
            <td style="text-align:right">${fmtNum(totalVlrTotal)}</td>
          </tr>
        </tfoot>
      </table></div>
    </div>

    <!-- Tabela 2: Relação de cashback utilizados na troca -->
    <div class="card" style="margin-top:16px">
      <div class="card-header" style="text-align:center;background:var(--bg-2)">
        <h3 style="font-size:14px;margin:0">Relacao de cashback utilizados na troca</h3>
      </div>
      <div class="table-wrap"><table class="data-table" style="font-size:12px">
        <thead><tr>
          <th>Data / Hora</th><th>Cupom de troca</th><th>Cliente</th><th>Origem do cashback</th><th>Valor</th>
        </tr></thead>
        <tbody>${cashbacks.length ? cashbacks.map(t=>`<tr>
          <td>${fmtDatetime(t.created_at)}</td>
          <td>${t.id||'\u2014'}</td>
          <td>${t.clientes?.nome||'\u2014'}</td>
          <td>${t.tipo==='devolucao'?'Devolucao':'Troca de produto'}</td>
          <td style="text-align:right">${fmtNum(parseFloat(t.valor_credito||0))}</td>
        </tr>`).join('') : '<tr><td colspan="5" style="text-align:left;color:var(--text-2);padding:10px 14px">Nenhum cashback de devolucao foi usado no periodo.</td></tr>'}</tbody>
        <tfoot>
          <tr style="font-weight:600;background:var(--bg-2)">
            <td colspan="4" style="text-align:right">Total cashback:</td>
            <td style="text-align:right">${fmtNum(totalCashback)}</td>
          </tr>
          <tr style="font-weight:700;background:var(--bg-2)">
            <td colspan="4" style="text-align:right"><strong>Total geral:</strong></td>
            <td style="text-align:right"><strong>${fmtNum(totalGeral)}</strong></td>
          </tr>
        </tfoot>
      </table></div>
    </div>`;
  lucide.createIcons();
}

// ===== VENDAS EXCLUIDAS (sub-page) =====
async function renderVendasExcluidas() {
  document.getElementById('topbar-actions').innerHTML = '';
  const {data:excl}=await sb.from('vendas').select('*,clientes(nome)').eq('status','cancelada').order('created_at',{ascending:false}).limit(50);
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-header"><h3>Vendas Excluidas / Canceladas</h3></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>#</th><th>Data</th><th>Cliente</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>${(excl||[]).map(v=>`<tr>
          <td><strong>#${v.numero_venda}</strong></td>
          <td>${fmtDatetime(v.created_at)}</td>
          <td>${v.clientes?.nome||'Consumidor'}</td>
          <td><strong>${fmt(v.total)}</strong></td>
          <td>${badgeStatus(v.status)}</td>
        </tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--text-2)">Nenhuma venda cancelada</td></tr>'}</tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

// ===== CREDITOS DE CLIENTES (sub-page) =====
async function renderCreditosClientes() {
  document.getElementById('topbar-actions').innerHTML = '';
  const {data:trocas}=await sb.from('trocas').select('*,clientes(nome)').gt('valor_credito',0).order('created_at',{ascending:false}).limit(50);
  const porCliente = {};
  (trocas||[]).forEach(t=>{
    const nome = t.clientes?.nome||'Sem nome';
    if(!porCliente[nome]) porCliente[nome]={nome:nome,total:0,qtd:0};
    porCliente[nome].total+=parseFloat(t.valor_credito||0);
    porCliente[nome].qtd++;
  });
  const lista = Object.values(porCliente).sort((a,b)=>b.total-a.total);
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-header"><h3>Creditos de Clientes</h3></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Cliente</th><th>Qtd Trocas</th><th>Total Credito</th></tr></thead>
        <tbody>${lista.map(c=>`<tr>
          <td><strong>${c.nome}</strong></td>
          <td style="text-align:center">${c.qtd}</td>
          <td style="text-align:right"><strong style="color:var(--green,#16a34a)">${fmt(c.total)}</strong></td>
        </tr>`).join('')||'<tr><td colspan="3" style="text-align:center;color:var(--text-2)">Nenhum credito de cliente encontrado</td></tr>'}</tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

function switchTab(id) {
  document.querySelectorAll('.tab').forEach((t,i)=>{
    const panels=document.querySelectorAll('.tab-panel');
    if(panels[i]) panels[i].classList.toggle('active',panels[i].id===id);
    t.classList.toggle('active',panels[i]?.id===id);
  });
}

// ===== BAG =====
async function renderBAG() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openBagModal()"><i data-lucide="plus"></i>Montar BAG</button>`;
  const {data}=await sb.from('bags').select('*,clientes(nome),vendedores(nome)').order('created_at',{ascending:false});
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>#BAG</th><th>Cliente</th><th>Vendedor</th><th>Data Retorno</th><th>Total</th><th>Status</th><th>Acoes</th></tr></thead>
        <tbody>${(data||[]).map(b=>`<tr>
          <td><strong>#${b.numero_bag||b.id}</strong></td>
          <td>${b.clientes?.nome||'\u2014'}</td>
          <td>${b.vendedores?.nome||'\u2014'}</td>
          <td>${fmtDate(b.data_retorno)}</td>
          <td>${fmt(b.total)}</td>
          <td>${badgeStatus(b.status)}</td>
          <td><div class="actions">
            <button class="btn btn-sm btn-secondary" onclick="verBAG('${b.id}')"><i data-lucide="eye"></i></button>
            ${b.status==='aberta'?`<button class="btn btn-sm btn-success" onclick="efetivarBAG('${b.id}')"><i data-lucide="check"></i>Efetivar</button>`:''}
          </div></td>
        </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:var(--text-2)">Nenhum BAG</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function openBagModal() {
  const [{data:cls},{data:vds},{data:prods}]=await Promise.all([
    sb.from('clientes').select('id,nome').eq('ativo',true),
    sb.from('vendedores').select('id,nome').eq('ativo',true),
    sb.from('produtos').select('id,nome,preco_venda').eq('ativo',true).order('nome')
  ]);
  openModal(`
    <div class="modal-header"><h3>Montar BAG</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body">
      <div class="form-row" style="margin-bottom:16px">
        <div class="form-group"><label>Cliente</label><select id="bg-cli"><option value="">Nenhum</option>${(cls||[]).map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}</select></div>
        <div class="form-group"><label>Vendedor</label><select id="bg-vd"><option value="">Nenhum</option>${(vds||[]).map(v=>`<option value="${v.id}">${v.nome}</option>`).join('')}</select></div>
        <div class="form-group"><label>Data Retorno</label><input id="bg-ret" type="date"></div>
      </div>
      <div class="form-group" style="margin-bottom:12px"><label>Adicionar Produto</label>
        <select id="bg-prod" onchange="addBagItem(this)"><option value="">Selecionar produto...</option>${(prods||[]).map(p=>`<option value="${p.id}" data-nome="${p.nome}" data-preco="${p.preco_venda}">${p.nome} - ${fmt(p.preco_venda)}</option>`).join('')}</select>
      </div>
      <div id="bag-items-list"></div>
      <div style="text-align:right;font-weight:700;font-size:15px;margin-top:8px">Total: <span id="bag-total">R$ 0,00</span></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveBag()"><i data-lucide="save"></i>Salvar BAG</button>
    </div>`,'modal-lg');
  window._bagItems=[];
}

function addBagItem(sel) {
  const opt=sel.options[sel.selectedIndex];
  if(!opt.value) return;
  window._bagItems=window._bagItems||[];
  window._bagItems.push({id:opt.value,nome:opt.getAttribute('data-nome'),preco:parseFloat(opt.getAttribute('data-preco')),qty:1,tamanho:'unico'});
  sel.value='';
  renderBagItems();
}

function renderBagItems() {
  const list=document.getElementById('bag-items-list');
  if(!list) return;
  list.innerHTML=window._bagItems.map((i,k)=>`<div class="cart-item">
    <div class="cart-item-info"><h4>${i.nome}</h4><span>${fmt(i.preco)}</span></div>
    <input type="text" value="${i.tamanho}" placeholder="Tam" style="width:60px;padding:4px 6px;border:1px solid var(--border-2);border-radius:4px;font-size:12px" onchange="window._bagItems[${k}].tamanho=this.value">
    <div class="cart-qty">
      <button onclick="window._bagItems[${k}].qty=Math.max(1,window._bagItems[${k}].qty-1);renderBagItems()">-</button>
      <span>${i.qty}</span>
      <button onclick="window._bagItems[${k}].qty++;renderBagItems()">+</button>
    </div>
    <span class="cart-item-price">${fmt(i.preco*i.qty)}</span>
    <button onclick="window._bagItems.splice(${k},1);renderBagItems()" style="background:none;color:var(--red);display:flex"><i data-lucide="x" style="width:14px;height:14px"></i></button>
  </div>`).join('');
  const total=(window._bagItems||[]).reduce((a,i)=>a+i.preco*i.qty,0);
  if(document.getElementById('bag-total')) document.getElementById('bag-total').textContent=fmt(total);
  lucide.createIcons();
}

async function saveBag() {
  if(!(window._bagItems||[]).length) return toast('Adicione produtos ao BAG','error');
  const total=(window._bagItems).reduce((a,i)=>a+i.preco*i.qty,0);
  const {data:bag}=await sb.from('bags').insert({cliente_id:document.getElementById('bg-cli').value||null,vendedor_id:document.getElementById('bg-vd').value||null,data_retorno:document.getElementById('bg-ret').value||null,total}).select().single();
  await sb.from('bag_itens').insert(window._bagItems.map(i=>({bag_id:bag.id,produto_id:i.id,produto_nome:i.nome,tamanho:i.tamanho,quantidade:i.qty,preco_unitario:i.preco,total:i.preco*i.qty})));
  closeModalDirect();toast('BAG criado');renderBAG();
}

async function efetivarBAG(id) {
  if(!confirm('Efetivar BAG como venda?')) return;
  await sb.from('bags').update({status:'efetivada'}).eq('id',id);
  toast('BAG efetivado');renderBAG();
}

async function verBAG(id) {
  const [{data:b},{data:itens}]=await Promise.all([
    sb.from('bags').select('*,clientes(nome),vendedores(nome)').eq('id',id).single(),
    sb.from('bag_itens').select('*').eq('bag_id',id)
  ]);
  openModal(`
    <div class="modal-header"><h3>BAG #${b?.numero_bag||b?.id}</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body">
      <div class="form-row" style="margin-bottom:16px">
        <div><strong>Cliente:</strong> ${b?.clientes?.nome||'\u2014'}</div>
        <div><strong>Retorno:</strong> ${fmtDate(b?.data_retorno)}</div>
        <div><strong>Status:</strong> ${badgeStatus(b?.status)}</div>
      </div>
      <table class="data-table">
        <thead><tr><th>Produto</th><th>Tamanho</th><th>Qtd</th><th>Total</th></tr></thead>
        <tbody>${(itens||[]).map(i=>`<tr><td>${i.produto_nome}</td><td>${i.tamanho||'\u2014'}</td><td>${i.quantidade}</td><td>${fmt(i.total)}</td></tr>`).join('')}</tbody>
      </table>
      <div style="text-align:right;margin-top:12px;font-size:16px;font-weight:700">Total: ${fmt(b?.total)}</div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModalDirect()">Fechar</button></div>`,'modal-lg');
}

// ===== TROCAS =====
async function renderTrocas() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openTrocaModal()"><i data-lucide="plus"></i>Nova Troca/Devolucao</button>`;
  const {data}=await sb.from('trocas').select('*,clientes(nome)').order('created_at',{ascending:false});
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Data</th><th>Cliente</th><th>Tipo</th><th>Motivo</th><th>Credito</th><th>Status</th><th>Acoes</th></tr></thead>
        <tbody>${(data||[]).map(t=>`<tr>
          <td>${fmtDate((t.data_troca||t.created_at)?.split('T')[0])}</td>
          <td>${t.clientes?.nome||'\u2014'}</td>
          <td><span class="badge badge-${t.tipo==='troca'?'blue':'yellow'}" style="text-transform:capitalize">${t.tipo||'troca'}</span></td>
          <td>${t.motivo||'\u2014'}</td>
          <td>${fmt(t.valor_credito||t.valor||0)}</td>
          <td>${badgeStatus(t.status)}</td>
          <td><button class="btn btn-sm btn-success" onclick="concluirTroca('${t.id}')"><i data-lucide="check"></i></button></td>
        </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:var(--text-2)">Nenhuma troca/devolucao</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function openTrocaModal() {
  const {data:cls}=await sb.from('clientes').select('id,nome').eq('ativo',true);
  openModal(`
    <div class="modal-header"><h3>Nova Troca / Devolucao</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-row">
        <div class="form-group"><label>Cliente</label><select id="tr-cli"><option value="">Nenhum</option>${(cls||[]).map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}</select></div>
        <div class="form-group"><label>Tipo</label><select id="tr-tipo"><option value="troca">Troca</option><option value="devolucao">Devolucao</option></select></div>
      </div>
      <div class="form-group"><label>Motivo</label><textarea id="tr-motivo"></textarea></div>
      <div class="form-group"><label>Valor Credito (R$)</label><input id="tr-cred" type="number" step="0.01" value="0"></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveTroca()"><i data-lucide="save"></i>Registrar</button>
    </div>`,'modal-md');
}

async function saveTroca() {
  const payload={
    cliente_id:document.getElementById('tr-cli').value||null,
    tipo:document.getElementById('tr-tipo').value,
    motivo:document.getElementById('tr-motivo').value,
    valor_credito:parseFloat(document.getElementById('tr-cred').value||0),
    valor:parseFloat(document.getElementById('tr-cred').value||0),
    data_troca:new Date().toISOString().split('T')[0]
  };
  const {error} = await sb.from('trocas').insert(payload);
  if(error) return toast('Erro ao registrar troca: '+error.message,'error');
  closeModalDirect();toast('Troca registrada');renderTrocas();
}

async function concluirTroca(id){await sb.from('trocas').update({status:'concluida'}).eq('id',id);toast('Troca concluida');renderTrocas();}

// ===== PAINEL DE VENDAS =====
async function renderPainelVendas() {
  const now=new Date(),m=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const [{data:vs},{data:itens},{data:vds}] = await Promise.all([
    sb.from('vendas').select('total,vendedor_id,vendedores(nome)').gte('created_at',m+'-01').eq('status','concluida'),
    sb.from('venda_itens').select('produto_nome,quantidade,total').gte('created_at',m+'-01'),
    sb.from('vendedores').select('id,nome').eq('ativo',true)
  ]);
  const totalMes=(vs||[]).reduce((a,v)=>a+parseFloat(v.total||0),0);
  const ticketMedio=(vs||[]).length?totalMes/(vs||[]).length:0;

  const porVend={};
  (vs||[]).forEach(v=>{
    if(v.vendedor_id){const n=v.vendedores?.nome||v.vendedor_id;porVend[n]=(porVend[n]||0)+parseFloat(v.total||0);}
  });

  const porProd={};
  (itens||[]).forEach(i=>{porProd[i.produto_nome]=(porProd[i.produto_nome]||{qty:0,total:0});porProd[i.produto_nome].qty+=i.quantidade;porProd[i.produto_nome].total+=parseFloat(i.total||0);});
  const topProds=Object.entries(porProd).sort((a,b)=>b[1].qty-a[1].qty).slice(0,10);
  const topVends=Object.entries(porVend).sort((a,b)=>b[1]-a[1]).slice(0,5);

  document.getElementById('content').innerHTML=`
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${fmt(totalMes)}</div><div class="stat-label">Faturamento do mes</div></div>
      <div class="stat-card"><div class="stat-value">${(vs||[]).length}</div><div class="stat-label">Vendas realizadas</div></div>
      <div class="stat-card"><div class="stat-value">${fmt(ticketMedio)}</div><div class="stat-label">Ticket medio</div></div>
      <div class="stat-card"><div class="stat-value">${topVends.length}</div><div class="stat-label">Vendedores ativos</div></div>
    </div>
    <div class="dash-grid">
      <div class="card">
        <div class="card-header"><h3>Top 10 Produtos Mais Vendidos</h3></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Produto</th><th>Qtd</th><th>Total</th></tr></thead>
          <tbody>${topProds.map(([k,v])=>`<tr><td>${k}</td><td><strong>${v.qty}</strong></td><td>${fmt(v.total)}</td></tr>`).join('')||'<tr><td colspan="3" style="text-align:center;color:var(--text-2)">Sem dados</td></tr>'}</tbody>
        </table></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Ranking de Vendedores</h3></div>
        <div class="card-body">
          ${topVends.map(([n,v],i)=>`<div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span><strong>#${i+1}</strong> ${n}</span><span>${fmt(v)}</span>
            </div>
            <div class="progress-bar"><div class="progress-bar-fill" style="width:${topVends[0]?((v/topVends[0][1])*100):0}%"></div></div>
          </div>`).join('')||'<p style="color:var(--text-2)">Sem dados de vendedores</p>'}
        </div>
      </div>
    </div>`;
  lucide.createIcons();
}

// ===== COMISSOES =====
async function renderComissoes() {
  const now=new Date(),m=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const {data:vs}=await sb.from('vendas').select('total,vendedor_id,vendedores(nome,comissao_percentual)').gte('created_at',m+'-01').eq('status','concluida');
  const porVend={};
  (vs||[]).filter(v=>v.vendedor_id).forEach(v=>{
    const k=v.vendedor_id;
    if(!porVend[k]) porVend[k]={nome:v.vendedores?.nome||'\u2014',pct:v.vendedores?.comissao_percentual||0,total:0,qtd:0};
    porVend[k].total+=parseFloat(v.total||0);porVend[k].qtd++;
  });

  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-header"><h3>Comissoes - ${new Date().toLocaleString('pt-BR',{month:'long',year:'numeric'})}</h3></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Vendedor</th><th>Qtd Vendas</th><th>Total Vendido</th><th>Comissao %</th><th>Comissao R$</th></tr></thead>
        <tbody>${Object.values(porVend).map(v=>`<tr>
          <td><strong>${v.nome}</strong></td>
          <td>${v.qtd}</td>
          <td>${fmt(v.total)}</td>
          <td>${fmtNum(v.pct)}%</td>
          <td><strong style="color:var(--green)">${fmt(v.total*v.pct/100)}</strong></td>
        </tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--text-2)">Nenhuma venda com vendedor associado</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

// ===== METAS DE VENDAS =====
async function renderMetas() {
  document.getElementById('topbar-actions').innerHTML = '';
  document.getElementById('content').innerHTML = `
    <div class="card">
      <div class="card-body" style="text-align:center;padding:48px 24px">
        <i data-lucide="target" style="width:48px;height:48px;color:var(--accent);margin-bottom:16px"></i>
        <h3 style="margin-bottom:8px;color:var(--text-1)">Metas de Vendas</h3>
        <p style="color:var(--text-2)">Modulo de metas em desenvolvimento.</p>
      </div>
    </div>`;
  lucide.createIcons();
}
