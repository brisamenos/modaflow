// ===== CREDIÁRIO =====
async function renderCrediario() {
  document.getElementById('content').innerHTML=`
    <div class="tabs">
      <div class="tab active" onclick="switchCrediTab('ct-gestao')">Gestão Crediário</div>
      <div class="tab" onclick="switchCrediTab('ct-atraso')">Crédito em Atraso</div>
      <div class="tab" onclick="switchCrediTab('ct-recebido')">Recebimentos</div>
    </div>
    <div id="ct-gestao" class="tab-panel active"></div>
    <div id="ct-atraso" class="tab-panel"></div>
    <div id="ct-recebido" class="tab-panel"></div>`;

  const {data}=await sb.from('crediario').select('*,clientes(nome)').order('created_at',{ascending:false});
  const renderTable=(rows)=>`<div class="card"><div class="table-wrap"><table class="data-table">
    <thead><tr><th>Cliente</th><th>Total</th><th>Parcelas</th><th>Saldo</th><th>Status</th><th>Ações</th></tr></thead>
    <tbody>${rows.map(c=>`<tr>
      <td><strong>${c.clientes?.nome||'—'}</strong></td>
      <td>${fmt(c.total)}</td>
      <td>${c.parcelas_pagas}/${c.num_parcelas}</td>
      <td><strong style="color:var(--red)">${fmt(c.saldo_devedor)}</strong></td>
      <td>${badgeStatus(c.status)}</td>
      <td><button class="btn btn-sm btn-primary" onclick="verCrediario('${c.id}')"><i data-lucide="eye"></i>Ver Parcelas</button></td>
    </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--text-2)">Nenhum crediário</td></tr>'}
    </tbody></table></div></div>`;

  document.getElementById('ct-gestao').innerHTML=renderTable(data||[]);
  document.getElementById('ct-atraso').innerHTML=renderTable((data||[]).filter(c=>c.status==='atrasado'));
  const {data:pagas}=await sb.from('crediario_parcelas').select('*,crediario(clientes(nome))').eq('status','paga').order('data_pagamento',{ascending:false}).limit(30);
  document.getElementById('ct-recebido').innerHTML=`<div class="card"><div class="table-wrap"><table class="data-table">
    <thead><tr><th>Cliente</th><th>Parcela</th><th>Valor</th><th>Pago em</th></tr></thead>
    <tbody>${(pagas||[]).map(p=>`<tr><td>${p.crediario?.clientes?.nome||'—'}</td><td>#${p.numero_parcela}</td><td>${fmt(p.valor_pago||p.valor)}</td><td>${fmtDate(p.data_pagamento)}</td></tr>`).join('')||'<tr><td colspan="4" style="text-align:center;color:var(--text-2)">Nenhum recebimento</td></tr>'}</tbody>
  </table></div></div>`;
  lucide.createIcons();
}

function switchCrediTab(id){
  const tabs=document.querySelectorAll('.tab');
  const panels=['ct-gestao','ct-atraso','ct-recebido'];
  panels.forEach((p,i)=>{
    const el=document.getElementById(p);
    if(el) el.classList.toggle('active',p===id);
    if(tabs[i]) tabs[i].classList.toggle('active',p===id);
  });
}

async function verCrediario(id) {
  const [{data:c},{data:ps}]=await Promise.all([
    sb.from('crediario').select('*,clientes(nome)').eq('id',id).single(),
    sb.from('crediario_parcelas').select('*').eq('crediario_id',id).order('numero_parcela')
  ]);
  openModal(`
    <div class="modal-header"><h3>Crediário — ${c?.clientes?.nome}</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body">
      <div class="info-list" style="margin-bottom:16px">
        <div class="info-row"><span class="label">Total</span><span class="value">${fmt(c?.total)}</span></div>
        <div class="info-row"><span class="label">Saldo Devedor</span><span class="value" style="color:var(--red)">${fmt(c?.saldo_devedor)}</span></div>
        <div class="info-row"><span class="label">Parcelas pagas</span><span class="value">${c?.parcelas_pagas}/${c?.num_parcelas}</span></div>
      </div>
      <table class="data-table">
        <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${(ps||[]).map(p=>`<tr>
          <td>#${p.numero_parcela}</td>
          <td>${fmtDate(p.vencimento)}</td>
          <td>${fmt(p.valor)}</td>
          <td>${badgeStatus(p.status)}</td>
          <td>${p.status==='aberta'||p.status==='atrasada'?`<button class="btn btn-sm btn-success" onclick="pagarParcela('${p.id}','${id}')"><i data-lucide="check"></i>Receber</button>`:'<span style="color:var(--text-3)">—</span>'}</td>
        </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModalDirect()">Fechar</button></div>`,'modal-lg');
}

