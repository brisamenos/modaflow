// ===== CAIXA =====
async function renderCaixa() {
  const {data:caixaAberto}=await sb.from('caixas').select('*').eq('status','aberto').order('created_at',{ascending:false}).limit(1);
  const caixa=caixaAberto?.[0];
  if(!caixa){
    document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="abrirCaixa()"><i data-lucide="unlock"></i>Abrir Caixa</button>`;
    document.getElementById('content').innerHTML=`<div class="card"><div class="card-body"><div class="empty-state"><i data-lucide="lock"></i><h3>Caixa fechado</h3><p>Abra o caixa para iniciar as operações do dia</p><button class="btn btn-primary" style="margin-top:12px" onclick="abrirCaixa()">Abrir Caixa</button></div></div></div>`;
    lucide.createIcons();return;
  }
  document.getElementById('topbar-actions').innerHTML=`
    <button class="btn btn-secondary" onclick="suprimentoCaixa()"><i data-lucide="plus-circle"></i>Suprimento</button>
    <button class="btn btn-secondary" onclick="sangriaCaixa()"><i data-lucide="minus-circle"></i>Sangria</button>
    <button class="btn btn-danger" onclick="fecharCaixa('${caixa.id}')"><i data-lucide="lock"></i>Fechar Caixa</button>`;
  const {data:movs}=await sb.from('movimentos_caixa').select('*').eq('caixa_id',caixa.id).order('created_at',{ascending:false});
  const entradas=(movs||[]).filter(m=>m.tipo==='entrada'||m.tipo==='suprimento').reduce((a,m)=>a+parseFloat(m.valor||0),0);
  const saidas=(movs||[]).filter(m=>m.tipo==='saida'||m.tipo==='sangria').reduce((a,m)=>a+parseFloat(m.valor||0),0);
  const saldoAtual=parseFloat(caixa.saldo_inicial||0)+entradas-saidas;

  document.getElementById('content').innerHTML=`
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${fmt(caixa.saldo_inicial)}</div><div class="stat-label">Saldo Inicial</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--green)">${fmt(entradas)}</div><div class="stat-label">Total Entradas</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--red)">${fmt(saidas)}</div><div class="stat-label">Total Saídas</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--accent)">${fmt(saldoAtual)}</div><div class="stat-label">Saldo Atual</div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Movimentações</h3></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Tipo</th><th>Descrição</th><th>Valor</th><th>Horário</th></tr></thead>
        <tbody>${(movs||[]).map(m=>`<tr>
          <td><span class="badge badge-${m.tipo==='entrada'||m.tipo==='suprimento'?'green':'red'}" style="text-transform:capitalize">${m.tipo}</span></td>
          <td>${m.descricao||'—'}</td>
          <td><strong style="color:${m.tipo==='entrada'||m.tipo==='suprimento'?'var(--green)':'var(--red)'}">${fmt(m.valor)}</strong></td>
          <td>${fmtDatetime(m.created_at)}</td>
        </tr>`).join('')||'<tr><td colspan="4" style="text-align:center;color:var(--text-2)">Nenhuma movimentação</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function abrirCaixa() {
  const val=prompt('Saldo inicial do caixa (R$):','0');
  if(val===null) return;
  await sb.from('caixas').insert({saldo_inicial:parseFloat(val||0),status:'aberto'});
  toast('Caixa aberto');renderCaixa();
}

async function fecharCaixa(id) {
  if(!confirm('Fechar o caixa?')) return;
  await sb.from('caixas').update({status:'fechado',data_fechamento:new Date().toISOString()}).eq('id',id);
  toast('Caixa fechado');renderCaixa();
}

async function suprimentoCaixa() {
  const val=prompt('Valor do suprimento (R$):');
  if(!val||isNaN(val)) return;
  const {data:cx}=await sb.from('caixas').select('id').eq('status','aberto').single();
  if(cx) await sb.from('movimentos_caixa').insert({caixa_id:cx.id,tipo:'suprimento',descricao:'Suprimento de caixa',valor:parseFloat(val)});
  toast('Suprimento registrado');renderCaixa();
}

