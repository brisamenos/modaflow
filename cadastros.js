// ===== GENERIC CRUD HELPER =====
function renderCRUDPage(opts) {
  const { title, addBtn, content } = opts;
  const ta = document.getElementById('topbar-actions');
  if(addBtn) ta.innerHTML = `<button class="btn btn-primary" onclick="${addBtn.fn}"><i data-lucide="plus"></i>${addBtn.label}</button>`;
  document.getElementById('content').innerHTML = content;
  setTimeout(()=>lucide.createIcons(),10);
}

// ===== CLIENTES =====
// ===== CLIENTES à LISTAR =====
async function renderClientes() {
  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-primary" style="background:#16a34a;box-shadow:0 2px 8px rgba(22,163,74,.3)" onclick="navigate('cadastrar-cliente')">
      <i data-lucide="plus"></i>Novo Cliente
    </button>`;
  await loadClientes();
}

let _clientesFiltroAvancado = false;

async function loadClientes(filtros={}) {
  const el = document.getElementById('content');

  let q = sb.from('clientes')
    .select('id,nome,nome_abreviado,celular,email,cpf,dia_nascimento,mes_nascimento,created_at,ativo,ultima_compra')
    .eq('ativo',true).order('created_at',{ascending:false});

  if(filtros.nome)    q = q.ilike('nome',`%${filtros.nome}%`);
  if(filtros.celular) q = q.ilike('celular',`%${filtros.celular}%`);
  if(filtros.cpf)     q = q.ilike('cpf',`%${filtros.cpf}%`);

  const {data} = await q;

  const tableRows = (data||[]).map(c => {
    const dataCad = c.created_at?new Date(c.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}):'—';
    const ultCompra = c.ultima_compra?new Date(c.ultima_compra+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}):'—';
    let niverFmt = '—';
    if(c.dia_nascimento && c.mes_nascimento) {
      niverFmt = `${String(c.dia_nascimento).padStart(2,'0')}/${String(c.mes_nascimento).padStart(2,'0')}`;
    }
    return `<tr>
      <td style="padding:8px 10px;text-align:center"><span style="font-size:16px">??</span></td>
      <td style="padding:8px 10px;font-size:12px;color:var(--text-2)">${dataCad}</td>
      <td style="padding:8px 10px;font-size:12px;font-family:monospace">${c.celular||'—'}</td>
      <td style="padding:8px 10px;font-size:13px;font-weight:600">${c.nome||'—'}</td>
      <td style="padding:8px 10px;font-size:12px;color:var(--text-2)">${c.email||'—'}</td>
      <td style="padding:8px 10px;font-size:12px;color:var(--text-2)">${ultCompra}</td>
      <td style="padding:8px 10px;font-size:12px;text-align:center;color:var(--text-2)">${niverFmt}</td>
      <td style="padding:8px 10px;white-space:nowrap">
        <button onclick="_editClienteId='${c.id}';navigate('cadastrar-cliente')" style="width:26px;height:26px;border:1px solid var(--border-2);border-radius:4px;background:white;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:var(--text-2);margin-right:3px" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text-2)'"><i data-lucide="square-pen" style="width:13px;height:13px"></i></button>
        <button onclick="deleteCliente('${c.id}')" style="width:26px;height:26px;border:1px solid #fecaca;border-radius:4px;background:#fef2f2;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:var(--red)"><i data-lucide="trash-2" style="width:13px;height:13px"></i></button>
      </td>
    </tr>`;
  }).join('');

  el.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
    <!-- barra superior -->
    <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <button onclick="toggleClientesFiltro()" style="padding:7px 14px;border:1.5px solid var(--border-2);border-radius:var(--radius);background:white;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px;color:var(--text-2)">
        <i data-lucide="sliders-horizontal" style="width:13px;height:13px"></i>Filtros Avançados
      </button>
      <div style="display:flex;gap:0;flex:1;min-width:180px">
        <input id="cl-nome" class="filter-input" placeholder="Nome abreviado ou completo" style="border-radius:var(--radius) 0 0 var(--radius);flex:1">
        <button onclick="buscarClientes()" style="padding:7px 12px;background:#2563eb;color:white;border:none;border-radius:0 var(--radius) var(--radius) 0;cursor:pointer"><i data-lucide="search" style="width:14px;height:14px"></i></button>
      </div>
      <div style="display:flex;gap:0;flex:1;min-width:160px">
        <input id="cl-celular" class="filter-input" placeholder="Celular do cliente" style="border-radius:var(--radius) 0 0 var(--radius);flex:1">
        <button onclick="buscarClientes()" style="padding:7px 12px;background:#2563eb;color:white;border:none;border-radius:0 var(--radius) var(--radius) 0;cursor:pointer"><i data-lucide="search" style="width:14px;height:14px"></i></button>
      </div>
      <div style="display:flex;gap:0;flex:1;min-width:140px">
        <input id="cl-cpf" class="filter-input" placeholder="Digite CPF/CNPJ" style="border-radius:var(--radius) 0 0 var(--radius);flex:1">
        <button onclick="buscarClientes()" style="padding:7px 12px;background:#2563eb;color:white;border:none;border-radius:0 var(--radius) var(--radius) 0;cursor:pointer"><i data-lucide="search" style="width:14px;height:14px"></i></button>
      </div>
    </div>

    <!-- filtro ativo -->
    <div style="padding:6px 16px;background:#f0fdf4;border-bottom:1px solid #bbf7d0;font-size:12px;display:flex;align-items:center;gap:6px">
      <i data-lucide="check-circle" style="width:13px;height:13px;color:var(--green)"></i>
      <span style="color:var(--green);font-weight:600">Todos Clientes Ativos</span>
    </div>

    <!-- tabela -->
    <div class="table-wrap"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f8fafc;border-bottom:2px solid var(--border)">
        <th style="padding:9px 10px;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;width:50px">Status</th>
        <th style="padding:9px 10px;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Data cadastro</th>
        <th style="padding:9px 10px;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Fone</th>
        <th style="padding:9px 10px;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Nome</th>
        <th style="padding:9px 10px;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Email</th>
        <th style="padding:9px 10px;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">última compra</th>
        <th style="padding:9px 10px;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;text-align:center">Niver Dia/Mês</th>
        <th style="padding:9px 10px;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Ação</th>
      </tr></thead>
      <tbody>${tableRows||'<tr><td colspan="8" style="text-align:center;color:var(--text-2);padding:32px">Nenhum cliente cadastrado</td></tr>'}</tbody>
    </table></div>
  </div>`;
  lucide.createIcons();
}

function buscarClientes() {
  loadClientes({
    nome: document.getElementById('cl-nome')?.value||'',
    celular: document.getElementById('cl-celular')?.value||'',
    cpf: document.getElementById('cl-cpf')?.value||''
  });
}

async function loadClienteSearch(q){await loadClientes({nome:q});}

async function deleteCliente(id) {
  if(!confirm('Excluir cliente?')) return;
  await sb.from('clientes').update({ativo:false}).eq('id',id);
  toast('Cliente removido'); loadClientes();
}

// ===== CADASTRAR CLIENTE à PÁGINA COMPLETA =====
let _editClienteId = null;
let _cadClienteId  = null;
let _filhosTemp    = [];

async function renderCadastrarCliente() {
  document.getElementById('topbar-actions').innerHTML = '';
  const clienteId = _editClienteId || null;
  _editClienteId = null;

  let cli = {};
  let filhos = [];
  if(clienteId) {
    const [{data:cd},{data:fd}] = await Promise.all([
      sb.from('clientes').select('*').eq('id',clienteId).single(),
      sb.from('cliente_filhos').select('*').eq('cliente_id',clienteId).order('nome')
    ]);
    cli = cd||{};
    filhos = fd||[];
  }
  _cadClienteId = clienteId;
  _filhosTemp = [];

  const {data:grades} = await sb.from('grades').select('id,nome').eq('ativo',true).order('nome');
  const dataCad = cli.created_at
    ? new Date(cli.created_at).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');

  // Parse aniversário
  let aniDia='', aniMes='';
  if(cli.dia_nascimento) aniDia = cli.dia_nascimento;
  if(cli.mes_nascimento) aniMes = cli.mes_nascimento;
  // fallback: parse data_nascimento se campos separados não existirem
  if(!aniDia && !aniMes && cli.data_nascimento) {
    const d = new Date(cli.data_nascimento+'T00:00:00');
    aniDia = d.getDate(); aniMes = d.getMonth()+1;
  }

  const html = `
  <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;max-width:900px;margin:0 auto">

    <!-- TÍTULO -->
    <div style="padding:10px 20px;font-size:15px;font-weight:700;color:var(--text)">Cadastrar Cliente</div>

    <!-- TABS -->
    <div style="display:flex;gap:0;border-bottom:2px solid var(--border);padding:0 8px">
      ${[['cli','Cliente'],['compl','Dados Complementares'],['filhos','Dados dos Filhos']].map(([t,l])=>`
        <button id="clic-tab-${t}" onclick="switchCliTab('${t}')"
          style="padding:9px 18px;border:none;background:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all .15s;color:var(--text-2)">
          ${l}
        </button>`).join('')}
    </div>

    <!-- TAB: CLIENTE -->
    <div id="clic-tab-cli" style="padding:20px 24px">
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:13px">
        <div><strong>Status:</strong> <span style="color:var(--green)">Ativo</span></div>
        <div><strong>Data Cadastro:</strong> ${dataCad}</div>
      </div>

      <div class="form-group" style="margin-bottom:14px">
        <label style="color:#dc2626;font-size:12px;font-weight:700;text-transform:none">Celular *</label>
        <input id="cl2-celular" value="${cli.celular||''}" placeholder="(__) ____-____"
          style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:14px;font-family:inherit"
          oninput="aplicarMaskCelular(this)">
        <div style="font-size:11px;color:var(--text-2);margin-top:3px">Informe apenas os dois dígitos do DDD</div>
        <div id="cl2-celular-err" style="font-size:12px;color:#dc2626;display:none">Celular à obrigatório.</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
        <div class="form-group">
          <label style="color:#dc2626;font-size:12px;font-weight:700;text-transform:none">Nome Completo *</label>
          <input id="cl2-nome" value="${cli.nome||''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
        <div class="form-group">
          <label style="color:#dc2626;font-size:12px;font-weight:700;text-transform:none">Nome Abreviado *</label>
          <input id="cl2-abrev" value="${cli.nome_abreviado||''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr auto auto;gap:14px;margin-bottom:14px;align-items:end">
        <div class="form-group">
          <label style="color:#dc2626;font-size:12px;font-weight:700;text-transform:none">Como nos conheceu *</label>
          <select id="cl2-como" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;background:white;font-family:inherit">
            <option value="">Selecione uma opção</option>
            ${await getComoConheceuOpts(cli.como_conheceu)}
          </select>
        </div>
        <div class="form-group" style="min-width:120px">
          <label style="color:#dc2626;font-size:12px;font-weight:700;text-transform:none">Sexo *</label>
          <div style="display:flex;align-items:center;gap:12px;padding:9px 0">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
              <input type="radio" name="cl2-sexo" value="F" ${cli.sexo==='F'?'checked':''}> F
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
              <input type="radio" name="cl2-sexo" value="M" ${cli.sexo==='M'?'checked':''}> M
            </label>
          </div>
        </div>
        <div class="form-group" style="min-width:140px">
          <label style="color:#dc2626;font-size:12px;font-weight:700;text-transform:none">Aniversário *</label>
          <div style="display:flex;align-items:center;gap:4px">
            <input id="cl2-ani-dia" type="number" min="1" max="31" placeholder="Dia" value="${aniDia}" style="width:60px;padding:9px 8px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;text-align:center;font-family:inherit">
            <span>/</span>
            <input id="cl2-ani-mes" type="number" min="1" max="12" placeholder="Mês" value="${aniMes}" style="width:60px;padding:9px 8px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;text-align:center;font-family:inherit">
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
        <div class="form-group">
          <label style="font-size:12px;font-weight:600;color:var(--text-2)">Email</label>
          <input id="cl2-email" type="email" value="${cli.email||''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
        <div class="form-group">
          <label style="font-size:12px;font-weight:600;color:var(--text-2)">Instagram</label>
          <input id="cl2-insta" value="${cli.instagram||''}" placeholder="@usuario" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
      </div>

      <div class="form-group">
        <label style="font-size:12px;font-weight:600;color:var(--text-2)">Observação</label>
        <textarea id="cl2-obs" placeholder="Informações complementares do cliente..." style="width:100%;min-height:100px;padding:10px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit;resize:vertical">${cli.observacoes||''}</textarea>
      </div>
    </div>

    <!-- TAB: DADOS COMPLEMENTARES -->
    <div id="clic-tab-compl" style="display:none;padding:20px 24px">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:14px">
        <div class="form-group" style="grid-column:1/2">
          <label style="font-size:12px;font-weight:600;color:var(--text-2)">Tipo Pessoa</label>
          <select id="cl2-tipo" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;background:white;font-family:inherit">
            <option value="PF" ${cli.tipo_pessoa!=='PJ'?'selected':''}>Pessoa Física</option>
            <option value="PJ" ${cli.tipo_pessoa==='PJ'?'selected':''}>Pessoa Jurídica</option>
          </select>
        </div>
        <div class="form-group">
          <label style="font-size:12px;font-weight:600;color:var(--text-2)">CPF</label>
          <input id="cl2-cpf" value="${cli.cpf||''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
        <div class="form-group">
          <label style="font-size:12px;font-weight:600;color:var(--text-2)">RG</label>
          <input id="cl2-rg" value="${cli.rg||''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
        <div class="form-group">
          <label style="font-size:12px;font-weight:600;color:var(--text-2)">Inscrição Estadual</label>
          <input id="cl2-ie" value="${cli.ie||''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:200px 1fr;gap:12px;margin-bottom:12px">
        <div class="form-group">
          <label style="color:#dc2626;font-size:12px;font-weight:700;text-transform:none">CEP *</label>
          <input id="cl2-cep" value="${cli.cep||''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit" onblur="buscarCEP(this.value)">
        </div>
        <div class="form-group">
          <label style="color:#dc2626;font-size:12px;font-weight:700;text-transform:none">Logradouro *</label>
          <input id="cl2-logradouro" value="${cli.logradouro||cli.endereco||''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:200px 1fr;gap:12px;margin-bottom:12px">
        <div class="form-group">
          <label style="color:#dc2626;font-size:12px;font-weight:700;text-transform:none">Número *</label>
          <input id="cl2-numero" value="${cli.numero||''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
        <div class="form-group">
          <label style="font-size:12px;font-weight:600;color:var(--text-2)">Complemento</label>
          <input id="cl2-compl" value="${cli.complemento||''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
      </div>
      <div style="margin-bottom:12px">
        <div class="form-group">
          <label style="color:#dc2626;font-size:12px;font-weight:700;text-transform:none">Bairro*</label>
          <input id="cl2-bairro" value="${cli.bairro||''}" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:200px 1fr;gap:12px">
        <div class="form-group">
          <label style="color:#dc2626;font-size:12px;font-weight:700;text-transform:none">UF*</label>
          <input id="cl2-uf" value="${cli.estado||''}" maxlength="2" style="width:100%;padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:var(--radius);font-size:13px;background:#f8fafc;font-family:inherit" readonly>
        </div>
        <div class="form-group">
          <label style="color:#dc2626;font-size:12px;font-weight:700;text-transform:none">Cidade *</label>
          <input id="cl2-cidade" value="${cli.cidade||''}" style="width:100%;padding:9px 12px;border:1.5px solid #cbd5e1;border-radius:var(--radius);font-size:13px;background:#f8fafc;font-family:inherit" readonly>
        </div>
      </div>
    </div>

    <!-- TAB: DADOS DOS FILHOS -->
    <div id="clic-tab-filhos" style="display:none;padding:20px 24px">
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:12px;margin-bottom:12px;align-items:end">
        <div class="form-group">
          <label style="color:#dc2626;font-size:12px;font-weight:700;text-transform:none">Nome Completo *</label>
          <input id="cf-nome" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
        <div class="form-group">
          <label style="color:#dc2626;font-size:12px;font-weight:700;text-transform:none">Nome Abreviado *</label>
          <input id="cf-abrev" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
        <div class="form-group" style="min-width:110px">
          <label style="color:#dc2626;font-size:12px;font-weight:700;text-transform:none">Sexo *</label>
          <div style="display:flex;align-items:center;gap:12px;padding:9px 0">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="radio" name="cf-sexo" value="F"> F</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="radio" name="cf-sexo" value="M"> M</label>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div class="form-group">
          <label style="font-size:12px;font-weight:600;color:var(--text-2)">Data de Nascimento</label>
          <input id="cf-nasc" type="date" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit">
        </div>
        <div class="form-group">
          <label style="font-size:12px;font-weight:600;color:var(--text-2)">Grade</label>
          <select id="cf-grade" style="width:100%;padding:9px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;background:white;font-family:inherit">
            <option value="">Selecione uma grade</option>
            ${(grades||[]).map(g=>`<option value="${g.id}">${g.nome}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="margin-bottom:16px">
        <button onclick="incluirFilho()" style="float:right;padding:9px 16px;background:#16a34a;color:white;border:none;border-radius:var(--radius);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px">
          <i data-lucide="plus" style="width:14px;height:14px"></i>Incluir Filho
        </button>
        <div style="clear:both"></div>
      </div>

      <!-- Tabela filhos -->
      <div id="cf-lista">
        ${renderFilhosTable(filhos)}
      </div>
    </div>

    <!-- RODAPÉ -->
    <div style="padding:14px 24px;border-top:1px solid var(--border);display:flex;gap:10px;align-items:center">
      <button onclick="navigate('clientes')" style="padding:8px 16px;background:#dc2626;color:white;border:none;border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px">
        <i data-lucide="arrow-left" style="width:13px;height:13px"></i>Voltar
      </button>
      <div style="flex:1"></div>
      <button onclick="limparFormCliente()" style="padding:8px 16px;background:white;color:var(--text-2);border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px">
        <i data-lucide="eraser" style="width:13px;height:13px"></i>Limpar
      </button>
      <button onclick="salvarClienteCompleto()" style="padding:8px 18px;background:#2563eb;color:white;border:none;border-radius:var(--radius);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(37,99,235,.3)">
        <i data-lucide="save" style="width:13px;height:13px"></i>Salvar
      </button>
    </div>
  </div>`;

  document.getElementById('content').innerHTML = html;
  setTimeout(()=>{ lucide.createIcons(); switchCliTab('cli'); },10);
}

async function getComoConheceuOpts(selected) {
  // Tentar buscar da tabela, fallback para padrões
  const {data} = await sb.from('como_conheceu').select('id,descricao').eq('ativo',true).order('descricao');
  const opcoes = (data||[]).length ? data.map(o=>o.descricao) : ['Viu a Loja na rua','Indicação de Cliente','Google','Facebook','Instagram','Outros'];
  return opcoes.map(o=>`<option value="${o}" ${selected===o?'selected':''}>${o}</option>`).join('');
}

function switchCliTab(tab) {
  ['cli','compl','filhos'].forEach(t=>{
    const panel = document.getElementById(`clic-tab-${t}`);
    const btn   = document.getElementById(`clic-tab-${t}`+'-btn') || null;
    if(panel) panel.style.display = t===tab ? 'block' : 'none';
    // update tab buttons
    const allBtns = document.querySelectorAll('[id^="clic-tab-"][id$="-btn"]');
    // fallback via loop
  });
  // Update button styles directly
  ['cli','compl','filhos'].forEach(t=>{
    const btn = document.getElementById(`clic-tab-${t}`);
    if(!btn || !btn.tagName || btn.tagName!=='BUTTON') return;
  });
  // Select tab buttons by their onclick content
  document.querySelectorAll('[onclick*="switchCliTab"]').forEach(btn=>{
    const isActive = btn.getAttribute('onclick').includes(`'${tab}'`);
    btn.style.color = isActive?'var(--accent)':'var(--text-2)';
    btn.style.borderBottomColor = isActive?'var(--accent)':'transparent';
  });
}

function aplicarMaskCelular(el) {
  let v = el.value.replace(/\D/g,'');
  if(v.length>11) v=v.slice(0,11);
  if(v.length>6) v=`(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
  else if(v.length>2) v=`(${v.slice(0,2)}) ${v.slice(2)}`;
  else if(v.length) v=`(${v}`;
  el.value=v;
}

async function buscarCEP(cep) {
  const digits = (cep||'').replace(/\D/g,'');
  if(digits.length !== 8) return;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const d = await r.json();
    if(d.erro) return;
    const set = (id,val)=>{ const e=document.getElementById(id); if(e){e.value=val;e.readOnly=true;e.style.background='#f8fafc';} };
    set('cl2-logradouro', d.logradouro||'');
    set('cl2-bairro', d.bairro||'');
    set('cl2-cidade', d.localidade||'');
    set('cl2-uf', d.uf||'');
  } catch(e) {}
}

