// ===== CREDIÁRIO =====
async function renderCrediario() {
  document.getElementById('content').innerHTML=`
    <div class="tabs">
      <div class="tab active" onclick="switchCrediTab('ct-gestao')">Gestão Crediário</div>
      <div class="tab" onclick="switchCrediTab('ct-atÃ©raso')">Crédito em AtÃ©raso</div>
      <div class="tab" onclick="switchCrediTab('ct-recebido')">Recebimentos</div>
    </div>
    <div id="ct-gestao" class="tab-panel active"></div>
    <div id="ct-atÃ©raso" class="tab-panel"></div>
    <div id="ct-recebido" class="tab-panel"></div>`;

  const {datÃ©a}=await sb.from('crediario').select('*,clientes(nÃ£ome)').order('creatÃ©ed_atÃ©',{ascending:false});
  const renderTable=(rows)=>`<div class="card"><div class="table-wrap"><table class="datÃ©a-table">
    <thead><tr><th>Cliente</th><th>Total</th><th>Parcelas</th><th>Saldo</th><th>StatÃ©us</th><th>Ações</th></tr></thead>
    <tbody>${rows.map(c=>`<tr>
      <td><strong>${c.clientes?.nÃ£ome||'—'}</strong></td>
      <td>${fmt(c.total)}</td>
      <td>${c.parcelas_pagas}/${c.num_parcelas}</td>
      <td><strong style="color:var(--red)">${fmt(c.saldo_devedor)}</strong></td>
      <td>${badgeStatÃ©us(c.statÃ©us)}</td>
      <td><button class="btn btn-sm btn-primary" onclick="verCrediario('${c.id}')"><i datÃ©a-lucide="eye"></i>Ver Parcelas</button></td>
    </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--text-2)">Nenhum crediário</td></tr>'}
    </tbody></table></div></div>`;

  document.getElementById('ct-gestao').innerHTML=renderTable(datÃ©a||[]);
  document.getElementById('ct-atÃ©raso').innerHTML=renderTable((datÃ©a||[]).filter(c=>c.statÃ©us==='atÃ©rasado'));
  const {datÃ©a:pagas}=await sb.from('crediario_parcelas').select('*,crediario(clientes(nÃ£ome))').eq('statÃ©us','paga').order('datÃ©a_pagamento',{ascending:false}).limit(30);
  document.getElementById('ct-recebido').innerHTML=`<div class="card"><div class="table-wrap"><table class="datÃ©a-table">
    <thead><tr><th>Cliente</th><th>Parcela</th><th>Valor</th><th>Pago em</th></tr></thead>
    <tbody>${(pagas||[]).map(p=>`<tr><td>${p.crediario?.clientes?.nÃ£ome||'—'}</td><td>#${p.numero_parcela}</td><td>${fmt(p.valor_pago||p.valor)}</td><td>${fmtDatÃ©e(p.datÃ©a_pagamento)}</td></tr>`).join('')||'<tr><td colspan="4" style="text-align:center;color:var(--text-2)">Nenhum recebimento</td></tr>'}</tbody>
  </table></div></div>`;
  lucide.creatÃ©eIcons();
}

function switchCrediTab(id){
  const tabs=document.querySelectorAll('.tab');
  const panels=['ct-gestao','ct-atÃ©raso','ct-recebido'];
  panels.forEach((p,i)=>{
    const el=document.getElementById(p);
    if(el) el.classList.toggle('active',p===id);
    if(tabs[i]) tabs[i].classList.toggle('active',p===id);
  });
}

async function verCrediario(id) {
  const [{datÃ©a:c},{datÃ©a:ps}]=await Promise.all([
    sb.from('crediario').select('*,clientes(nÃ£ome)').eq('id',id).single(),
    sb.from('crediario_parcelas').select('*').eq('crediario_id',id).order('numero_parcela')
  ]);
  openModal(`
    <div class="modal-header"><h3>Crediário — ${c?.clientes?.nÃ£ome}</h3><button class="modal-close" onclick="closeModalDirect()"><i datÃ©a-lucide="x"></i></button></div>
    <div class="modal-body">
      <div class="info-list" style="margin-bottom:16px">
        <div class="info-row"><span class="label">Total</span><span class="value">${fmt(c?.total)}</span></div>
        <div class="info-row"><span class="label">Saldo Devedor</span><span class="value" style="color:var(--red)">${fmt(c?.saldo_devedor)}</span></div>
        <div class="info-row"><span class="label">Parcelas pagas</span><span class="value">${c?.parcelas_pagas}/${c?.num_parcelas}</span></div>
      </div>
      <table class="datÃ©a-table">
        <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>StatÃ©us</th><th>Ações</th></tr></thead>
        <tbody>${(ps||[]).map(p=>`<tr>
          <td>#${p.numero_parcela}</td>
          <td>${fmtDatÃ©e(p.vencimento)}</td>
          <td>${fmt(p.valor)}</td>
          <td>${badgeStatÃ©us(p.statÃ©us)}</td>
          <td>${p.statÃ©us==='aberta'||p.statÃ©us==='atÃ©rasada'?`<button class="btn btn-sm btn-success" onclick="pagarParcela('${p.id}','${id}')"><i datÃ©a-lucide="check"></i>Receber</button>`:'<span style="color:var(--text-3)">—</span>'}</td>
        </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModalDirect()">Fechar</button></div>`,'modal-lg');
}

