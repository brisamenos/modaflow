// ===== RELAÇÃO DE VENDAS =====
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
      <strong style="color:var(--accent)">${(data||[]).length} vendas à Total: ${fmt(total)}</strong>
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>#</th><th>Data</th><th>Cliente</th><th>Vendedor</th><th>Forma Pag.</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>${(data||[]).map(v=>`<tr>
        <td><strong>#${v.numero_venda}</strong></td>
        <td>${fmtDatetime(v.created_at)}</td>
        <td>${v.clientes?.nome||'Consumidor'}</td>
        <td>${v.vendedores?.nome||'—'}</td>
        <td style="text-transform:capitalize">${v.forma_pagamento||'—'}</td>
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
        <div><strong>Vendedor:</strong> ${v?.vendedores?.nome||'—'}</div>
        <div><strong>Data:</strong> ${fmtDatetime(v?.created_at)}</div>
        <div><strong>Status:</strong> ${badgeStatus(v?.status)}</div>
      </div>
      <table class="data-table">
        <thead><tr><th>Produto</th><th>Tam.</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead>
        <tbody>${(itens||[]).map(i=>`<tr><td>${i.produto_nome}</td><td>${i.tamanho||'—'}</td><td>${i.quantidade}</td><td>${fmt(i.preco_unitario)}</td><td>${fmt(i.total)}</td></tr>`).join('')}</tbody>
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

// ===== CONSULTA VENDAS =====
async function renderConsultaVendas() {
  document.getElementById('content').innerHTML = `
    <div class="tabs">
      <div class="tab active" onclick="switchTab('cv-geral')">Visão Geral</div>
      <div class="tab" onclick="switchTab('cv-trocas')">Relação de Trocas</div>
      <div class="tab" onclick="switchTab('cv-excluidas')">Vendas Excluídas</div>
      <div class="tab" onclick="switchTab('cv-creditos')">Créditos de Clientes</div>
    </div>
    <div id="cv-geral" class="tab-panel active"></div>
    <div id="cv-trocas" class="tab-panel"></div>
    <div id="cv-excluidas" class="tab-panel"></div>
    <div id="cv-creditos" class="tab-panel"></div>`;

  const now=new Date(),m=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const {data:vs} = await sb.from('vendas').select('forma_pagamento,total,status').gte('created_at',m+'-01').eq('status','concluida');
  const total=(vs||[]).reduce((a,v)=>a+parseFloat(v.total||0),0);
  const porPag={};
  (vs||[]).forEach(v=>{porPag[v.forma_pagamento]=(porPag[v.forma_pagamento]||0)+parseFloat(v.total||0);});

  document.getElementById('cv-geral').innerHTML = `
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card"><div class="stat-value">${fmt(total)}</div><div class="stat-label">Faturamento do mês</div></div>
      <div class="stat-card"><div class="stat-value">${(vs||[]).length}</div><div class="stat-label">Vendas realizadas</div></div>
      <div class="stat-card"><div class="stat-value">${fmt((vs||[]).length?(total/(vs||[]).length):0)}</div><div class="stat-label">Ticket médio</div></div>
    </div>
    <div class="card"><div class="card-header"><h3>Por Forma de Pagamento</h3></div>
    <div class="card-body"><div class="table-wrap"><table class="data-table">
      <thead><tr><th>Forma</th><th>Total</th><th>% do Total</th></tr></thead>
      <tbody>${Object.entries(porPag).map(([k,v])=>`<tr><td style="text-transform:capitalize">${k}</td><td><strong>${fmt(v)}</strong></td><td>${total?((v/total)*100).toFixed(1):0}%</td></tr>`).join('')}</tbody>
    </table></div></div></div>`;

  const {data:trocasD}=await sb.from('trocas').select('*,clientes(nome)').order('created_at',{ascending:false}).limit(20);
  document.getElementById('cv-trocas').innerHTML=`<div class="card"><div class="table-wrap"><table class="data-table">
    <thead><tr><th>Data</th><th>Cliente</th><th>Tipo</th><th>Crédito</th><th>Status</th></tr></thead>
    <tbody>${(trocasD||[]).map(t=>`<tr><td>${fmtDate((t.data_troca||t.created_at)?.split('T')[0])}</td><td>${t.clientes?.nome||'—'}</td><td style="text-transform:capitalize">${t.tipo||'troca'}</td><td>${fmt(t.valor_credito||t.valor||0)}</td><td>${badgeStatus(t.status)}</td></tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--text-2)">Nenhuma troca</td></tr>'}</tbody>
  </table></div></div>`;

  const {data:excl}=await sb.from('vendas').select('*,clientes(nome)').eq('status','cancelada').order('created_at',{ascending:false}).limit(30);
  document.getElementById('cv-excluidas').innerHTML=`<div class="card"><div class="table-wrap"><table class="data-table">
    <thead><tr><th>#</th><th>Data</th><th>Cliente</th><th>Total</th></tr></thead>
    <tbody>${(excl||[]).map(v=>`<tr><td>#${v.numero_venda}</td><td>${fmtDatetime(v.created_at)}</td><td>${v.clientes?.nome||'Consumidor'}</td><td>${fmt(v.total)}</td></tr>`).join('')||'<tr><td colspan="4" style="text-align:center;color:var(--text-2)">Nenhuma venda cancelada</td></tr>'}</tbody>
  </table></div></div>`;

  document.getElementById('cv-creditos').innerHTML=`<div class="card"><div class="card-body"><p style="color:var(--text-2);text-align:center">Módulo de créditos de clientes à em breve</p></div></div>`;
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
        <thead><tr><th>#BAG</th><th>Cliente</th><th>Vendedor</th><th>Data Retorno</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${(data||[]).map(b=>`<tr>
          <td><strong>#${b.numero_bag||b.id}</strong></td>
          <td>${b.clientes?.nome||'—'}</td>
          <td>${b.vendedores?.nome||'—'}</td>
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
        <select id="bg-prod" onchange="addBagItem(this)"><option value="">Selecionar produto...</option>${(prods||[]).map(p=>`<option value="${p.id}" data-nome="${p.nome}" data-preco="${p.preco_venda}">${p.nome} à ${fmt(p.preco_venda)}</option>`).join('')}</select>
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
  window._bagItems.push({id:opt.value,nome:opt.getAttribute('data-nome'),preco:parseFloat(opt.getAttribute('data-preco')),qty:1,tamanho:'único'});
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
        <div><strong>Cliente:</strong> ${b?.clientes?.nome||'—'}</div>
        <div><strong>Retorno:</strong> ${fmtDate(b?.data_retorno)}</div>
        <div><strong>Status:</strong> ${badgeStatus(b?.status)}</div>
      </div>
      <table class="data-table">
        <thead><tr><th>Produto</th><th>Tamanho</th><th>Qtd</th><th>Total</th></tr></thead>
        <tbody>${(itens||[]).map(i=>`<tr><td>${i.produto_nome}</td><td>${i.tamanho||'—'}</td><td>${i.quantidade}</td><td>${fmt(i.total)}</td></tr>`).join('')}</tbody>
      </table>
      <div style="text-align:right;margin-top:12px;font-size:16px;font-weight:700">Total: ${fmt(b?.total)}</div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModalDirect()">Fechar</button></div>`,'modal-lg');
}

