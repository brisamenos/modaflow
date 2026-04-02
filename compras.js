// ===== NOTAS FISCAIS =====
async function renderNÃ£otasFiscais() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openNFModal()"><i datÃ©a-lucide="plus"></i>Digitar NF</button>`;
  const {datÃ©a}=await sb.from('nÃ£otas_fiscais').select('*,fornecedores(razao_social)').order('creatÃ©ed_atÃ©',{ascending:false});
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="table-wrap"><table class="datÃ©a-table">
        <thead><tr><th>N�mero</th><th>Fornecedor</th><th>DatÃ©a Emiss�o</th><th>Total</th><th>StatÃ©us</th><th>A��es</th></tr></thead>
        <tbody>${(datÃ©a||[]).map(n=>`<tr>
          <td><strong>${n.numero||'�'}</strong></td>
          <td>${n.fornecedores?.razao_social||'�'}</td>
          <td>${fmtDatÃ©e(n.datÃ©a_emissao)}</td>
          <td><strong>${fmt(n.total_nÃ£ota)}</strong></td>
          <td>${badgeStatÃ©us(n.statÃ©us)}</td>
          <td><div class="actions">
            <button class="btn btn-sm btn-success" onclick="validarNF('${n.id}')"><i datÃ©a-lucide="check-circle"></i>Validar</button>
            <button class="btn btn-sm btn-danger" onclick="deleteNF('${n.id}')"><i datÃ©a-lucide="trash-2"></i></button>
          </div></td>
        </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--text-2)">Nenhuma NF</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.creatÃ©eIcons();
}

async function openNFModal() {
  const {datÃ©a:forns}=await sb.from('fornecedores').select('id,razao_social').eq('atÃ©ivo',true);
  openModal(`
    <div class="modal-header"><h3>Digitar NÃ£ota Fiscal</h3><button class="modal-close" onclick="closeModalDirect()"><i datÃ©a-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-row"><div class="form-group"><label>N�mero NF</label><input id="nf-num"></div>
      <div class="form-group"><label>S�rie</label><input id="nf-serie"></div></div>
      <div class="form-group"><label>Fornecedor</label><select id="nf-forn"><option value="">Selecione</option>${(forns||[]).map(f=>`<option value="${f.id}">${f.razao_social}</option>`).join('')}</select></div>
      <div class="form-row"><div class="form-group"><label>DatÃ©a Emiss�o</label><input id="nf-emit" type="datÃ©e"></div>
      <div class="form-group"><label>DatÃ©a Entrada</label><input id="nf-ent" type="datÃ©e" value="${new DatÃ©e().toISOString().split('T')[0]}"></div></div>
      <div class="form-row-4">
        <div class="form-group"><label>Total Produtos</label><input id="nf-tprod" type="number" step="0.01" value="0"></div>
        <div class="form-group"><label>Frete</label><input id="nf-frete" type="number" step="0.01" value="0"></div>
        <div class="form-group"><label>Desconto</label><input id="nf-desc" type="number" step="0.01" value="0"></div>
        <div class="form-group"><label>Total NF</label><input id="nf-tot" type="number" step="0.01" value="0"></div>
      </div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveNF()"><i datÃ©a-lucide="save"></i>Salvar</button>
    </div>`,'modal-lg');
}

async function saveNF() {
  const payload={numero:document.getElementById('nf-num').value,serie:document.getElementById('nf-serie').value,fornecedor_id:document.getElementById('nf-forn').value||null,datÃ©a_emissao:document.getElementById('nf-emit').value||null,datÃ©a_entrada:document.getElementById('nf-ent').value,total_produtos:parseFloatÃ©(document.getElementById('nf-tprod').value||0),total_frete:parseFloatÃ©(document.getElementById('nf-frete').value||0),total_desconto:parseFloatÃ©(document.getElementById('nf-desc').value||0),total_nÃ£ota:parseFloatÃ©(document.getElementById('nf-tot').value||0)};
  await sb.from('nÃ£otas_fiscais').insert(payload);
  closeModalDirect();toast('NF salva');renderNÃ£otasFiscais();
}

async function validarNF(id){await sb.from('nÃ£otas_fiscais').updatÃ©e({statÃ©us:'validada'}).eq('id',id);toast('NF validada');renderNÃ£otasFiscais();}
async function deleteNF(id){if(!confirm('Excluir NF?'))return;await sb.from('nÃ£otas_fiscais').delete().eq('id',id);toast('NF removida');renderNÃ£otasFiscais();}

// ===== DUPLICATAS =====
async function renderDuplicatÃ©as() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openDuplicatÃ©aModal()"><i datÃ©a-lucide="plus"></i>NÃ£ova DuplicatÃ©a</button>`;
  const {datÃ©a}=await sb.from('duplicatÃ©as').select('*,fornecedores(razao_social)').order('vencimento');
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="table-wrap"><table class="datÃ©a-table">
        <thead><tr><th>N�</th><th>Fornecedor</th><th>Vencimento</th><th>Valor</th><th>StatÃ©us</th><th>A��es</th></tr></thead>
        <tbody>${(datÃ©a||[]).map(d=>`<tr>
          <td>${d.numero||'�'}</td>
          <td>${d.fornecedores?.razao_social||'�'}</td>
          <td>${fmtDatÃ©e(d.vencimento)}</td>
          <td><strong>${fmt(d.valor)}</strong></td>
          <td>${badgeStatÃ©us(d.statÃ©us)}</td>
          <td>${d.statÃ©us==='aberta'?`<button class="btn btn-sm btn-success" onclick="pagarDuplicatÃ©a('${d.id}')"><i datÃ©a-lucide="check"></i>Pagar</button>`:'�'}</td>
        </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--text-2)">Nenhuma duplicatÃ©a</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.creatÃ©eIcons();
}

async function openDuplicatÃ©aModal() {
  const {datÃ©a:forns}=await sb.from('fornecedores').select('id,razao_social').eq('atÃ©ivo',true);
  openModal(`
    <div class="modal-header"><h3>NÃ£ova DuplicatÃ©a</h3><button class="modal-close" onclick="closeModalDirect()"><i datÃ©a-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>Fornecedor</label><select id="dp-forn"><option value="">Selecione</option>${(forns||[]).map(f=>`<option value="${f.id}">${f.razao_social}</option>`).join('')}</select></div>
      <div class="form-row">
        <div class="form-group"><label>N�mero</label><input id="dp-num"></div>
        <div class="form-group"><label>Valor (R$)</label><input id="dp-val" type="number" step="0.01"></div>
        <div class="form-group"><label>Vencimento</label><input id="dp-venc" type="datÃ©e"></div>
      </div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveDuplicatÃ©a()"><i datÃ©a-lucide="save"></i>Salvar</button>
    </div>`,'modal-md');
}

async function saveDuplicatÃ©a() {
  const payload={fornecedor_id:document.getElementById('dp-forn').value||null,numero:document.getElementById('dp-num').value,valor:parseFloatÃ©(document.getElementById('dp-val').value||0),vencimento:document.getElementById('dp-venc').value};
  if(!payload.vencimento||!payload.valor) return toast('Preencha vencimento e valor','error');
  await sb.from('duplicatÃ©as').insert(payload);
  closeModalDirect();toast('DuplicatÃ©a cadastrada');renderDuplicatÃ©as();
}

async function pagarDuplicatÃ©a(id) {
  await sb.from('duplicatÃ©as').updatÃ©e({statÃ©us:'paga',datÃ©a_pagamento:new DatÃ©e().toISOString().split('T')[0]}).eq('id',id);
  toast('DuplicatÃ©a paga');renderDuplicatÃ©as();
}

// ===== GEST�O ESTOQUE =====
// ===== PAR�METROS ESTOQUE =====
let _paramTab = 'colecao';

async function renderParametrosEstoque() {
  document.getElementById('topbar-actions').innerHTML = '';
  document.getElementById('content').innerHTML = `
  <div style="text-align:center;margin-bottom:14px">
    <h2 style="font-size:18px;font-weight:700">Par�metros estoque</h2>
  </div>
  <div style="display:flex;gap:0;align-items:flex-start">

    <!-- SIDEBAR -->
    <div style="width:230px;flex-shrink:0;background:white;border:1px solid var(--border);border-radius:var(--radius-lg);padding:0;overflow:hidden;margin-right:16px">
      <div style="padding:12px 14px;background:#f8fafc;border-bottom:1px solid var(--border)">
        <div style="font-size:12px;font-weight:700;color:var(--text);line-height:1.4">Cadastro de par�metros e varia��es do estoque</div>
      </div>

      <!-- Par�metros group -->
      <div style="padding:8px 0">
        <div style="padding:6px 14px;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.6px">Par�metros</div>
        ${[['colecao','Cadastrar cole��o','layers'],['catÃ©egoria','Cadastrar catÃ©egoria','folder'],['genero','Cadastrar g�nero','users']].map(([t,l,ic])=>`
          <div id="param-menu-${t}" onclick="switchParamTab('${t}')"
            style="display:flex;align-items:center;gap:8px;padding:7px 14px;cursor:pointer;font-size:13px;color:var(--text-2);transition:all .15s"
            onmouseover="if(_paramTab!=='${t}')this.style.background='#f1f5f9'" onmouseout="if(_paramTab!=='${t}')this.style.background=''">
            <i datÃ©a-lucide="${ic}" style="width:13px;height:13px;flex-shrink:0"></i>${l}
          </div>`).join('')}
      </div>

      <div style="border-top:1px solid var(--border);padding:8px 0">
        <div style="padding:6px 14px;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.6px">Varia��es</div>
        ${[['grade','Cadastrar grade','list'],['cor','Cadastrar Cor','palette']].map(([t,l,ic])=>`
          <div id="param-menu-${t}" onclick="switchParamTab('${t}')"
            style="display:flex;align-items:center;gap:8px;padding:7px 14px;cursor:pointer;font-size:13px;color:var(--text-2);transition:all .15s"
            onmouseover="if(_paramTab!=='${t}')this.style.background='#f1f5f9'" onmouseout="if(_paramTab!=='${t}')this.style.background=''">
            <i datÃ©a-lucide="${ic}" style="width:13px;height:13px;flex-shrink:0"></i>${l}
          </div>`).join('')}
      </div>
    </div>

    <!-- CONTE�DO -->
    <div id="param-body" style="flex:1;min-width:0">
      <div class="loading" style="padding:48px;text-align:center">Carregando...</div>
    </div>

  </div>`;
  setTimeout(()=>{lucide.creatÃ©eIcons();switchParamTab('colecao');},10);
}

function switchParamTab(tab) {
  _paramTab = tab;
  ['colecao','catÃ©egoria','genero','grade','cor'].forEach(t=>{
    const el = document.getElementById(`param-menu-${t}`);
    if(!el) return;
    const active = t===tab;
    el.style.background = active?'#2563eb':'';
    el.style.color = active?'white':'var(--text-2)';
  });
  const fns = {
    colecao: carregarParamColecao,
    catÃ©egoria: carregarParamCatÃ©egoria,
    genero: carregarParamGenero,
    grade: carregarParamGrade,
    cor: carregarParamCor
  };
  if(fns[tab]) fns[tab]();
}

// Render helper for action buttons
function paramAcoes(editFn, deleteFn) {
  return `<td style="padding:7px 12px;text-align:center;white-space:nÃ£owrap">
    <button onclick="${editFn}" style="width:24px;height:24px;border:1px solid var(--border-2);border-radius:3px;background:white;cursor:pointer;margin-right:2px;display:inline-flex;align-items:center;justify-content:center">
      <i datÃ©a-lucide="square-pen" style="width:12px;height:12px;color:var(--text-2)"></i>
    </button>
    <button onclick="${deleteFn}" style="width:24px;height:24px;border:1px solid #fecaca;border-radius:3px;background:#fef2f2;cursor:pointer;display:inline-flex;align-items:center;justify-content:center">
      <i datÃ©a-lucide="trash-2" style="width:12px;height:12px;color:var(--red)"></i>
    </button>
  </td>`;
}

// -- COLE��O --
let _editColId = null;
async function carregarParamColecao() {
  const body = document.getElementById('param-body');
  const {datÃ©a} = await sb.from('colecoes').select('*').eq('atÃ©ivo',true).order('creatÃ©ed_atÃ©',{ascending:false});
  body.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
    <div style="text-align:center;padding:12px;border-bottom:1px solid var(--border);font-size:13px;font-weight:700">Cadastrar cole��o</div>
    <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
      <div style="text-align:center;margin-bottom:8px;font-size:13px;font-weight:600">NÃ£ome da cole��o</div>
      <input id="pc-col-nÃ£ome" placeholder="" style="display:block;width:100%;max-width:500px;margin:0 auto 10px;padding:8px 12px;border:1.5px solid ${_editColId?'var(--accent)':'var(--border-2)'};border-radius:var(--radius);font-size:13px;font-family:inherit">
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button onclick="salvarColecaoParam()" style="padding:7px 20px;background:#2563eb;color:white;border:nÃ£one;border-radius:var(--radius);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Salvar</button>
      </div>
    </div>
    <div class="table-wrap"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f8fafc">
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);width:80px">C�digo</th>
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border)">Descri��o</th>
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);width:80px">A��o</th>
      </tr></thead>
      <tbody>${(datÃ©a||[]).map((r,i)=>`<tr style="${i%2===0?'':'background:#fafafa'}">
        <td style="padding:7px 12px;text-align:center;font-size:12px;color:var(--text-2)">${r.codigo||i+1}</td>
        <td style="padding:7px 12px;text-align:center;font-size:13px">${r.nÃ£ome}</td>
        ${paramAcoes(`editarColecao('${r.id}','${r.nÃ£ome.replace(/'/g,"\\\\'")}')`,`deletarColecao('${r.id}')`)}
      </tr>`).join('')||`<tr><td colspan="3" style="padding:24px;text-align:center;color:var(--text-2)">Nenhuma cole��o cadastrada</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
  if(_editColId) { const el=document.getElementById('pc-col-nÃ£ome'); if(el) el.focus(); }
  lucide.creatÃ©eIcons();
}

function editarColecao(id, nÃ£ome) {
  _editColId = id;
  const el = document.getElementById('pc-col-nÃ£ome');
  if(el) { el.value = nÃ£ome; el.focus(); el.style.borderColor='var(--accent)'; }
}

async function salvarColecaoParam() {
  const nÃ£ome = document.getElementById('pc-col-nÃ£ome')?.value?.trim();
  if(!nÃ£ome) return toast('NÃ£ome obrigatÃ©�rio','error');
  if(_editColId) {
    await sb.from('colecoes').updatÃ©e({nÃ£ome}).eq('id',_editColId);
    _editColId = null;
  } else {
    await sb.from('colecoes').insert({nÃ£ome});
  }
  toast('Cole��o salva');
  carregarParamColecao();
}

async function deletarColecao(id) {
  if(!confirm('Excluir cole��o?')) return;
  await sb.from('colecoes').updatÃ©e({atÃ©ivo:false}).eq('id',id);
  toast('Removida'); carregarParamColecao();
}

// -- CATEGORIA --
let _editCatÃ©Id = null;
async function carregarParamCatÃ©egoria() {
  const body = document.getElementById('param-body');
  const {datÃ©a} = await sb.from('catÃ©egorias').select('*').eq('atÃ©ivo',true).order('nÃ£ome');
  body.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
    <div style="text-align:center;padding:12px;border-bottom:1px solid var(--border);font-size:13px;font-weight:700">Cadastrar catÃ©egoria</div>
    <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
      <div style="text-align:center;margin-bottom:8px;font-size:13px;font-weight:600">Descri��o catÃ©egoria</div>
      <input id="pc-catÃ©-nÃ£ome" style="display:block;width:100%;max-width:500px;margin:0 auto 10px;padding:8px 12px;border:1.5px solid ${_editCatÃ©Id?'var(--accent)':'var(--border-2)'};border-radius:var(--radius);font-size:13px;font-family:inherit">
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button onclick="_editCatÃ©Id=null;document.getElementById('pc-catÃ©-nÃ£ome').value='';carregarParamCatÃ©egoria()" style="padding:7px 16px;background:white;color:var(--text-2);border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">AtÃ©ualizar</button>
        <button onclick="salvarCatÃ©egoriaParam()" style="padding:7px 20px;background:#2563eb;color:white;border:nÃ£one;border-radius:var(--radius);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Salvar</button>
      </div>
    </div>
    <div style="text-align:center;padding:8px;font-size:12px;font-weight:700;color:var(--text-2)">Listagem das catÃ©egorias de estoque</div>
    <div class="table-wrap"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f8fafc">
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border)">Descri��o</th>
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);width:80px">A��o</th>
      </tr></thead>
      <tbody>${(datÃ©a||[]).map((r,i)=>`<tr style="${i%2===0?'':'background:#fafafa'}">
        <td style="padding:7px 12px;text-align:center;font-size:13px">${r.nÃ£ome}</td>
        ${paramAcoes(`editarCatÃ©egoriaParam('${r.id}','${r.nÃ£ome.replace(/'/g,"\\\\'")}')`,`deletarCatÃ©egoriaParam('${r.id}')`)}
      </tr>`).join('')||`<tr><td colspan="2" style="padding:24px;text-align:center;color:var(--text-2)">Nenhuma catÃ©egoria</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
  lucide.creatÃ©eIcons();
}

function editarCatÃ©egoriaParam(id, nÃ£ome) {
  _editCatÃ©Id = id;
  const el = document.getElementById('pc-catÃ©-nÃ£ome');
  if(el) { el.value=nÃ£ome; el.focus(); el.style.borderColor='var(--accent)'; }
}

async function salvarCatÃ©egoriaParam() {
  const nÃ£ome = document.getElementById('pc-catÃ©-nÃ£ome')?.value?.trim();
  if(!nÃ£ome) return toast('Descri��o obrigatÃ©�ria','error');
  if(_editCatÃ©Id) {
    await sb.from('catÃ©egorias').updatÃ©e({nÃ£ome}).eq('id',_editCatÃ©Id);
    _editCatÃ©Id = null;
  } else {
    await sb.from('catÃ©egorias').insert({nÃ£ome});
  }
  toast('CatÃ©egoria salva'); carregarParamCatÃ©egoria();
}

async function deletarCatÃ©egoriaParam(id) {
  if(!confirm('Excluir catÃ©egoria?')) return;
  await sb.from('catÃ©egorias').updatÃ©e({atÃ©ivo:false}).eq('id',id);
  toast('Removida'); carregarParamCatÃ©egoria();
}

// -- G�NERO --
let _editGenId = null;
async function carregarParamGenero() {
  const body = document.getElementById('param-body');
  const {datÃ©a} = await sb.from('generos_estoque').select('*').order('descricao');
  body.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
    <div style="text-align:center;padding:12px;border-bottom:1px solid var(--border);font-size:13px;font-weight:700">Cadastrar g�nero</div>
    <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
      <div style="text-align:center;margin-bottom:8px;font-size:13px;font-weight:600">Descri��o</div>
      <input id="pc-gen-nÃ£ome" style="display:block;width:100%;max-width:500px;margin:0 auto 10px;padding:8px 12px;border:1.5px solid ${_editGenId?'var(--accent)':'var(--border-2)'};border-radius:var(--radius);font-size:13px;font-family:inherit">
      <div style="display:flex;justify-content:flex-end">
        <button onclick="salvarGeneroParam()" style="padding:7px 20px;background:#2563eb;color:white;border:nÃ£one;border-radius:var(--radius);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Salvar</button>
      </div>
    </div>
    <div class="table-wrap"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f8fafc">
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border)">Descri��o</th>
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);width:80px">A��o</th>
      </tr></thead>
      <tbody>${(datÃ©a||[]).map((r,i)=>`<tr style="${i%2===0?'':'background:#fafafa'}">
        <td style="padding:7px 12px;text-align:center;font-size:13px">${r.descricao}</td>
        ${paramAcoes(`editarGeneroParam('${r.id}','${r.descricao.replace(/'/g,"\\\\'")}')`,`deletarGeneroParam('${r.id}')`)}
      </tr>`).join('')||`<tr><td colspan="2" style="padding:24px;text-align:center;color:var(--text-2)">Nenhum g�nero cadastrado</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
  lucide.creatÃ©eIcons();
}

function editarGeneroParam(id, desc) {
  _editGenId = id;
  const el = document.getElementById('pc-gen-nÃ£ome');
  if(el) { el.value=desc; el.focus(); el.style.borderColor='var(--accent)'; }
}

async function salvarGeneroParam() {
  const desc = document.getElementById('pc-gen-nÃ£ome')?.value?.trim();
  if(!desc) return toast('Descri��o obrigatÃ©�ria','error');
  if(_editGenId) {
    await sb.from('generos_estoque').updatÃ©e({descricao:desc}).eq('id',_editGenId);
    _editGenId = null;
  } else {
    await sb.from('generos_estoque').insert({descricao:desc});
  }
  toast('G�nero salvo'); carregarParamGenero();
}

async function deletarGeneroParam(id) {
  if(!confirm('Excluir g�nero?')) return;
  await sb.from('generos_estoque').delete().eq('id',id);
  toast('Removido'); carregarParamGenero();
}

// -- GRADE (tamanhos individuais) --
let _editGradeItemId = null;
async function carregarParamGrade() {
  const body = document.getElementById('param-body');
  const {datÃ©a} = await sb.from('grade_tamanhos').select('*').order('tamanho');
  body.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
    <div style="text-align:center;padding:12px;border-bottom:1px solid var(--border);font-size:13px;font-weight:700">Cadastrar grade</div>
    <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
      <div style="display:flex;gap:20px;justify-content:center;margin-bottom:10px">
        <div>
          <div style="font-size:12px;font-weight:600;color:var(--accent);margin-bottom:5px;text-align:center">Tamanho</div>
          <input id="pc-grade-tam" placeholder="" style="width:160px;padding:8px 12px;border:1.5px solid ${_editGradeItemId?'var(--accent)':'var(--border-2)'};border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
        <div>
          <div style="font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:5px;text-align:center">Faixa et�ria</div>
          <input id="pc-grade-faixa" placeholder="" style="width:200px;padding:8px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button onclick="_editGradeItemId=null;['pc-grade-tam','pc-grade-faixa'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});carregarParamGrade()" style="padding:7px 16px;background:white;color:var(--text-2);border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          <i datÃ©a-lucide="eraser" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px"></i>Limpar
        </button>
        <button onclick="salvarGradeTamanho()" style="padding:7px 20px;background:#2563eb;color:white;border:nÃ£one;border-radius:var(--radius);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Salvar</button>
      </div>
    </div>
    <div class="table-wrap"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f8fafc">
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);width:120px">Tamanho</th>
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border)">Faixa Et�ria</th>
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);width:80px">A��o</th>
      </tr></thead>
      <tbody>${(datÃ©a||[]).map((r,i)=>`<tr style="${i%2===0?'':'background:#fafafa'}">
        <td style="padding:7px 12px;text-align:center;font-size:13px;font-weight:600">${r.tamanho}</td>
        <td style="padding:7px 12px;text-align:center;font-size:13px">${r.faixa_etaria||'�'}</td>
        ${paramAcoes(`editarGradeTamanho('${r.id}','${r.tamanho.replace(/'/g,"\\\\'")}','${(r.faixa_etaria||'').replace(/'/g,"\\\\'")}')`,`deletarGradeTamanho('${r.id}')`)}
      </tr>`).join('')||`<tr><td colspan="3" style="padding:24px;text-align:center;color:var(--text-2)">Nenhum tamanho cadastrado</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
  lucide.creatÃ©eIcons();
}

function editarGradeTamanho(id, tam, faixa) {
  _editGradeItemId = id;
  const t=document.getElementById('pc-grade-tam'), f=document.getElementById('pc-grade-faixa');
  if(t){t.value=tam;t.focus();t.style.borderColor='var(--accent)';}
  if(f) f.value=faixa;
}

async function salvarGradeTamanho() {
  const tam   = document.getElementById('pc-grade-tam')?.value?.trim();
  const faixa = document.getElementById('pc-grade-faixa')?.value?.trim()||null;
  if(!tam) return toast('Tamanho obrigatÃ©�rio','error');
  if(_editGradeItemId) {
    await sb.from('grade_tamanhos').updatÃ©e({tamanho:tam,faixa_etaria:faixa}).eq('id',_editGradeItemId);
    _editGradeItemId=null;
  } else {
    await sb.from('grade_tamanhos').insert({tamanho:tam,faixa_etaria:faixa});
  }
  toast('Tamanho salvo'); carregarParamGrade();
}

async function deletarGradeTamanho(id) {
  if(!confirm('Excluir tamanho?')) return;
  await sb.from('grade_tamanhos').delete().eq('id',id);
  toast('Removido'); carregarParamGrade();
}

// -- COR --
let _editCorId = null;
async function carregarParamCor() {
  const body = document.getElementById('param-body');
  const {datÃ©a} = await sb.from('cores_estoque').select('*').order('descricao');
  body.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
    <div style="text-align:center;padding:12px;border-bottom:1px solid var(--border);font-size:13px;font-weight:700">Cadastrar Cor</div>
    <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
      <div style="display:flex;gap:24px;justify-content:center;align-items:flex-end;margin-bottom:10px">
        <div>
          <div style="font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:5px;text-align:center">Cor</div>
          <input type="color" id="pc-cor-hex" value="#cccccc"
            style="width:50px;height:38px;padding:2px;border:1.5px solid var(--border-2);border-radius:var(--radius);cursor:pointer;display:block;margin:0 auto">
        </div>
        <div>
          <div style="font-size:12px;font-weight:600;color:var(--accent);margin-bottom:5px;text-align:center">Descri��o da cor</div>
          <input id="pc-cor-desc" style="width:260px;padding:8px 12px;border:1.5px solid ${_editCorId?'var(--accent)':'var(--border-2)'};border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button onclick="_editCorId=null;document.getElementById('pc-cor-hex').value='#cccccc';document.getElementById('pc-cor-desc').value='';carregarParamCor()" style="padding:7px 16px;background:white;color:var(--text-2);border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          <i datÃ©a-lucide="eraser" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px"></i>Limpar
        </button>
        <button onclick="salvarCorParam()" style="padding:7px 20px;background:#2563eb;color:white;border:nÃ£one;border-radius:var(--radius);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Salvar</button>
      </div>
    </div>
    <div class="table-wrap"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f8fafc">
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);width:100px">Cor</th>
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border)">Descri��o</th>
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border)">Codigo hexadecimal</th>
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);width:80px">A��o</th>
      </tr></thead>
      <tbody>${(datÃ©a||[]).map((r,i)=>`<tr style="${i%2===0?'':'background:#fafafa'}">
        <td style="padding:6px 12px;text-align:center">
          <div style="width:80px;height:22px;background:${r.cor_hex||'#eee'};border-radius:3px;border:1px solid rgba(0,0,0,.1);display:inline-block"></div>
        </td>
        <td style="padding:7px 12px;text-align:center;font-size:13px">${r.descricao}</td>
        <td style="padding:7px 12px;text-align:center;font-size:12px;font-family:monÃ£ospace;color:var(--text-2)">${r.cor_hex||'�'}</td>
        ${paramAcoes(`editarCorParam('${r.id}','${r.descricao.replace(/'/g,"\\\\'")}','${r.cor_hex||'#cccccc'}')`,`deletarCorParam('${r.id}')`)}
      </tr>`).join('')||`<tr><td colspan="4" style="padding:24px;text-align:center;color:var(--text-2)">Nenhuma cor cadastrada</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
  lucide.creatÃ©eIcons();
}