function renderFilhosTable(filhos) {
  if(!filhos.length) return `
    <div style="text-align:center;padding:32px;color:var(--text-3)">
      <svg width="40" height="60" viewBox="0 0 40 60" xmlns="http://www.w3.org/2000/svg" style="opacity:.25;display:block;margin:0 auto 10px">
        <circle cx="20" cy="12" r="9" fill="#64748b"/>
        <ellipse cx="20" cy="40" rx="14" ry="18" fill="#94a3b8"/>
      </svg>
      <div style="font-size:13px">Nenhum filho cadastrado</div>
    </div>`;
  return `<table style="width:100%;border-collapse:collapse">
    <thead><tr style="border-bottom:2px solid var(--border)">
      <th style="padding:9px 12px;text-align:left;font-size:12px;font-weight:700;color:var(--text-2)">Nome</th>
      <th style="padding:9px 12px;text-align:left;font-size:12px;font-weight:700;color:var(--text-2)">Nascimento</th>
      <th style="padding:9px 12px;text-align:left;font-size:12px;font-weight:700;color:var(--text-2)">Grade</th>
      <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2)">Sexo</th>
      <th style="padding:9px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2)">Ações</th>
    </tr></thead>
    <tbody>${filhos.map((f,i)=>`<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:8px 12px;font-size:13px">${f.nome}</td>
      <td style="padding:8px 12px;font-size:12px;color:var(--text-2)">${f.data_nascimento?new Date(f.data_nascimento+'T00:00:00').toLocaleDateString('pt-BR'):'—'}</td>
      <td style="padding:8px 12px;font-size:12px;color:var(--text-2)">${f.grade_nome||'—'}</td>
      <td style="padding:8px 12px;text-align:center;font-size:12px">${f.sexo||'—'}</td>
      <td style="padding:8px 12px;text-align:center">
        <button onclick="removerFilho(${i})" style="width:24px;height:24px;border:1px solid #fecaca;border-radius:4px;background:#fef2f2;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:var(--red)"><i data-lucide="trash-2" style="width:12px;height:12px"></i></button>
      </td>
    </tr>`).join('')}
    </tbody>
  </table>`;
}

async function incluirFilho() {
  const nome  = document.getElementById('cf-nome')?.value?.trim();
  const abrev = document.getElementById('cf-abrev')?.value?.trim();
  const sexo  = document.querySelector('input[name="cf-sexo"]:checked')?.value||'';
  const nasc  = document.getElementById('cf-nasc')?.value||null;
  const gid   = document.getElementById('cf-grade')?.value||null;
  const gnome = document.getElementById('cf-grade')?.options[document.getElementById('cf-grade')?.selectedIndex]?.text||'—';
  if(!nome) return toast('Nome do filho obrigatório','error');
  const filho = {nome, nome_abreviado:abrev, sexo, data_nascimento:nasc, grade_id:gid, grade_nome:gnome};

  if(_cadClienteId) {
    const {error} = await sb.from('cliente_filhos').insert({...filho, cliente_id:_cadClienteId});
    if(error) return toast('Erro: '+error.message,'error');
    const {data:fd} = await sb.from('cliente_filhos').select('*').eq('cliente_id',_cadClienteId).order('nome');
    const el = document.getElementById('cf-lista');
    if(el) el.innerHTML = renderFilhosTable(fd||[]);
  } else {
    _filhosTemp.push(filho);
    const el = document.getElementById('cf-lista');
    if(el) el.innerHTML = renderFilhosTable(_filhosTemp);
  }
  ['cf-nome','cf-abrev','cf-nasc'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('cf-grade').value='';
  const r=document.querySelector('input[name="cf-sexo"]:checked'); if(r) r.checked=false;
  lucide.createIcons();
  toast('Filho incluído');
}

function removerFilho(idx) {
  if(!confirm('Remover filho?')) return;
  if(_cadClienteId) {
    // recarregar da DB via callback
    toast('Use o botão de deletar após salvar o cliente','info');
    return;
  }
  _filhosTemp.splice(idx,1);
  const el = document.getElementById('cf-lista');
  if(el) el.innerHTML = renderFilhosTable(_filhosTemp);
  lucide.createIcons();
}

function limparFormCliente() {
  const ids = ['cl2-celular','cl2-nome','cl2-abrev','cl2-email','cl2-insta','cl2-obs',
    'cl2-cpf','cl2-rg','cl2-ie','cl2-cep','cl2-logradouro','cl2-numero','cl2-compl','cl2-bairro'];
  ids.forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('cl2-como').value='';
  document.getElementById('cl2-tipo').value='PF';
  const r=document.querySelector('input[name="cl2-sexo"]:checked'); if(r) r.checked=false;
  document.getElementById('cl2-ani-dia').value='';
  document.getElementById('cl2-ani-mes').value='';
}

async function salvarClienteCompleto() {
  const celular = document.getElementById('cl2-celular')?.value?.trim();
  const nome    = document.getElementById('cl2-nome')?.value?.trim();
  if(!celular) {
    const err = document.getElementById('cl2-celular-err');
    if(err) err.style.display='block';
    document.getElementById('cl2-celular').style.borderColor='#dc2626';
    switchCliTab('cli');
    return toast('Celular obrigatório','error');
  }
  if(!nome) { switchCliTab('cli'); return toast('Nome completo obrigatório','error'); }

  const dia  = parseInt(document.getElementById('cl2-ani-dia')?.value||0);
  const mes  = parseInt(document.getElementById('cl2-ani-mes')?.value||0);
  let dataNasc = null;
  if(dia&&mes) dataNasc = `2000-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;

  const payload = {
    nome,
    nome_abreviado: document.getElementById('cl2-abrev')?.value?.trim()||null,
    celular,
    email:         document.getElementById('cl2-email')?.value||null,
    instagram:     document.getElementById('cl2-insta')?.value||null,
    sexo:          document.querySelector('input[name="cl2-sexo"]:checked')?.value||null,
    como_conheceu: document.getElementById('cl2-como')?.value||null,
    dia_nascimento: dia||null,
    mes_nascimento: mes||null,
    data_nascimento: dataNasc,
    observacoes:   document.getElementById('cl2-obs')?.value||null,
    tipo_pessoa:   document.getElementById('cl2-tipo')?.value||'PF',
    cpf:           document.getElementById('cl2-cpf')?.value||null,
    rg:            document.getElementById('cl2-rg')?.value||null,
    ie:            document.getElementById('cl2-ie')?.value||null,
    cep:           document.getElementById('cl2-cep')?.value||null,
    logradouro:    document.getElementById('cl2-logradouro')?.value||null,
    numero:        document.getElementById('cl2-numero')?.value||null,
    complemento:   document.getElementById('cl2-compl')?.value||null,
    bairro:        document.getElementById('cl2-bairro')?.value||null,
    estado:        document.getElementById('cl2-uf')?.value||null,
    cidade:        document.getElementById('cl2-cidade')?.value||null
  };

  let savedId = _cadClienteId;
  if(savedId) {
    const {error} = await sb.from('clientes').update(payload).eq('id',savedId);
    if(error) return toast('Erro: '+error.message,'error');
  } else {
    const {data:nc,error} = await sb.from('clientes').insert(payload).select().single();
    if(error) return toast('Erro: '+error.message,'error');
    savedId = nc.id;
    _cadClienteId = savedId;
    // Salvar filhos temporários
    for(const f of _filhosTemp)
      await sb.from('cliente_filhos').insert({...f, cliente_id:savedId});
    _filhosTemp=[];
  }
  toast('Cliente salvo com sucesso');
  _editClienteId = savedId;
  renderCadastrarCliente();
}

// ===== COMO CONHECEU =====
async function renderComoConheceu() {
  document.getElementById('topbar-actions').innerHTML='';
  const {data} = await sb.from('como_conheceu').select('*').eq('ativo',true).order('descricao');
  document.getElementById('content').innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;max-width:600px">
    <div style="padding:12px 20px;border-bottom:1px solid var(--border);font-size:13px;font-weight:700">Como nos Conheceu à Opções</div>
    <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
      <div class="form-group">
        <label>Descrição *</label>
        <input id="cc-desc" placeholder="Ex: Indicação de amigo" style="width:100%;padding:8px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit">
      </div>
      <div style="margin-top:10px;text-align:right">
        <button onclick="salvarComoConheceu()" style="padding:8px 20px;background:#2563eb;color:white;border:none;border-radius:var(--radius);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Salvar</button>
      </div>
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Descrição</th><th style="width:80px">Ação</th></tr></thead>
      <tbody>${(data||[]).map(r=>`<tr>
        <td>${r.descricao}</td>
        <td><button onclick="deletarComoConheceu('${r.id}')" style="width:26px;height:26px;border:1px solid #fecaca;border-radius:4px;background:#fef2f2;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:var(--red)"><i data-lucide="trash-2" style="width:12px;height:12px"></i></button></td>
      </tr>`).join('')||'<tr><td colspan="2" style="text-align:center;color:var(--text-2);padding:24px">Nenhuma opção cadastrada</td></tr>'}
      </tbody>
    </table></div>
  </div>`;
  lucide.createIcons();
}

async function salvarComoConheceu() {
  const desc = document.getElementById('cc-desc')?.value?.trim();
  if(!desc) return toast('Descrição obrigatória','error');
  await sb.from('como_conheceu').insert({descricao:desc});
  toast('Opção salva'); renderComoConheceu();
}

async function deletarComoConheceu(id) {
  if(!confirm('Remover opção?')) return;
  await sb.from('como_conheceu').update({ativo:false}).eq('id',id);
  toast('Removido'); renderComoConheceu();
}

// ===== HISTÓRICO DE CLIENTES =====
async function renderHistoricoClientes() {
  document.getElementById('content').innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;margin-bottom:14px;display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
    <div class="form-group" style="min-width:200px;flex:1">
      <label>Buscar cliente</label>
      <input id="hc-nome" class="filter-input" placeholder="Nome ou celular" style="width:100%">
    </div>
    <button onclick="buscarHistoricoCliente()" class="btn btn-primary"><i data-lucide="search"></i>Buscar</button>
  </div>
  <div id="hc-resultado"></div>`;
  lucide.createIcons();
}

async function buscarHistoricoCliente() {
  const q = document.getElementById('hc-nome')?.value?.trim();
  if(!q) return toast('Informe o nome ou celular','error');
  const {data:clis} = await sb.from('clientes').select('id,nome,celular').eq('ativo',true).or(`nome.ilike.%${q}%,celular.ilike.%${q}%`).limit(5);
  const res = document.getElementById('hc-resultado');
  if(!clis||!clis.length) { res.innerHTML='<div class="empty-state"><p>Nenhum cliente encontrado</p></div>'; return; }
  if(clis.length===1) { carregarHistoricoCliente(clis[0].id, clis[0].nome); return; }
  res.innerHTML = `<div class="card"><div class="card-body"><div style="font-size:13px;margin-bottom:8px;font-weight:600">Selecione o cliente:</div>${clis.map(c=>`
    <div onclick="carregarHistoricoCliente('${c.id}','${c.nome.replace(/'/g,"\\\\'")}');this.parentElement.remove()" style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;margin-bottom:6px;font-size:13px" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
      <strong>${c.nome}</strong> à ${c.celular||'—'}
    </div>`).join('')}</div></div>`;
}

async function carregarHistoricoCliente(id, nome) {
  const {data:vendas} = await sb.from('vendas').select('id,numero_venda,total,forma_pagamento,status,created_at,venda_itens(produto_nome,quantidade,total)').eq('cliente_id',id).order('created_at',{ascending:false});
  const totalGasto = (vendas||[]).filter(v=>v.status==='concluida').reduce((a,v)=>a+parseFloat(v.total||0),0);
  document.getElementById('hc-resultado').innerHTML = `
  <div style="font-size:15px;font-weight:700;margin-bottom:12px">${nome} à ${(vendas||[]).length} compras | Total: ${fmt(totalGasto)}</div>
  <div class="card"><div class="table-wrap"><table class="data-table">
    <thead><tr><th>#</th><th>Data</th><th>Forma Pag.</th><th>Total</th><th>Status</th><th>Itens</th></tr></thead>
    <tbody>${(vendas||[]).map(v=>`<tr>
      <td>#${v.numero_venda}</td>
      <td>${fmtDatetime(v.created_at)}</td>
      <td style="text-transform:capitalize">${v.forma_pagamento||'—'}</td>
      <td><strong>${fmt(v.total)}</strong></td>
      <td>${badgeStatus(v.status)}</td>
      <td style="font-size:11px;color:var(--text-2)">${(v.venda_itens||[]).map(i=>`${i.produto_nome} (${i.quantidade})`).join(', ')||'—'}</td>
    </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--text-2);padding:24px">Nenhuma compra</td></tr>'}
    </tbody>
  </table></div></div>`;
  lucide.createIcons();
}

// ===== PAINEL DE CLIENTES =====
async function renderPainelClientes() {
  const now = new Date();
  const ini = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  const fim = now.toISOString().split('T')[0];

  const [{data:vendas},{data:clientes}] = await Promise.all([
    sb.from('vendas').select('total,cliente_id,clientes(nome,celular)').gte('created_at',ini).lte('created_at',fim+'T23:59:59').eq('status','concluida'),
    sb.from('venda_itens').select('produto_nome,quantidade').gte('created_at',ini).lte('created_at',fim+'T23:59:59')
  ]);

  const totalVendas = (vendas||[]).reduce((a,v)=>a+parseFloat(v.total||0),0);
  const numVendas   = (vendas||[]).length;
  const ticketMedio = numVendas>0?(totalVendas/numVendas):0;
  const clientesUnicos = new Set((vendas||[]).filter(v=>v.cliente_id).map(v=>v.cliente_id)).size;

  // Top clientes
  const cliMap = {};
  (vendas||[]).forEach(v=>{
    const key = v.cliente_id||'balcao';
    const nome = v.clientes?.nome||'Cliente balcão';
    const fone = v.clientes?.celular||'';
    if(!cliMap[key]) cliMap[key]={nome,fone,total:0,pecas:0,freq:0};
    cliMap[key].total+=parseFloat(v.total||0);
    cliMap[key].freq++;
  });

  // Top produtos
  const prodMap = {};
  (clientes||[]).forEach(i=>{
    const cat = i.produto_nome?.split(' ')[0]||'Outro';
    prodMap[cat]=(prodMap[cat]||0)+i.quantidade;
  });

  const topCli = Object.values(cliMap).sort((a,b)=>b.total-a.total).slice(0,50);
  const topProd = Object.entries(prodMap).sort((a,b)=>b[1]-a[1]).slice(0,10);

  document.getElementById('content').innerHTML = `
  <div style="font-size:13px;color:var(--text-2);margin-bottom:12px">
    Painel de Clientes por compras: ${new Date(ini+'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(fim+'T00:00:00').toLocaleDateString('pt-BR')}
    <button onclick="toast('Filtrar períodos: em breve','info')" style="margin-left:12px;padding:5px 12px;border:1px solid var(--border-2);border-radius:var(--radius);background:white;font-size:12px;cursor:pointer;font-family:inherit"><i data-lucide="calendar" style="width:12px;height:12px;vertical-align:-2px;margin-right:4px"></i>Filtrar Períodos</button>
  </div>
  <div class="stats-grid" style="margin-bottom:16px">
    <div class="stat-card" style="background:#2563eb;color:white;border:none"><div style="font-size:11px;font-weight:600;opacity:.8;margin-bottom:4px">Vendas no período</div><div style="font-size:26px;font-weight:800">${fmtNum(totalVendas)}</div></div>
    <div class="stat-card" style="background:#16a34a;color:white;border:none"><div style="font-size:11px;font-weight:600;opacity:.8;margin-bottom:4px">Peças vendidas</div><div style="font-size:26px;font-weight:800">${(clientes||[]).reduce((a,i)=>a+i.quantidade,0)}</div></div>
    <div class="stat-card" style="background:#d97706;color:white;border:none"><div style="font-size:11px;font-weight:600;opacity:.8;margin-bottom:4px">Ticket médio</div><div style="font-size:26px;font-weight:800">${fmtNum(ticketMedio)}</div></div>
    <div class="stat-card" style="background:#7c3aed;color:white;border:none"><div style="font-size:11px;font-weight:600;opacity:.8;margin-bottom:4px">Clientes que compraram</div><div style="font-size:26px;font-weight:800">${clientesUnicos}</div></div>
  </div>
  <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
    <div>
      <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:8px">Clientes que mais compraram na loja (até 100)</div>
      <div class="card"><div class="table-wrap"><table class="data-table" style="font-size:12px">
        <thead><tr><th>Celular</th><th>Nome</th><th style="text-align:right">Valor total</th><th style="text-align:center">Freq</th></tr></thead>
        <tbody>${topCli.map(c=>`<tr>
          <td style="font-family:monospace">${c.fone||'—'}</td>
          <td><strong>${c.nome}</strong></td>
          <td style="text-align:right">${fmtNum(c.total)}</td>
          <td style="text-align:center">${c.freq}</td>
        </tr>`).join('')}</tbody>
      </table></div></div>
    </div>
    <div>
      <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:8px">Produtos que vendem mais</div>
      <div style="font-size:12px;color:var(--text-2);margin-bottom:8px">Os 10 grupos mais comprados</div>
      <div class="card"><div class="card-body">
        ${topProd.map(([n,q])=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px"><span>${n}</span><strong>${q}</strong></div>`).join('')}
      </div></div>
    </div>
  </div>`;
  lucide.createIcons();
}


// ===== IMPORTAR CLIENTES =====
async function renderImportarClientes() {
  document.getElementById('topbar-actions').innerHTML = '';
  document.getElementById('content').innerHTML = `
  <div style="max-width:860px">
    <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">

      <div style="padding:16px 22px;border-bottom:1px solid var(--border)">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:6px">Importar Clientes via CSV</h3>
        <p style="font-size:12.5px;color:var(--text-2);margin:0">
          Compatível com o formato de backup: <strong>ID; Data cadastro; Nome; Abreviado; Celular; Sexo; Dia Aniv; Mês Aniv; Email; Instagram; Ativo; Limite; CPF; CEP; Logradouro; Número; Complemento; Bairro; UF; Cidade</strong>
          <br>Separador: <code style="background:#f1f5f9;padding:1px 5px;border-radius:3px">;</code> à Encoding: UTF-8 ou Latin-1
        </p>
      </div>

      <!-- DROP ZONE -->
      <div style="padding:20px 22px;border-bottom:1px solid var(--border)">
        <div id="ic-dropzone"
          style="border:2px dashed var(--border-2);border-radius:var(--radius-lg);padding:36px;text-align:center;background:var(--bg);cursor:pointer;transition:all .2s"
          onclick="document.getElementById('ic-file').click()"
          ondragover="event.preventDefault();this.style.borderColor='var(--accent)';this.style.background='#eff6ff'"
          ondragleave="this.style.borderColor='var(--border-2)';this.style.background='var(--bg)'"
          ondrop="event.preventDefault();this.style.borderColor='var(--border-2)';this.style.background='var(--bg)';previewClientesCSV(event.dataTransfer.files[0])">
          <i data-lucide="upload-cloud" style="width:40px;height:40px;color:var(--text-2);margin-bottom:10px"></i>
          <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px">Clique para selecionar o arquivo CSV</div>
          <div style="font-size:12px;color:var(--text-2)">ou arraste e solte aqui</div>
          <input type="file" id="ic-file" accept=".csv" style="display:none" onchange="previewClientesCSV(this.files[0])">
        </div>
      </div>

      <!-- PREVIEW + PROGRESSO -->
      <div id="ic-preview" style="padding:0 22px 20px"></div>
    </div>
  </div>`;
  setTimeout(()=>lucide.createIcons(),10);
}

function parseCSVLineCliente(line) {
  const result = [];
  let cur = '', inQ = false;
  for(let i=0;i<line.length;i++){
    const ch = line[i];
    if(ch==='"'){ inQ=!inQ; }
    else if(ch===';'&&!inQ){ result.push(cur.trim()); cur=''; }
    else { cur+=ch; }
  }
  result.push(cur.trim());
  return result;
}

async function previewClientesCSV(file) {
  if(!file) return;

  // Ler como UTF-8, fallback Latin-1
  let text = '';
  try {
    text = await file.text();
  } catch(e) {
    const buf = await file.arrayBuffer();
    text = new TextDecoder('windows-1252').decode(buf);
  }

  const lines = text.split(/\r?\n/).filter(l=>l.trim());

  // Detectar se tem cabeçalho (primeira célula não numérica)
  const firstCell = parseCSVLineCliente(lines[0])[0].replace(/^\uFEFF/,'');
  const hasHeader = isNaN(parseInt(firstCell));
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows = dataLines
    .map(l=>parseCSVLineCliente(l))
    .filter(r=>r.length>=5 && r[2]); // precisa ter pelo menos nome

  if(!rows.length) {
    document.getElementById('ic-preview').innerHTML =
      '<div class="empty-state" style="padding:32px"><i data-lucide="alert-circle"></i><p>Nenhuma linha válida encontrada no arquivo</p></div>';
    lucide.createIcons(); return;
  }

  window._icRows = rows;

  const preview = rows.slice(0,5).map(r=>
    `<tr><td style="font-size:12px;color:var(--text-2)">${r[0]||'—'}</td><td style="font-size:12px">${r[1]||'—'}</td><td style="font-size:13px;font-weight:600">${r[2]||'—'}</td><td style="font-size:12px">${r[3]||'—'}</td><td style="font-family:monospace;font-size:12px">${r[4]||'—'}</td><td style="font-size:12px;text-align:center">${r[5]||'—'}</td><td style="font-size:12px;text-align:center">${r[6]||''}/${r[7]||''}</td><td style="font-size:11px;color:var(--text-2)">${r[8]||'—'}</td></tr>`
  ).join('');

  document.getElementById('ic-preview').innerHTML = `
  <div style="margin-top:16px">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--radius);padding:12px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:var(--green)">${rows.length}</div>
        <div style="font-size:12px;color:var(--green)">Clientes no arquivo</div>
      </div>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:var(--radius);padding:12px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:var(--accent)">${rows.filter(r=>r[4]).length}</div>
        <div style="font-size:12px;color:var(--accent)">Com celular</div>
      </div>
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:var(--radius);padding:12px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:var(--yellow)">${rows.filter(r=>r[8]).length}</div>
        <div style="font-size:12px;color:var(--yellow)">Com email</div>
      </div>
    </div>

    <!-- Prévia -->
    <div style="font-size:13px;font-weight:600;margin-bottom:8px">Prévia dos primeiros 5 registros:</div>
    <div style="overflow-x:auto;margin-bottom:16px">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#f8fafc;border-bottom:2px solid var(--border)">
          <th style="padding:7px 10px;text-align:left;color:var(--text-2)">ID</th>
          <th style="padding:7px 10px;text-align:left;color:var(--text-2)">Cadastro</th>
          <th style="padding:7px 10px;text-align:left;color:var(--text-2)">Nome</th>
          <th style="padding:7px 10px;text-align:left;color:var(--text-2)">Abreviado</th>
          <th style="padding:7px 10px;text-align:left;color:var(--text-2)">Celular</th>
          <th style="padding:7px 10px;text-align:center;color:var(--text-2)">Sexo</th>
          <th style="padding:7px 10px;text-align:center;color:var(--text-2)">Aniv</th>
          <th style="padding:7px 10px;text-align:left;color:var(--text-2)">Email</th>
        </tr></thead>
        <tbody>${preview}</tbody>
      </table>
      ${rows.length>5?`<div style="font-size:12px;color:var(--text-2);padding:6px 10px">... e mais ${rows.length-5} clientes</div>`:''}
    </div>

    <!-- Aviso -->
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:var(--radius);padding:12px 16px;margin-bottom:16px;font-size:12.5px;color:#854d0e">
      <strong>Aviso:</strong> Clientes com o mesmo celular serão <strong>atualizados</strong>. Novos celulares serão criados como novos clientes.
    </div>

    <!-- Progresso (oculto até importar) -->
    <div id="ic-progress-wrap" style="display:none;margin-bottom:16px">
      <div style="font-size:12px;color:var(--text-2);margin-bottom:6px" id="ic-progress-label">Importando...</div>
      <div style="background:var(--border);border-radius:99px;height:8px;overflow:hidden">
        <div id="ic-progress-bar" style="height:100%;background:var(--accent);width:0%;transition:width .15s;border-radius:99px"></div>
      </div>
    </div>

    <!-- Botões -->
    <div style="display:flex;justify-content:flex-end;gap:10px">
      <button onclick="renderImportarClientes()" class="btn btn-secondary"><i data-lucide="x"></i>Cancelar</button>
      <button id="ic-btn-import" onclick="executarImportacaoClientes()" class="btn btn-primary" style="background:#16a34a;box-shadow:0 2px 8px rgba(22,163,74,.3)">
        <i data-lucide="download"></i>Importar ${rows.length} clientes
      </button>
    </div>
  </div>`;
  lucide.createIcons();
}

function parseDateBR(str) {
  // dd/mm/yyyy ? yyyy-mm-dd
  if(!str) return null;
  const p = str.trim().split('/');
  if(p.length!==3) return null;
  const [d,m,y] = p;
  if(!y||y.length!==4) return null;
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
}

async function executarImportacaoClientes() {
  const rows = window._icRows;
  if(!rows||!rows.length) return toast('Nenhum dado para importar','error');

  const btn = document.getElementById('ic-btn-import');
  if(btn) { btn.disabled=true; btn.innerHTML='<i data-lucide="loader"></i>Importando...'; lucide.createIcons(); }
  document.getElementById('ic-progress-wrap').style.display='block';

  const setProgress = (n, total, msg) => {
    const bar = document.getElementById('ic-progress-bar');
    const lbl = document.getElementById('ic-progress-label');
    if(bar) bar.style.width = ((n/total)*100).toFixed(1)+'%';
    if(lbl) lbl.textContent = msg;
  };

  let criados=0, atualizados=0, erros=0;

  // Processar em lotes de 20 para não sobrecarregar
  const BATCH = 20;
  for(let i=0;i<rows.length;i++) {
    const r = rows[i];
    setProgress(i+1, rows.length, `(${i+1}/${rows.length}) ${r[2]||''}`);

    try {
      // Montar payload
      // Colunas: [0]ID [1]DataCad [2]Nome [3]Abrev [4]Celular [5]Sexo [6]DiaAniv [7]MesAniv [8]Email [9]Insta [10]Ativo [11]Limite [12]CPF [13]CEP [14]Logradouro [15]Numero [16]Compl [17]Bairro [18]UF [19]Cidade
      const celular = (r[4]||'').trim();
      const nome    = (r[2]||'').trim();
      if(!nome) { erros++; continue; }

      // Data de cadastro
      const dataCad = parseDateBR(r[1]);

      // Aniversário: guardar dia e mês separados + data fictícia ano 2000
      let dataNasc = null;
      const dia = parseInt(r[6]||0), mes = parseInt(r[7]||0);
      if(dia>0 && mes>0) dataNasc = `2000-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;

      const payload = {
        codigo_externo: (r[0]||'').trim()||null,
        nome,
        nome_abreviado: (r[3]||'').trim()||null,
        celular: celular||null,
        sexo: (r[5]||'').trim()||null,
        dia_nascimento: dia>0?dia:null,
        mes_nascimento: mes>0?mes:null,
        data_nascimento: dataNasc,
        email: (r[8]||'').trim()||null,
        instagram: (r[9]||'').trim()||null,
        ativo: (r[10]||'S').trim().toUpperCase() !== 'N',
        cpf: (r[12]||'').replace(/\D/g,'')||null,
        cep: (r[13]||'').trim()||null,
        logradouro: (r[14]||'').trim()||null,
        numero: (r[15]||'').trim()||null,
        complemento: (r[16]||'').trim()||null,
        bairro: (r[17]||'').trim()||null,
        estado: (r[18]||'').trim()||null,
        cidade: (r[19]||'').trim()||null
      };

      if(celular) {
        // Tentar encontrar pelo celular
        const {data:existing} = await sb.from('clientes')
          .select('id').eq('celular',celular).maybeSingle();
        if(existing) {
          await sb.from('clientes').update(payload).eq('id',existing.id);
          atualizados++;
        } else {
          await sb.from('clientes').insert(payload);
          criados++;
        }
      } else {
        // Sem celular à inserir apenas se nome não existe
        const {data:ex2} = await sb.from('clientes')
          .select('id').eq('nome',nome).eq('ativo',true).maybeSingle();
        if(!ex2) {
          await sb.from('clientes').insert(payload);
          criados++;
        } else {
          atualizados++;
        }
      }
    } catch(e) {
      erros++;
      console.error('Erro linha',i, e);
    }
  }

  document.getElementById('ic-progress-wrap').style.display='none';
  document.getElementById('ic-preview').innerHTML = `
  <div style="text-align:center;padding:32px">
    <div style="font-size:40px;margin-bottom:12px">?</div>
    <h3 style="font-size:18px;font-weight:700;margin-bottom:10px">Importação concluída!</h3>
    <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:20px">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--radius);padding:12px 20px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:var(--green)">${criados}</div>
        <div style="font-size:12px;color:var(--green)">Criados</div>
      </div>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:var(--radius);padding:12px 20px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:var(--accent)">${atualizados}</div>
        <div style="font-size:12px;color:var(--accent)">Atualizados</div>
      </div>
      ${erros>0?`<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:var(--radius);padding:12px 20px;text-align:center"><div style="font-size:24px;font-weight:800;color:var(--red)">${erros}</div><div style="font-size:12px;color:var(--red)">Erros</div></div>`:''}
    </div>
    <button onclick="navigate('clientes')" class="btn btn-primary">
      <i data-lucide="users"></i>Ver Clientes
    </button>
    <button onclick="repararAniversarios()" style="margin-left:10px;padding:8px 16px;background:white;color:var(--text-2);border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px">
      <i data-lucide="refresh-cw" style="width:14px;height:14px"></i>Reparar Aniversários
    </button>
  </div>`;
  lucide.createIcons();
}

async function repararAniversarios() {
  toast('Sincronizando aniversários...','info');
  try {
    const {data,error} = await sb.rpc('repairBirthdays');
    if(error) return toast('Erro: '+error.message,'error');
    const d = data||{};
    toast(`Aniversários reparados! ${d.from_data_niver||0} de data_nascimento, ${d.from_dia_mes||0} de dia/mês. Total com niver: ${d.total_com_aniversario||0}`,'success');
  } catch(e) {
    toast('Erro ao reparar: '+e.message,'error');
  }
}

// ===== PRODUTOS =====
// ===== PRODUTOS à LISTA =====
async function renderProdutos() {
  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-primary" style="background:#16a34a;border:none;box-shadow:0 2px 8px rgba(22,163,74,.3)" onclick="navigate('cadastrar-produto')">
      <i data-lucide="plus"></i>Incluir Novo Produto
    </button>`;
  await loadProdutos();
}