async function pagarParcela(parcId, credId) {
  await sb.from('crediario_parcelas').update({status:'paga',data_pagamento:new Date().toISOString().split('T')[0]}).eq('id',parcId);
  const {data:cred}=await sb.from('crediario').select('*').eq('id',credId).single();
  if(cred){
    const pagas=cred.parcelas_pagas+1;
    const saldo=Math.max(0,cred.saldo_devedor-cred.valor_parcela);
    await sb.from('crediario').update({parcelas_pagas:pagas,saldo_devedor:saldo,status:pagas>=cred.num_parcelas?'quitado':'aberto'}).eq('id',credId);
  }
  toast('Parcela recebida');closeModalDirect();renderCrediario();
}

// ===== CONTAS A RECEBER =====
async function renderContasReceber() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openContaReceberModal()"><i data-lucide="plus"></i>Nova Conta</button>`;
  const {data}=await sb.from('contas_receber').select('*,clientes(nome)').order('vencimento');
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Descrição</th><th>Cliente</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${(data||[]).map(c=>`<tr>
          <td>${c.descricao}</td>
          <td>${c.clientes?.nome||'—'}</td>
          <td>${fmtDate(c.vencimento)}</td>
          <td><strong>${fmt(c.valor)}</strong></td>
          <td>${badgeStatus(c.status)}</td>
          <td><div class="actions">
            ${c.status==='aberta'?`<button class="btn btn-sm btn-success" onclick="receberConta('${c.id}')"><i data-lucide="check"></i>Receber</button>`:''}
            <button class="btn btn-sm btn-danger" onclick="deleteContaRec('${c.id}')"><i data-lucide="trash-2"></i></button>
          </div></td>
        </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--text-2)">Nenhuma conta</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function openContaReceberModal() {
  const {data:cls}=await sb.from('clientes').select('id,nome').eq('ativo',true);
  openModal(`
    <div class="modal-header"><h3>Nova Conta a Receber</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>Descrição *</label><input id="cr-desc"></div>
      <div class="form-row">
        <div class="form-group"><label>Cliente</label><select id="cr-cli"><option value="">Nenhum</option>${(cls||[]).map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}</select></div>
        <div class="form-group"><label>Valor (R$) *</label><input id="cr-val" type="number" step="0.01"></div>
      </div>
      <div class="form-group"><label>Vencimento *</label><input id="cr-venc" type="date"></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveContaReceber()"><i data-lucide="save"></i>Salvar</button>
    </div>`,'modal-md');
}

async function saveContaReceber() {
  const payload={descricao:document.getElementById('cr-desc').value.trim(),cliente_id:document.getElementById('cr-cli').value||null,valor:parseFloat(document.getElementById('cr-val').value||0),vencimento:document.getElementById('cr-venc').value};
  if(!payload.descricao||!payload.valor||!payload.vencimento) return toast('Preencha todos os campos obrigatórios','error');
  await sb.from('contas_receber').insert(payload);
  closeModalDirect();toast('Conta cadastrada');renderContasReceber();
}

async function receberConta(id) {
  await sb.from('contas_receber').update({status:'recebida',data_recebimento:new Date().toISOString().split('T')[0]}).eq('id',id);
  toast('Recebimento registrado');renderContasReceber();
}

async function deleteContaRec(id){if(!confirm('Excluir?'))return;await sb.from('contas_receber').delete().eq('id',id);toast('Removido');renderContasReceber();}

// ===== METAS =====
async function renderMetas() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openMetaModal()"><i data-lucide="plus"></i>Definir Meta</button>`;
  const {data:metas}=await sb.from('metas_vendas').select('*,vendedores(nome)').order('ano',{ascending:false});
  const now=new Date();
  const mes=now.getMonth()+1,ano=now.getFullYear();
  const mesStr=`${ano}-${String(mes).padStart(2,'0')}`;
  const {data:vendas}=await sb.from('vendas').select('total,vendedor_id').gte('created_at',mesStr+'-01').eq('status','concluida');
  const totalMes=(vendas||[]).reduce((a,v)=>a+parseFloat(v.total||0),0);
  document.getElementById('content').innerHTML=`
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><h3>Desempenho Atual — ${new Date().toLocaleString('pt-BR',{month:'long',year:'numeric'})}</h3></div>
      <div class="card-body">
        ${(metas||[]).filter(m=>m.mes===mes&&m.ano===ano).map(m=>{
          const realizado=m.tipo==='loja'?totalMes:(vendas||[]).filter(v=>v.vendedor_id===m.vendedor_id).reduce((a,v)=>a+parseFloat(v.total||0),0);
          const pct=m.valor_meta>0?Math.min(100,(realizado/m.valor_meta)*100):0;
          return `<div style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <strong>${m.tipo==='loja'?'Meta da Loja':(m.vendedores?.nome||'Vendedor')}</strong>
              <span>${fmt(realizado)} / ${fmt(m.valor_meta)} (${pct.toFixed(1)}%)</span>
            </div>
            <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%;background:${pct>=100?'var(--green)':pct>=70?'var(--accent)':'var(--yellow)'}"></div></div>
          </div>`;
        }).join('')||'<p style="color:var(--text-2)">Nenhuma meta definida para este mês</p>'}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Todas as Metas</h3></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Tipo</th><th>Mês/Ano</th><th>Vendedor</th><th>Meta</th><th>Ações</th></tr></thead>
        <tbody>${(metas||[]).map(m=>`<tr>
          <td><span class="badge badge-${m.tipo==='loja'?'blue':'purple'}">${m.tipo}</span></td>
          <td>${String(m.mes).padStart(2,'0')}/${m.ano}</td>
          <td>${m.vendedores?.nome||'—'}</td>
          <td><strong>${fmt(m.valor_meta)}</strong></td>
          <td><button class="btn btn-sm btn-danger" onclick="deleteMeta('${m.id}')"><i data-lucide="trash-2"></i></button></td>
        </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function openMetaModal() {
  const {data:vds}=await sb.from('vendedores').select('id,nome').eq('ativo',true);
  const now=new Date();
  openModal(`
    <div class="modal-header"><h3>Definir Meta</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>Tipo</label><select id="mt-tipo"><option value="loja">Meta da Loja</option><option value="vendedor">Meta por Vendedor</option></select></div>
      <div class="form-group"><label>Vendedor (se tipo vendedor)</label><select id="mt-vd"><option value="">Nenhum</option>${(vds||[]).map(v=>`<option value="${v.id}">${v.nome}</option>`).join('')}</select></div>
      <div class="form-row">
        <div class="form-group"><label>Mês</label><input id="mt-mes" type="number" min="1" max="12" value="${now.getMonth()+1}"></div>
        <div class="form-group"><label>Ano</label><input id="mt-ano" type="number" value="${now.getFullYear()}"></div>
      </div>
      <div class="form-group"><label>Valor da Meta (R$)</label><input id="mt-val" type="number" step="0.01"></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveMeta()"><i data-lucide="save"></i>Salvar</button>
    </div>`,'modal-md');
}

async function saveMeta() {
  const payload={tipo:document.getElementById('mt-tipo').value,vendedor_id:document.getElementById('mt-vd').value||null,mes:parseInt(document.getElementById('mt-mes').value),ano:parseInt(document.getElementById('mt-ano').value),valor_meta:parseFloat(document.getElementById('mt-val').value||0)};
  await sb.from('metas_vendas').insert(payload);
  closeModalDirect();toast('Meta definida');renderMetas();
}

async function deleteMeta(id){if(!confirm('Remover meta?'))return;await sb.from('metas_vendas').delete().eq('id',id);toast('Removido');renderMetas();}