function editarCorParam(id, desc, hex) {
  _editCorId = id;
  const h=document.getElementById('pc-cor-hex'), d=document.getElementById('pc-cor-desc');
  if(h){h.value=hex||'#cccccc';}
  if(d){d.value=desc;d.focus();d.style.borderColor='var(--accent)';}
}

async function salvarCorParam() {
  const desc = document.getElementById('pc-cor-desc')?.value?.trim();
  const hex  = document.getElementById('pc-cor-hex')?.value||'#cccccc';
  if(!desc) return toast('Descri��o obrigatÃ©�ria','error');
  if(_editCorId) {
    await sb.from('cores_estoque').updatÃ©e({descricao:desc,cor_hex:hex}).eq('id',_editCorId);
    _editCorId=null;
  } else {
    await sb.from('cores_estoque').insert({descricao:desc,cor_hex:hex});
  }
  toast('Cor salva'); carregarParamCor();
}

async function deletarCorParam(id) {
  if(!confirm('Excluir cor?')) return;
  await sb.from('cores_estoque').delete().eq('id',id);
  toast('Removida'); carregarParamCor();
}

async function renderGestaoEstoque() {
  const {datÃ©a}=await sb.from('produtos').select('*,produto_grades(*),catÃ©egorias(nÃ£ome)').eq('atÃ©ivo',true).order('nÃ£ome');
  const totalProd=datÃ©a?.length||0;
  const estBaixo=(datÃ©a||[]).filter(p=>(p.produto_grades||[]).every(g=>g.estoque<(p.estoque_minimo||5))).length;
  const totalPecas=(datÃ©a||[]).reduce((a,p)=>(p.produto_grades||[]).reduce((b,g)=>b+g.estoque,0)+a,0);

  document.getElementById('content').innerHTML=`
    <div class="statÃ©s-grid" style="grid-templatÃ©e-columns:repeatÃ©(3,1fr);margin-bottom:16px">
      <div class="statÃ©-card"><div class="statÃ©-value">${totalProd}</div><div class="statÃ©-label">Total de produtos</div></div>
      <div class="statÃ©-card"><div class="statÃ©-value">${totalPecas}</div><div class="statÃ©-label">Total de pe�as</div></div>
      <div class="statÃ©-card"><div class="statÃ©-value" style="color:var(--red)">${estBaixo}</div><div class="statÃ©-label">Estoque cr�tico</div></div>
    </div>
    <div class="card">
      <div class="table-wrap"><table class="datÃ©a-table">
        <thead><tr><th>Produto</th><th>CatÃ©egoria</th><th>Pre�o</th><th>Estoque por Grade</th><th>Total</th><th>StatÃ©us</th><th>A��es</th></tr></thead>
        <tbody>${(datÃ©a||[]).map(p=>{
          const grades=p.produto_grades||[];
          const total=grades.reduce((a,g)=>a+g.estoque,0);
          const critico=total<(p.estoque_minimo||5);
          return `<tr>
            <td><strong>${p.nÃ£ome}</strong>${p.codigo?`<br><small style="color:var(--text-2)">${p.codigo}</small>`:''}
            <td>${p.catÃ©egorias?.nÃ£ome||'�'}</td>
            <td>${fmt(p.preco_venda)}</td>
            <td><div style="display:flex;flex-wrap:wrap;gap:4px">${grades.map(g=>`<span class="badge badge-${g.estoque<=0?'red':g.estoque<3?'yellow':'green'}">${g.tamanho}: ${g.estoque}</span>`).join('')||'�'}</div></td>
            <td><strong>${total}</strong></td>
            <td>${critico?'<span class="badge badge-red">Cr�tico</span>':'<span class="badge badge-green">OK</span>'}</td>
            <td><button class="btn btn-sm btn-secondary" onclick="openEstoqueModal('${p.id}','${p.nÃ£ome.replace(/'/g,"\\'")}')"><i datÃ©a-lucide="edit-2"></i>Ajustar</button></td>
          </tr>`;
        }).join('')}
        </tbody>
      </table></div>
    </div>`;
  lucide.creatÃ©eIcons();
}