let _filaImpressao = [];

async function renderListaProdutosEstoque() {
  const el = document.getElementById('content');
  if(!el) return;

  // Buscar opções dos selects
  const [{data:cats},{data:forns},{data:grades}] = await Promise.all([
    sb.from('categorias').select('id,nome').eq('ativo',true).order('nome'),
    sb.from('fornecedores').select('id,razao_social').eq('ativo',true).order('razao_social'),
    sb.from('grades').select('id,nome').eq('ativo',true).order('nome')
  ]);

  el.innerHTML = `
  <div style="display:flex;gap:0;align-items:flex-start">

    <!-- SIDEBAR FILTRO -->
    <div style="width:220px;flex-shrink:0;background:white;border:1px solid var(--border);border-right:none;border-radius:var(--radius-lg) 0 0 var(--radius-lg);padding:16px 14px;min-height:400px">
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:14px">Filtro</div>

      <div style="font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Informe o Produto</div>
      <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:14px">
        <input id="lp-ean" placeholder="Cód. Barra"
          style="padding:7px 10px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit"
          onkeydown="if(event.key==='Enter')buscarListaProdutos()">
        <input id="lp-codigo" placeholder="Código do Produto"
          style="padding:7px 10px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-family:inherit"
          onkeydown="if(event.key==='Enter')buscarListaProdutos()">
      </div>

      <div style="font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Filtros adicionais</div>
      <div style="display:flex;flex-direction:column;gap:7px">
        <select id="lp-cat" style="padding:7px 10px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:12px;background:white">
          <option value="">Todas as categorias</option>
          ${(cats||[]).map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}
        </select>
        <select id="lp-forn" style="padding:7px 10px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:12px;background:white">
          <option value="">Todos os fornecedores</option>
          ${(forns||[]).map(f=>`<option value="${f.id}">${f.razao_social}</option>`).join('')}
        </select>
        <select id="lp-grade" style="padding:7px 10px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:12px;background:white">
          <option value="">Todas as grades</option>
          ${(grades||[]).map(g=>`<option value="${g.id}">${g.nome}</option>`).join('')}
        </select>
        <select id="lp-gen" style="padding:7px 10px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:12px;background:white">
          <option value="">Todos os gêneros</option>
          <option value="F">Feminino</option>
          <option value="M">Masculino</option>
          <option value="U">Unissex</option>
          <option value="J">Juvenil</option>
        </select>
        <button onclick="buscarListaProdutos()" style="padding:8px;background:#2563eb;color:white;border:none;border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px">
          <i data-lucide="search" style="width:14px;height:14px"></i>Buscar
        </button>
        <button onclick="limparListaProdutos()" style="padding:8px;background:white;color:var(--text-2);border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          Limpar
        </button>
      </div>
    </div>

    <!-- ÁREA PRINCIPAL -->
    <div style="flex:1;min-width:0;background:white;border:1px solid var(--border);border-radius:0 var(--radius-lg) var(--radius-lg) 0;overflow:hidden">

      <!-- BARRA DE AÇÕES -->
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="display:flex;flex-direction:column;gap:3px">
          <div style="font-size:11px;font-weight:700;color:var(--text-2)">Listar Produtos que:</div>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:11px;font-weight:600;color:var(--text-2)">Etiqueta</span>
              <label style="position:relative;display:inline-block;width:38px;height:20px;cursor:pointer">
                <input type="checkbox" id="lp-etiqueta" style="opacity:0;width:0;height:0" onchange="atualizarToggleEtiqueta(this)">
                <span id="lp-toggle-span" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#16a34a;border-radius:20px;transition:.3s">
                  <span style="position:absolute;left:3px;top:3px;width:14px;height:14px;background:white;border-radius:50%;transition:.3s;transform:translateX(18px)"></span>
                </span>
              </label>
            </div>
            <select id="lp-opcao" style="padding:5px 10px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:12px;background:white;min-width:180px">
              <option value="">Selecione uma opção</option>
              <option value="sem_etiqueta">Sem etiqueta impressa</option>
              <option value="com_etiqueta">Com etiqueta impressa</option>
              <option value="todos">Todos os produtos</option>
            </select>
          </div>
        </div>

        <div style="display:flex;gap:8px;align-items:center;margin-left:auto;flex-wrap:wrap">
          <button onclick="adicionarFilaImpressao()" style="padding:8px 14px;background:#7c3aed;color:white;border:none;border-radius:var(--radius);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">
            Adicionar fila de impressão
          </button>
          <div style="position:relative">
            <button onclick="verFilaImpressao()" style="padding:8px 14px;background:white;color:var(--text);border:2px solid var(--border-2);border-radius:var(--radius);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">
              Ver Fila
            </button>
            <span id="fila-badge" style="position:absolute;top:-7px;right:-7px;background:#ef4444;color:white;border-radius:50%;width:18px;height:18px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">${_filaImpressao.length}</span>
          </div>
          <button onclick="imprimirEtiquetas()" style="padding:8px 16px;background:#0891b2;color:white;border:none;border-radius:var(--radius);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">
            Imprimir Etiqueta
          </button>
          <button onclick="ajudaEtiquetas()" style="width:28px;height:28px;background:#2563eb;color:white;border:none;border-radius:50%;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center">?</button>
        </div>
      </div>

      <!-- BANNER INFO -->
      <div style="padding:10px 18px;background:#eff6ff;border-bottom:1px solid #bfdbfe;display:flex;align-items:flex-start;gap:8px">
        <i data-lucide="info" style="width:15px;height:15px;color:#2563eb;flex-shrink:0;margin-top:1px"></i>
        <div style="font-size:12px;color:#1e40af">
          <strong>NOVO:</strong> Lançamos novos botões para facilitar as impressões de etiquetas.
          Assista o vídeo tutorial de como usar esses botões de impressão:
          <span style="color:#2563eb;font-weight:700;cursor:pointer;text-decoration:underline" onclick="ajudaEtiquetas()">CLIQUE AQUI E ASSISTA AGORA.</span>
        </div>
      </div>

      <!-- TABELA -->
      <div id="lp-table-wrap">
        <div style="padding:32px;text-align:center;color:var(--text-2);font-size:13px">
          Use os filtros ao lado ou clique em Buscar para listar os produtos.
        </div>
      </div>

      <!-- RODAPÉ TOTAIS -->
      <div id="lp-footer" style="padding:10px 18px;border-top:1px solid var(--border);background:#f8fafc;font-size:13px;display:flex;justify-content:space-between;align-items:center">
        <span id="lp-count" style="color:var(--text-2)">Existem 0 produtos nesta seleção.</span>
        <span style="color:var(--text-2)">Valor Total (R$): <strong id="lp-total">0,00</strong></span>
      </div>
    </div>
  </div>`;

  // Inicializar toggle
  const toggle = document.getElementById('lp-etiqueta');
  if(toggle) toggle.checked = true;

  setTimeout(()=>{ lucide.createIcons(); buscarListaProdutos(); },10);
}