async function sangriaCaixa() {
  const val=prompt('Valor da sangria (R$):');
  if(!val||isNaN(val)) return;
  const {data:cx}=await sb.from('caixas').select('id').eq('status','aberto').single();
  if(cx) await sb.from('movimentos_caixa').insert({caixa_id:cx.id,tipo:'sangria',descricao:'Sangria de caixa',valor:parseFloat(val)});
  toast('Sangria registrada');renderCaixa();
}

// ===== PAINEL FINANCEIRO =====
async function renderPainelFinanceiro() {
  const now=new Date(),m=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const [{data:vs},{data:desps},{data:pagar}]=await Promise.all([
    sb.from('vendas').select('total,forma_pagamento').gte('created_at',m+'-01').eq('status','concluida'),
    sb.from('despesas').select('valor,status').gte('data_competencia',m+'-01'),
    sb.from('contas_pagar').select('valor,status').gte('vencimento',m+'-01')
  ]);
  const receita=(vs||[]).reduce((a,v)=>a+parseFloat(v.total||0),0);
  const desp=(desps||[]).reduce((a,d)=>a+parseFloat(d.valor||0),0);
  const pag=(pagar||[]).reduce((a,p)=>a+parseFloat(p.valor||0),0);
  const lucro=receita-desp-pag;

  const porPag={};
  (vs||[]).forEach(v=>{porPag[v.forma_pagamento]=(porPag[v.forma_pagamento]||0)+parseFloat(v.total||0);});

  document.getElementById('content').innerHTML=`
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value" style="color:var(--green)">${fmt(receita)}</div><div class="stat-label">Receita</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--red)">${fmt(desp+pag)}</div><div class="stat-label">Despesas Totais</div></div>
      <div class="stat-card"><div class="stat-value" style="color:${lucro>=0?'var(--green)':'var(--red)'}">${fmt(lucro)}</div><div class="stat-label">Resultado</div></div>
      <div class="stat-card"><div class="stat-value">${receita>0?((lucro/receita)*100).toFixed(1):0}%</div><div class="stat-label">Margem Líquida</div></div>
    </div>
    <div class="dash-grid">
      <div class="card">
        <div class="card-header"><h3>Receita por Forma de Pagamento</h3></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Forma</th><th>Total</th><th>%</th></tr></thead>
          <tbody>${Object.entries(porPag).map(([k,v])=>`<tr><td style="text-transform:capitalize">${k}</td><td>${fmt(v)}</td><td>${receita?((v/receita)*100).toFixed(1):0}%</td></tr>`).join('')||'<tr><td colspan="3" style="text-align:center;color:var(--text-2)">Sem dados</td></tr>'}</tbody>
        </table></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Resumo do Mês</h3></div>
        <div class="card-body">
          <div class="info-list">
            <div class="info-row"><span class="label">Vendas</span><span class="value" style="color:var(--green)">${fmt(receita)}</span></div>
            <div class="info-row"><span class="label">Despesas</span><span class="value" style="color:var(--red)">${fmt(desp)}</span></div>
            <div class="info-row"><span class="label">Contas a Pagar</span><span class="value" style="color:var(--red)">${fmt(pag)}</span></div>
            <div class="info-row"><span class="label" style="font-weight:700">Resultado</span><span class="value" style="font-size:16px;color:${lucro>=0?'var(--green)':'var(--red)'}">${fmt(lucro)}</span></div>
          </div>
        </div>
      </div>
    </div>`;
  lucide.createIcons();
}

