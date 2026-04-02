// ===== NOTAS FISCAIS =====
async function renderNotasFiscais() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openNFModal()"><i data-lucide="plus"></i>Digitar NF</button>`;
  const {data}=await sb.from('notas_fiscais').select('*,fornecedores(razao_social)').order('created_at',{ascending:false});
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Número</th><th>Fornecedor</th><th>Data Emissão</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${(data||[]).map(n=>`<tr>
          <td><strong>${n.numero||'—'}</strong></td>
          <td>${n.fornecedores?.razao_social||'—'}</td>
          <td>${fmtDate(n.data_emissao)}</td>
          <td><strong>${fmt(n.total_nota)}</strong></td>
          <td>${badgeStatus(n.status)}</td>
          <td><div class="actions">
            <button class="btn btn-sm btn-success" onclick="validarNF('${n.id}')"><i data-lucide="check-circle"></i>Validar</button>
            <button class="btn btn-sm btn-danger" onclick="deleteNF('${n.id}')"><i data-lucide="trash-2"></i></button>
          </div></td>
        </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--text-2)">Nenhuma NF</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function openNFModal() {
  const {data:forns}=await sb.from('fornecedores').select('id,razao_social').eq('ativo',true);
  openModal(`
    <div class="modal-header"><h3>Digitar Nota Fiscal</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-row"><div class="form-group"><label>Número NF</label><input id="nf-num"></div>
      <div class="form-group"><label>Série</label><input id="nf-serie"></div></div>
      <div class="form-group"><label>Fornecedor</label><select id="nf-forn"><option value="">Selecione</option>${(forns||[]).map(f=>`<option value="${f.id}">${f.razao_social}</option>`).join('')}</select></div>
      <div class="form-row"><div class="form-group"><label>Data Emissão</label><input id="nf-emit" type="date"></div>
      <div class="form-group"><label>Data Entrada</label><input id="nf-ent" type="date" value="${new Date().toISOString().split('T')[0]}"></div></div>
      <div class="form-row-4">
        <div class="form-group"><label>Total Produtos</label><input id="nf-tprod" type="number" step="0.01" value="0"></div>
        <div class="form-group"><label>Frete</label><input id="nf-frete" type="number" step="0.01" value="0"></div>
        <div class="form-group"><label>Desconto</label><input id="nf-desc" type="number" step="0.01" value="0"></div>
        <div class="form-group"><label>Total NF</label><input id="nf-tot" type="number" step="0.01" value="0"></div>
      </div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveNF()"><i data-lucide="save"></i>Salvar</button>
    </div>`,'modal-lg');
}

async function saveNF() {
  const payload={numero:document.getElementById('nf-num').value,serie:document.getElementById('nf-serie').value,fornecedor_id:document.getElementById('nf-forn').value||null,data_emissao:document.getElementById('nf-emit').value||null,data_entrada:document.getElementById('nf-ent').value,total_produtos:parseFloat(document.getElementById('nf-tprod').value||0),total_frete:parseFloat(document.getElementById('nf-frete').value||0),total_desconto:parseFloat(document.getElementById('nf-desc').value||0),total_nota:parseFloat(document.getElementById('nf-tot').value||0)};
  await sb.from('notas_fiscais').insert(payload);
  closeModalDirect();toast('NF salva');renderNotasFiscais();
}

async function validarNF(id){await sb.from('notas_fiscais').update({status:'validada'}).eq('id',id);toast('NF validada');renderNotasFiscais();}
async function deleteNF(id){if(!confirm('Excluir NF?'))return;await sb.from('notas_fiscais').delete().eq('id',id);toast('NF removida');renderNotasFiscais();}

// ===== DUPLICATAS =====
async function renderDuplicatas() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openDuplicataModal()"><i data-lucide="plus"></i>Nova Duplicata</button>`;
  const {data}=await sb.from('duplicatas').select('*,fornecedores(razao_social)').order('vencimento');
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Nº</th><th>Fornecedor</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${(data||[]).map(d=>`<tr>
          <td>${d.numero||'—'}</td>
          <td>${d.fornecedores?.razao_social||'—'}</td>
          <td>${fmtDate(d.vencimento)}</td>
          <td><strong>${fmt(d.valor)}</strong></td>
          <td>${badgeStatus(d.status)}</td>
          <td>${d.status==='aberta'?`<button class="btn btn-sm btn-success" onclick="pagarDuplicata('${d.id}')"><i data-lucide="check"></i>Pagar</button>`:'—'}</td>
        </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--text-2)">Nenhuma duplicata</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function openDuplicataModal() {
  const {data:forns}=await sb.from('fornecedores').select('id,razao_social').eq('ativo',true);
  openModal(`
    <div class="modal-header"><h3>Nova Duplicata</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>Fornecedor</label><select id="dp-forn"><option value="">Selecione</option>${(forns||[]).map(f=>`<option value="${f.id}">${f.razao_social}</option>`).join('')}</select></div>
      <div class="form-row">
        <div class="form-group"><label>Número</label><input id="dp-num"></div>
        <div class="form-group"><label>Valor (R$)</label><input id="dp-val" type="number" step="0.01"></div>
        <div class="form-group"><label>Vencimento</label><input id="dp-venc" type="date"></div>
      </div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveDuplicata()"><i data-lucide="save"></i>Salvar</button>
    </div>`,'modal-md');
}

async function saveDuplicata() {
  const payload={fornecedor_id:document.getElementById('dp-forn').value||null,numero:document.getElementById('dp-num').value,valor:parseFloat(document.getElementById('dp-val').value||0),vencimento:document.getElementById('dp-venc').value};
  if(!payload.vencimento||!payload.valor) return toast('Preencha vencimento e valor','error');
  await sb.from('duplicatas').insert(payload);
  closeModalDirect();toast('Duplicata cadastrada');renderDuplicatas();
}

async function pagarDuplicata(id) {
  await sb.from('duplicatas').update({status:'paga',data_pagamento:new Date().toISOString().split('T')[0]}).eq('id',id);
  toast('Duplicata paga');renderDuplicatas();
}

// ===== GESTÃO ESTOQUE =====
// ===== PARÂMETROS ESTOQUE =====
let _paramTab = 'colecao';

async function renderParametrosEstoque() {
  document.getElementById('topbar-actions').innerHTML = '';
  document.getElementById('content').innerHTML = `
  <div style="text-align:center;margin-bottom:14px">
    <h2 style="font-size:18px;font-weight:700">Parâmetros estoque</h2>
  </div>
  <div style="display:flex;gap:0;align-items:flex-start">

    <!-- SIDEBAR -->
    <div style="width:230px;flex-shrink:0;background:white;border:1px solid var(--border);border-radius:var(--radius-lg);padding:0;overflow:hidden;margin-right:16px">
      <div style="padding:12px 14px;background:#f8fafc;border-bottom:1px solid var(--border)">
        <div style="font-size:12px;font-weight:700;color:var(--text);line-height:1.4">Cadastro de parâmetros e variações do estoque</div>
      </div>

      <!-- Parâmetros group -->
      <div style="padding:8px 0">
        <div style="padding:6px 14px;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.6px">Parâmetros</div>
        ${[['colecao','Cadastrar coleção','layers'],['categoria','Cadastrar categoria','folder'],['genero','Cadastrar gênero','users']].map(([t,l,ic])=>`
          <div id="param-menu-${t}" onclick="switchParamTab('${t}')"
            style="display:flex;align-items:center;gap:8px;padding:7px 14px;cursor:pointer;font-size:13px;color:var(--text-2);transition:all .15s"
            onmouseover="if(_paramTab!=='${t}')this.style.background='#f1f5f9'" onmouseout="if(_paramTab!=='${t}')this.style.background=''">
            <i data-lucide="${ic}" style="width:13px;height:13px;flex-shrink:0"></i>${l}
          </div>`).join('')}
      </div>

      <div style="border-top:1px solid var(--border);padding:8px 0">
        <div style="padding:6px 14px;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.6px">Variações</div>
        ${[['grade','Cadastrar grade','list'],['cor','Cadastrar Cor','palette']].map(([t,l,ic])=>`
          <div id="param-menu-${t}" onclick="switchParamTab('${t}')"
            style="display:flex;align-items:center;gap:8px;padding:7px 14px;cursor:pointer;font-size:13px;color:var(--text-2);transition:all .15s"
            onmouseover="if(_paramTab!=='${t}')this.style.background='#f1f5f9'" onmouseout="if(_paramTab!=='${t}')this.style.background=''">
            <i data-lucide="${ic}" style="width:13px;height:13px;flex-shrink:0"></i>${l}
          </div>`).join('')}
      </div>
    </div>

    <!-- CONTEÚDO -->
    <div id="param-body" style="flex:1;min-width:0">
      <div class="loading" style="padding:48px;text-align:center">Carregando...</div>
    </div>

  </div>`;
  setTimeout(()=>{lucide.createIcons();switchParamTab('colecao');},10);
}

function switchParamTab(tab) {
  _paramTab = tab;
  ['colecao','categoria','genero','grade','cor'].forEach(t=>{
    const el = document.getElementById(`param-menu-${t}`);
    if(!el) return;
    const active = t===tab;
    el.style.background = active?'#2563eb':'';
    el.style.color = active?'white':'var(--text-2)';
  });
  const fns = {
    colecao: carregarParamColecao,
    categoria: carregarParamCategoria,
    genero: carregarParamGenero,
    grade: carregarParamGrade,
    cor: carregarParamCor
  };
  if(fns[tab]) fns[tab]();
}

// Render helper for action buttons
function paramAcoes(editFn, deleteFn) {
  return `<td style="padding:7px 12px;text-align:center;white-space:nowrap">
    <button onclick="${editFn}" style="width:24px;height:24px;border:1px solid var(--border-2);border-radius:3px;background:white;cursor:pointer;margin-right:2px;display:inline-flex;align-items:center;justify-content:center">
      <i data-lucide="square-pen" style="width:12px;height:12px;color:var(--text-2)"></i>
    </button>
    <button onclick="${deleteFn}" style="width:24px;height:24px;border:1px solid #fecaca;border-radius:3px;background:#fef2f2;cursor:pointer;display:inline-flex;align-items:center;justify-content:center">
      <i data-lucide="trash-2" style="width:12px;height:12px;color:var(--red)"></i>
    </button>
  </td>`;
}

// -- COLEÇÃO --
let _editColId = null;
async function carregarParamColecao() {
  const body = document.getElementById('param-body');
  const {data} = await sb.from('colecoes').select('*').eq('ativo',true).order('created_at',{ascending:false});
  body.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
    <div style="text-align:center;padding:12px;border-bottom:1px solid var(--border);font-size:13px;font-weight:700">Cadastrar coleção</div>
    <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
      <div style="text-align:center;margin-bottom:8px;font-size:13px;font-weight:600">Nome da coleção</div>
      <input id="pc-col-nome" placeholder="" style="display:block;width:100%;max-width:500px;margin:0 auto 10px;padding:8px 12px;border:1.5px solid ${_editColId?'var(--accent)':'var(--border-2)'};border-radius:var(--radius);font-size:13px;font-family:inherit">
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button onclick="salvarColecaoParam()" style="padding:7px 20px;background:#2563eb;color:white;border:none;border-radius:var(--radius);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Salvar</button>
      </div>
    </div>
    <div class="table-wrap"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f8fafc">
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);width:80px">Código</th>
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border)">Descrição</th>
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);width:80px">Ação</th>
      </tr></thead>
      <tbody>${(data||[]).map((r,i)=>`<tr style="${i%2===0?'':'background:#fafafa'}">
        <td style="padding:7px 12px;text-align:center;font-size:12px;color:var(--text-2)">${r.codigo||i+1}</td>
        <td style="padding:7px 12px;text-align:center;font-size:13px">${r.nome}</td>
        ${paramAcoes(`editarColecao('${r.id}','${r.nome.replace(/'/g,"\\\\'")}')`,`deletarColecao('${r.id}')`)}
      </tr>`).join('')||`<tr><td colspan="3" style="padding:24px;text-align:center;color:var(--text-2)">Nenhuma coleção cadastrada</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
  if(_editColId) { const el=document.getElementById('pc-col-nome'); if(el) el.focus(); }
  lucide.createIcons();
}

function editarColecao(id, nome) {
  _editColId = id;
  const el = document.getElementById('pc-col-nome');
  if(el) { el.value = nome; el.focus(); el.style.borderColor='var(--accent)'; }
}

async function salvarColecaoParam() {
  const nome = document.getElementById('pc-col-nome')?.value?.trim();
  if(!nome) return toast('Nome obrigatório','error');
  if(_editColId) {
    await sb.from('colecoes').update({nome}).eq('id',_editColId);
    _editColId = null;
  } else {
    await sb.from('colecoes').insert({nome});
  }
  toast('Coleção salva');
  carregarParamColecao();
}

async function deletarColecao(id) {
  if(!confirm('Excluir coleção?')) return;
  await sb.from('colecoes').update({ativo:false}).eq('id',id);
  toast('Removida'); carregarParamColecao();
}

// -- CATEGORIA --
let _editCatId = null;
async function carregarParamCategoria() {
  const body = document.getElementById('param-body');
  const {data} = await sb.from('categorias').select('*').eq('ativo',true).order('nome');
  body.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
    <div style="text-align:center;padding:12px;border-bottom:1px solid var(--border);font-size:13px;font-weight:700">Cadastrar categoria</div>
    <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
      <div style="text-align:center;margin-bottom:8px;font-size:13px;font-weight:600">Descrição categoria</div>
      <input id="pc-cat-nome" style="display:block;width:100%;max-width:500px;margin:0 auto 10px;padding:8px 12px;border:1.5px solid ${_editCatId?'var(--accent)':'var(--border-2)'};border-radius:var(--radius);font-size:13px;font-family:inherit">
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button onclick="_editCatId=null;document.getElementById('pc-cat-nome').value='';carregarParamCategoria()" style="padding:7px 16px;background:white;color:var(--text-2);border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Atualizar</button>
        <button onclick="salvarCategoriaParam()" style="padding:7px 20px;background:#2563eb;color:white;border:none;border-radius:var(--radius);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Salvar</button>
      </div>
    </div>
    <div style="text-align:center;padding:8px;font-size:12px;font-weight:700;color:var(--text-2)">Listagem das categorias de estoque</div>
    <div class="table-wrap"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f8fafc">
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border)">Descrição</th>
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);width:80px">Ação</th>
      </tr></thead>
      <tbody>${(data||[]).map((r,i)=>`<tr style="${i%2===0?'':'background:#fafafa'}">
        <td style="padding:7px 12px;text-align:center;font-size:13px">${r.nome}</td>
        ${paramAcoes(`editarCategoriaParam('${r.id}','${r.nome.replace(/'/g,"\\\\'")}')`,`deletarCategoriaParam('${r.id}')`)}
      </tr>`).join('')||`<tr><td colspan="2" style="padding:24px;text-align:center;color:var(--text-2)">Nenhuma categoria</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
  lucide.createIcons();
}

function editarCategoriaParam(id, nome) {
  _editCatId = id;
  const el = document.getElementById('pc-cat-nome');
  if(el) { el.value=nome; el.focus(); el.style.borderColor='var(--accent)'; }
}

async function salvarCategoriaParam() {
  const nome = document.getElementById('pc-cat-nome')?.value?.trim();
  if(!nome) return toast('Descrição obrigatória','error');
  if(_editCatId) {
    await sb.from('categorias').update({nome}).eq('id',_editCatId);
    _editCatId = null;
  } else {
    await sb.from('categorias').insert({nome});
  }
  toast('Categoria salva'); carregarParamCategoria();
}

async function deletarCategoriaParam(id) {
  if(!confirm('Excluir categoria?')) return;
  await sb.from('categorias').update({ativo:false}).eq('id',id);
  toast('Removida'); carregarParamCategoria();
}

// -- GÊNERO --
let _editGenId = null;
async function carregarParamGenero() {
  const body = document.getElementById('param-body');
  const {data} = await sb.from('generos_estoque').select('*').order('descricao');
  body.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
    <div style="text-align:center;padding:12px;border-bottom:1px solid var(--border);font-size:13px;font-weight:700">Cadastrar gênero</div>
    <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
      <div style="text-align:center;margin-bottom:8px;font-size:13px;font-weight:600">Descrição</div>
      <input id="pc-gen-nome" style="display:block;width:100%;max-width:500px;margin:0 auto 10px;padding:8px 12px;border:1.5px solid ${_editGenId?'var(--accent)':'var(--border-2)'};border-radius:var(--radius);font-size:13px;font-family:inherit">
      <div style="display:flex;justify-content:flex-end">
        <button onclick="salvarGeneroParam()" style="padding:7px 20px;background:#2563eb;color:white;border:none;border-radius:var(--radius);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Salvar</button>
      </div>
    </div>
    <div class="table-wrap"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f8fafc">
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border)">Descrição</th>
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);width:80px">Ação</th>
      </tr></thead>
      <tbody>${(data||[]).map((r,i)=>`<tr style="${i%2===0?'':'background:#fafafa'}">
        <td style="padding:7px 12px;text-align:center;font-size:13px">${r.descricao}</td>
        ${paramAcoes(`editarGeneroParam('${r.id}','${r.descricao.replace(/'/g,"\\\\'")}')`,`deletarGeneroParam('${r.id}')`)}
      </tr>`).join('')||`<tr><td colspan="2" style="padding:24px;text-align:center;color:var(--text-2)">Nenhum gênero cadastrado</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
  lucide.createIcons();
}

function editarGeneroParam(id, desc) {
  _editGenId = id;
  const el = document.getElementById('pc-gen-nome');
  if(el) { el.value=desc; el.focus(); el.style.borderColor='var(--accent)'; }
}

async function salvarGeneroParam() {
  const desc = document.getElementById('pc-gen-nome')?.value?.trim();
  if(!desc) return toast('Descrição obrigatória','error');
  if(_editGenId) {
    await sb.from('generos_estoque').update({descricao:desc}).eq('id',_editGenId);
    _editGenId = null;
  } else {
    await sb.from('generos_estoque').insert({descricao:desc});
  }
  toast('Gênero salvo'); carregarParamGenero();
}

async function deletarGeneroParam(id) {
  if(!confirm('Excluir gênero?')) return;
  await sb.from('generos_estoque').delete().eq('id',id);
  toast('Removido'); carregarParamGenero();
}

// -- GRADE (tamanhos individuais) --
let _editGradeItemId = null;
async function carregarParamGrade() {
  const body = document.getElementById('param-body');
  const {data} = await sb.from('grade_tamanhos').select('*').order('tamanho');
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
          <div style="font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:5px;text-align:center">Faixa etária</div>
          <input id="pc-grade-faixa" placeholder="" style="width:200px;padding:8px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button onclick="_editGradeItemId=null;['pc-grade-tam','pc-grade-faixa'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});carregarParamGrade()" style="padding:7px 16px;background:white;color:var(--text-2);border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          <i data-lucide="eraser" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px"></i>Limpar
        </button>
        <button onclick="salvarGradeTamanho()" style="padding:7px 20px;background:#2563eb;color:white;border:none;border-radius:var(--radius);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Salvar</button>
      </div>
    </div>
    <div class="table-wrap"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f8fafc">
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);width:120px">Tamanho</th>
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border)">Faixa Etária</th>
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);width:80px">Ação</th>
      </tr></thead>
      <tbody>${(data||[]).map((r,i)=>`<tr style="${i%2===0?'':'background:#fafafa'}">
        <td style="padding:7px 12px;text-align:center;font-size:13px;font-weight:600">${r.tamanho}</td>
        <td style="padding:7px 12px;text-align:center;font-size:13px">${r.faixa_etaria||'—'}</td>
        ${paramAcoes(`editarGradeTamanho('${r.id}','${r.tamanho.replace(/'/g,"\\\\'")}','${(r.faixa_etaria||'').replace(/'/g,"\\\\'")}')`,`deletarGradeTamanho('${r.id}')`)}
      </tr>`).join('')||`<tr><td colspan="3" style="padding:24px;text-align:center;color:var(--text-2)">Nenhum tamanho cadastrado</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
  lucide.createIcons();
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
  if(!tam) return toast('Tamanho obrigatório','error');
  if(_editGradeItemId) {
    await sb.from('grade_tamanhos').update({tamanho:tam,faixa_etaria:faixa}).eq('id',_editGradeItemId);
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
  const {data} = await sb.from('cores_estoque').select('*').order('descricao');
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
          <div style="font-size:12px;font-weight:600;color:var(--accent);margin-bottom:5px;text-align:center">Descrição da cor</div>
          <input id="pc-cor-desc" style="width:260px;padding:8px 12px;border:1.5px solid ${_editCorId?'var(--accent)':'var(--border-2)'};border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button onclick="_editCorId=null;document.getElementById('pc-cor-hex').value='#cccccc';document.getElementById('pc-cor-desc').value='';carregarParamCor()" style="padding:7px 16px;background:white;color:var(--text-2);border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          <i data-lucide="eraser" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px"></i>Limpar
        </button>
        <button onclick="salvarCorParam()" style="padding:7px 20px;background:#2563eb;color:white;border:none;border-radius:var(--radius);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Salvar</button>
      </div>
    </div>
    <div class="table-wrap"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f8fafc">
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);width:100px">Cor</th>
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border)">Descrição</th>
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border)">Codigo hexadecimal</th>
        <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);border-bottom:1px solid var(--border);width:80px">Ação</th>
      </tr></thead>
      <tbody>${(data||[]).map((r,i)=>`<tr style="${i%2===0?'':'background:#fafafa'}">
        <td style="padding:6px 12px;text-align:center">
          <div style="width:80px;height:22px;background:${r.cor_hex||'#eee'};border-radius:3px;border:1px solid rgba(0,0,0,.1);display:inline-block"></div>
        </td>
        <td style="padding:7px 12px;text-align:center;font-size:13px">${r.descricao}</td>
        <td style="padding:7px 12px;text-align:center;font-size:12px;font-family:monospace;color:var(--text-2)">${r.cor_hex||'—'}</td>
        ${paramAcoes(`editarCorParam('${r.id}','${r.descricao.replace(/'/g,"\\\\'")}','${r.cor_hex||'#cccccc'}')`,`deletarCorParam('${r.id}')`)}
      </tr>`).join('')||`<tr><td colspan="4" style="padding:24px;text-align:center;color:var(--text-2)">Nenhuma cor cadastrada</td></tr>`}
      </tbody>
    </table></div>
  </div>`;
  lucide.createIcons();
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
  if(!desc) return toast('Descrição obrigatória','error');
  if(_editCorId) {
    await sb.from('cores_estoque').update({descricao:desc,cor_hex:hex}).eq('id',_editCorId);
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
  const {data}=await sb.from('produtos').select('*,produto_grades(*),categorias(nome)').eq('ativo',true).order('nome');
  const totalProd=data?.length||0;
  const estBaixo=(data||[]).filter(p=>(p.produto_grades||[]).every(g=>g.estoque<(p.estoque_minimo||5))).length;
  const totalPecas=(data||[]).reduce((a,p)=>(p.produto_grades||[]).reduce((b,g)=>b+g.estoque,0)+a,0);

  document.getElementById('content').innerHTML=`
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
      <div class="stat-card"><div class="stat-value">${totalProd}</div><div class="stat-label">Total de produtos</div></div>
      <div class="stat-card"><div class="stat-value">${totalPecas}</div><div class="stat-label">Total de peças</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--red)">${estBaixo}</div><div class="stat-label">Estoque crítico</div></div>
    </div>
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque por Grade</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${(data||[]).map(p=>{
          const grades=p.produto_grades||[];
          const total=grades.reduce((a,g)=>a+g.estoque,0);
          const critico=total<(p.estoque_minimo||5);
          return `<tr>
            <td><strong>${p.nome}</strong>${p.codigo?`<br><small style="color:var(--text-2)">${p.codigo}</small>`:''}
            <td>${p.categorias?.nome||'—'}</td>
            <td>${fmt(p.preco_venda)}</td>
            <td><div style="display:flex;flex-wrap:wrap;gap:4px">${grades.map(g=>`<span class="badge badge-${g.estoque<=0?'red':g.estoque<3?'yellow':'green'}">${g.tamanho}: ${g.estoque}</span>`).join('')||'—'}</div></td>
            <td><strong>${total}</strong></td>
            <td>${critico?'<span class="badge badge-red">Crítico</span>':'<span class="badge badge-green">OK</span>'}</td>
            <td><button class="btn btn-sm btn-secondary" onclick="openEstoqueModal('${p.id}','${p.nome.replace(/'/g,"\\'")}')"><i data-lucide="edit-2"></i>Ajustar</button></td>
          </tr>`;
        }).join('')}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function openEstoqueModal(id, nome) {
  const {data} = await sb.from('produto_grades').select('*').eq('produto_id', id).order('tamanho');
  
  const linhas = (data||[]).map(g => `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border)">
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">\${g.tamanho} \${g.cor_descricao?'- '+g.cor_descricao:''}</div>
        \${g.ean?\`<div style="font-size:11px;color:var(--text-2)">EAN: \${g.ean}</div>\`:\`\`}
      </div>
      <div style="width:100px">
        <input type="number" id="ajuste-grade-\${g.id}" value="\${g.estoque||0}" class="form-control" style="width:100%;text-align:center">
      </div>
    </div>
  `).join('');

  openModal(`
    <div class="modal-header">
      <h3>Ajustar Estoque: \${nome}</h3>
      <button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button>
    </div>
    <div class="modal-body" style="max-height:60vh;overflow-y:auto">
      \${data&&data.length?linhas:'<div class="empty-state" style="padding:24px"><p>Nenhuma grade cadastrada para este produto.</p></div>'}
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      \${data&&data.length?\`<button class="btn btn-primary" onclick="salvarEstoqueModal('\${id}')"><i data-lucide="save"></i>Salvar Ajuste</button>\`:\`\`}
    </div>
  `, 'modal-md');
}