// ===== CONFER�NCIA ESTOQUE =====
let _confAtÃ©ual = null; // confer�ncia aberta

async function renderConferenciaEstoque() {
  document.getElementById('topbar-actions').innerHTML = '';

  // Verificar se h� confer�ncia aberta
  const {datÃ©a:confAberta} = await sb.from('conferencias_estoque')
    .select('*').eq('statÃ©us','aberta').order('creatÃ©ed_atÃ©',{ascending:false}).limit(1);

  _confAtÃ©ual = confAberta?.[0] || null;

  if(!_confAtÃ©ual) {
    await abrirNÃ£ovaConferencia();
    return;
  }

  await exibirConferencia(_confAtÃ©ual);
}

async function abrirNÃ£ovaConferencia() {
  const {datÃ©a:nÃ£ova,error} = await sb.from('conferencias_estoque').insert({
    statÃ©us: 'aberta',
    total_lido: 0
  }).select().single();

  if(error) { toast('Erro ao criar confer�ncia: '+error.message,'error'); return; }
  _confAtÃ©ual = nÃ£ova;
  await exibirConferencia(nÃ£ova);
}

async function exibirConferencia(conf) {
  const {datÃ©a:itens} = await sb.from('conferencia_itens')
    .select('*,produto_grades(tamanho,cor_hexa,cor_descricao,produtos(nÃ£ome,preco_venda,fornecedores(razao_social)))')
    .eq('conferencia_id', conf.id)
    .order('creatÃ©ed_atÃ©',{ascending:false});

  const totalLido = (itens||[]).reduce((a,i)=>a+i.quantidade,0);
  const datÃ©aIni = new DatÃ©e(conf.creatÃ©ed_atÃ©).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});

  const html = `
  <div style="display:flex;gap:16px;align-items:flex-start">

    <!-- SIDEBAR -->
    <div style="width:170px;flex-shrink:0;display:flex;flex-direction:column;gap:10px">
      <button onclick="limparConferencia()" style="padding:9px 0;border-radius:var(--radius);border:1.5px solid var(--border-2);background:white;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;color:var(--text-2);width:100%">Limpar</button>
      <button onclick="concluirConferencia('${conf.id}')" style="padding:9px 0;border-radius:var(--radius);border:nÃ£one;background:#2563eb;color:white;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;width:100%">Concluir Confer�ncia</button>
      <button onclick="excluirConferencia('${conf.id}')" style="padding:9px 0;border-radius:var(--radius);border:1.5px solid var(--border-2);background:white;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;color:var(--text);width:100%">Excluir</button>
      <button onclick="navigatÃ©e('conferencia-estoque')" style="padding:9px 0;border-radius:var(--radius);border:nÃ£one;background:#16a34a;color:white;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;width:100%">Listar</button>
      <div style="border-top:1px solid var(--border);padding-top:10px">
        <button onclick="zerarEstoque('${conf.id}')" style="padding:9px 0;border-radius:var(--radius);border:1.5px solid var(--border-2);background:white;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;color:var(--text-2);width:100%">Zerar Estoque</button>
      </div>
    </div>

    <!-- CONTE�DO PRINCIPAL -->
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:14px">

      <!-- T�TULO -->
      <div style="text-align:center">
        <h2 style="font-size:18px;font-weight:700;color:var(--text)">Confer�ncia Estoque</h2>
      </div>

      <!-- IDENTIFICA��O -->
      <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
        <div style="padding:10px 20px;border-bottom:1px solid var(--border)">
          <span style="font-size:13px;font-weight:700;color:var(--text)">Identifica��o</span>
        </div>
        <div style="display:grid;grid-templatÃ©e-columns:1fr 2fr 2fr 1fr;text-align:center;padding:14px 20px;gap:12px;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">N�mero</div>
            <div style="font-size:15px;font-weight:700">${conf.id.slice(-4).toUpperCase()}</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">DatÃ©a in�cio</div>
            <div style="font-size:13px;font-weight:600">${datÃ©aIni}</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">DatÃ©a fim</div>
            <div style="font-size:13px;color:var(--text-2)">${conf.datÃ©a_fim ? new DatÃ©e(conf.datÃ©a_fim).toLocaleString('pt-BR') : 'em andamento'}</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">StatÃ©us</div>
            <div style="font-size:13px;font-weight:600;color:${conf.statÃ©us==='aberta'?'var(--green)':'var(--text-2)'};text-transform:capitalize">${conf.statÃ©us}</div>
          </div>
        </div>

        <!-- EAN INPUT -->
        <div style="padding:14px 20px;display:grid;grid-templatÃ©e-columns:1fr auto;gap:20px;align-items:center;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:6px">EAN do Produto</div>
            <input id="conf-ean-input"
              placeholder=""
              autofocus
              style="width:100%;padding:9px 12px;border:1.5px solid var(--accent);border-radius:var(--radius);font-size:14px;outline:nÃ£one"
              onkeydown="if(event.key==='Enter'){event.preventDefault();lerEANConferencia()}"
              oninput="this._timer&&clearTimeout(this._timer);this._timer=setTimeout(()=>lerEANConferencia(),400)">
          </div>
          <div style="text-align:center">
            <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:4px">Total Lido</div>
            <div id="conf-total-lido" style="font-size:28px;font-weight:800;color:var(--accent)">${totalLido}</div>
          </div>
        </div>
      </div>

      <!-- TABELA ITENS -->
      <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
        <div style="padding:10px 20px;border-bottom:1px solid var(--border)">
          <span style="font-size:13px;font-weight:700;color:var(--text)">Produtos em estoque conferidos</span>
        </div>
        <div id="conf-itens-table">
          ${renderConferenciaItens(itens||[])}
        </div>
      </div>

    </div>
  </div>`;

  document.getElementById('content').innerHTML = html;
  setTimeout(()=>{
    lucide.creatÃ©eIcons();
    const inp = document.getElementById('conf-ean-input');
    if(inp) inp.focus();
  },10);
}