// ===== TROCAS =====
async function renderTrocas() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openTrocaModal()"><i data-lucide="plus"></i>Nova Troca/Devolução</button>`;
  const {data}=await sb.from('trocas').select('*,clientes(nome)').order('created_at',{ascending:false});
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Data</th><th>Cliente</th><th>Tipo</th><th>Motivo</th><th>Crédito</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${(data||[]).map(t=>`<tr>
          <td>${fmtDate((t.data_troca||t.created_at)?.split('T')[0])}</td>
          <td>${t.clientes?.nome||'—'}</td>
          <td><span class="badge badge-${t.tipo==='troca'?'blue':'yellow'}" style="text-transform:capitalize">${t.tipo||'troca'}</span></td>
          <td>${t.motivo||'—'}</td>
          <td>${fmt(t.valor_credito||t.valor||0)}</td>
          <td>${badgeStatus(t.status)}</td>
          <td><button class="btn btn-sm btn-success" onclick="concluirTroca('${t.id}')"><i data-lucide="check"></i></button></td>
        </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:var(--text-2)">Nenhuma troca/devolução</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function openTrocaModal() {
  const {data:cls}=await sb.from('clientes').select('id,nome').eq('ativo',true);
  openModal(`
    <div class="modal-header"><h3>Nova Troca / Devolução</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-row">
        <div class="form-group"><label>Cliente</label><select id="tr-cli"><option value="">Nenhum</option>${(cls||[]).map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}</select></div>
        <div class="form-group"><label>Tipo</label><select id="tr-tipo"><option value="troca">Troca</option><option value="devolucao">Devolução</option></select></div>
      </div>
      <div class="form-group"><label>Motivo</label><textarea id="tr-motivo"></textarea></div>
      <div class="form-group"><label>Valor Crédito (R$)</label><input id="tr-cred" type="number" step="0.01" value="0"></div>
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

async function concluirTroca(id){await sb.from('trocas').update({status:'concluida'}).eq('id',id);toast('Troca concluída');renderTrocas();}

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

  // Por vendedor
  const porVend={};
  (vs||[]).forEach(v=>{
    if(v.vendedor_id){const n=v.vendedores?.nome||v.vendedor_id;porVend[n]=(porVend[n]||0)+parseFloat(v.total||0);}
  });

  // Top produtos
  const porProd={};
  (itens||[]).forEach(i=>{porProd[i.produto_nome]=(porProd[i.produto_nome]||{qty:0,total:0});porProd[i.produto_nome].qty+=i.quantidade;porProd[i.produto_nome].total+=parseFloat(i.total||0);});
  const topProds=Object.entries(porProd).sort((a,b)=>b[1].qty-a[1].qty).slice(0,10);
  const topVends=Object.entries(porVend).sort((a,b)=>b[1]-a[1]).slice(0,5);

  document.getElementById('content').innerHTML=`
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${fmt(totalMes)}</div><div class="stat-label">Faturamento do mês</div></div>
      <div class="stat-card"><div class="stat-value">${(vs||[]).length}</div><div class="stat-label">Vendas realizadas</div></div>
      <div class="stat-card"><div class="stat-value">${fmt(ticketMedio)}</div><div class="stat-label">Ticket médio</div></div>
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

// ===== COMISSÕES =====
async function renderComissoes() {
  const now=new Date(),m=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const {data:vs}=await sb.from('vendas').select('total,vendedor_id,vendedores(nome,comissao_percentual)').gte('created_at',m+'-01').eq('status','concluida');
  const porVend={};
  (vs||[]).filter(v=>v.vendedor_id).forEach(v=>{
    const k=v.vendedor_id;
    if(!porVend[k]) porVend[k]={nome:v.vendedores?.nome||'—',pct:v.vendedores?.comissao_percentual||0,total:0,qtd:0};
    porVend[k].total+=parseFloat(v.total||0);porVend[k].qtd++;
  });

  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-header"><h3>Comissões à ${new Date().toLocaleString('pt-BR',{month:'long',year:'numeric'})}</h3></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Vendedor</th><th>Qtd Vendas</th><th>Total Vendido</th><th>Comissão %</th><th>Comissão R$</th></tr></thead>
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