async function salvarEstoqueModal(prodId) {
  const {data} = await sb.from('produto_grades').select('id').eq('produto_id', prodId);
  if(!data) return;
  
  const btn = document.querySelector('.modal-footer .btn-primary');
  if(btn){
    btn.innerHTML = '<i data-lucide="loader"></i>Salvando...';
    btn.disabled = true;
  }
  
  try {
    for(const g of data) {
      const inp = document.getElementById('ajuste-grade-'+g.id);
      if(inp && inp.value !== '') {
        const v = parseInt(inp.value)||0;
        await sb.from('produto_grades').update({estoque: v}).eq('id', g.id);
      }
    }
    closeModalDirect();
    toast('Estoque ajustado');
    renderGestaoEstoque();
  } catch(e) {
    toast('Erro ao ajustar estoque', 'error');
  }
}


// ===== CONFERÊNCIA ESTOQUE =====
let _confAtual = null; // conferência aberta

async function renderConferenciaEstoque() {
  document.getElementById('topbar-actions').innerHTML = '';

  // Verificar se há conferência aberta
  const {data:confAberta} = await sb.from('conferencias_estoque')
    .select('*').eq('status','aberta').order('created_at',{ascending:false}).limit(1);

  _confAtual = confAberta?.[0] || null;

  if(!_confAtual) {
    await abrirNovaConferencia();
    return;
  }

  await exibirConferencia(_confAtual);
}

