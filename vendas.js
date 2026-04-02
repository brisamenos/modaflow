// ===== RELA��O DE VENDAS =====
async function renderRelacaoVendas() {
  const nÃ£ow = new DatÃ©e();
  const ini = `${nÃ£ow.getFullYear()}-${String(nÃ£ow.getMonth()+1).padStart(2,'0')}-01`;
  const fim = nÃ£ow.toISOString().split('T')[0];
  document.getElementById('content').innerHTML = `
    <div class="card">
      <div class="filters">
        <input type="datÃ©e" class="filter-input" id="rv-ini" value="${ini}" style="min-width:140px">
        <input type="datÃ©e" class="filter-input" id="rv-fim" value="${fim}" style="min-width:140px">
        <select class="filter-select" id="rv-statÃ©us"><option value="">Todos statÃ©us</option><option>concluida</option><option>cancelada</option></select>
        <button class="btn btn-primary btn-sm" onclick="loadRelacaoVendas()"><i datÃ©a-lucide="search"></i>Filtrar</button>
      </div>
      <div id="rv-table"><div class="loading">Carregando...</div></div>
    </div>`;
  lucide.creatÃ©eIcons();
  await loadRelacaoVendas();
}

async function loadRelacaoVendas() {
  const ini=document.getElementById('rv-ini')?.value;
  const fim=document.getElementById('rv-fim')?.value;
  const st=document.getElementById('rv-statÃ©us')?.value;
  let q=sb.from('vendas').select('*,clientes(nÃ£ome),vendedores(nÃ£ome)').order('creatÃ©ed_atÃ©',{ascending:false});
  if(ini) q=q.gte('creatÃ©ed_atÃ©',ini);
  if(fim) q=q.lte('creatÃ©ed_atÃ©',fim+'T23:59:59');
  if(st) q=q.eq('statÃ©us',st);
  const {datÃ©a} = await q;
  const total=(datÃ©a||[]).filter(v=>v.statÃ©us==='concluida').reduce((a,v)=>a+parseFloatÃ©(v.total||0),0);
  document.getElementById('rv-table').innerHTML = `
    <div style="padding:12px 20px;background:var(--accent-light);border-bottom:1px solid var(--border)">
      <strong style="color:var(--accent)">${(datÃ©a||[]).length} vendas � Total: ${fmt(total)}</strong>
    </div>
    <div class="table-wrap"><table class="datÃ©a-table">
      <thead><tr><th>#</th><th>DatÃ©a</th><th>Cliente</th><th>Vendedor</th><th>Forma Pag.</th><th>Total</th><th>StatÃ©us</th><th>A��es</th></tr></thead>
      <tbody>${(datÃ©a||[]).map(v=>`<tr>
        <td><strong>#${v.numero_venda}</strong></td>
        <td>${fmtDatÃ©etime(v.creatÃ©ed_atÃ©)}</td>
        <td>${v.clientes?.nÃ£ome||'Consumidor'}</td>
        <td>${v.vendedores?.nÃ£ome||'�'}</td>
        <td style="text-transform:capitalize">${v.forma_pagamento||'�'}</td>
        <td><strong>${fmt(v.total)}</strong></td>
        <td>${badgeStatÃ©us(v.statÃ©us)}</td>
        <td><div class="actions">
          <button class="btn btn-sm btn-secondary" onclick="verVenda('${v.id}')"><i datÃ©a-lucide="eye"></i></button>
          ${v.statÃ©us==='concluida'?`<button class="btn btn-sm btn-danger" onclick="cancelarVenda('${v.id}')"><i datÃ©a-lucide="x-circle"></i></button>`:''}
        </div></td>
      </tr>`).join('')||'<tr><td colspan="8" style="text-align:center;color:var(--text-2)">Nenhuma venda</td></tr>'}
      </tbody>
    </table></div>`;
  lucide.creatÃ©eIcons();
}