function atualizarToggleEtiqueta(el) {
  const span = document.getElementById('lp-toggle-span');
  if(!span) return;
  span.style.background = el.checked?'#16a34a':'#94a3b8';
  const ball = span.querySelector('span');
  if(ball) ball.style.transform = el.checked?'translateX(18px)':'translateX(0)';
}

async function buscarListaProdutos() {
  const wrap = document.getElementById('lp-table-wrap');
  if(!wrap) return;
  wrap.innerHTML = '<div class="loading" style="padding:32px;text-align:center">Carregando...</div>';

  const ean    = document.getElementById('lp-ean')?.value.trim()||'';
  const codigo = document.getElementById('lp-codigo')?.value.trim()||'';
  const cat    = document.getElementById('lp-cat')?.value||'';
  const forn   = document.getElementById('lp-forn')?.value||'';
  const gradeF = document.getElementById('lp-grade')?.value||'';
  const gen    = document.getElementById('lp-gen')?.value||'';

  let q = sb.from('produto_grades')
    .select('id,tamanho,ean,estoque,custo,preco_venda,cor_descricao,cor_hexa,produto_id,produtos!inner(id,nome,codigo,sku,marca,ncm,genero,ativo,created_at,fornecedor_id,categoria_id,grade_id,categorias(nome),grades(nome))')
    .eq('produtos.ativo', true)
    .order('produto_id');

  if(ean)    q = q.ilike('ean', `%${ean}%`);
  if(codigo) q = q.ilike('produtos.codigo', `%${codigo}%`);
  if(cat)    q = q.eq('produtos.categoria_id', cat);
  if(forn)   q = q.eq('produtos.fornecedor_id', forn);
  if(gradeF) q = q.eq('produtos.grade_id', gradeF);
  if(gen)    q = q.eq('produtos.genero', gen);

  const {data, error} = await q;
  const rows = data||[];

  if(error||!rows.length) {
    wrap.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-2);font-size:13px">Nenhum produto encontrado.</div>`;
    document.getElementById('lp-count').textContent = 'Existem 0 produtos nesta seleção.';
    document.getElementById('lp-total').textContent = '0,00';
    return;
  }

  // Guardar para fila
  window._lpRows = rows;

  const totalValor = rows.reduce((a,r)=>a+((r.estoque||0)*parseFloat(r.preco_venda||r.produtos?.preco_venda||0)),0);
  const tableRows = rows.map(r => {
    const p = r.produtos;
    const dataCad = p.created_at?new Date(p.created_at).toLocaleDateString('pt-BR'):'—';
    const corDot  = r.cor_hexa?`<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${r.cor_hexa};border:1px solid rgba(0,0,0,.15);vertical-align:-2px;margin-right:4px"></span>`:'';
    const totalLinha = (r.estoque||0)*parseFloat(r.preco_venda||p?.preco_venda||0);
    const genMap = {F:'Feminino',M:'Masculino',U:'Unissex',J:'Juvenil'};
    return `<tr>
      <td style="padding:7px 10px;text-align:center"><input type="checkbox" data-gid="${r.id}" class="lp-check"></td>
      <td style="padding:7px 10px;font-size:12px;color:var(--text-2);white-space:nowrap">${dataCad}</td>
      <td style="padding:7px 10px;font-size:12px">${p?.marca||'—'}</td>
      <td style="padding:7px 10px;font-size:11px;font-family:monospace;color:var(--text-2)">${p?.ncm||'—'}</td>
      <td style="padding:7px 10px;font-size:12px">${p?.codigo||'—'}</td>
      <td style="padding:7px 10px;font-size:11px;font-family:monospace">${r.ean||'—'}</td>
      <td style="padding:7px 10px;font-size:12px"><strong>${p?.nome||'—'}</strong>${r.cor_descricao?`<br><small>${corDot}${r.cor_descricao}</small>`:''}</td>
      <td style="padding:7px 10px;font-size:12px;text-align:center">${r.tamanho||'—'}</td>
      <td style="padding:7px 10px;font-size:12px;text-align:center">${genMap[p?.genero]||'—'}</td>
      <td style="padding:7px 10px;font-size:12px;text-align:right">${fmtNum(r.custo||0)}</td>
      <td style="padding:7px 10px;font-size:12px;text-align:right">${fmtNum(r.preco_venda||p?.preco_venda||0)}</td>
      <td style="padding:7px 10px;font-size:12px;text-align:center;font-weight:700">${r.estoque||0}</td>
      <td style="padding:7px 10px;font-size:12px;text-align:right;font-weight:600">${fmtNum(totalLinha)}</td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
  <div class="table-wrap" style="max-height:60vh;overflow-y:auto">
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead style="position:sticky;top:0;z-index:1">
        <tr style="background:#f8fafc;border-bottom:2px solid var(--border)">
          <th style="padding:9px 10px;width:36px"><input type="checkbox" id="lp-chk-all" onchange="document.querySelectorAll('.lp-check').forEach(c=>c.checked=this.checked)"></th>
          <th style="padding:9px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;white-space:nowrap">Data<br>Cadastro</th>
          <th style="padding:9px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Marca</th>
          <th style="padding:9px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">NCM</th>
          <th style="padding:9px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Código</th>
          <th style="padding:9px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Cód. Barra</th>
          <th style="padding:9px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Descrição Produto / Cor</th>
          <th style="padding:9px 10px;text-align:center;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Grade</th>
          <th style="padding:9px 10px;text-align:center;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Gênero</th>
          <th style="padding:9px 10px;text-align:right;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Valor Un<br>Custo</th>
          <th style="padding:9px 10px;text-align:right;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Valor Un<br>Venda</th>
          <th style="padding:9px 10px;text-align:center;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Qtde</th>
          <th style="padding:9px 10px;text-align:right;font-size:11px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Valor Total<br>Venda</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>`;

  document.getElementById('lp-count').textContent = `Existem ${rows.length} produto(s) nesta seleção.`;
  document.getElementById('lp-total').textContent = fmtNum(totalValor);

  const badge = document.getElementById('fila-badge');
  if(badge) badge.textContent = _filaImpressao.length;

  lucide.createIcons();
}

function limparListaProdutos() {
  ['lp-ean','lp-codigo'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  ['lp-cat','lp-forn','lp-grade','lp-gen','lp-opcao'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  buscarListaProdutos();
}

function adicionarFilaImpressao() {
  const selecionados = [...document.querySelectorAll('.lp-check:checked')].map(c=>c.getAttribute('data-gid'));
  if(!selecionados.length) {
    // Se nenhum selecionado, adiciona todos da listagem atual
    const todos = [...document.querySelectorAll('.lp-check')].map(c=>c.getAttribute('data-gid'));
    if(!todos.length) return toast('Nenhum produto na lista','error');
    _filaImpressao = [...new Set([..._filaImpressao, ...todos])];
  } else {
    _filaImpressao = [...new Set([..._filaImpressao, ...selecionados])];
  }
  const badge = document.getElementById('fila-badge');
  if(badge) badge.textContent = _filaImpressao.length;
  toast(`${selecionados.length||'Todos'} item(ns) adicionado(s) à fila de impressão`);
}

function verFilaImpressao() {
  if(!_filaImpressao.length) {
    openModal(`<div class="modal-header"><h3>Fila de Impressão</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="empty-state"><i data-lucide="printer"></i><p>Fila vazia. Selecione produtos e clique em "Adicionar fila de impressão".</p></div></div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModalDirect()">Fechar</button></div>`,'modal-sm');
    return;
  }
  const rows = (window._lpRows||[]).filter(r=>_filaImpressao.includes(r.id));
  openModal(`
    <div class="modal-header"><h3>Fila de Impressão (${_filaImpressao.length})</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body">
      <div class="table-wrap"><table class="data-table" style="font-size:12px">
        <thead><tr><th>Produto</th><th>EAN</th><th>Grade</th><th>Preço</th><th></th></tr></thead>
        <tbody>${rows.map(r=>`<tr>
          <td>${r.produtos?.nome||'—'}</td>
          <td style="font-family:monospace">${r.ean||'—'}</td>
          <td>${r.tamanho||'—'}</td>
          <td>${fmtNum(r.preco_venda||r.produtos?.preco_venda||0)}</td>
          <td><button onclick="removerDaFila('${r.id}')" style="background:none;border:none;cursor:pointer;color:var(--red)"><i data-lucide="x" style="width:14px;height:14px"></i></button></td>
        </tr>`).join('')}
        </tbody>
      </table></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-danger" onclick="_filaImpressao=[];document.getElementById('fila-badge').textContent=0;closeModalDirect();toast('Fila limpa')">
        <i data-lucide="trash-2"></i>Limpar fila
      </button>
      <button class="btn btn-primary" style="background:#0891b2" onclick="closeModalDirect();imprimirEtiquetas()">
        <i data-lucide="printer"></i>Imprimir
      </button>
    </div>`,'modal-lg');
}

function removerDaFila(id) {
  _filaImpressao = _filaImpressao.filter(x=>x!==id);
  const badge = document.getElementById('fila-badge');
  if(badge) badge.textContent = _filaImpressao.length;
  verFilaImpressao();
}

function imprimirEtiquetas() {
  const ids = _filaImpressao.length ? _filaImpressao
    : [...document.querySelectorAll('.lp-check:checked')].map(c=>c.getAttribute('data-gid'));

  if(!ids.length) return toast('Nenhum produto selecionado para impressão','error');

  const prods = (window._lpRows||[]).filter(r=>ids.includes(r.id));
  if(!prods.length) return toast('Carregue os produtos primeiro','error');

  const etiquetas = prods.map(r=>`
    <div style="width:62mm;min-height:38mm;border:1px solid #ccc;padding:6px;display:inline-block;margin:4px;font-family:monospace;vertical-align:top;page-break-inside:avoid">
      <div style="font-size:8pt;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.produtos?.nome||''}</div>
      <div style="font-size:7pt;color:#555">${r.tamanho||''} ${r.cor_descricao?'— '+r.cor_descricao:''}</div>
      <div style="font-size:10pt;font-weight:bold;margin:2px 0">R$ ${fmtNum(r.preco_venda||r.produtos?.preco_venda||0)}</div>
      <div style="font-size:6.5pt;letter-spacing:2px">${r.ean||''}</div>
    </div>`).join('');

  const win = window.open('','_blank');
  win.document.write(`<html><head><title>Etiquetas</title>
    <link rel="stylesheet" href="style.css">
</head>
    <body style="padding:10px">${etiquetas}
    <script>window.onload=()=>{window.print();}<\/script></body></html>`);
  win.document.close();

  // Marcar como impressos e limpar fila
  _filaImpressao = [];
  const badge = document.getElementById('fila-badge');
  if(badge) badge.textContent = 0;
  toast('Etiquetas enviadas para impressão');
}

function ajudaEtiquetas() {
  openModal(`
    <div class="modal-header"><h3>Como usar as Etiquetas</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body">
      <div class="info-list">
        <div class="info-row"><span class="label">1. Adicionar fila de impressão</span><span class="value">Selecione os produtos (checkbox) e clique no botão roxo para adicioná-los à fila</span></div>
        <div class="info-row"><span class="label">2. Ver Fila</span><span class="value">Veja todos os produtos na fila antes de imprimir. à possível remover individualmente.</span></div>
        <div class="info-row"><span class="label">3. Imprimir Etiqueta</span><span class="value">Gera um layout de etiquetas 62x38mm com nome, tamanho, cor, preço e código de barras</span></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModalDirect()">Entendi</button></div>`,'modal-md');
}

async function loadProdutos(filtros={}) {
  const el = document.getElementById('content');
  if(el) el.innerHTML = `
  <div style="display:flex;gap:0;align-items:flex-start">

    <!-- SIDEBAR ESQUERDA: Filtros Avançados -->
    <div style="flex-shrink:0;padding:0 10px 0 0">
      <button onclick="openFiltrosAvancadosModal()"
        style="display:flex;align-items:center;gap:7px;padding:9px 14px;background:white;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;color:var(--text);white-space:nowrap">
        <span style="width:18px;height:18px;border-radius:50%;background:#2563eb;color:white;font-size:14px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">+</span>
        Filtros Avançados
      </button>
    </div>

    <!-- ÁREA PRINCIPAL -->
    <div style="flex:1;min-width:0;background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">

      <!-- Barra de buscas - linha 1 -->
      <div style="padding:12px 16px 0 16px;display:flex;gap:8px">
        <div style="display:flex;gap:0;flex:1;min-width:200px">
          <input id="pf-ean" class="filter-input" placeholder="Buscar produtos pela cód. barras"
            style="border-radius:var(--radius) 0 0 var(--radius);flex:1"
            onkeydown="if(event.key==='Enter')aplicarFiltrosProdutos()">
          <button class="btn btn-primary" style="border-radius:0 var(--radius) var(--radius) 0;padding:7px 12px;white-space:nowrap" onclick="aplicarFiltrosProdutos()">
            <i data-lucide="barcode" style="width:14px;height:14px"></i>Pesquisar
          </button>
        </div>
        <div style="display:flex;gap:0;flex:1;min-width:200px">
          <input id="pf-desc" class="filter-input" placeholder="Buscar produtos pela descrição"
            style="border-radius:var(--radius) 0 0 var(--radius);flex:1"
            onkeydown="if(event.key==='Enter')aplicarFiltrosProdutos()">
          <button class="btn btn-primary" style="border-radius:0 var(--radius) var(--radius) 0;padding:7px 12px;white-space:nowrap" onclick="aplicarFiltrosProdutos()">
            <i data-lucide="search" style="width:14px;height:14px"></i>Pesquisar
          </button>
        </div>
      </div>

      <!-- Barra de buscas - linha 2 -->
      <div style="padding:8px 16px 12px 16px;display:flex;gap:8px;align-items:center;border-bottom:1px solid var(--border)">
        <div style="display:flex;gap:0;flex:1;min-width:200px">
          <input id="pf-cod" class="filter-input" placeholder="Buscar produtos pelo Código"
            style="border-radius:var(--radius) 0 0 var(--radius);flex:1"
            onkeydown="if(event.key==='Enter')aplicarFiltrosProdutos()">
          <button class="btn btn-primary" style="border-radius:0 var(--radius) var(--radius) 0;padding:7px 12px;white-space:nowrap" onclick="aplicarFiltrosProdutos()">
            <i data-lucide="search" style="width:14px;height:14px"></i>Pesquisar
          </button>
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:200px">
          <span style="font-size:11px;font-weight:600;color:var(--text-2)">Ações</span>
          <select id="pf-acao" style="padding:7px 10px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;background:white;font-family:inherit;width:100%"
            onchange="executarAcaoEmMassa(this.value);this.value=''">
            <option value="">Selecione uma ação</option>
            <option value="desc-codigo">Alteração em massa Descrição e Código Referência (Agrupamento)</option>
            <option value="categoria">Alteração em massa de Categoria</option>
            <option value="marca">Alteração em massa da Marca</option>
            <option value="genero">Alteração em massa da Gênero</option>
            <option value="grade">Alteração em massa da Grade</option>
            <option value="cor">Alteração em massa da Cor</option>
            <option value="transferir">Transferir produtos para outra loja</option>
            <option value="excluir">Excluir selecionados</option>
          </select>
        </div>
      </div>

      <!-- Tabela -->
      <div id="produtos-table-wrap"><div class="loading" style="padding:32px;text-align:center">Carregando...</div></div>
    </div>
  </div>`;
  setTimeout(()=>lucide.createIcons(),10);
  await carregarTabelaProdutos({});
  await carregarSelectsFiltros();
}

async function openFiltrosAvancadosModal() {
  // Buscar dados para os selects
  const [{data:forns},{data:cats},{data:cols},{data:marcasRaw}] = await Promise.all([
    sb.from('fornecedores').select('id,razao_social').eq('ativo',true).order('razao_social'),
    sb.from('categorias').select('id,nome').eq('ativo',true).order('nome'),
    sb.from('colecoes').select('id,nome').eq('ativo',true).order('nome'),
    sb.from('produtos').select('marca').eq('ativo',true).not('marca','is',null)
  ]);
  const marcas = [...new Set((marcasRaw||[]).map(m=>m.marca).filter(Boolean))].sort();

  const optForn = (forns||[]).map(f=>`<option value="${f.id}">${f.razao_social}</option>`).join('');
  const optCat  = (cats||[]).map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
  const optCol  = (cols||[]).map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
  const optMar  = marcas.map(m=>`<option value="${m}">${m}</option>`).join('');

  openModal(`
    <div style="position:relative">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border)">
        <h3 style="font-size:16px;font-weight:700;color:var(--text);margin:0">Filtros Avançados</h3>
        <button onclick="closeModalDirect()" style="background:none;border:none;cursor:pointer;color:var(--text-2);font-size:18px;line-height:1;padding:0;width:24px;height:24px">&times;</button>
      </div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:14px">

        <div class="form-group">
          <label style="font-weight:600;color:var(--text)">Descrição complementar</label>
          <input id="fa-desc" class="filter-input" placeholder="Digite a descrição" style="width:100%">
        </div>

        <div class="form-group">
          <label style="font-weight:600;color:var(--text)">Id do Produto</label>
          <input id="fa-id-produto" class="filter-input" placeholder="Digite o Id do Produto" style="width:100%">
        </div>

        <div class="form-group">
          <label style="font-weight:600;color:var(--text)">Fornecedor</label>
          <select id="fa-forn" class="filter-select" style="width:100%">
            <option value="">Selecione um Fornecedor</option>
            ${optForn}
          </select>
        </div>

        <div class="form-group">
          <label style="font-weight:600;color:var(--text)">Nota Fiscal</label>
          <select id="fa-nota" class="filter-select" style="width:100%;color:var(--text-2)">
            <option value="">Selecione a nota fiscal</option>
          </select>
        </div>

        <div class="form-group">
          <label style="font-weight:600;color:var(--text)">Marca</label>
          <select id="fa-marca" class="filter-select" style="width:100%">
            <option value="">Selecione a marca</option>
            ${optMar}
          </select>
        </div>

        <div class="form-group">
          <label style="font-weight:600;color:var(--text)">Coleção</label>
          <select id="fa-colecao" class="filter-select" style="width:100%">
            <option value="">Selecione a coleção</option>
            ${optCol}
          </select>
        </div>

        <div class="form-group">
          <label style="font-weight:600;color:var(--text)">Categoria</label>
          <select id="fa-categoria" class="filter-select" style="width:100%">
            <option value="">Selecione a categoria</option>
            ${optCat}
          </select>
        </div>

        <details style="cursor:pointer">
          <summary style="font-size:13px;font-weight:600;color:#2563eb;list-style:none;display:flex;align-items:center;gap:6px">
            <i data-lucide="plus-circle" style="width:14px;height:14px"></i> Mais filtros de variações
          </summary>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:12px">
            <div class="form-group">
              <label style="font-weight:600;color:var(--text)">Cor</label>
              <input id="fa-cor" class="filter-input" placeholder="Ex: Preto, Branco" style="width:100%">
            </div>
            <div class="form-group">
              <label style="font-weight:600;color:var(--text)">EAN (Cód. Barras)</label>
              <input id="fa-ean" class="filter-input" placeholder="Código de barras" style="width:100%">
            </div>
            <div class="form-group">
              <label style="font-weight:600;color:var(--text)">Estoque mínimo</label>
              <input id="fa-estoque-min" type="number" min="0" class="filter-input" placeholder="0" style="width:100%">
            </div>
          </div>
        </details>

        <button onclick="aplicarFiltrosAvancados()" style="width:100%;padding:11px;background:#2563eb;color:white;border:none;border-radius:var(--radius);font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
          <i data-lucide="filter" style="width:15px;height:15px"></i> Aplicar Filtro
        </button>
      </div>
    </div>
  `, 'modal-sm');
  lucide.createIcons();
}

async function aplicarFiltrosAvancados() {
  const filtros = {
    desc: document.getElementById('fa-desc')?.value.trim() || '',
    forn: document.getElementById('fa-forn')?.value || '',
    marca: document.getElementById('fa-marca')?.value || '',
    colecao: document.getElementById('fa-colecao')?.value || '',
    cat: document.getElementById('fa-categoria')?.value || '',
    gen: document.getElementById('fa-genero')?.value || '',
    cor: document.getElementById('fa-cor')?.value.trim() || '',
    ean: document.getElementById('fa-ean')?.value.trim() || '',
    estoqueMin: document.getElementById('fa-estoque-min')?.value || ''
  };
  closeModalDirect();
  await carregarTabelaProdutos(filtros);
}

function getSelectedProdIds() {
  return [...document.querySelectorAll('[data-pid]:checked')].map(c => c.getAttribute('data-pid'));
}

async function executarAcaoEmMassa(acao) {
  if(!acao) return;
  const ids = getSelectedProdIds();
  if(acao === 'excluir') {
    if(!ids.length) return toast('Selecione pelo menos um produto', 'error');
    if(!confirm(`Excluir ${ids.length} produto(s) selecionado(s)?`)) return;
    for(const id of ids) await sb.from('produtos').update({ativo:false}).eq('id',id);
    toast(`${ids.length} produto(s) excluído(s)`);
    await carregarTabelaProdutos({});
    return;
  }
  if(acao === 'transferir') { toast('Funcionalidade em desenvolvimento', 'info'); return; }

  // Ações de alteração em massa
  const acoes = {
    'desc-codigo': { titulo: 'Descrição e Código de Referência', tipo: 'desc-codigo' },
    'categoria':   { titulo: 'Categoria', tipo: 'select-cat' },
    'marca':       { titulo: 'Marca', tipo: 'text', campo: 'marca', placeholder: 'Nova marca' },
    'genero':      { titulo: 'Gênero', tipo: 'select-gen' },
    'grade':       { titulo: 'Grade', tipo: 'select-grade' },
    'cor':         { titulo: 'Cor das Variações', tipo: 'cor' }
  };

  const cfg = acoes[acao];
  if(!cfg) return;

  if(!ids.length) return toast('Selecione pelo menos um produto na lista', 'error');

  await openMassEditModal(cfg, ids);
}

async function openMassEditModal(cfg, ids) {
  let inputHtml = '';

  if(cfg.tipo === 'text') {
    inputHtml = `<input id="me-val" class="filter-input" placeholder="${cfg.placeholder||''}" style="width:100%">`;
  } else if(cfg.tipo === 'select-cat') {
    const {data} = await sb.from('categorias').select('id,nome').eq('ativo',true).order('nome');
    inputHtml = `<select id="me-val" class="filter-select" style="width:100%">
      <option value="">Selecione a categoria</option>
      ${(data||[]).map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}
    </select>`;
  } else if(cfg.tipo === 'select-gen') {
    inputHtml = `<select id="me-val" class="filter-select" style="width:100%">
      <option value="">Selecione</option>
      <option value="F">Feminino</option>
      <option value="M">Masculino</option>
      <option value="U">Unissex</option>
      <option value="J">Juvenil/Infantil</option>
    </select>`;
  } else if(cfg.tipo === 'select-grade') {
    const {data} = await sb.from('grades').select('id,nome').eq('ativo',true).order('nome');
    inputHtml = `<select id="me-val" class="filter-select" style="width:100%">
      <option value="">Selecione a grade</option>
      ${(data||[]).map(g=>`<option value="${g.id}">${g.nome}</option>`).join('')}
    </select>`;
  } else if(cfg.tipo === 'desc-codigo') {
    inputHtml = `
      <div class="form-group">
        <label style="font-size:12px;font-weight:600">Nova Descrição</label>
        <input id="me-val-desc" class="filter-input" placeholder="Deixe vazio para não alterar" style="width:100%">
      </div>
      <div class="form-group" style="margin-top:10px">
        <label style="font-size:12px;font-weight:600">Novo Código de Referência</label>
        <input id="me-val-cod" class="filter-input" placeholder="Deixe vazio para não alterar" style="width:100%">
      </div>`;
  } else if(cfg.tipo === 'cor') {
    inputHtml = `
      <div style="display:flex;gap:10px;align-items:center">
        <input type="color" id="me-cor-hex" value="#cccccc" style="width:40px;height:40px;border:1.5px solid var(--border-2);border-radius:6px;cursor:pointer">
        <input id="me-val" class="filter-input" placeholder="Nome da cor (ex: Preto)" style="flex:1">
      </div>`;
  }

  openModal(`
    <div class="modal-header">
      <h3>Alteração em Massa — ${cfg.titulo}</h3>
      <button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button>
    </div>
    <div class="modal-body">
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#1e40af">
        <i data-lucide="info" style="width:14px;height:14px;vertical-align:-2px;margin-right:6px"></i>
        <strong>${ids.length} produto(s)</strong> serão alterados.
      </div>
      ${inputHtml}
    </div>
    <div class="modal-footer" style="display:flex;justify-content:space-between">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="confirmarEdicaoEmMassa('${cfg.tipo}',${JSON.stringify(ids).replace(/"/g,'\"')})"
        style="background:#2563eb">
        <i data-lucide="save"></i> Aplicar Alteração
      </button>
    </div>
  `, 'modal-md');
  lucide.createIcons();
}

async function confirmarEdicaoEmMassa(tipo, ids) {
  let payload = {};
  let varPayload = null;

  if(tipo === 'text') {
    // não usado mais, mas por segurança
    const val = document.getElementById('me-val')?.value?.trim();
    if(!val) return toast('Informe o novo valor', 'error');
    payload = { marca: val };
  } else if(tipo === 'select-cat') {
    const val = document.getElementById('me-val')?.value;
    if(!val) return toast('Selecione a categoria', 'error');
    payload = { categoria_id: val };
  } else if(tipo === 'select-gen') {
    const val = document.getElementById('me-val')?.value;
    if(!val) return toast('Selecione o gênero', 'error');
    payload = { genero: val };
  } else if(tipo === 'select-grade') {
    const val = document.getElementById('me-val')?.value;
    if(!val) return toast('Selecione a grade', 'error');
    payload = { grade_id: val };
  } else if(tipo === 'marca') {
    const val = document.getElementById('me-val')?.value?.trim();
    if(!val) return toast('Informe a nova marca', 'error');
    payload = { marca: val };
  } else if(tipo === 'desc-codigo') {
    const desc = document.getElementById('me-val-desc')?.value?.trim();
    const cod  = document.getElementById('me-val-cod')?.value?.trim();
    if(!desc && !cod) return toast('Preencha ao menos um campo', 'error');
    if(desc) payload.nome = desc;
    if(cod)  payload.codigo = cod;
  } else if(tipo === 'cor') {
    const corHex  = document.getElementById('me-cor-hex')?.value || '#cccccc';
    const corDesc = document.getElementById('me-val')?.value?.trim();
    if(!corDesc) return toast('Informe o nome da cor', 'error');
    // Altera nas variações (produto_grades)
    varPayload = { cor_hexa: corHex, cor_descricao: corDesc };
  }

  let sucessos = 0;
  try {
    if(varPayload) {
      // Atualizar variações de todos os produtos selecionados
      for(const id of ids) {
        await sb.from('produto_grades').update(varPayload).eq('produto_id', id);
        sucessos++;
      }
    } else if(Object.keys(payload).length) {
      for(const id of ids) {
        await sb.from('produtos').update(payload).eq('id', id);
        sucessos++;
      }
    }
    closeModalDirect();
    toast(`✅ ${sucessos} produto(s) atualizados com sucesso!`, 'success');
    await carregarTabelaProdutos({});
  } catch(e) {
    toast('Erro ao atualizar: ' + e.message, 'error');
  }
}

function toggleFiltrosAvancados() { openFiltrosAvancadosModal(); }

async function carregarSelectsFiltros() {
  const [{data:forns},{data:cats},{data:grades}] = await Promise.all([
    sb.from('fornecedores').select('id,razao_social').eq('ativo',true).order('razao_social'),
    sb.from('categorias').select('id,nome').eq('ativo',true).order('nome'),
    sb.from('grades').select('id,nome').eq('ativo',true).order('nome')
  ]);
  const sel = (id, rows, label) => {
    const el = document.getElementById(id);
    if(!el) return;
    rows.forEach(r => el.add(new Option(r.razao_social||r.nome, r.id)));
  };
  sel('pf-forn', forns||[], 'razao_social');
  sel('pf-cat', cats||[], 'nome');
  sel('pf-grade', grades||[], 'nome');
}

async function aplicarFiltrosProdutos() {
  const ean   = document.getElementById('pf-ean')?.value.trim()||'';
  const desc  = document.getElementById('pf-desc')?.value.trim()||'';
  const cod   = document.getElementById('pf-cod')?.value.trim()||'';
  const forn  = document.getElementById('pf-forn')?.value||'';
  const cat   = document.getElementById('pf-cat')?.value||'';
  const gen   = document.getElementById('pf-gen')?.value||'';
  const grade = document.getElementById('pf-grade')?.value||'';
  await carregarTabelaProdutos({ean,desc,cod,forn,cat,gen,grade});
}

function limparFiltros() {
  ['pf-ean','pf-desc','pf-cod'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  ['pf-forn','pf-cat','pf-gen','pf-grade'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  carregarTabelaProdutos({});
}

async function carregarTabelaProdutos(filtros) {
  const wrap = document.getElementById('produtos-table-wrap');
  if(!wrap) return;
  wrap.innerHTML = '<div class="loading" style="padding:32px;text-align:center">Carregando...</div>';

  filtros = filtros || {};

  try {
    // 1. Buscar produtos ativos com filtros
    let qProd = sb.from('produtos')
      .select('id,nome,sku,codigo,marca,genero,ativo,preco_venda,fornecedor_id,categoria_id,colecao_id,grade_id')
      .eq('ativo', true)
      .order('nome');

    if(filtros.desc)    qProd = qProd.ilike('nome',    `%${filtros.desc}%`);
    if(filtros.cod)     qProd = qProd.ilike('codigo',  `%${filtros.cod}%`);
    if(filtros.cat)     qProd = qProd.eq('categoria_id', filtros.cat);
    if(filtros.forn)    qProd = qProd.eq('fornecedor_id', filtros.forn);
    if(filtros.gen)     qProd = qProd.eq('genero', filtros.gen);
    if(filtros.grade)   qProd = qProd.eq('grade_id', filtros.grade);
    if(filtros.marca)   qProd = qProd.ilike('marca', `%${filtros.marca}%`);
    if(filtros.colecao) qProd = qProd.eq('colecao_id', filtros.colecao);

    const {data: produtosData, error: errProd} = await qProd;
    if(errProd) throw errProd;

    const todosProdutos = produtosData || [];
    if(!todosProdutos.length) {
      wrap.innerHTML = '<div class="empty-state" style="padding:48px"><i data-lucide="package"></i><h3>Nenhum produto encontrado</h3></div>';
      lucide.createIcons(); return;
    }

    const prodIds = todosProdutos.map(p => p.id);

    // 2. Buscar variantes para esses produtos
    let qGrades = sb.from('produto_grades')
      .select('id,produto_id,tamanho,ean,cor_hexa,cor_descricao,estoque,custo,preco_venda,margem_lucro')
      .in('produto_id', prodIds)
      .order('produto_id');

    if(filtros.ean) qGrades = qGrades.ilike('ean', `%${filtros.ean}%`);
    if(filtros.cor) qGrades = qGrades.ilike('cor_descricao', `%${filtros.cor}%`);
    if(filtros.estoqueMin && parseInt(filtros.estoqueMin) > 0)
      qGrades = qGrades.gte('estoque', parseInt(filtros.estoqueMin));

    const {data: gradesData} = await qGrades;

    // 3. Montar prodMap juntando produtos + variantes
    const prodMap = {};
    todosProdutos.forEach(p => { prodMap[p.id] = { prod: p, variantes: [] }; });
    (gradesData || []).forEach(v => {
      if(prodMap[v.produto_id]) prodMap[v.produto_id].variantes.push(v);
    });

    // Se filtrou por EAN/cor, manter só produtos que têm variantes com match
    let entries = Object.values(prodMap);
    if(filtros.ean || filtros.cor || filtros.estoqueMin) {
      entries = entries.filter(e => e.variantes.length > 0);
    }

    if(!entries.length) {
      wrap.innerHTML = '<div class="empty-state" style="padding:48px"><i data-lucide="package"></i><h3>Nenhum produto encontrado</h3></div>';
      lucide.createIcons(); return;
    }

    // 4. Renderizar tabela
    let rows = '';
    entries.forEach(({prod, variantes}) => {
      const numVar = Math.max(variantes.length, 1);
      const btnEdit = `<button title="Editar" onclick="_editProdId='${prod.id}';navigate('cadastrar-produto')" style="width:28px;height:28px;border:1px solid var(--border-2);border-radius:4px;background:white;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-2)" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text-2)'"><i data-lucide="square-pen" style="width:13px;height:13px"></i></button>`;
      const btnDel  = `<button title="Excluir" onclick="deleteProduto('${prod.id}')" style="width:28px;height:28px;border:1px solid #fecaca;border-radius:4px;background:#fef2f2;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--red)"><i data-lucide="trash-2" style="width:13px;height:13px"></i></button>`;

      if(variantes.length === 0) {
        rows += `<tr>
          <td style="padding:8px 10px"><input type="checkbox" data-pid="${prod.id}"></td>
          <td style="padding:8px 10px;font-size:12px;color:var(--text-2)">${prod.sku||'—'}</td>
          <td style="padding:8px 10px;font-size:12px">${prod.codigo||'—'}</td>
          <td style="padding:8px 10px;font-size:13px;font-weight:600">${prod.nome||'—'}</td>
          <td style="padding:8px 10px;font-size:12px;color:var(--text-2)">—</td>
          <td style="padding:8px 10px;font-size:12px;color:var(--text-2)">—</td>
          <td style="padding:8px 10px">—</td>
          <td style="padding:8px 10px;font-size:13px;font-weight:600">${prod.preco_venda?fmt(prod.preco_venda):'—'}</td>
          <td style="padding:8px 10px;text-align:center">0</td>
          <td style="padding:8px 10px"><div style="display:flex;gap:4px">${btnEdit}${btnDel}</div></td>
        </tr>`;
      } else {
        variantes.forEach((v, vi) => {
          const corDot = v.cor_hexa
            ? `<span style="display:inline-block;width:13px;height:13px;border-radius:50%;background:${v.cor_hexa};border:1px solid rgba(0,0,0,.15);vertical-align:-2px;margin-right:4px"></span>`
            : '';
          rows += `<tr style="${vi%2?'background:#f8fafc':''}">
            ${vi===0 ? `<td style="padding:8px 10px;vertical-align:top" rowspan="${numVar}"><input type="checkbox" data-pid="${prod.id}"></td>
            <td style="padding:8px 10px;font-size:12px;color:var(--text-2);vertical-align:top" rowspan="${numVar}">${prod.sku||'—'}</td>
            <td style="padding:8px 10px;font-size:12px;vertical-align:top" rowspan="${numVar}">${prod.codigo||'—'}</td>
            <td style="padding:8px 10px;font-size:13px;font-weight:600;vertical-align:top" rowspan="${numVar}">${prod.nome||'—'}</td>` : ''}
            <td style="padding:8px 10px;font-size:12px">${v.ean||'—'}</td>
            <td style="padding:8px 10px;font-size:12px">${v.tamanho||'—'}</td>
            <td style="padding:8px 10px;font-size:12px;white-space:nowrap">${corDot}${v.cor_descricao||'—'}</td>
            <td style="padding:8px 10px;font-size:13px;font-weight:600">${v.preco_venda?fmt(v.preco_venda):(prod.preco_venda?fmt(prod.preco_venda):'—')}</td>
            <td style="padding:8px 10px;text-align:center">${v.estoque??0}</td>
            ${vi===0 ? `<td style="padding:8px 10px;vertical-align:top" rowspan="${numVar}"><div style="display:flex;gap:4px">${btnEdit}${btnDel}</div></td>` : ''}
          </tr>`;
        });
      }
    });

    wrap.innerHTML = `
      <div style="padding:8px 16px;background:#f8fafc;border-bottom:1px solid var(--border);font-size:12px;color:var(--text-2)">
        <strong>${entries.length}</strong> produto(s) encontrado(s)
      </div>
      <div class="table-wrap"><table class="data-table" style="font-size:13px">
        <thead><tr>
          <th style="width:36px"><input type="checkbox" id="chk-all" onchange="document.querySelectorAll('[data-pid]').forEach(c=>c.checked=this.checked)"></th>
          <th>SKU</th><th>Código</th><th>Descrição</th>
          <th>Cód. barras</th><th>Grade</th><th>Cor</th>
          <th>Vlr Venda UN</th><th style="text-align:center">Qtde</th><th>Ação</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
    lucide.createIcons();

  } catch(e) {
    console.error('Erro ao carregar produtos:', e);
    wrap.innerHTML = `<div style="padding:24px;color:var(--red);text-align:center">Erro ao carregar produtos: ${e.message||e}</div>`;
  }
}


function renderTabelaProdutosFallback(prods) {
  const wrap = document.getElementById('produtos-table-wrap');
  if(!wrap) return;
  let rows = prods.map(p=>`<tr>
    <td style="padding:8px 12px"><input type="checkbox" data-pid="${p.id}"></td>
    <td style="padding:8px 10px;font-size:12px;color:var(--text-2)">${p.sku||'—'}</td>
    <td style="padding:8px 10px;font-size:12px">${p.codigo||'—'}</td>
    <td style="padding:8px 10px;font-size:13px;font-weight:600">${p.nome}</td>
    <td colspan="3" style="padding:8px 10px;font-size:12px;color:var(--text-3)">Sem variantes</td>
    <td style="padding:8px 10px;font-size:13px;font-weight:600">${fmt(p.preco_venda)}</td>
    <td style="padding:8px 10px;text-align:center">—</td>
    <td style="padding:8px 10px">
      <div style="display:flex;gap:4px">
        <button onclick="_editProdId='${p.id}';navigate('cadastrar-produto')" style="width:28px;height:28px;border:1px solid var(--border-2);border-radius:4px;background:white;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-2)"><i data-lucide="square-pen" style="width:13px;height:13px"></i></button>
        <button onclick="deleteProduto('${p.id}')" style="width:28px;height:28px;border:1px solid #fecaca;border-radius:4px;background:#fef2f2;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--red)"><i data-lucide="trash-2" style="width:13px;height:13px"></i></button>
      </div>
    </td>
  </tr>`).join('');
  wrap.innerHTML = `<div class="table-wrap"><table class="data-table">
    <thead><tr><th style="width:36px"><input type="checkbox"></th><th>SKU</th><th>Código</th><th>Descrição</th><th colspan="3"></th><th>Vlr Venda UN</th><th>Qtde</th><th>Ação</th></tr></thead>
    <tbody>${rows||'<tr><td colspan="10" style="text-align:center;color:var(--text-2);padding:32px">Nenhum produto</td></tr>'}</tbody>
  </table></div>`;
  lucide.createIcons();
}

async function loadProdutosSearch(q){await carregarTabelaProdutos({desc:q});}

async function deleteProduto(id) {
  if(!confirm('Excluir produto?')) return;
  await sb.from('produtos').update({ativo:false}).eq('id',id);
  toast('Produto removido');
  carregarTabelaProdutos({});
}

// ===== CADASTRO PRODUTO à PÁGINA COMPLETA =====
let _editProdId = null;
let _cadProdId  = null;  // produto sendo editado/criado

async function renderCadastrarProduto() {
  document.getElementById('topbar-actions').innerHTML = '';
  const prodId = _editProdId || null;
  _editProdId = null;

  const [{data:cols},{data:forns},{data:marcas},{data:cats},{data:grades},{data:cores}] = await Promise.all([
    sb.from('colecoes').select('id,nome').eq('ativo',true).order('nome'),
    sb.from('fornecedores').select('id,razao_social').eq('ativo',true).order('razao_social'),
    sb.from('produtos').select('marca').eq('ativo',true).not('marca','is',null),
    sb.from('categorias').select('id,nome').eq('ativo',true).order('nome'),
    sb.from('grades').select('id,nome,valores').eq('ativo',true).order('nome'),
    sb.from('produto_grades').select('cor_hexa,cor_descricao').not('cor_descricao','is',null)
  ]);

  let prod = {};
  let variantesExistentes = [];
  if(prodId) {
    const [{data:p},{data:vars}] = await Promise.all([
      sb.from('produtos').select('*').eq('id',prodId).single(),
      sb.from('produto_grades').select('*').eq('produto_id',prodId).order('tamanho')
    ]);
    prod = p||{};
    variantesExistentes = vars||[];
    _cadProdId = prodId;
  } else {
    _cadProdId = null;
  }

  const opts = (arr, valKey, labelKey, selected) =>
    (arr||[]).map(r=>`<option value="${r[valKey]}" ${selected===r[valKey]?'selected':''}>${r[labelKey]}</option>`).join('');

  const marcasUnicas = [...new Set((marcas||[]).map(m=>m.marca).filter(Boolean))];

  // Cores únicas para o select
  const coresMap = {};
  (cores||[]).forEach(c=>{ if(c.cor_descricao && !coresMap[c.cor_descricao]) coresMap[c.cor_descricao]=c.cor_hexa||''; });
  const coresOpts = Object.entries(coresMap).sort(([a],[b])=>a.localeCompare(b))
    .map(([desc,hex])=>`<option value="${desc}" data-hex="${hex}">${desc}</option>`).join('');

  const inputStyle = 'width:100%;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box';
  const selectStyle = inputStyle + ';background:white';
  const labelOrange = 'display:block;font-size:11px;font-weight:700;color:#b45309;margin-bottom:4px;text-transform:uppercase;letter-spacing:.3px';
  const labelNormal = 'display:block;font-size:11px;font-weight:700;color:#374151;margin-bottom:4px;text-transform:uppercase;letter-spacing:.3px';

  const html = `
  <div style="display:flex;gap:14px;align-items:flex-start">

    <!-- LEGENDA LATERAL (idêntica ao Phibo) -->
    <div style="width:190px;flex-shrink:0;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px">
      <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:14px;line-height:1.4">As cores informam a situação da variação do produto</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="width:18px;height:18px;border-radius:3px;background:#4ade80;flex-shrink:0;border:1px solid #16a34a"></span>
        <span style="font-size:12px;color:#374151">Em cadastro</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="width:18px;height:18px;border-radius:3px;background:#93c5fd;flex-shrink:0;border:1px solid #2563eb"></span>
        <span style="font-size:12px;color:#374151">Em edição</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="width:18px;height:18px;border-radius:3px;background:#fb923c;flex-shrink:0;border:1px solid #ea580c"></span>
        <span style="font-size:12px;color:#374151">Última variação cadastrada</span>
      </div>
    </div>

    <!-- FORMULÁRIO PRINCIPAL -->
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:12px">

      <!-- DADOS GERAIS PRODUTO -->
      <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <div style="background:#e8f5e9;padding:10px 20px;border-bottom:1px solid #c8e6c9;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;font-weight:700;color:#2e7d32">Dados gerais produto</span>
          ${prodId ? `<span style="font-size:12px;color:#6b7280">SKU: ${prod.sku||prodId}</span>` : ''}
        </div>
        <div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px">

          <!-- Linha 1: Coleção + Fornecedor + Marca -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
            <div>
              <label style="${labelOrange}">Informar a coleção</label>
              <select id="cp-colecao" style="${selectStyle}"><option value="">Selecione</option>${opts(cols,'id','nome',prod.colecao_id)}</select>
            </div>
            <div>
              <label style="${labelOrange}">Fornecedor</label>
              <select id="cp-fornecedor" style="${selectStyle}"><option value="">Selecione</option>${opts(forns,'id','razao_social',prod.fornecedor_id)}</select>
            </div>
            <div>
              <label style="${labelNormal}">Marca</label>
              <input id="cp-marca" value="${prod.marca||''}" placeholder="Selecione" list="marcas-list" style="${inputStyle}">
              <datalist id="marcas-list">${marcasUnicas.map(m=>`<option value="${m}">`).join('')}</datalist>
            </div>
          </div>

          <!-- Linha 2: Código Referência + Gênero + Categoria -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
            <div>
              <label style="${labelOrange}">Código produto (Referência)</label>
              <div style="display:flex;gap:0">
                <input id="cp-codigo" value="${prod.codigo||''}" style="${inputStyle};border-radius:6px 0 0 6px">
                <button onclick="gerarCodProd()" style="padding:0 10px;background:#2563eb;color:white;border:none;border-radius:0 6px 6px 0;font-size:11px;font-weight:600;white-space:nowrap;cursor:pointer;font-family:inherit">Gerar Cód. Prod</button>
              </div>
            </div>
            <div>
              <label style="${labelNormal}">Gênero</label>
              <select id="cp-genero" style="${selectStyle}">
                <option value="">Selecione</option>
                <option value="F" ${prod.genero==='F'?'selected':''}>Feminino</option>
                <option value="M" ${prod.genero==='M'?'selected':''}>Masculino</option>
                <option value="U" ${prod.genero==='U'?'selected':''}>Unissex</option>
                <option value="J" ${prod.genero==='J'?'selected':''}>Juvenil/Infantil</option>
              </select>
            </div>
            <div>
              <label style="${labelNormal}">Categoria</label>
              <select id="cp-categoria" style="${selectStyle}"><option value="">Selecione</option>${opts(cats,'id','nome',prod.categoria_id)}</select>
            </div>
          </div>

          <!-- Linha 3: NCM + Descrição NCM -->
          <div style="display:grid;grid-template-columns:1fr 2fr;gap:10px">
            <div>
              <label style="${labelOrange}">Código NCM</label>
              <div style="display:flex;gap:0">
                <input id="cp-ncm" value="${prod.ncm||''}" placeholder="00000000" style="${inputStyle};border-radius:6px 0 0 6px">
                <button onclick="gerarNCMPadrao()" style="padding:0 10px;background:#2563eb;color:white;border:none;border-radius:0 6px 6px 0;font-size:11px;font-weight:600;white-space:nowrap;cursor:pointer;font-family:inherit">Gerar NCM padrão</button>
              </div>
            </div>
            <div>
              <label style="${labelNormal}">Descrição NCM</label>
              <div style="display:flex;gap:0">
                <input id="cp-ncm-desc" value="${prod.ncm_descricao||''}" placeholder="Descrição..." style="${inputStyle};border-radius:6px 0 0 6px">
                <button onclick="buscarNCM()" style="padding:0 11px;background:#e2e8f0;border:1.5px solid #cbd5e1;border-left:none;border-radius:0 6px 6px 0;cursor:pointer;display:flex;align-items:center;color:#6b7280"><i data-lucide="search" style="width:14px;height:14px"></i></button>
              </div>
            </div>
          </div>

          <!-- Linha 4: Descrição produto full-width -->
          <div>
            <label style="${labelOrange}">Descrição produto</label>
            <input id="cp-nome" value="${prod.nome||''}" placeholder="Nome/descrição do produto" style="${inputStyle}">
          </div>
          <input type="hidden" id="cp-sku" value="${prod.sku||''}">
        </div>
      </div>

      <!-- DADOS DA VARIAÇÃO -->
      <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <div style="background:#e3f2fd;padding:10px 20px;border-bottom:1px solid #bbdefb">
          <span style="font-size:13px;font-weight:700;color:#1565c0">Dados da variação</span>
        </div>
        <div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px;background:#f8fbff">

          <!-- Linha 1: Grade + Cor + Custo + Margem + Venda -->
          <div style="display:grid;grid-template-columns:160px 160px 1fr 1fr 1fr;gap:10px;align-items:end">
            <div>
              <label style="${labelOrange}">Grade</label>
              <select id="cp-grade" onchange="atualizarGradeOpcoes()" style="${selectStyle}">
                <option value="">Selecione</option>
                ${(grades||[]).map(g=>`<option value="${g.id}" data-vals='${JSON.stringify(g.valores||[])}'>${g.nome}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="${labelNormal}">Cor</label>
              <select id="cp-cor-select" onchange="corSelectChanged(this)" style="${selectStyle}">
                <option value="">Selecione uma cor</option>
                ${coresOpts}
                <option value="__nova__">+ Nova cor...</option>
              </select>
              <input id="cp-cor-desc" style="display:none;margin-top:6px;${inputStyle}" placeholder="Nome da cor">
              <input type="hidden" id="cp-cor-hex" value="#cccccc">
            </div>
            <div>
              <label style="${labelNormal}">Valor custo</label>
              <input id="cp-custo" type="number" step="0.01" value="" placeholder="0,00" oninput="calcMargemVariacao()" style="${inputStyle}">
            </div>
            <div>
              <label style="${labelNormal}">Margem de venda</label>
              <input id="cp-margem" type="number" step="0.01" value="" placeholder="0,00" oninput="calcPrecoVariacao()" style="${inputStyle}">
            </div>
            <div>
              <label style="${labelOrange}">Valor venda</label>
              <input id="cp-preco" type="number" step="0.01" value="" placeholder="0,00" oninput="calcMargemVariacao()" style="${inputStyle}">
            </div>
          </div>

          <!-- Linha 2: EAN + EAN Lido + Tamanho + Qtde -->
          <div style="display:grid;grid-template-columns:1fr 1fr 130px 100px;gap:10px;align-items:end">
            <div>
              <label style="${labelOrange}">Código de barras (EAN)</label>
              <input id="cp-ean" placeholder="" style="${inputStyle}">
            </div>
            <div>
              <label style="${labelNormal}">Código de barras (EAN) - Lido</label>
              <input id="cp-ean-lido" placeholder="" style="${inputStyle}">
            </div>
            <div>
              <label style="${labelNormal}">Tamanho / Grade</label>
              <select id="cp-tamanho" style="${selectStyle}"><option value="">—</option></select>
            </div>
            <div>
              <label style="${labelOrange}">Qtde</label>
              <input id="cp-qtde" type="number" min="0" value="0" style="${inputStyle}">
            </div>
          </div>

          <!-- Botão Trocar EAN -->
          <div>
            <button onclick="trocarCodigoBarras()" style="padding:8px 18px;background:#e2e8f0;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;color:#374151">
              Trocar Cód. Barras (EAN)
            </button>
          </div>
        </div>
      </div>

      <!-- BOTÕES RODAPÉ (idênticos ao Phibo) -->
      <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px 20px;display:flex;gap:8px;align-items:center">
        <button onclick="navigate('produtos')" style="display:flex;align-items:center;gap:6px;padding:8px 16px;background:#ef4444;color:white;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          <i data-lucide="arrow-left" style="width:14px;height:14px"></i>Voltar
        </button>
        <div style="flex:1"></div>
        <div style="position:relative">
          <button onclick="toggleOutrasAcoes()" id="btn-outras-acoes" style="background:none;border:none;color:#2563eb;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:4px">
            <span style="font-size:16px;font-weight:700">+</span> Outras ações
          </button>
          <div id="outras-acoes-menu" style="display:none;position:absolute;bottom:calc(100% + 4px);right:0;background:white;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.12);min-width:180px;z-index:100;padding:4px">
            <div onclick="limparFormVariacao()" style="padding:8px 14px;font-size:13px;cursor:pointer;border-radius:6px;color:#374151" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">
              <i data-lucide="eraser" style="width:13px;height:13px;margin-right:6px"></i>Limpar variação
            </div>
            <div onclick="deleteProduto('${prodId||''}');navigate('produtos')" style="padding:8px 14px;font-size:13px;cursor:pointer;color:#dc2626;border-radius:6px" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background=''">
              <i data-lucide="trash-2" style="width:13px;height:13px;margin-right:6px"></i>Excluir produto
            </div>
          </div>
        </div>
        <button onclick="salvarDadosGerais()" style="display:flex;align-items:center;gap:6px;padding:8px 16px;background:#f1f5f9;color:#374151;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          <i data-lucide="edit" style="width:14px;height:14px"></i>Editar dados gerais
        </button>
        <button onclick="salvarProdutoCompleto()" style="display:flex;align-items:center;gap:6px;padding:8px 20px;background:#2563eb;color:white;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          <i data-lucide="thumbs-up" style="width:14px;height:14px"></i>Salvar
        </button>
      </div>

      <!-- TABELA DE VARIAÇÕES DO PRODUTO -->
      <div id="cp-variantes-lista" style="background:white;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden${variantesExistentes.length?'':';display:none'}">
        <div id="cp-variantes-table">${renderVariantesTable(variantesExistentes, prod.nome||'')}</div>
      </div>

    </div>
  </div>`;

  document.getElementById('content').innerHTML = html;
  _cadProdId = prodId;
  setTimeout(()=>lucide.createIcons(), 10);
}

function renderVariantesTable(variantes, nomeProduto) {
  const titulo = nomeProduto ? `Variações do produto: ${nomeProduto.toUpperCase()}` : 'Variações do produto';
  if(!variantes.length) return `
    <div style="padding:10px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0">
      <span style="font-size:13px;font-weight:700;color:#374151">${titulo}</span>
    </div>`;

  const rows = variantes.map(v => {
    const corDot = v.cor_hexa
      ? `<span style="display:inline-block;width:13px;height:13px;border-radius:50%;background:${v.cor_hexa};border:1px solid rgba(0,0,0,.2);vertical-align:-2px;margin-right:5px"></span>`
      : '';
    return `<tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:8px 12px;font-size:12px;font-family:monospace">${v.ean||'—'}</td>
      <td style="padding:8px 12px;font-size:12px">${v.tamanho||'—'}</td>
      <td style="padding:8px 12px;font-size:12px;white-space:nowrap">${corDot}${v.cor_descricao||'—'}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:right">${v.custo?fmt(v.custo):'—'}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:right">${v.margem_lucro!=null?v.margem_lucro.toFixed(2)+'%':'—'}</td>
      <td style="padding:8px 12px;font-size:12px;font-weight:700;text-align:right">${v.preco_venda?fmt(v.preco_venda):'—'}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:center">${v.estoque??0}</td>
      <td style="padding:8px 12px">
        <div style="display:flex;gap:3px;align-items:center">
          <button title="Editar variação" onclick="editarVariante('${v.id}')" style="width:26px;height:26px;border:1px solid #e2e8f0;border-radius:4px;background:white;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#6b7280" onmouseover="this.style.color='#2563eb'" onmouseout="this.style.color='#6b7280'">
            <i data-lucide="square-pen" style="width:12px;height:12px"></i>
          </button>
          <button title="Excluir variação" onclick="deletarVariante('${v.id}')" style="width:26px;height:26px;border:1px solid #fecaca;border-radius:4px;background:#fef2f2;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#dc2626">
            <i data-lucide="trash-2" style="width:12px;height:12px"></i>
          </button>
          <button title="Imprimir etiqueta" onclick="imprimirEtiquetaVariante('${v.id}','${(v.ean||'').replace(/'/g,'')}','${(v.tamanho||'').replace(/'/g,'')}','${(v.cor_descricao||'').replace(/'/g,'')}',${parseFloat(v.preco_venda||0).toFixed(2)})" style="width:26px;height:26px;border:1px solid #bfdbfe;border-radius:4px;background:#eff6ff;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#2563eb">
            <i data-lucide="printer" style="width:12px;height:12px"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  return `
    <div style="padding:10px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0">
      <span style="font-size:13px;font-weight:700;color:#374151">${titulo}</span>
    </div>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">Código de barras (EAN)</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">Grade</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">Cor</th>
        <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">Valor custo</th>
        <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">Margem de venda</th>
        <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">Valor venda</th>
        <th style="padding:8px 12px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">Qtde</th>
        <th style="padding:8px 12px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">Ação</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

function trocarCodigoBarras() {
  const ean = document.getElementById('cp-ean');
  const lido = document.getElementById('cp-ean-lido');
  if(!ean || !lido) return;
  const tmp = ean.value;
  ean.value = lido.value;
  lido.value = tmp;
  toast('Códigos de barras trocados');
}

async function deletarVariante(varId) {
  if(!confirm('Excluir esta variação? Esta ação não pode ser desfeita.')) return;
  await sb.from('produto_grades').delete().eq('id', varId);
  toast('Variação excluída');
  if(_cadProdId) {
    const [{data:vars},{data:prod}] = await Promise.all([
      sb.from('produto_grades').select('*').eq('produto_id',_cadProdId).order('tamanho'),
      sb.from('produtos').select('nome').eq('id',_cadProdId).single()
    ]);
    const listaEl = document.getElementById('cp-variantes-lista');
    const tableEl = document.getElementById('cp-variantes-table');
    if(tableEl) tableEl.innerHTML = renderVariantesTable(vars||[], prod?.nome||'');
    if(listaEl) listaEl.style.display = (vars&&vars.length) ? '' : 'none';
    lucide.createIcons();
  }
}

async function imprimirEtiquetaVariante(varId, ean, tamanho, cor, preco) {
  // Buscar nome do produto
  let nomeProd = '';
  try {
    if(_cadProdId) {
      const {data:p} = await sb.from('produtos').select('nome,codigo,marca').eq('id',_cadProdId).maybeSingle();
      nomeProd = p?.nome || '';
      var codigo = p?.codigo || '';
      var marca = p?.marca || '';
    }
  } catch(e){}

  const precoFmt = 'R$ ' + parseFloat(preco||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});

  const win = window.open('', '_blank', 'width=400,height=520,menubar=no,toolbar=no,location=no,status=no');
  win.document.write(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Etiqueta — ${nomeProd}</title>
  <style>
    @page { size: 60mm 40mm; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; }

    .etiqueta-wrapper {
      display: flex; flex-direction: column; gap: 18px;
      padding: 20px; align-items: center;
    }

    .etiqueta {
      width: 220px;
      border: 1.5px solid #ccc;
      border-radius: 6px;
      padding: 10px 12px;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .marca { font-size: 9px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
    .nome { font-size: 11px; font-weight: 700; color: #111; line-height: 1.3; margin-bottom: 4px; }
    .info-row { display: flex; justify-content: center; gap: 10px; font-size: 10px; color: #555; margin-bottom: 6px; }
    .info-label { font-weight: 600; }
    .preco { font-size: 22px; font-weight: 900; color: #111; margin-bottom: 6px; }
    .ean-code { font-family: monospace; font-size: 10px; color: #555; letter-spacing: 1px; margin-bottom: 4px; }
    .codigo-ref { font-size: 9px; color: #aaa; }

    /* Barras visíveis via CSS (representacional) */
    .barcode-bars {
      display: flex; align-items: flex-end; justify-content: center;
      gap: 1px; height: 28px; margin-bottom: 4px;
    }
    .barcode-bars span {
      display: inline-block; background: #111;
      width: 2px;
    }

    .btn-row { display: flex; gap: 10px; margin-top: 10px; }
    .btn { padding: 9px 20px; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: Arial, sans-serif; }
    .btn-print { background: #2563eb; color: white; }
    .btn-close { background: #e5e7eb; color: #374151; }
    @media print { .btn-row { display: none; } body { padding: 0; } .etiqueta-wrapper { padding: 4px; } }
  </style>
</head>
<body>
  <div class="etiqueta-wrapper">

    <div class="etiqueta" id="etq">
      ${marca ? `<div class="marca">${marca}</div>` : ''}
      <div class="nome">${nomeProd}</div>
      <div class="info-row">
        ${tamanho ? `<span><span class="info-label">Tam:</span> ${tamanho}</span>` : ''}
        ${cor ? `<span><span class="info-label">Cor:</span> ${cor}</span>` : ''}
      </div>
      <div class="preco">${precoFmt}</div>
      ${ean ? `<div class="barcode-bars" id="bars-container"></div><div class="ean-code">${ean}</div>` : ''}
      ${codigo ? `<div class="codigo-ref">Ref: ${codigo}</div>` : ''}
    </div>

    <div class="btn-row">
      <button class="btn btn-print" onclick="window.print()">&#128438; Imprimir</button>
      <button class="btn btn-close" onclick="window.close()">Fechar</button>
    </div>
  </div>

  <script>
    // Gera barras CSS representando o EAN visualmente
    const ean = '${ean}';
    const barsEl = document.getElementById('bars-container');
    if(barsEl && ean) {
      const heights = [32,24,32,18,28,20,32,18,28,32,20,26,32,18,24,30,32,20,28,32,18,30,32,24,18,32,28,20,32,24];
      let html = '';
      for(let i=0;i<ean.length*2+10;i++) {
        const h = heights[i%heights.length];
        const w = (i%3===0)?3:2;
        const show = i%2===0;
        html += show ? '<span style="height:'+h+'px;width:'+w+'px;"></span>' : '<span style="width:1px;background:transparent"></span>';
      }
      barsEl.innerHTML = html;
    }
  <\/script>
</body>
</html>`);
  win.document.close();
}

function atualizarGradeOpcoes() {
  const sel = document.getElementById('cp-grade');
  const opt = sel?.options[sel.selectedIndex];
  const vals = opt ? JSON.parse(opt.getAttribute('data-vals')||'[]') : [];
  const tamSel = document.getElementById('cp-tamanho');
  if(!tamSel) return;
  tamSel.innerHTML = `<option value="">—</option>` + vals.map(v=>`<option value="${v}">${v}</option>`).join('');
}

function calcMargemVariacao() {
  const custo = parseFloat(document.getElementById('cp-custo')?.value||0);
  const preco = parseFloat(document.getElementById('cp-preco')?.value||0);
  const m = preco>0 ? ((preco-custo)/preco*100) : 0;
  const mEl = document.getElementById('cp-margem');
  if(mEl) mEl.value = m.toFixed(2);
}

function calcPrecoVariacao() {
  const custo  = parseFloat(document.getElementById('cp-custo')?.value||0);
  const margem = parseFloat(document.getElementById('cp-margem')?.value||0);
  if(margem > 0 && margem < 100 && custo > 0) {
    const preco = custo / (1 - margem/100);
    const pEl = document.getElementById('cp-preco');
    if(pEl) pEl.value = preco.toFixed(2);
  }
}

function gerarCodProd() {
  const cod = 'P' + Date.now().toString().slice(-8);
  const el = document.getElementById('cp-codigo');
  if(el) el.value = cod;
}

function gerarNCMPadrao() {
  const el = document.getElementById('cp-ncm');
  if(el) el.value = '62034200';  // NCM padrão para confecções
  const desc = document.getElementById('cp-ncm-desc');
  if(desc) desc.value = 'Vestuário e seus acessórios';
}

function buscarNCM() {
  const ncm = document.getElementById('cp-ncm')?.value?.trim();
  if(!ncm) return toast('Informe o código NCM para pesquisar','info');
  toast('Pesquisa NCM: acesse https://www.tipi.receita.fazenda.gov.br','info');
}

function gerarEAN() {
  const base = '789' + Math.floor(Math.random()*1000000000).toString().padStart(9,'0');
  let sum = 0;
  for(let i=0;i<12;i++) sum += parseInt(base[i]) * (i%2===0?1:3);
  const check = (10 - (sum%10)) % 10;
  const el = document.getElementById('cp-ean');
  if(el) el.value = base + check;
}

function toggleOutrasAcoes() {
  const m = document.getElementById('outras-acoes-menu');
  if(m) { m.style.display = m.style.display==='none'?'block':'none'; lucide.createIcons(); }
}

function corSelectChanged(sel) {
  const desc = document.getElementById('cp-cor-desc');
  const hex  = document.getElementById('cp-cor-hex');
  if(!desc || !hex) return;
  if(sel.value === '__nova__') {
    desc.style.display = '';
    desc.value = '';
    hex.value = '#cccccc';
    desc.focus();
  } else {
    desc.style.display = 'none';
    desc.value = sel.value;
    const opt = sel.options[sel.selectedIndex];
    hex.value = opt?.dataset?.hex || '#cccccc';
  }
}

function limparFormVariacao() {
  ['cp-ean','cp-ean-lido','cp-cor-desc'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  ['cp-custo','cp-margem','cp-preco'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  const qtde=document.getElementById('cp-qtde');if(qtde)qtde.value='0';
  const tam=document.getElementById('cp-tamanho');if(tam)tam.value='';
  const cor=document.getElementById('cp-cor-hex');if(cor)cor.value='#cccccc';
  const corSel=document.getElementById('cp-cor-select');if(corSel)corSel.value='';
  const corInput=document.getElementById('cp-cor-desc');if(corInput)corInput.style.display='none';
  const m=document.getElementById('outras-acoes-menu');if(m)m.style.display='none';
}

async function editarVariante(varId) {
  const {data:v} = await sb.from('produto_grades').select('*').eq('id',varId).single();
  if(!v) return;
  const e = id => document.getElementById(id);
  if(e('cp-ean'))       e('cp-ean').value = v.ean||'';
  if(e('cp-cor-hex'))   e('cp-cor-hex').value = v.cor_hexa||'#cccccc';
  if(e('cp-cor-desc'))  e('cp-cor-desc').value = v.cor_descricao||'';
  // Sincronizar select de cor
  const corSel = e('cp-cor-select');
  if(corSel && v.cor_descricao) {
    const opt = [...corSel.options].find(o=>o.value===v.cor_descricao);
    if(opt) { corSel.value = v.cor_descricao; e('cp-cor-desc').style.display='none'; }
    else { corSel.value='__nova__'; e('cp-cor-desc').style.display=''; e('cp-cor-desc').value=v.cor_descricao||''; }
  }
  if(e('cp-custo'))     e('cp-custo').value = v.custo||'';
  if(e('cp-margem'))    e('cp-margem').value = v.margem_lucro||'';
  if(e('cp-preco'))     e('cp-preco').value = v.preco_venda||'';
  if(e('cp-qtde'))      e('cp-qtde').value = v.estoque||0;
  if(e('cp-tamanho'))   e('cp-tamanho').value = v.tamanho||'';
  _editVarianteId = varId;
  window.scrollTo({top:0, behavior:'smooth'});
  toast('Variação carregada para edição','info');
}
let _editVarianteId = null;

async function salvarDadosGerais() {
  const nome = document.getElementById('cp-nome')?.value?.trim();
  if(!nome) return toast('Descrição do produto obrigatória','error');
  const payload = {
    nome,
    sku:       document.getElementById('cp-sku')?.value||null,
    codigo:    document.getElementById('cp-codigo')?.value||null,
    marca:     document.getElementById('cp-marca')?.value||null,
    colecao_id:document.getElementById('cp-colecao')?.value||null,
    fornecedor_id:document.getElementById('cp-fornecedor')?.value||null,
    categoria_id: document.getElementById('cp-categoria')?.value||null,
    genero:    document.getElementById('cp-genero')?.value||null,
    ncm:       document.getElementById('cp-ncm')?.value||null,
    ncm_descricao: document.getElementById('cp-ncm-desc')?.value||null
  };
  if(_cadProdId) {
    const {error} = await sb.from('produtos').update(payload).eq('id',_cadProdId);
    if(error) return toast('Erro: '+error.message,'error');
  } else {
    const {data:np,error} = await sb.from('produtos').insert(payload).select().single();
    if(error) return toast('Erro: '+error.message,'error');
    _cadProdId = np.id;
  }
  toast('Dados gerais salvos');
}

async function salvarProdutoCompleto() {
  // 1. Salvar dados gerais
  const nome = document.getElementById('cp-nome')?.value?.trim();
  if(!nome) return toast('Descrição do produto obrigatória','error');

  const payload = {
    nome,
    sku:       document.getElementById('cp-sku')?.value||null,
    codigo:    document.getElementById('cp-codigo')?.value||null,
    marca:     document.getElementById('cp-marca')?.value||null,
    colecao_id:document.getElementById('cp-colecao')?.value||null,
    fornecedor_id:document.getElementById('cp-fornecedor')?.value||null,
    categoria_id: document.getElementById('cp-categoria')?.value||null,
    grade_id:   document.getElementById('cp-grade')?.value||null,
    genero:    document.getElementById('cp-genero')?.value||null,
    ncm:       document.getElementById('cp-ncm')?.value||null,
    ncm_descricao: document.getElementById('cp-ncm-desc')?.value||null
  };

  let prodId = _cadProdId;
  if(prodId) {
    const {error} = await sb.from('produtos').update(payload).eq('id',prodId);
    if(error) return toast('Erro ao salvar produto: '+error.message,'error');
  } else {
    const {data:np,error} = await sb.from('produtos').insert(payload).select().single();
    if(error) return toast('Erro ao criar produto: '+error.message,'error');
    prodId = np.id;
    _cadProdId = prodId;
  }

  // 2. Salvar variação (se preenchida)
  const tamanho  = document.getElementById('cp-tamanho')?.value || 'único';
  const ean      = document.getElementById('cp-ean')?.value||'';
  const eanLido  = document.getElementById('cp-ean-lido')?.value||'';
  const corHex   = document.getElementById('cp-cor-hex')?.value||null;
  // cor pode vir do select (hidden input) ou do campo de nova cor
  const corSelEl = document.getElementById('cp-cor-select');
  const corDescEl = document.getElementById('cp-cor-desc');
  const corDesc = corSelEl?.value === '__nova__'
    ? (corDescEl?.value?.trim()||null)
    : (corDescEl?.value?.trim()||null);
  const custo    = parseFloat(document.getElementById('cp-custo')?.value||0)||null;
  const margem   = parseFloat(document.getElementById('cp-margem')?.value||0)||null;
  const preco    = parseFloat(document.getElementById('cp-preco')?.value||0)||null;
  const qtde     = parseInt(document.getElementById('cp-qtde')?.value||0);

  const varPayload = {
    produto_id: prodId, tamanho,
    ean: ean||eanLido||null,
    cor_hexa: corHex, cor_descricao: corDesc,
    custo, margem_lucro: margem, preco_venda: preco,
    estoque: qtde
  };

  const chaveKey = _editVarianteId ? {id:_editVarianteId} : null;
  const {data:existing} = chaveKey
    ? await sb.from('produto_grades').select('id').eq('id',_editVarianteId).maybeSingle()
    : await sb.from('produto_grades').select('id').match({produto_id:prodId,tamanho}).maybeSingle();

  if(existing) {
    await sb.from('produto_grades').update(varPayload).eq('id',existing.id);
  } else {
    await sb.from('produto_grades').insert(varPayload);
  }
  _editVarianteId = null;

  // 3. Recarregar variantes
  const {data:vars} = await sb.from('produto_grades').select('*').eq('produto_id',prodId).order('tamanho');
  const listaEl = document.getElementById('cp-variantes-lista');
  const tableEl = document.getElementById('cp-variantes-table');
  const nomeProdSalvo = document.getElementById('cp-nome')?.value||'';
  if(listaEl && tableEl) {
    listaEl.style.display = '';
    tableEl.innerHTML = renderVariantesTable(vars||[], nomeProdSalvo);
  }
  limparFormVariacao();
  toast('Produto salvo com sucesso');
  lucide.createIcons();
}

// ===== FORNECEDORES =====
// ===== FORNECEDORES à LISTA =====
let _editFornId = null;

async function renderFornecedores() {
  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-primary" style="background:#16a34a;box-shadow:0 2px 8px rgba(22,163,74,.3)" onclick="navigate('cadastrar-fornecedor')">
      <i data-lucide="plus"></i>Novo Fornecedor
    </button>`;
  await loadFornecedores();
}

async function loadFornecedores(q='') {
  let query = sb.from('fornecedores').select('*').eq('ativo',true).order('razao_social');
  if(q) query = query.ilike('razao_social',`%${q}%`);
  const {data} = await query;
  document.getElementById('content').innerHTML = `
    <div class="card">
      <div class="filters">
        <input class="filter-input" placeholder="Buscar fornecedor..." oninput="loadFornSearch(this.value)">
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Nome / Razão Social</th><th>CNPJ</th><th>E-mail</th><th>Telefone</th><th>Cidade</th><th>Ações</th></tr></thead>
        <tbody>${(data||[]).map(f=>`<tr>
          <td><strong>${f.razao_social}</strong>${f.nome_fantasia?`<br><small style="color:var(--text-2)">${f.nome_fantasia}</small>`:''}</td>
          <td style="font-family:monospace;font-size:12px">${f.cnpj||f.cpf||'—'}</td>
          <td style="font-size:12px">${f.email||'—'}</td>
          <td>${f.telefone||f.celular||'—'}</td>
          <td>${f.cidade||'—'}</td>
          <td><div class="actions">
            <button title="Editar" onclick="_editFornId='${f.id}';navigate('cadastrar-fornecedor')" style="width:28px;height:28px;border:1px solid var(--border-2);border-radius:4px;background:white;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-2)" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text-2)'"><i data-lucide="square-pen" style="width:13px;height:13px"></i></button>
            <button title="Excluir" onclick="deleteForn('${f.id}')" style="width:28px;height:28px;border:1px solid #fecaca;border-radius:4px;background:#fef2f2;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--red)"><i data-lucide="trash-2" style="width:13px;height:13px"></i></button>
          </div></td>
        </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--text-2);padding:32px">Nenhum fornecedor cadastrado</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function loadFornSearch(q){await loadFornecedores(q);}

async function deleteForn(id) {
  if(!confirm('Excluir fornecedor?')) return;
  await sb.from('fornecedores').update({ativo:false}).eq('id',id);
  toast('Fornecedor removido');
  loadFornecedores();
}

// ===== CADASTRAR FORNECEDOR à PÁGINA COMPLETA =====
async function renderCadastrarFornecedor() {
  document.getElementById('topbar-actions').innerHTML = '';
  const fornId = _editFornId || null;
  _editFornId = null;

  let f = {};
  let marcas = [];
  if(fornId) {
    const [{data:fd},{data:md}] = await Promise.all([
      sb.from('fornecedores').select('*').eq('id',fornId).single(),
      sb.from('fornecedor_marcas').select('*').eq('fornecedor_id',fornId).order('nome')
    ]);
    f = fd||{};
    marcas = md||[];
  }

  const dataCad = f.created_at
    ? new Date(f.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})
    : new Date().toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});

  const obsMax = 240;
  const obsAtual = (f.observacoes||'').length;

  const html = `
  <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">

    <!-- TÍTULO -->
    <div style="text-align:center;padding:16px 24px 0;border-bottom:1px solid var(--border)">
      <h2 style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:14px">Cadastrar Fornecedor</h2>

      <!-- TABS -->
      <div style="display:flex;gap:0;border-bottom:none">
        <button id="tab-forn-btn" onclick="switchFornTab('forn')" style="padding:8px 20px;border:1px solid var(--border);border-bottom:none;border-radius:var(--radius) var(--radius) 0 0;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;background:white;color:var(--accent);border-color:var(--accent);margin-right:2px">Fornecedor</button>
        <button id="tab-marcas-btn" onclick="switchFornTab('marcas')" style="padding:8px 20px;border:1px solid var(--border);border-bottom:none;border-radius:var(--radius) var(--radius) 0 0;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;background:#f8fafc;color:var(--text-2);margin-right:2px">Marcas</button>
        <button id="tab-dados-btn" onclick="switchFornTab('dados')" style="padding:8px 20px;border:1px solid var(--border);border-bottom:none;border-radius:var(--radius) var(--radius) 0 0;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;background:#f8fafc;color:var(--text-2)">Dados Complementares</button>
      </div>
    </div>

    <!-- DATA CADASTRO -->
    <div style="padding:10px 24px;background:#f8fafc;border-bottom:1px solid var(--border);text-align:right">
      <span style="font-size:12px;color:var(--text-2)"><strong>Data Cadastro:</strong> ${dataCad}</span>
    </div>

    <!-- TAB: FORNECEDOR -->
    <div id="tab-forn" style="padding:24px">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="form-group">
          <label>Nome *</label>
          <input id="fn-nome" value="${f.razao_social||''}" placeholder="Nome ou Razão Social">
        </div>
        <div class="form-group">
          <label>E-mail</label>
          <input id="fn-email" type="email" value="${f.email||''}" placeholder="">
        </div>
        <div class="form-group">
          <label>Telefone</label>
          <input id="fn-telefone" value="${f.telefone||f.celular||''}" placeholder="">
        </div>
      </div>
      <div class="form-group" style="margin-bottom:8px">
        <label>Observação</label>
        <textarea id="fn-obs" maxlength="${obsMax}" oninput="document.getElementById('fn-obs-count').textContent=(${obsMax}-this.value.length)+' characters restantes.'" style="min-height:80px;resize:vertical" placeholder="Informações complementares, exemplo: nome da pessoa de contato, pontos fortes e fracos, etc">${f.observacoes||''}</textarea>
        <div id="fn-obs-count" style="font-size:11px;color:var(--text-2);margin-top:3px">${obsMax-obsAtual} characters restantes.</div>
      </div>
    </div>

    <!-- TAB: MARCAS -->
    <div id="tab-marcas" style="display:none;padding:24px">
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <input id="fn-marca-nova" class="filter-input" placeholder="Nome da marca" style="flex:1">
        <button class="btn btn-primary" onclick="adicionarMarcaForn()"><i data-lucide="plus"></i>Adicionar</button>
      </div>
      <div id="fn-marcas-lista">
        ${marcas.length ? `<div class="table-wrap"><table class="data-table">
          <thead><tr><th>Marca</th><th style="width:60px">Ação</th></tr></thead>
          <tbody>${marcas.map(m=>`<tr>
            <td>${m.nome}</td>
            <td><button onclick="removerMarcaForn('${m.id}')" style="width:26px;height:26px;border:1px solid #fecaca;border-radius:4px;background:#fef2f2;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--red)"><i data-lucide="trash-2" style="width:12px;height:12px"></i></button></td>
          </tr>`).join('')}</tbody>
        </table></div>` : '<div class="empty-state" style="padding:32px"><i data-lucide="tag"></i><p>Nenhuma marca vinculada</p></div>'}
      </div>
    </div>

    <!-- TAB: DADOS COMPLEMENTARES -->
    <div id="tab-dados" style="display:none;padding:24px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="form-group">
          <label>CNPJ / CPF</label>
          <input id="fn-cnpj" value="${f.cnpj||f.cpf||''}" placeholder="00.000.000/0000-00">
        </div>
        <div class="form-group">
          <label>Inscrição Estadual</label>
          <input id="fn-ie" value="${f.ie||''}">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="form-group">
          <label>Nome Fantasia</label>
          <input id="fn-fantasia" value="${f.nome_fantasia||''}">
        </div>
        <div class="form-group">
          <label>Contato</label>
          <input id="fn-contato" value="${f.contato||''}" placeholder="Nome da pessoa de contato">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 80px;gap:16px;margin-bottom:16px">
        <div class="form-group">
          <label>Endereço</label>
          <input id="fn-endereco" value="${f.endereco||''}">
        </div>
        <div class="form-group">
          <label>Cidade</label>
          <input id="fn-cidade" value="${f.cidade||''}">
        </div>
        <div class="form-group">
          <label>Estado</label>
          <input id="fn-uf" value="${f.estado||''}" maxlength="2" placeholder="UF">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="form-group">
          <label>Celular</label>
          <input id="fn-celular" value="${f.celular||''}">
        </div>
        <div class="form-group">
          <label>Site / Instagram</label>
          <input id="fn-site" value="${f.site||''}" placeholder="https://...">
        </div>
      </div>
    </div>

    <!-- RODAPÉ -->
    <div style="padding:14px 24px;border-top:1px solid var(--border);display:flex;gap:8px;align-items:center">
      <button class="btn btn-secondary" onclick="navigate('fornecedores')"><i data-lucide="list"></i>Listar</button>
      ${fornId?`<button class="btn btn-secondary" onclick="_editFornId='${fornId}';renderCadastrarFornecedor()"><i data-lucide="edit"></i>Editar</button>`:''}
      <div style="flex:1"></div>
      <button class="btn btn-secondary" onclick="limparFormForn()"><i data-lucide="eraser"></i>Limpar</button>
      <button class="btn btn-primary" style="background:#1d4ed8;box-shadow:0 2px 8px rgba(29,78,216,.3)" onclick="salvarFornecedor('${fornId||''}')"><i data-lucide="save"></i>Salvar</button>
    </div>

  </div>`;

  document.getElementById('content').innerHTML = html;
  window._editFornId_current = fornId;
  setTimeout(()=>lucide.createIcons(),10);
}

function switchFornTab(tab) {
  ['forn','marcas','dados'].forEach(t=>{
    const panel = document.getElementById(`tab-${t}`);
    const btn   = document.getElementById(`tab-${t}-btn`);
    if(!panel||!btn) return;
    const active = t === tab;
    panel.style.display = active ? 'block' : 'none';
    btn.style.background  = active ? 'white' : '#f8fafc';
    btn.style.color       = active ? 'var(--accent)' : 'var(--text-2)';
    btn.style.fontWeight  = active ? '600' : '500';
    btn.style.borderColor = active ? 'var(--accent)' : 'var(--border)';
  });
}

async function adicionarMarcaForn() {
  const nome = document.getElementById('fn-marca-nova')?.value?.trim();
  if(!nome) return toast('Informe o nome da marca','error');
  const fornId = window._editFornId_current;
  if(!fornId) {
    // Guardar temporariamente para salvar junto com o fornecedor
    window._marcasTemp = window._marcasTemp||[];
    window._marcasTemp.push(nome);
    const lista = document.getElementById('fn-marcas-lista');
    if(lista) lista.innerHTML += `<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">${nome} <span style="color:var(--text-3);font-size:11px">(será salvo com o fornecedor)</span></div>`;
    document.getElementById('fn-marca-nova').value='';
    return;
  }
  const {error} = await sb.from('fornecedor_marcas').insert({fornecedor_id:fornId, nome});
  if(error) return toast('Erro: '+error.message,'error');
  document.getElementById('fn-marca-nova').value='';
  toast('Marca adicionada');
  _editFornId = fornId;
  renderCadastrarFornecedor();
}

async function removerMarcaForn(id) {
  if(!confirm('Remover marca?')) return;
  await sb.from('fornecedor_marcas').delete().eq('id',id);
  toast('Marca removida');
  const fornId = window._editFornId_current;
  if(fornId){ _editFornId = fornId; renderCadastrarFornecedor(); }
}

function limparFormForn() {
  ['fn-nome','fn-email','fn-telefone','fn-obs','fn-cnpj','fn-ie','fn-fantasia',
   'fn-contato','fn-endereco','fn-cidade','fn-uf','fn-celular','fn-site'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value='';
  });
  const cnt = document.getElementById('fn-obs-count');
  if(cnt) cnt.textContent = '240 characters restantes.';
}

async function salvarFornecedor(id) {
  const nome = document.getElementById('fn-nome')?.value?.trim();
  if(!nome) return toast('Nome obrigatório','error');
  const payload = {
    razao_social: nome,
    nome:         nome,
    email:        document.getElementById('fn-email')?.value||null,
    telefone:     document.getElementById('fn-telefone')?.value||null,
    observacoes:  document.getElementById('fn-obs')?.value||null,
    cnpj:         document.getElementById('fn-cnpj')?.value||null,
    ie:           document.getElementById('fn-ie')?.value||null,
    nome_fantasia:document.getElementById('fn-fantasia')?.value||null,
    contato:      document.getElementById('fn-contato')?.value||null,
    endereco:     document.getElementById('fn-endereco')?.value||null,
    cidade:       document.getElementById('fn-cidade')?.value||null,
    estado:       document.getElementById('fn-uf')?.value||null,
    celular:      document.getElementById('fn-celular')?.value||null,
    site:         document.getElementById('fn-site')?.value||null,
    ativo:        1
  };
  let savedId = id;
  if(id) {
    const {error} = await sb.from('fornecedores').update(payload).eq('id',id);
    if(error) return toast('Erro: '+error.message,'error');
  } else {
    const {data:nf,error} = await sb.from('fornecedores').insert(payload).select().single();
    if(error) return toast('Erro: '+error.message,'error');
    savedId = nf.id;
    // Salvar marcas temporárias
    if(window._marcasTemp?.length) {
      for(const nome of window._marcasTemp)
        await sb.from('fornecedor_marcas').insert({fornecedor_id:savedId, nome});
      window._marcasTemp=[];
    }
  }
  toast('Fornecedor salvo com sucesso');
  window._editFornId_current = savedId;
  _editFornId = savedId;
  renderCadastrarFornecedor();
}

// ===== SIMPLE CRUD (Categorias, Grades, Coleções, Vendedores) =====
async function renderSimpleCRUD(table, fields, title, cols, renderFn) {
  const {data} = await sb.from(table).select('*').eq('ativo',true).order('nome');
  renderFn(data||[]);
}

async function renderCategorias() {
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary" onclick="openSimpleModal('categorias','Categoria')"><i data-lucide="plus"></i>Nova Categoria</button>`;
  await loadSimple('categorias','Categoria',['nome','descricao']);
}

async function renderColecoes() {
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary" onclick="openSimpleModal('colecoes','Coleção')"><i data-lucide="plus"></i>Nova Coleção</button>`;
  await loadSimple('colecoes','Coleção',['nome','temporada','ano']);
}

async function renderGrades() {
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary" onclick="openGradeModal()"><i data-lucide="plus"></i>Nova Grade</button>`;
  const {data} = await sb.from('grades').select('*').eq('ativo',true);
  document.getElementById('content').innerHTML = `
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Nome</th><th>Tipo</th><th>Valores</th><th>Ações</th></tr></thead>
        <tbody>${(data||[]).map(g=>`<tr>
          <td><strong>${g.nome}</strong></td><td>${g.tipo||'—'}</td>
          <td><div style="display:flex;flex-wrap:wrap;gap:4px">${(g.valores||[]).map(v=>`<span class="badge badge-blue">${v}</span>`).join('')}</div></td>
          <td><button class="btn btn-sm btn-danger" onclick="deleteRecord('grades','${g.id}',renderGrades)"><i data-lucide="trash-2"></i></button></td>
        </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

function openGradeModal() {
  openModal(`
    <div class="modal-header"><h3>Nova Grade</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group"><label>Nome *</label><input id="gr-nome"></div>
        <div class="form-group"><label>Tipo</label><select id="gr-tipo"><option value="tamanho">Tamanho</option><option value="numeracao">Numeração</option><option value="unico">único</option></select></div>
        <div class="form-group"><label>Valores (separados por vírgula)</label><input id="gr-vals" placeholder="PP,P,M,G,GG,XGG"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveGrade()"><i data-lucide="save"></i>Salvar</button>
    </div>`,'modal-md');
}

async function saveGrade() {
  const nome=document.getElementById('gr-nome').value.trim();
  if(!nome) return toast('Nome obrigatório','error');
  const vals=document.getElementById('gr-vals').value.split(',').map(v=>v.trim()).filter(Boolean);
  await sb.from('grades').insert({nome,tipo:document.getElementById('gr-tipo').value,valores:vals});
  closeModalDirect();toast('Grade salva');renderGrades();
}

async function loadSimple(table, label, fields) {
  const {data} = await sb.from(table).select('*').eq('ativo',true).order('nome');
  document.getElementById('content').innerHTML = `
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr>${fields.map(f=>`<th>${f}</th>`).join('')}<th>Ações</th></tr></thead>
        <tbody>${(data||[]).map(r=>`<tr>${fields.map(f=>`<td>${r[f]||'—'}</td>`).join('')}
          <td><button class="btn btn-sm btn-danger" onclick="deleteRecord('${table}','${r.id}',render${label.replace('—','c').replace('—','a').replace(' ','')})"><i data-lucide="trash-2"></i></button></td>
        </tr>`).join('')||`<tr><td colspan="${fields.length+1}" style="text-align:center;color:var(--text-2)">Nenhum registro</td></tr>`}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function openSimpleModal(table, label) {
  const fields = {
    categorias:[{id:'s-nome',label:'Nome',type:'text'},{id:'s-desc',label:'Descrição',type:'text'}],
    colecoes:[{id:'s-nome',label:'Nome',type:'text'},{id:'s-temp',label:'Temporada',type:'text'},{id:'s-ano',label:'Ano',type:'number'}]
  };
  const flds = fields[table]||[{id:'s-nome',label:'Nome',type:'text'}];
  openModal(`
    <div class="modal-header"><h3>Nova ${label}</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">${flds.map(f=>`<div class="form-group"><label>${f.label}</label><input id="${f.id}" type="${f.type}"></div>`).join('')}</div></div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveSimple('${table}','${label}')"><i data-lucide="save"></i>Salvar</button></div>`,'modal-sm');
}

async function saveSimple(table, label) {
  const map={categorias:{nome:document.getElementById('s-nome')?.value?.trim(),descricao:document.getElementById('s-desc')?.value},colecoes:{nome:document.getElementById('s-nome')?.value?.trim(),temporada:document.getElementById('s-temp')?.value,ano:document.getElementById('s-ano')?.value||null}};
  const payload=map[table]||{nome:document.getElementById('s-nome')?.value?.trim()};
  if(!payload.nome) return toast('Nome obrigatório','error');
  await sb.from(table).insert(payload);
  closeModalDirect();toast(`${label} salva`);
  navigate(currentPage);
}

async function deleteRecord(table, id, cb) {
  if(!confirm('Excluir registro?')) return;
  await sb.from(table).update({ativo:false}).eq('id',id);
  toast('Removido');if(cb)cb();
}

// ===== VENDEDORES =====
async function renderVendedores() {
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary" onclick="openVendedorModal()"><i data-lucide="plus"></i>Novo Vendedor</button>`;
  const {data} = await sb.from('vendedores').select('*').eq('ativo',true).order('nome');
  document.getElementById('content').innerHTML = `
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Nome</th><th>CPF</th><th>Telefone</th><th>Comissão %</th><th>Meta Mensal</th><th>Ações</th></tr></thead>
        <tbody>${(data||[]).map(v=>`<tr>
          <td><strong>${v.nome}</strong></td><td>${v.cpf||'—'}</td><td>${v.telefone||'—'}</td>
          <td>${fmtNum(v.comissao_percentual)}%</td><td>${fmt(v.meta_mensal)}</td>
          <td><div class="actions">
            <button class="btn btn-sm btn-secondary" onclick="openVendedorModal('${v.id}')"><i data-lucide="edit-2"></i></button>
            <button class="btn btn-sm btn-danger" onclick="deleteVend('${v.id}')"><i data-lucide="trash-2"></i></button>
          </div></td>
        </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--text-2)">Nenhum vendedor</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function openVendedorModal(id=null) {
  let v={};
  if(id){const {data}=await sb.from('vendedores').select('*').eq('id',id).single();v=data||{};}
  openModal(`
    <div class="modal-header"><h3>${id?'Editar':'Novo'} Vendedor</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-row"><div class="form-group"><label>Nome *</label><input id="vd-nome" value="${v.nome||''}"></div>
        <div class="form-group"><label>CPF</label><input id="vd-cpf" value="${v.cpf||''}"></div></div>
        <div class="form-row"><div class="form-group"><label>Telefone</label><input id="vd-tel" value="${v.telefone||''}"></div>
        <div class="form-group"><label>Usuário</label><input id="vd-email" value="${v.email||''}"></div></div>
        <div class="form-row"><div class="form-group"><label>Comissão %</label><input id="vd-com" type="number" step="0.01" value="${v.comissao_percentual||0}"></div>
        <div class="form-group"><label>Meta Mensal (R$)</label><input id="vd-meta" type="number" value="${v.meta_mensal||0}"></div></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveVendedor('${id||''}')"><i data-lucide="save"></i>Salvar</button>
    </div>`,'modal-md');
}

async function saveVendedor(id) {
  const payload={nome:document.getElementById('vd-nome').value.trim(),cpf:document.getElementById('vd-cpf').value,telefone:document.getElementById('vd-tel').value,email:document.getElementById('vd-email').value,comissao_percentual:parseFloat(document.getElementById('vd-com').value||0),meta_mensal:parseFloat(document.getElementById('vd-meta').value||0)};
  if(!payload.nome) return toast('Nome obrigatório','error');
  if(id){await sb.from('vendedores').update(payload).eq('id',id);}else{await sb.from('vendedores').insert(payload);}
  closeModalDirect();toast('Vendedor salvo');renderVendedores();
}

async function deleteVend(id){if(!confirm('Excluir?'))return;await sb.from('vendedores').update({ativo:false}).eq('id',id);toast('Removido');renderVendedores();}