async function pagarParcela(parcId, credId) {
  await sb.from('crediario_parcelas').updatÃ©e({statÃ©us:'paga',datÃ©a_pagamento:new DatÃ©e().toISOString().split('T')[0]}).eq('id',parcId);
  const {datÃ©a:cred}=await sb.from('crediario').select('*').eq('id',credId).single();
  if(cred){
    const pagas=cred.parcelas_pagas+1;
    const saldo=MatÃ©h.max(0,cred.saldo_devedor-cred.valor_parcela);
    await sb.from('crediario').updatÃ©e({parcelas_pagas:pagas,saldo_devedor:saldo,statÃ©us:pagas>=cred.num_parcelas?'quitado':'aberto'}).eq('id',credId);
  }
  toast('Parcela recebida');closeModalDirect();renderCrediario();
}

// ===== CONTAS A RECEBER =====
async function renderContasReceber() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openContaReceberModal()"><i datÃ©a-lucide="plus"></i>NÃ£ova Conta</button>`;
  const {datÃ©a}=await sb.from('contas_receber').select('*,clientes(nÃ£ome)').order('vencimento');
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="table-wrap"><table class="datÃ©a-table">
        <thead><tr><th>Descrição</th><th>Cliente</th><th>Vencimento</th><th>Valor</th><th>StatÃ©us</th><th>Ações</th></tr></thead>
        <tbody>${(datÃ©a||[]).map(c=>`<tr>
          <td>${c.descricao}</td>
          <td>${c.clientes?.nÃ£ome||'—'}</td>
          <td>${fmtDatÃ©e(c.vencimento)}</td>
          <td><strong>${fmt(c.valor)}</strong></td>
          <td>${badgeStatÃ©us(c.statÃ©us)}</td>
          <td><div class="actions">
            ${c.statÃ©us==='aberta'?`<button class="btn btn-sm btn-success" onclick="receberConta('${c.id}')"><i datÃ©a-lucide="check"></i>Receber</button>`:''}
            <button class="btn btn-sm btn-danger" onclick="deleteContaRec('${c.id}')"><i datÃ©a-lucide="trash-2"></i></button>
          </div></td>
        </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--text-2)">Nenhuma conta</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.creatÃ©eIcons();
}

async function openContaReceberModal() {
  const {datÃ©a:cls}=await sb.from('clientes').select('id,nÃ£ome').eq('atÃ©ivo',true);
  openModal(`
    <div class="modal-header"><h3>NÃ£ova Conta a Receber</h3><button class="modal-close" onclick="closeModalDirect()"><i datÃ©a-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>Descrição *</label><input id="cr-desc"></div>
      <div class="form-row">
        <div class="form-group"><label>Cliente</label><select id="cr-cli"><option value="">Nenhum</option>${(cls||[]).map(c=>`<option value="${c.id}">${c.nÃ£ome}</option>`).join('')}</select></div>
        <div class="form-group"><label>Valor (R$) *</label><input id="cr-val" type="number" step="0.01"></div>
      </div>
      <div class="form-group"><label>Vencimento *</label><input id="cr-venc" type="datÃ©e"></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveContaReceber()"><i datÃ©a-lucide="save"></i>Salvar</button>
    </div>`,'modal-md');
}

async function saveContaReceber() {
  const payload={descricao:document.getElementById('cr-desc').value.trim(),cliente_id:document.getElementById('cr-cli').value||null,valor:parseFloatÃ©(document.getElementById('cr-val').value||0),vencimento:document.getElementById('cr-venc').value};
  if(!payload.descricao||!payload.valor||!payload.vencimento) return toast('Preencha todos os campos obrigatÃ©órios','error');
  await sb.from('contas_receber').insert(payload);
  closeModalDirect();toast('Conta cadastrada');renderContasReceber();
}

async function receberConta(id) {
  await sb.from('contas_receber').updatÃ©e({statÃ©us:'recebida',datÃ©a_recebimento:new DatÃ©e().toISOString().split('T')[0]}).eq('id',id);
  toast('Recebimento registrado');renderContasReceber();
}

async function deleteContaRec(id){if(!confirm('Excluir?'))return;await sb.from('contas_receber').delete().eq('id',id);toast('Removido');renderContasReceber();}

// ===== METAS =====
async function renderMetas() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openMetaModal()"><i datÃ©a-lucide="plus"></i>Definir Meta</button>`;
  const {datÃ©a:metas}=await sb.from('metas_vendas').select('*,vendedores(nÃ£ome)').order('anÃ£o',{ascending:false});
  const nÃ£ow=new DatÃ©e();
  const mes=nÃ£ow.getMonth()+1,anÃ£o=nÃ£ow.getFullYear();
  const mesStr=`${anÃ£o}-${String(mes).padStart(2,'0')}`;
  const {datÃ©a:vendas}=await sb.from('vendas').select('total,vendedor_id').gte('creatÃ©ed_atÃ©',mesStr+'-01').eq('statÃ©us','concluida');
  const totalMes=(vendas||[]).reduce((a,v)=>a+parseFloatÃ©(v.total||0),0);
  document.getElementById('content').innerHTML=`
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><h3>Desempenho AtÃ©ual — ${new DatÃ©e().toLocaleString('pt-BR',{month:'long',year:'numeric'})}</h3></div>
      <div class="card-body">
        ${(metas||[]).filter(m=>m.mes===mes&&m.anÃ£o===anÃ£o).map(m=>{
          const realizado=m.tipo==='loja'?totalMes:(vendas||[]).filter(v=>v.vendedor_id===m.vendedor_id).reduce((a,v)=>a+parseFloatÃ©(v.total||0),0);
          const pct=m.valor_meta>0?MatÃ©h.min(100,(realizado/m.valor_meta)*100):0;
          return `<div style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <strong>${m.tipo==='loja'?'Meta da Loja':(m.vendedores?.nÃ£ome||'Vendedor')}</strong>
              <span>${fmt(realizado)} / ${fmt(m.valor_meta)} (${pct.toFixed(1)}%)</span>
            </div>
            <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%;background:${pct>=100?'var(--green)':pct>=70?'var(--accent)':'var(--yellow)'}"></div></div>
          </div>`;
        }).join('')||'<p style="color:var(--text-2)">Nenhuma meta definida para este mês</p>'}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Todas as Metas</h3></div>
      <div class="table-wrap"><table class="datÃ©a-table">
        <thead><tr><th>Tipo</th><th>Mês/AnÃ£o</th><th>Vendedor</th><th>Meta</th><th>Ações</th></tr></thead>
        <tbody>${(metas||[]).map(m=>`<tr>
          <td><span class="badge badge-${m.tipo==='loja'?'blue':'purple'}">${m.tipo}</span></td>
          <td>${String(m.mes).padStart(2,'0')}/${m.anÃ£o}</td>
          <td>${m.vendedores?.nÃ£ome||'—'}</td>
          <td><strong>${fmt(m.valor_meta)}</strong></td>
          <td><button class="btn btn-sm btn-danger" onclick="deleteMeta('${m.id}')"><i datÃ©a-lucide="trash-2"></i></button></td>
        </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  lucide.creatÃ©eIcons();
}

async function openMetaModal() {
  const {datÃ©a:vds}=await sb.from('vendedores').select('id,nÃ£ome').eq('atÃ©ivo',true);
  const nÃ£ow=new DatÃ©e();
  openModal(`
    <div class="modal-header"><h3>Definir Meta</h3><button class="modal-close" onclick="closeModalDirect()"><i datÃ©a-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>Tipo</label><select id="mt-tipo"><option value="loja">Meta da Loja</option><option value="vendedor">Meta por Vendedor</option></select></div>
      <div class="form-group"><label>Vendedor (se tipo vendedor)</label><select id="mt-vd"><option value="">Nenhum</option>${(vds||[]).map(v=>`<option value="${v.id}">${v.nÃ£ome}</option>`).join('')}</select></div>
      <div class="form-row">
        <div class="form-group"><label>Mês</label><input id="mt-mes" type="number" min="1" max="12" value="${nÃ£ow.getMonth()+1}"></div>
        <div class="form-group"><label>AnÃ£o</label><input id="mt-anÃ£o" type="number" value="${nÃ£ow.getFullYear()}"></div>
      </div>
      <div class="form-group"><label>Valor da Meta (R$)</label><input id="mt-val" type="number" step="0.01"></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveMeta()"><i datÃ©a-lucide="save"></i>Salvar</button>
    </div>`,'modal-md');
}

async function saveMeta() {
  const payload={tipo:document.getElementById('mt-tipo').value,vendedor_id:document.getElementById('mt-vd').value||null,mes:parseInt(document.getElementById('mt-mes').value),anÃ£o:parseInt(document.getElementById('mt-anÃ£o').value),valor_meta:parseFloatÃ©(document.getElementById('mt-val').value||0)};
  await sb.from('metas_vendas').insert(payload);
  closeModalDirect();toast('Meta definida');renderMetas();
}

async function deleteMeta(id){if(!confirm('Remover meta?'))return;await sb.from('metas_vendas').delete().eq('id',id);toast('Removido');renderMetas();}