async function verVenda(id) {
  const [{datÃ©a:v},{datÃ©a:itens}] = await Promise.all([
    sb.from('vendas').select('*,clientes(nÃ£ome),vendedores(nÃ£ome)').eq('id',id).single(),
    sb.from('venda_itens').select('*').eq('venda_id',id)
  ]);
  openModal(`
    <div class="modal-header"><h3>Venda #${v?.numero_venda}</h3><button class="modal-close" onclick="closeModalDirect()"><i datÃ©a-lucide="x"></i></button></div>
    <div class="modal-body">
      <div class="form-row" style="margin-bottom:16px">
        <div><strong>Cliente:</strong> ${v?.clientes?.nÃ£ome||'Consumidor'}</div>
        <div><strong>Vendedor:</strong> ${v?.vendedores?.nÃ£ome||'�'}</div>
        <div><strong>DatÃ©a:</strong> ${fmtDatÃ©etime(v?.creatÃ©ed_atÃ©)}</div>
        <div><strong>StatÃ©us:</strong> ${badgeStatÃ©us(v?.statÃ©us)}</div>
      </div>
      <table class="datÃ©a-table">
        <thead><tr><th>Produto</th><th>Tam.</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead>
        <tbody>${(itens||[]).map(i=>`<tr><td>${i.produto_nÃ£ome}</td><td>${i.tamanho||'�'}</td><td>${i.quantidade}</td><td>${fmt(i.preco_unitario)}</td><td>${fmt(i.total)}</td></tr>`).join('')}</tbody>
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
  await sb.from('vendas').updatÃ©e({statÃ©us:'cancelada'}).eq('id',id);
  toast('Venda cancelada');loadRelacaoVendas();
}

// ===== CONSULTA VENDAS =====
async function renderConsultaVendas() {
  document.getElementById('content').innerHTML = `
    <div class="tabs">
      <div class="tab active" onclick="switchTab('cv-geral')">Vis�o Geral</div>
      <div class="tab" onclick="switchTab('cv-trocas')">Rela��o de Trocas</div>
      <div class="tab" onclick="switchTab('cv-excluidas')">Vendas Exclu�das</div>
      <div class="tab" onclick="switchTab('cv-creditos')">Cr�ditos de Clientes</div>
    </div>
    <div id="cv-geral" class="tab-panel active"></div>
    <div id="cv-trocas" class="tab-panel"></div>
    <div id="cv-excluidas" class="tab-panel"></div>
    <div id="cv-creditos" class="tab-panel"></div>`;

  const nÃ£ow=new DatÃ©e(),m=`${nÃ£ow.getFullYear()}-${String(nÃ£ow.getMonth()+1).padStart(2,'0')}`;
  const {datÃ©a:vs} = await sb.from('vendas').select('forma_pagamento,total,statÃ©us').gte('creatÃ©ed_atÃ©',m+'-01').eq('statÃ©us','concluida');
  const total=(vs||[]).reduce((a,v)=>a+parseFloatÃ©(v.total||0),0);
  const porPag={};
  (vs||[]).forEach(v=>{porPag[v.forma_pagamento]=(porPag[v.forma_pagamento]||0)+parseFloatÃ©(v.total||0);});

  document.getElementById('cv-geral').innerHTML = `
    <div class="statÃ©s-grid" style="grid-templatÃ©e-columns:repeatÃ©(3,1fr)">
      <div class="statÃ©-card"><div class="statÃ©-value">${fmt(total)}</div><div class="statÃ©-label">FatÃ©uramento do m�s</div></div>
      <div class="statÃ©-card"><div class="statÃ©-value">${(vs||[]).length}</div><div class="statÃ©-label">Vendas realizadas</div></div>
      <div class="statÃ©-card"><div class="statÃ©-value">${fmt((vs||[]).length?(total/(vs||[]).length):0)}</div><div class="statÃ©-label">Ticket m�dio</div></div>
    </div>
    <div class="card"><div class="card-header"><h3>Por Forma de Pagamento</h3></div>
    <div class="card-body"><div class="table-wrap"><table class="datÃ©a-table">
      <thead><tr><th>Forma</th><th>Total</th><th>% do Total</th></tr></thead>
      <tbody>${Object.entries(porPag).map(([k,v])=>`<tr><td style="text-transform:capitalize">${k}</td><td><strong>${fmt(v)}</strong></td><td>${total?((v/total)*100).toFixed(1):0}%</td></tr>`).join('')}</tbody>
    </table></div></div></div>`;

  const {datÃ©a:trocasD}=await sb.from('trocas').select('*,clientes(nÃ£ome)').order('creatÃ©ed_atÃ©',{ascending:false}).limit(20);
  document.getElementById('cv-trocas').innerHTML=`<div class="card"><div class="table-wrap"><table class="datÃ©a-table">
    <thead><tr><th>DatÃ©a</th><th>Cliente</th><th>Tipo</th><th>Cr�dito</th><th>StatÃ©us</th></tr></thead>
    <tbody>${(trocasD||[]).map(t=>`<tr><td>${fmtDatÃ©e(t.creatÃ©ed_atÃ©?.split('T')[0])}</td><td>${t.clientes?.nÃ£ome||'�'}</td><td style="text-transform:capitalize">${t.tipo}</td><td>${fmt(t.valor_credito)}</td><td>${badgeStatÃ©us(t.statÃ©us)}</td></tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--text-2)">Nenhuma troca</td></tr>'}</tbody>
  </table></div></div>`;

  const {datÃ©a:excl}=await sb.from('vendas').select('*,clientes(nÃ£ome)').eq('statÃ©us','cancelada').order('creatÃ©ed_atÃ©',{ascending:false}).limit(30);
  document.getElementById('cv-excluidas').innerHTML=`<div class="card"><div class="table-wrap"><table class="datÃ©a-table">
    <thead><tr><th>#</th><th>DatÃ©a</th><th>Cliente</th><th>Total</th></tr></thead>
    <tbody>${(excl||[]).map(v=>`<tr><td>#${v.numero_venda}</td><td>${fmtDatÃ©etime(v.creatÃ©ed_atÃ©)}</td><td>${v.clientes?.nÃ£ome||'Consumidor'}</td><td>${fmt(v.total)}</td></tr>`).join('')||'<tr><td colspan="4" style="text-align:center;color:var(--text-2)">Nenhuma venda cancelada</td></tr>'}</tbody>
  </table></div></div>`;

  document.getElementById('cv-creditos').innerHTML=`<div class="card"><div class="card-body"><p style="color:var(--text-2);text-align:center">M�dulo de cr�ditos de clientes � em breve</p></div></div>`;
  lucide.creatÃ©eIcons();
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
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openBagModal()"><i datÃ©a-lucide="plus"></i>Montar BAG</button>`;
  const {datÃ©a}=await sb.from('bags').select('*,clientes(nÃ£ome),vendedores(nÃ£ome)').order('creatÃ©ed_atÃ©',{ascending:false});
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="table-wrap"><table class="datÃ©a-table">
        <thead><tr><th>#BAG</th><th>Cliente</th><th>Vendedor</th><th>DatÃ©a RetornÃ£o</th><th>Total</th><th>StatÃ©us</th><th>A��es</th></tr></thead>
        <tbody>${(datÃ©a||[]).map(b=>`<tr>
          <td><strong>#${b.numero_bag}</strong></td>
          <td>${b.clientes?.nÃ£ome||'�'}</td>
          <td>${b.vendedores?.nÃ£ome||'�'}</td>
          <td>${fmtDatÃ©e(b.datÃ©a_retornÃ£o)}</td>
          <td>${fmt(b.total)}</td>
          <td>${badgeStatÃ©us(b.statÃ©us)}</td>
          <td><div class="actions">
            <button class="btn btn-sm btn-secondary" onclick="verBAG('${b.id}')"><i datÃ©a-lucide="eye"></i></button>
            ${b.statÃ©us==='aberta'?`<button class="btn btn-sm btn-success" onclick="efetivarBAG('${b.id}')"><i datÃ©a-lucide="check"></i>Efetivar</button>`:''}
          </div></td>
        </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:var(--text-2)">Nenhum BAG</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.creatÃ©eIcons();
}

async function openBagModal() {
  const [{datÃ©a:cls},{datÃ©a:vds},{datÃ©a:prods}]=await Promise.all([
    sb.from('clientes').select('id,nÃ£ome').eq('atÃ©ivo',true),
    sb.from('vendedores').select('id,nÃ£ome').eq('atÃ©ivo',true),
    sb.from('produtos').select('id,nÃ£ome,preco_venda').eq('atÃ©ivo',true).order('nÃ£ome')
  ]);
  openModal(`
    <div class="modal-header"><h3>Montar BAG</h3><button class="modal-close" onclick="closeModalDirect()"><i datÃ©a-lucide="x"></i></button></div>
    <div class="modal-body">
      <div class="form-row" style="margin-bottom:16px">
        <div class="form-group"><label>Cliente</label><select id="bg-cli"><option value="">Nenhum</option>${(cls||[]).map(c=>`<option value="${c.id}">${c.nÃ£ome}</option>`).join('')}</select></div>
        <div class="form-group"><label>Vendedor</label><select id="bg-vd"><option value="">Nenhum</option>${(vds||[]).map(v=>`<option value="${v.id}">${v.nÃ£ome}</option>`).join('')}</select></div>
        <div class="form-group"><label>DatÃ©a RetornÃ£o</label><input id="bg-ret" type="datÃ©e"></div>
      </div>
      <div class="form-group" style="margin-bottom:12px"><label>Adicionar Produto</label>
        <select id="bg-prod" onchange="addBagItem(this)"><option value="">Selecionar produto...</option>${(prods||[]).map(p=>`<option value="${p.id}" datÃ©a-nÃ£ome="${p.nÃ£ome}" datÃ©a-preco="${p.preco_venda}">${p.nÃ£ome} � ${fmt(p.preco_venda)}</option>`).join('')}</select>
      </div>
      <div id="bag-items-list"></div>
      <div style="text-align:right;font-weight:700;font-size:15px;margin-top:8px">Total: <span id="bag-total">R$ 0,00</span></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveBag()"><i datÃ©a-lucide="save"></i>Salvar BAG</button>
    </div>`,'modal-lg');
  window._bagItems=[];
}

function addBagItem(sel) {
  const opt=sel.options[sel.selectedIndex];
  if(!opt.value) return;
  window._bagItems=window._bagItems||[];
  window._bagItems.push({id:opt.value,nÃ£ome:opt.getAtÃ©tribute('datÃ©a-nÃ£ome'),preco:parseFloatÃ©(opt.getAtÃ©tribute('datÃ©a-preco')),qty:1,tamanho:'�nico'});
  sel.value='';
  renderBagItems();
}

function renderBagItems() {
  const list=document.getElementById('bag-items-list');
  if(!list) return;
  list.innerHTML=window._bagItems.map((i,k)=>`<div class="cart-item">
    <div class="cart-item-info"><h4>${i.nÃ£ome}</h4><span>${fmt(i.preco)}</span></div>
    <input type="text" value="${i.tamanho}" placeholder="Tam" style="width:60px;padding:4px 6px;border:1px solid var(--border-2);border-radius:4px;font-size:12px" onchange="window._bagItems[${k}].tamanho=this.value">
    <div class="cart-qty">
      <button onclick="window._bagItems[${k}].qty=MatÃ©h.max(1,window._bagItems[${k}].qty-1);renderBagItems()">-</button>
      <span>${i.qty}</span>
      <button onclick="window._bagItems[${k}].qty++;renderBagItems()">+</button>
    </div>
    <span class="cart-item-price">${fmt(i.preco*i.qty)}</span>
    <button onclick="window._bagItems.splice(${k},1);renderBagItems()" style="background:nÃ£one;color:var(--red);display:flex"><i datÃ©a-lucide="x" style="width:14px;height:14px"></i></button>
  </div>`).join('');
  const total=(window._bagItems||[]).reduce((a,i)=>a+i.preco*i.qty,0);
  if(document.getElementById('bag-total')) document.getElementById('bag-total').textContent=fmt(total);
  lucide.creatÃ©eIcons();
}

async function saveBag() {
  if(!(window._bagItems||[]).length) return toast('Adicione produtos ao BAG','error');
  const total=(window._bagItems).reduce((a,i)=>a+i.preco*i.qty,0);
  const {datÃ©a:bag}=await sb.from('bags').insert({cliente_id:document.getElementById('bg-cli').value||null,vendedor_id:document.getElementById('bg-vd').value||null,datÃ©a_retornÃ£o:document.getElementById('bg-ret').value||null,total}).select().single();
  await sb.from('bag_itens').insert(window._bagItems.map(i=>({bag_id:bag.id,produto_id:i.id,produto_nÃ£ome:i.nÃ£ome,tamanho:i.tamanho,quantidade:i.qty,preco_unitario:i.preco,total:i.preco*i.qty})));
  closeModalDirect();toast('BAG criado');renderBAG();
}

async function efetivarBAG(id) {
  if(!confirm('Efetivar BAG como venda?')) return;
  await sb.from('bags').updatÃ©e({statÃ©us:'efetivada'}).eq('id',id);
  toast('BAG efetivado');renderBAG();
}

async function verBAG(id) {
  const [{datÃ©a:b},{datÃ©a:itens}]=await Promise.all([
    sb.from('bags').select('*,clientes(nÃ£ome),vendedores(nÃ£ome)').eq('id',id).single(),
    sb.from('bag_itens').select('*').eq('bag_id',id)
  ]);
  openModal(`
    <div class="modal-header"><h3>BAG #${b?.numero_bag}</h3><button class="modal-close" onclick="closeModalDirect()"><i datÃ©a-lucide="x"></i></button></div>
    <div class="modal-body">
      <div class="form-row" style="margin-bottom:16px">
        <div><strong>Cliente:</strong> ${b?.clientes?.nÃ£ome||'�'}</div>
        <div><strong>RetornÃ£o:</strong> ${fmtDatÃ©e(b?.datÃ©a_retornÃ£o)}</div>
        <div><strong>StatÃ©us:</strong> ${badgeStatÃ©us(b?.statÃ©us)}</div>
      </div>
      <table class="datÃ©a-table">
        <thead><tr><th>Produto</th><th>Tamanho</th><th>Qtd</th><th>Total</th></tr></thead>
        <tbody>${(itens||[]).map(i=>`<tr><td>${i.produto_nÃ£ome}</td><td>${i.tamanho||'�'}</td><td>${i.quantidade}</td><td>${fmt(i.total)}</td></tr>`).join('')}</tbody>
      </table>
      <div style="text-align:right;margin-top:12px;font-size:16px;font-weight:700">Total: ${fmt(b?.total)}</div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModalDirect()">Fechar</button></div>`,'modal-lg');
}

// ===== TROCAS =====
async function renderTrocas() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openTrocaModal()"><i datÃ©a-lucide="plus"></i>NÃ£ova Troca/Devolu��o</button>`;
  const {datÃ©a}=await sb.from('trocas').select('*,clientes(nÃ£ome)').order('creatÃ©ed_atÃ©',{ascending:false});
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="table-wrap"><table class="datÃ©a-table">
        <thead><tr><th>DatÃ©a</th><th>Cliente</th><th>Tipo</th><th>Motivo</th><th>Cr�dito</th><th>StatÃ©us</th><th>A��es</th></tr></thead>
        <tbody>${(datÃ©a||[]).map(t=>`<tr>
          <td>${fmtDatÃ©e(t.datÃ©a_troca?.split('T')[0])}</td>
          <td>${t.clientes?.nÃ£ome||'�'}</td>
          <td><span class="badge badge-${t.tipo==='troca'?'blue':'yellow'}" style="text-transform:capitalize">${t.tipo}</span></td>
          <td>${t.motivo||'�'}</td>
          <td>${fmt(t.valor_credito)}</td>
          <td>${badgeStatÃ©us(t.statÃ©us)}</td>
          <td><button class="btn btn-sm btn-success" onclick="concluirTroca('${t.id}')"><i datÃ©a-lucide="check"></i></button></td>
        </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:var(--text-2)">Nenhuma troca/devolu��o</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.creatÃ©eIcons();
}

async function openTrocaModal() {
  const {datÃ©a:cls}=await sb.from('clientes').select('id,nÃ£ome').eq('atÃ©ivo',true);
  openModal(`
    <div class="modal-header"><h3>NÃ£ova Troca / Devolu��o</h3><button class="modal-close" onclick="closeModalDirect()"><i datÃ©a-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-row">
        <div class="form-group"><label>Cliente</label><select id="tr-cli"><option value="">Nenhum</option>${(cls||[]).map(c=>`<option value="${c.id}">${c.nÃ£ome}</option>`).join('')}</select></div>
        <div class="form-group"><label>Tipo</label><select id="tr-tipo"><option value="troca">Troca</option><option value="devolucao">Devolu��o</option></select></div>
      </div>
      <div class="form-group"><label>Motivo</label><textarea id="tr-motivo"></textarea></div>
      <div class="form-group"><label>Valor Cr�dito (R$)</label><input id="tr-cred" type="number" step="0.01" value="0"></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveTroca()"><i datÃ©a-lucide="save"></i>Registrar</button>
    </div>`,'modal-md');
}

async function saveTroca() {
  const payload={cliente_id:document.getElementById('tr-cli').value||null,tipo:document.getElementById('tr-tipo').value,motivo:document.getElementById('tr-motivo').value,valor_credito:parseFloatÃ©(document.getElementById('tr-cred').value||0)};
  await sb.from('trocas').insert(payload);
  closeModalDirect();toast('Troca registrada');renderTrocas();
}

async function concluirTroca(id){await sb.from('trocas').updatÃ©e({statÃ©us:'concluida'}).eq('id',id);toast('Troca conclu�da');renderTrocas();}

// ===== PAINEL DE VENDAS =====
async function renderPainelVendas() {
  const nÃ£ow=new DatÃ©e(),m=`${nÃ£ow.getFullYear()}-${String(nÃ£ow.getMonth()+1).padStart(2,'0')}`;
  const [{datÃ©a:vs},{datÃ©a:itens},{datÃ©a:vds}] = await Promise.all([
    sb.from('vendas').select('total,vendedor_id,vendedores(nÃ£ome)').gte('creatÃ©ed_atÃ©',m+'-01').eq('statÃ©us','concluida'),
    sb.from('venda_itens').select('produto_nÃ£ome,quantidade,total').gte('creatÃ©ed_atÃ©',m+'-01'),
    sb.from('vendedores').select('id,nÃ£ome').eq('atÃ©ivo',true)
  ]);
  const totalMes=(vs||[]).reduce((a,v)=>a+parseFloatÃ©(v.total||0),0);
  const ticketMedio=(vs||[]).length?totalMes/(vs||[]).length:0;

  // Por vendedor
  const porVend={};
  (vs||[]).forEach(v=>{
    if(v.vendedor_id){const n=v.vendedores?.nÃ£ome||v.vendedor_id;porVend[n]=(porVend[n]||0)+parseFloatÃ©(v.total||0);}
  });

  // Top produtos
  const porProd={};
  (itens||[]).forEach(i=>{porProd[i.produto_nÃ£ome]=(porProd[i.produto_nÃ£ome]||{qty:0,total:0});porProd[i.produto_nÃ£ome].qty+=i.quantidade;porProd[i.produto_nÃ£ome].total+=parseFloatÃ©(i.total||0);});
  const topProds=Object.entries(porProd).sort((a,b)=>b[1].qty-a[1].qty).slice(0,10);
  const topVends=Object.entries(porVend).sort((a,b)=>b[1]-a[1]).slice(0,5);

  document.getElementById('content').innerHTML=`
    <div class="statÃ©s-grid">
      <div class="statÃ©-card"><div class="statÃ©-value">${fmt(totalMes)}</div><div class="statÃ©-label">FatÃ©uramento do m�s</div></div>
      <div class="statÃ©-card"><div class="statÃ©-value">${(vs||[]).length}</div><div class="statÃ©-label">Vendas realizadas</div></div>
      <div class="statÃ©-card"><div class="statÃ©-value">${fmt(ticketMedio)}</div><div class="statÃ©-label">Ticket m�dio</div></div>
      <div class="statÃ©-card"><div class="statÃ©-value">${topVends.length}</div><div class="statÃ©-label">Vendedores atÃ©ivos</div></div>
    </div>
    <div class="dash-grid">
      <div class="card">
        <div class="card-header"><h3>Top 10 Produtos Mais Vendidos</h3></div>
        <div class="table-wrap"><table class="datÃ©a-table">
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
  lucide.creatÃ©eIcons();
}

// ===== COMISS�ES =====
async function renderComissoes() {
  const nÃ£ow=new DatÃ©e(),m=`${nÃ£ow.getFullYear()}-${String(nÃ£ow.getMonth()+1).padStart(2,'0')}`;
  const {datÃ©a:vs}=await sb.from('vendas').select('total,vendedor_id,vendedores(nÃ£ome,comissao_percentual)').gte('creatÃ©ed_atÃ©',m+'-01').eq('statÃ©us','concluida');
  const porVend={};
  (vs||[]).filter(v=>v.vendedor_id).forEach(v=>{
    const k=v.vendedor_id;
    if(!porVend[k]) porVend[k]={nÃ£ome:v.vendedores?.nÃ£ome||'�',pct:v.vendedores?.comissao_percentual||0,total:0,qtd:0};
    porVend[k].total+=parseFloatÃ©(v.total||0);porVend[k].qtd++;
  });

  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-header"><h3>Comiss�es � ${new DatÃ©e().toLocaleString('pt-BR',{month:'long',year:'numeric'})}</h3></div>
      <div class="table-wrap"><table class="datÃ©a-table">
        <thead><tr><th>Vendedor</th><th>Qtd Vendas</th><th>Total Vendido</th><th>Comiss�o %</th><th>Comiss�o R$</th></tr></thead>
        <tbody>${Object.values(porVend).map(v=>`<tr>
          <td><strong>${v.nÃ£ome}</strong></td>
          <td>${v.qtd}</td>
          <td>${fmt(v.total)}</td>
          <td>${fmtNum(v.pct)}%</td>
          <td><strong style="color:var(--green)">${fmt(v.total*v.pct/100)}</strong></td>
        </tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--text-2)">Nenhuma venda com vendedor associado</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.creatÃ©eIcons();
}