async function abrirNovaConferencia() {
  const {data:nova,error} = await sb.from('conferencias_estoque').insert({
    status: 'aberta',
    total_lido: 0
  }).select().single();

  if(error) { toast('Erro ao criar conferência: '+error.message,'error'); return; }
  _confAtual = nova;
  await exibirConferencia(nova);
}

async function exibirConferencia(conf) {
  const {data:itens} = await sb.from('conferencia_itens')
    .select('*,produto_grades(tamanho,cor_hexa,cor_descricao,produtos(nome,preco_venda,fornecedores(razao_social)))')
    .eq('conferencia_id', conf.id)
    .order('created_at',{ascending:false});

  const totalLido = (itens||[]).reduce((a,i)=>a+i.quantidade,0);
  const dataIni = new Date(conf.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});

  const html = `
  <div style="display:flex;gap:16px;align-items:flex-start">

    <!-- SIDEBAR -->
    <div style="width:170px;flex-shrink:0;display:flex;flex-direction:column;gap:10px">
      <button onclick="limparConferencia()" style="padding:9px 0;border-radius:var(--radius);border:1.5px solid var(--border-2);background:white;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;color:var(--text-2);width:100%">Limpar</button>
      <button onclick="concluirConferencia('${conf.id}')" style="padding:9px 0;border-radius:var(--radius);border:none;background:#2563eb;color:white;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;width:100%">Concluir Conferência</button>
      <button onclick="excluirConferencia('${conf.id}')" style="padding:9px 0;border-radius:var(--radius);border:1.5px solid var(--border-2);background:white;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;color:var(--text);width:100%">Excluir</button>
      <button onclick="navigate('conferencia-estoque')" style="padding:9px 0;border-radius:var(--radius);border:none;background:#16a34a;color:white;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;width:100%">Listar</button>
      <div style="border-top:1px solid var(--border);padding-top:10px">
        <button onclick="zerarEstoque('${conf.id}')" style="padding:9px 0;border-radius:var(--radius);border:1.5px solid var(--border-2);background:white;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;color:var(--text-2);width:100%">Zerar Estoque</button>
      </div>
    </div>

    <!-- CONTEÚDO PRINCIPAL -->
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:14px">

      <!-- TÍTULO -->
      <div style="text-align:center">
        <h2 style="font-size:18px;font-weight:700;color:var(--text)">Conferência Estoque</h2>
      </div>

      <!-- IDENTIFICAÇÃO -->
      <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
        <div style="padding:10px 20px;border-bottom:1px solid var(--border)">
          <span style="font-size:13px;font-weight:700;color:var(--text)">Identificação</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 2fr 2fr 1fr;text-align:center;padding:14px 20px;gap:12px;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Número</div>
            <div style="font-size:15px;font-weight:700">${conf.id.slice(-4).toUpperCase()}</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Data início</div>
            <div style="font-size:13px;font-weight:600">${dataIni}</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Data fim</div>
            <div style="font-size:13px;color:var(--text-2)">${conf.data_fim ? new Date(conf.data_fim).toLocaleString('pt-BR') : 'em andamento'}</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Status</div>
            <div style="font-size:13px;font-weight:600;color:${conf.status==='aberta'?'var(--green)':'var(--text-2)'};text-transform:capitalize">${conf.status}</div>
          </div>
        </div>

        <!-- EAN INPUT -->
        <div style="padding:14px 20px;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:6px">EAN do Produto</div>
            <input id="conf-ean-input"
              placeholder=""
              autofocus
              style="width:100%;padding:9px 12px;border:1.5px solid var(--accent);border-radius:var(--radius);font-size:14px;outline:none"
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
    lucide.createIcons();
    const inp = document.getElementById('conf-ean-input');
    if(inp) inp.focus();
  },10);
}

function renderConferenciaItens(itens) {
  if(!itens.length) return `<div class="empty-state" style="padding:40px"><i data-lucide="clipboard-list"></i><p>Nenhum item conferido ainda.<br>Escaneie ou digite um EAN acima.</p></div>`;

  return `<div class="table-wrap"><table class="data-table" style="font-size:13px">
    <thead><tr>
      <th>Data / Hora</th>
      <th>Produto</th>
      <th>Preço</th>
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
      const corDesc = pg?.cor_descricao||'—';
      const marca = prod?.fornecedores?.razao_social || 'Fornecedor padrão';
      const dt = new Date(i.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
      const corDot = corHex
        ? `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${corHex};border:1px solid rgba(0,0,0,.15);vertical-align:-3px;margin-right:5px;flex-shrink:0"></span>`
        : '';
      return `<tr>
        <td style="font-size:11px;color:var(--text-2);white-space:nowrap">${dt}</td>
        <td style="font-size:12px">${i.ean||''} - ${prod?.nome||i.produto_nome||'—'}</td>
        <td style="font-size:12px">${prod?.preco_venda?fmt(prod.preco_venda):'—'}</td>
        <td style="font-size:12px">${pg?.tamanho||'—'}</td>
        <td style="white-space:nowrap">${corDot}${corDesc}</td>
        <td style="font-size:11px;color:var(--text-2)">${marca}</td>
        <td style="text-align:center">
          <span style="color:var(--accent);font-weight:700;font-size:14px;cursor:pointer" onclick="editarQtdeConferencia('${i.id}',${i.quantidade})" title="Clique para editar">${i.quantidade}</span>
        </td>
        <td>
          <button onclick="removerItemConferencia('${i.id}')" style="width:26px;height:26px;border:1px solid #fecaca;border-radius:4px;background:#fef2f2;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--red)"><i data-lucide="trash-2" style="width:12px;height:12px"></i></button>
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

  if(!_confAtual) return toast('Nenhuma conferência ativa','error');

  // Buscar produto_grade pelo EAN
  const {data:pg} = await sb.from('produto_grades')
    .select('id,tamanho,ean,cor_hexa,cor_descricao,produtos(id,nome,preco_venda,fornecedores(razao_social))')
    .eq('ean', ean).maybeSingle();

  if(!pg) {
    toast('EAN não encontrado: '+ean,'error');
    inp.value='';
    inp.focus();
    return;
  }

  // Verificar se já tem item desta grade nesta conferência
  const {data:existing} = await sb.from('conferencia_itens')
    .select('id,quantidade')
    .eq('conferencia_id',_confAtual.id)
    .eq('produto_grade_id',pg.id)
    .maybeSingle();

  if(existing) {
    // Incrementar quantidade
    await sb.from('conferencia_itens')
      .update({quantidade: existing.quantidade+1})
      .eq('id',existing.id);
  } else {
    // Inserir novo item
    await sb.from('conferencia_itens').insert({
      conferencia_id: _confAtual.id,
      produto_grade_id: pg.id,
      ean: ean,
      produto_nome: pg.produtos?.nome||'',
      quantidade: 1
    });
  }

  inp.value='';
  inp.focus();
  await recarregarItensConferencia();
}

async function recarregarItensConferencia() {
  const {data:itens} = await sb.from('conferencia_itens')
    .select('*,produto_grades(tamanho,cor_hexa,cor_descricao,produtos(nome,preco_venda,fornecedores(razao_social)))')
    .eq('conferencia_id',_confAtual.id)
    .order('created_at',{ascending:false});

  const totalLido = (itens||[]).reduce((a,i)=>a+i.quantidade,0);

  const tableEl = document.getElementById('conf-itens-table');
  const totalEl = document.getElementById('conf-total-lido');
  if(tableEl) { tableEl.innerHTML = renderConferenciaItens(itens||[]); lucide.createIcons(); }
  if(totalEl) totalEl.textContent = totalLido;

  // Manter foco no input
  const inp = document.getElementById('conf-ean-input');
  if(inp) inp.focus();
}

async function removerItemConferencia(id) {
  await sb.from('conferencia_itens').delete().eq('id',id);
  await recarregarItensConferencia();
}

async function editarQtdeConferencia(id, qtdeAtual) {
  const nova = prompt(`Quantidade atual: ${qtdeAtual}\nNova quantidade:`, qtdeAtual);
  if(nova === null) return;
  const n = parseInt(nova);
  if(isNaN(n)||n<0) return toast('Quantidade inválida','error');
  if(n===0) {
    await sb.from('conferencia_itens').delete().eq('id',id);
  } else {
    await sb.from('conferencia_itens').update({quantidade:n}).eq('id',id);
  }
  await recarregarItensConferencia();
}

function limparConferencia() {
  const inp = document.getElementById('conf-ean-input');
  if(inp) { inp.value=''; inp.focus(); }
}

async function concluirConferencia(id) {
  if(!confirm('Concluir a conferência e atualizar o estoque com as quantidades lidas?')) return;

  // Buscar todos os itens
  const {data:itens} = await sb.from('conferencia_itens')
    .select('produto_grade_id,quantidade')
    .eq('conferencia_id',id);

  // Atualizar estoque de cada grade
  for(const item of (itens||[])) {
    await sb.from('produto_grades')
      .update({estoque: item.quantidade})
      .eq('id', item.produto_grade_id);
  }

  await sb.from('conferencias_estoque').update({
    status:'concluida',
    data_fim: new Date().toISOString()
  }).eq('id',id);

  _confAtual = null;
  toast('Conferência concluída! Estoque atualizado.');
  navigate('gestao-estoque');
}

async function excluirConferencia(id) {
  if(!confirm('Excluir esta conferência? Os dados não serão recuperados.')) return;
  await sb.from('conferencia_itens').delete().eq('conferencia_id',id);
  await sb.from('conferencias_estoque').delete().eq('id',id);
  _confAtual = null;
  toast('Conferência excluída');
  navigate('conferencia-estoque');
}

async function zerarEstoque(confId) {
  if(!confirm('Zerar TODO o estoque dos produtos? Esta ação não pode ser desfeita.')) return;
  await sb.from('produto_grades').update({estoque:0});
  toast('Estoque zerado com sucesso','info');
}