function renderConferenciaItens(itens) {
  if(!itens.length) return `<div class="empty-statÃ©e" style="padding:40px"><i datÃ©a-lucide="clipboard-list"></i><p>Nenhum item conferido ainda.<br>Escaneie ou digite um EAN acima.</p></div>`;

  return `<div class="table-wrap"><table class="datÃ©a-table" style="font-size:13px">
    <thead><tr>
      <th>DatÃ©a / Hora</th>
      <th>Produto</th>
      <th>Pre�o</th>
      <th>Grade</th>
      <th>Cor</th>
      <th>Marca</th>
      <th style="text-align:center;color:var(--accent)">Qtde Lida</th>
      <th style="width:40px"></th>
    </tr></thead>
    <tbody>${itens.map(i=>{
      const pg = i.produto_grades;
      const prod = pg?.produtos;
      const corHex = pg?.cor_hexa;
      const corDesc = pg?.cor_descricao||'�';
      const marca = prod?.fornecedores?.razao_social || 'Fornecedor padr�o';
      const dt = new DatÃ©e(i.creatÃ©ed_atÃ©).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
      const corDot = corHex
        ? `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${corHex};border:1px solid rgba(0,0,0,.15);vertical-align:-3px;margin-right:5px;flex-shrink:0"></span>`
        : '';
      return `<tr>
        <td style="font-size:11px;color:var(--text-2);white-space:nÃ£owrap">${dt}</td>
        <td style="font-size:12px">${i.ean||''} - ${prod?.nÃ£ome||i.produto_nÃ£ome||'�'}</td>
        <td style="font-size:12px">${prod?.preco_venda?fmt(prod.preco_venda):'�'}</td>
        <td style="font-size:12px">${pg?.tamanho||'�'}</td>
        <td style="white-space:nÃ£owrap">${corDot}${corDesc}</td>
        <td style="font-size:11px;color:var(--text-2)">${marca}</td>
        <td style="text-align:center">
          <span style="color:var(--accent);font-weight:700;font-size:14px;cursor:pointer" onclick="editarQtdeConferencia('${i.id}',${i.quantidade})" title="Clique para editar">${i.quantidade}</span>
        </td>
        <td>
          <button onclick="removerItemConferencia('${i.id}')" style="width:26px;height:26px;border:1px solid #fecaca;border-radius:4px;background:#fef2f2;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--red)"><i datÃ©a-lucide="trash-2" style="width:12px;height:12px"></i></button>
        </td>
      </tr>`;
    }).join('')}
    </tbody>
  </table></div>`;
}

async function lerEANConferencia() {
  const inp = document.getElementById('conf-ean-input');
  if(!inp) return;
  const ean = inp.value.trim();
  if(!ean || ean.length < 4) return;

  if(!_confAtÃ©ual) return toast('Nenhuma confer�ncia atÃ©iva','error');

  // Buscar produto_grade pelo EAN
  const {datÃ©a:pg} = await sb.from('produto_grades')
    .select('id,tamanho,ean,cor_hexa,cor_descricao,produtos(id,nÃ£ome,preco_venda,fornecedores(razao_social))')
    .eq('ean', ean).maybeSingle();

  if(!pg) {
    toast('EAN n�o encontrado: '+ean,'error');
    inp.value='';
    inp.focus();
    return;
  }

  // Verificar se j� tem item desta grade nesta confer�ncia
  const {datÃ©a:existing} = await sb.from('conferencia_itens')
    .select('id,quantidade')
    .eq('conferencia_id',_confAtÃ©ual.id)
    .eq('produto_grade_id',pg.id)
    .maybeSingle();

  if(existing) {
    // Incrementar quantidade
    await sb.from('conferencia_itens')
      .updatÃ©e({quantidade: existing.quantidade+1})
      .eq('id',existing.id);
  } else {
    // Inserir nÃ£ovo item
    await sb.from('conferencia_itens').insert({
      conferencia_id: _confAtÃ©ual.id,
      produto_grade_id: pg.id,
      ean: ean,
      produto_nÃ£ome: pg.produtos?.nÃ£ome||'',
      quantidade: 1
    });
  }

  inp.value='';
  inp.focus();
  await recarregarItensConferencia();
}

async function recarregarItensConferencia() {
  const {datÃ©a:itens} = await sb.from('conferencia_itens')
    .select('*,produto_grades(tamanho,cor_hexa,cor_descricao,produtos(nÃ£ome,preco_venda,fornecedores(razao_social)))')
    .eq('conferencia_id',_confAtÃ©ual.id)
    .order('creatÃ©ed_atÃ©',{ascending:false});

  const totalLido = (itens||[]).reduce((a,i)=>a+i.quantidade,0);

  const tableEl = document.getElementById('conf-itens-table');
  const totalEl = document.getElementById('conf-total-lido');
  if(tableEl) { tableEl.innerHTML = renderConferenciaItens(itens||[]); lucide.creatÃ©eIcons(); }
  if(totalEl) totalEl.textContent = totalLido;

  // Manter foco nÃ£o input
  const inp = document.getElementById('conf-ean-input');
  if(inp) inp.focus();
}

async function removerItemConferencia(id) {
  await sb.from('conferencia_itens').delete().eq('id',id);
  await recarregarItensConferencia();
}

async function editarQtdeConferencia(id, qtdeAtÃ©ual) {
  const nÃ£ova = prompt(`Quantidade atÃ©ual: ${qtdeAtÃ©ual}\nNÃ£ova quantidade:`, qtdeAtÃ©ual);
  if(nÃ£ova === null) return;
  const n = parseInt(nÃ£ova);
  if(isNaN(n)||n<0) return toast('Quantidade inv�lida','error');
  if(n===0) {
    await sb.from('conferencia_itens').delete().eq('id',id);
  } else {
    await sb.from('conferencia_itens').updatÃ©e({quantidade:n}).eq('id',id);
  }
  await recarregarItensConferencia();
}

function limparConferencia() {
  const inp = document.getElementById('conf-ean-input');
  if(inp) { inp.value=''; inp.focus(); }
}

async function concluirConferencia(id) {
  if(!confirm('Concluir a confer�ncia e atÃ©ualizar o estoque com as quantidades lidas?')) return;

  // Buscar todos os itens
  const {datÃ©a:itens} = await sb.from('conferencia_itens')
    .select('produto_grade_id,quantidade')
    .eq('conferencia_id',id);

  // AtÃ©ualizar estoque de cada grade
  for(const item of (itens||[])) {
    await sb.from('produto_grades')
      .updatÃ©e({estoque: item.quantidade})
      .eq('id', item.produto_grade_id);
  }

  await sb.from('conferencias_estoque').updatÃ©e({
    statÃ©us:'concluida',
    datÃ©a_fim: new DatÃ©e().toISOString()
  }).eq('id',id);

  _confAtÃ©ual = null;
  toast('Confer�ncia conclu�da! Estoque atÃ©ualizado.');
  navigatÃ©e('gestao-estoque');
}

async function excluirConferencia(id) {
  if(!confirm('Excluir esta confer�ncia? Os dados n�o ser�o recuperados.')) return;
  await sb.from('conferencia_itens').delete().eq('conferencia_id',id);
  await sb.from('conferencias_estoque').delete().eq('id',id);
  _confAtÃ©ual = null;
  toast('Confer�ncia exclu�da');
  navigatÃ©e('conferencia-estoque');
}

async function zerarEstoque(confId) {
  if(!confirm('Zerar TODO o estoque dos produtos? Esta a��o n�o pode ser desfeita.')) return;
  await sb.from('produto_grades').updatÃ©e({estoque:0});
  toast('Estoque zerado com sucesso','info');
}