// ===== DESPESAS =====
async function renderDespesas() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openDespesaModal()"><i data-lucide="plus"></i>Nova Despesa</button>`;
  const now=new Date(),m=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const {data}=await sb.from('despesas').select('*,classificacoes(nome)').gte('data_competencia',m+'-01').order('vencimento');
  const totalPend=(data||[]).filter(d=>d.status==='pendente').reduce((a,d)=>a+parseFloat(d.valor||0),0);
  const totalPago=(data||[]).filter(d=>d.status==='pago').reduce((a,d)=>a+parseFloat(d.valor||0),0);
  document.getElementById('content').innerHTML=`
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
      <div class="stat-card"><div class="stat-value">${(data||[]).length}</div><div class="stat-label">Total despesas</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--yellow)">${fmt(totalPend)}</div><div class="stat-label">Pendente</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--green)">${fmt(totalPago)}</div><div class="stat-label">Pago</div></div>
    </div>
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Descrição</th><th>Classificação</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${(data||[]).map(d=>`<tr>
          <td><strong>${d.descricao}</strong></td>
          <td>${d.classificacoes?.nome||'—'}</td>
          <td>${fmtDate(d.vencimento)}</td>
          <td><strong>${fmt(d.valor)}</strong></td>
          <td>${badgeStatus(d.status)}</td>
          <td><div class="actions">
            ${d.status==='pendente'?`<button class="btn btn-sm btn-success" onclick="pagarDespesa('${d.id}')"><i data-lucide="check"></i>Pagar</button>`:''}
            <button class="btn btn-sm btn-danger" onclick="deleteDespesa('${d.id}')"><i data-lucide="trash-2"></i></button>
          </div></td>
        </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--text-2)">Nenhuma despesa</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function openDespesaModal() {
  const {data:cls}=await sb.from('classificacoes').select('id,nome').eq('tipo','despesa');
  openModal(`
    <div class="modal-header"><h3>Nova Despesa</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>Descrição *</label><input id="dp2-desc"></div>
      <div class="form-row">
        <div class="form-group"><label>Valor (R$) *</label><input id="dp2-val" type="number" step="0.01"></div>
        <div class="form-group"><label>Vencimento</label><input id="dp2-venc" type="date"></div>
        <div class="form-group"><label>Competência</label><input id="dp2-comp" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
      </div>
      <div class="form-group"><label>Classificação</label><select id="dp2-cls"><option value="">Nenhuma</option>${(cls||[]).map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}</select></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveDespesa()"><i data-lucide="save"></i>Salvar</button>
    </div>`,'modal-md');
}

async function saveDespesa() {
  const payload={descricao:document.getElementById('dp2-desc').value.trim(),valor:parseFloat(document.getElementById('dp2-val').value||0),vencimento:document.getElementById('dp2-venc').value||null,data_competencia:document.getElementById('dp2-comp').value,classificacao_id:document.getElementById('dp2-cls').value||null};
  if(!payload.descricao||!payload.valor) return toast('Preencha descrição e valor','error');
  await sb.from('despesas').insert(payload);
  closeModalDirect();toast('Despesa cadastrada');renderDespesas();
}

async function pagarDespesa(id){await sb.from('despesas').update({status:'pago',data_pagamento:new Date().toISOString().split('T')[0]}).eq('id',id);toast('Despesa paga');renderDespesas();}
async function deleteDespesa(id){if(!confirm('Excluir?'))return;await sb.from('despesas').delete().eq('id',id);toast('Removido');renderDespesas();}

// ===== CONTAS A PAGAR =====
async function renderContasPagar() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openContaPagarModal()"><i data-lucide="plus"></i>Nova Conta</button>`;
  const {data}=await sb.from('contas_pagar').select('*,fornecedores(razao_social),classificacoes(nome)').order('vencimento');
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Descrição</th><th>Fornecedor</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${(data||[]).map(c=>`<tr>
          <td>${c.descricao}</td>
          <td>${c.fornecedores?.razao_social||'—'}</td>
          <td>${fmtDate(c.vencimento)}</td>
          <td><strong>${fmt(c.valor)}</strong></td>
          <td>${badgeStatus(c.status)}</td>
          <td>${c.status==='aberta'?`<button class="btn btn-sm btn-success" onclick="pagarConta('${c.id}')"><i data-lucide="check"></i>Pagar</button>`:''}</td>
        </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--text-2)">Nenhuma conta</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function openContaPagarModal() {
  const [{data:forns},{data:cls}]=await Promise.all([
    sb.from('fornecedores').select('id,razao_social').eq('ativo',true),
    sb.from('classificacoes').select('id,nome').eq('tipo','despesa')
  ]);
  openModal(`
    <div class="modal-header"><h3>Nova Conta a Pagar</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>Descrição *</label><input id="cp-desc"></div>
      <div class="form-row">
        <div class="form-group"><label>Fornecedor</label><select id="cp-forn"><option value="">Nenhum</option>${(forns||[]).map(f=>`<option value="${f.id}">${f.razao_social}</option>`).join('')}</select></div>
        <div class="form-group"><label>Valor (R$) *</label><input id="cp-val" type="number" step="0.01"></div>
        <div class="form-group"><label>Vencimento *</label><input id="cp-venc" type="date"></div>
      </div>
      <div class="form-group"><label>Classificação</label><select id="cp-cls"><option value="">Nenhuma</option>${(cls||[]).map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}</select></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveContaPagar()"><i data-lucide="save"></i>Salvar</button>
    </div>`,'modal-md');
}

async function saveContaPagar() {
  const payload={descricao:document.getElementById('cp-desc').value.trim(),fornecedor_id:document.getElementById('cp-forn').value||null,valor:parseFloat(document.getElementById('cp-val').value||0),vencimento:document.getElementById('cp-venc').value,classificacao_id:document.getElementById('cp-cls').value||null};
  if(!payload.descricao||!payload.valor||!payload.vencimento) return toast('Preencha os campos obrigatórios','error');
  await sb.from('contas_pagar').insert(payload);
  closeModalDirect();toast('Conta cadastrada');renderContasPagar();
}

async function pagarConta(id){await sb.from('contas_pagar').update({status:'paga',data_pagamento:new Date().toISOString().split('T')[0]}).eq('id',id);toast('Conta paga');renderContasPagar();}

// ===== CONTAS BANCÁRIAS =====
async function renderContasBancarias() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openContaBancariaModal()"><i data-lucide="plus"></i>Nova Conta</button>`;
  const {data}=await sb.from('contas_bancarias').select('*').eq('ativo',true);
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Nome</th><th>Banco</th><th>Agência</th><th>Conta</th><th>Tipo</th><th>Saldo Inicial</th><th>Ações</th></tr></thead>
        <tbody>${(data||[]).map(c=>`<tr>
          <td><strong>${c.nome}</strong></td><td>${c.banco||'—'}</td><td>${c.agencia||'—'}</td><td>${c.conta||'—'}</td>
          <td style="text-transform:capitalize">${c.tipo||'—'}</td><td>${fmt(c.saldo_inicial)}</td>
          <td><button class="btn btn-sm btn-danger" onclick="deleteCB('${c.id}')"><i data-lucide="trash-2"></i></button></td>
        </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:var(--text-2)">Nenhuma conta bancária</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function openContaBancariaModal() {
  openModal(`
    <div class="modal-header"><h3>Nova Conta Bancária</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-row"><div class="form-group"><label>Nome *</label><input id="cb-nome"></div>
      <div class="form-group"><label>Tipo</label><select id="cb-tipo"><option value="corrente">Conta Corrente</option><option value="poupanca">Poupança</option><option value="caixa">Caixa</option></select></div></div>
      <div class="form-row"><div class="form-group"><label>Banco</label><input id="cb-banco"></div>
      <div class="form-group"><label>Agência</label><input id="cb-agencia"></div>
      <div class="form-group"><label>Conta</label><input id="cb-conta"></div></div>
      <div class="form-group"><label>Saldo Inicial (R$)</label><input id="cb-saldo" type="number" step="0.01" value="0"></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveContaBancaria()"><i data-lucide="save"></i>Salvar</button>
    </div>`,'modal-md');
}

async function saveContaBancaria() {
  const payload={nome:document.getElementById('cb-nome').value.trim(),tipo:document.getElementById('cb-tipo').value,banco:document.getElementById('cb-banco').value,agencia:document.getElementById('cb-agencia').value,conta:document.getElementById('cb-conta').value,saldo_inicial:parseFloat(document.getElementById('cb-saldo').value||0)};
  if(!payload.nome) return toast('Nome obrigatório','error');
  await sb.from('contas_bancarias').insert(payload);
  closeModalDirect();toast('Conta cadastrada');renderContasBancarias();
}

async function deleteCB(id){if(!confirm('Excluir conta?'))return;await sb.from('contas_bancarias').update({ativo:false}).eq('id',id);toast('Removido');renderContasBancarias();}

// ===== FLUXO DE CAIXA =====
async function renderFluxoCaixa() {
  const now=new Date(),ano=now.getFullYear();
  const meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const results=await Promise.all(meses.map(async(_,i)=>{
    const m=String(i+1).padStart(2,'0');
    const [{data:vs},{data:ds}]=await Promise.all([
      sb.from('vendas').select('total').gte('created_at',`${ano}-${m}-01`).lt('created_at',`${ano}-${m}-31`).eq('status','concluida'),
      sb.from('despesas').select('valor').gte('data_competencia',`${ano}-${m}-01`).lt('data_competencia',`${ano}-${m}-31`)
    ]);
    const rec=(vs||[]).reduce((a,v)=>a+parseFloat(v.total||0),0);
    const desp=(ds||[]).reduce((a,d)=>a+parseFloat(d.valor||0),0);
    return {mes:meses[i],rec,desp,res:rec-desp};
  }));

  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-header"><h3>Fluxo de Caixa ${ano}</h3></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Resultado</th></tr></thead>
        <tbody>${results.map(r=>`<tr>
          <td><strong>${r.mes}</strong></td>
          <td style="color:var(--green)">${fmt(r.rec)}</td>
          <td style="color:var(--red)">${fmt(r.desp)}</td>
          <td style="color:${r.res>=0?'var(--green)':'var(--red)'}"><strong>${fmt(r.res)}</strong></td>
        </tr>`).join('')}
        <tr style="background:var(--bg)">
          <td><strong>TOTAL</strong></td>
          <td style="color:var(--green)"><strong>${fmt(results.reduce((a,r)=>a+r.rec,0))}</strong></td>
          <td style="color:var(--red)"><strong>${fmt(results.reduce((a,r)=>a+r.desp,0))}</strong></td>
          <td style="color:${results.reduce((a,r)=>a+r.res,0)>=0?'var(--green)':'var(--red)'}"><strong>${fmt(results.reduce((a,r)=>a+r.res,0))}</strong></td>
        </tr>
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

// ===== DRE =====
async function renderDRE() {
  const now=new Date(),ano=now.getFullYear();
  const meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const results=await Promise.all(meses.map(async(_,i)=>{
    const m=String(i+1).padStart(2,'0');
    const [{data:vs},{data:ds},{data:ps}]=await Promise.all([
      sb.from('vendas').select('total').gte('created_at',`${ano}-${m}-01`).lte('created_at',`${ano}-${m}-31T23:59:59`).eq('status','concluida'),
      sb.from('despesas').select('valor').gte('data_competencia',`${ano}-${m}-01`).lte('data_competencia',`${ano}-${m}-31`),
      sb.from('contas_pagar').select('valor').gte('vencimento',`${ano}-${m}-01`).lte('vencimento',`${ano}-${m}-31`).eq('status','paga')
    ]);
    const rec=(vs||[]).reduce((a,v)=>a+parseFloat(v.total||0),0);
    const desp=(ds||[]).reduce((a,d)=>a+parseFloat(d.valor||0),0);
    const pagos=(ps||[]).reduce((a,p)=>a+parseFloat(p.valor||0),0);
    return {mes:meses[i],rec,desp,pagos,lucro:rec-desp-pagos};
  }));

  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-header"><h3>DRE — Demonstrativo de Resultado ${ano}</h3></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Conta</th>${meses.map(m=>`<th>${m}</th>`).join('')}<th>Total</th></tr></thead>
        <tbody>
          <tr style="background:var(--green-bg)"><td><strong>Receita de Vendas</strong></td>${results.map(r=>`<td style="color:var(--green)">${fmt(r.rec)}</td>`).join('')}<td><strong style="color:var(--green)">${fmt(results.reduce((a,r)=>a+r.rec,0))}</strong></td></tr>
          <tr><td>Despesas Operacionais</td>${results.map(r=>`<td style="color:var(--red)">${fmt(r.desp)}</td>`).join('')}<td><strong style="color:var(--red)">${fmt(results.reduce((a,r)=>a+r.desp,0))}</strong></td></tr>
          <tr><td>Contas Pagas</td>${results.map(r=>`<td style="color:var(--red)">${fmt(r.pagos)}</td>`).join('')}<td><strong style="color:var(--red)">${fmt(results.reduce((a,r)=>a+r.pagos,0))}</strong></td></tr>
          <tr style="border-top:2px solid var(--border-2)"><td><strong>Lucro Líquido</strong></td>${results.map(r=>`<td><strong style="color:${r.lucro>=0?'var(--green)':'var(--red)'}">${fmt(r.lucro)}</strong></td>`).join('')}<td><strong style="color:${results.reduce((a,r)=>a+r.lucro,0)>=0?'var(--green)':'var(--red)'}">${fmt(results.reduce((a,r)=>a+r.lucro,0))}</strong></td></tr>
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}
