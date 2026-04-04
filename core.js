// ===== CONFIG =====

// ===== STATE =====
let currentPage = 'dashboard';
let currentUser = null;
let cart = [];
let cartClient = null;
let cartSeller = null;
let cartPayment = 'dinheiro';

// ===== AUTH =====
const LOCAL_USER = 'admin';
const LOCAL_PASS = '1234';

async function sha256(msg) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function login() {
  const email = document.getElementById('auth-email').value.trim();
  const pw = document.getElementById('auth-password').value;
  if(!email||!pw) return toast('Preencha usuário e senha','error');
  
  try {
    const hash = await sha256(pw);
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha_hash: hash })
    });
    const d = await r.json();
    if(!r.ok) return toast(d.message || 'Credenciais inválidas', 'error');
    
    localStorage.setItem('loja_token', d.token);
    currentUser = { email, nome: d.nome, slug: d.slug };
    initApp();
  } catch(e) {
    toast('Erro ao conectar com servidor', 'error');
  }
}

function logout() {
  localStorage.removeItem('loja_token');
  currentUser = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  const waFab = document.getElementById('wa-fab');
  if(waFab) waFab.style.display = 'none';
  const waWin = document.getElementById('wa-chat-window');
  if(waWin) waWin.classList.remove('open');
}

async function checkSession() {
  const t = localStorage.getItem('loja_token');
  if(!t) return;
  try {
    const r = await fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer '+t } });
    if(!r.ok) { localStorage.removeItem('loja_token'); return; }
    const d = await r.json();
    currentUser = { email: d.email||'', nome: d.nome, slug: d.slug };
    initApp();
  } catch(e) {}
}

function initApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  const waFab = document.getElementById('wa-fab');
  if(waFab) waFab.style.display = 'flex';
  const name = currentUser.nome || currentUser.email?.split('@')[0] || 'Gestor';
  document.getElementById('sidebar-user-name').textContent = name;
  document.getElementById('topnav-initial').textContent = name.charAt(0).toUpperCase();
  lucide.createIcons();
  navigate('dashboard');
  // Fechar dropdowns ao clicar fora
  document.addEventListener('click', e => {
    if(!e.target.closest('.nav-group')) closeNGs();
  });
}

// ===== NAVIGATION =====
const pageTitles = {
  dashboard:'Dashboard',pdv:'PDV — Registrar Venda',bag:'BAG — Pré-venda',
  clientes:'Cadastrar Clientes','cadastrar-cliente':'Cadastrar Cliente','historico-clientes':'Histórico de Clientes','painel-clientes':'Painel de Clientes','como-conheceu':'Como nos Conheceu','importar-clientes':'Importar Clientes',produtos:'Cadastro Produto',categorias:'Categorias',colecoes:'Coleções',
  grades:'Grades',vendedores:'Vendedores',fornecedores:'Fornecedores',
  'relacao-vendas':'Relação de Vendas','consulta-vendas':'Vendas — Visão Geral','relacao-trocas':'Relação de Trocas','vendas-excluidas':'Vendas Excluídas','creditos-clientes':'Créditos de Clientes',
  crediario:'Gestão Crediário','contas-receber':'Recebimento Efetuado','efetuar-recebimento':'Efetuar Recebimento','analise-cliente':'Análise por Cliente','credito-atraso':'Crédito em Atraso','parametros-crediario':'Parâmetros Crediário',
  'listar-contas-receber':'Contas A Receber','fluxo-recebimento':'Fluxo Recebimento','historico-data-venda':'Histórico por Data Venda','relacao-recebimento':'Relação de Recebimento',
  'cartoes-vendas':'Cartões — Suas Vendas','cartoes-pagamentos':'Cartões — Seus Pagamentos','cartoes-visao-geral':'Cartões — Visão Geral','cartoes-maquinas':'Cartões — Cadastrar Máquina','cartoes-taxas':'Cartões — Cadastrar Taxas',
  'antecipar-parcelas':'Antecipar Parcelas','listar-antecipacoes':'Listar Antecipações',
  metas:'Metas de Vendas','painel-vendas':'Painel de Vendas',comissoes:'Comissões',
  'notas-fiscais':'Notas Fiscais',duplicatas:'Duplicatas a Pagar',
  'gestao-estoque':'Gestão de Estoque','parametros-estoque':'Parâmetros estoque','conferencia-estoque':'Conferência Estoque','visao-geral-estoque':'Visão Geral — Estoque','visao-detalhada-estoque':'Visão Detalhada — Estoque','giro-estoque':'Giro de Estoque','curva-abc':'Curva ABC','transferencia-lojas':'Transferência entre Lojas','importar-csv':'Importar Estoque CSV','cadastrar-produto':'Cadastro Produto — Estoque','cadastrar-fornecedor':'Cadastrar Fornecedor',
  caixa:'Caixa Diário','painel-financeiro':'Painel Financeiro',
  despesas:'Despesas','contas-pagar':'Contas a Pagar',
  'contas-bancarias':'Contas Bancárias','fluxo-caixa':'Fluxo de Caixa',
  dre:'Resultado — DRE',trocas:'Devoluções e Trocas'
};

// Page → grupo do nav
const pageGroup = {
  bag:'ng-vendas','painel-vendas':'ng-vendas','relacao-vendas':'ng-vendas',
  'consulta-vendas':'ng-vendas','relacao-trocas':'ng-vendas','vendas-excluidas':'ng-vendas','creditos-clientes':'ng-vendas',trocas:'ng-vendas',
  crediario:'ng-vendas','contas-receber':'ng-vendas','efetuar-recebimento':'ng-vendas','analise-cliente':'ng-vendas','credito-atraso':'ng-vendas','parametros-crediario':'ng-vendas',
  'listar-contas-receber':'ng-vendas','fluxo-recebimento':'ng-vendas','historico-data-venda':'ng-vendas','relacao-recebimento':'ng-vendas',
  'cartoes-vendas':'ng-vendas','cartoes-pagamentos':'ng-vendas','cartoes-visao-geral':'ng-vendas','cartoes-maquinas':'ng-vendas','cartoes-taxas':'ng-vendas',
  'antecipar-parcelas':'ng-vendas','listar-antecipacoes':'ng-vendas',
  comissoes:'ng-vendedores',metas:'ng-vendedores',vendedores:'ng-vendedores',
  'notas-fiscais':'ng-compras',duplicatas:'ng-compras','gestao-estoque':'ng-compras','parametros-estoque':'ng-compras','conferencia-estoque':'ng-compras','visao-geral-estoque':'ng-compras','visao-detalhada-estoque':'ng-compras','giro-estoque':'ng-compras','curva-abc':'ng-compras','transferencia-lojas':'ng-compras','importar-csv':'ng-compras',
  produtos:'ng-compras',fornecedores:'ng-compras','cadastrar-produto':'ng-compras','cadastrar-fornecedor':'ng-compras',
  clientes:'ng-cadastros',categorias:'ng-cadastros',colecoes:'ng-cadastros',grades:'ng-cadastros','cadastrar-cliente':'ng-cadastros','historico-clientes':'ng-cadastros','painel-clientes':'ng-cadastros','como-conheceu':'ng-cadastros','importar-clientes':'ng-cadastros',
  caixa:'ng-financeiro','painel-financeiro':'ng-financeiro',despesas:'ng-financeiro',
  'contas-pagar':'ng-financeiro','contas-bancarias':'ng-financeiro',
  'fluxo-caixa':'ng-financeiro',dre:'ng-financeiro'
};

function toggleNG(id) {
  const isOpen = document.getElementById(id).classList.contains('open');
  closeNGs();
  if(!isOpen) document.getElementById(id).classList.add('open');
}
function closeNGs() {
  document.querySelectorAll('.nav-group.open').forEach(el=>el.classList.remove('open'));
}

function navigate(page) {
  currentPage = page;
  closeNGs();

  // Atualizar estados visuais do topnav
  document.querySelectorAll('.nav-group-btn').forEach(b=>b.classList.remove('grp-active'));
  document.getElementById('nav-dash').classList.toggle('active', page==='dashboard');
  document.getElementById('nav-pdv').classList.toggle('active', page==='pdv');
  const grp = pageGroup[page];
  if(grp) {
    const btn = document.querySelector(`#${grp} .nav-group-btn`);
    if(btn) btn.classList.add('grp-active');
  }
  // Itens do dropdown
  document.querySelectorAll('.nav-dd-item').forEach(el=>{
    el.classList.toggle('active', el.getAttribute('onclick')?.includes(`'${page}'`));
  });

  const titles = {
    'pdv':'PDV','dashboard':'Dashboard','clientes':'Clientes','cadastrar-cliente':'Novo Cliente',
    'produtos':'Produtos','cadastrar-produto':'Novo Produto','vendedores':'Vendedores',
    'relacao-vendas':'Relação de Vendas','consulta-vendas':'Consulta de Vendas',
    'crediario':'Crediário','caixa':'Caixa','financeiro':'Financeiro',
    'gestao-estoque':'Gestão de Estoque','visao-geral-estoque':'Estoque — Visão Geral',
    'importar-csv':'Importar Estoque CSV','cartoes-maquinas':'Cartões & Maquinetas',
    'antecipar-parcelas':'Antecipar Parcelas',
  };
  const pt = document.getElementById('page-title');
  if(pt) pt.textContent = pageTitles[page] || titles[page] || page;
  document.getElementById('topbar-actions').innerHTML = '';
  const contentEl = document.getElementById('content');
  contentEl.classList.remove('pdv-active');
  contentEl.scrollTop = 0;
  contentEl.innerHTML = '<div class="loading"><div class="sk" style="height:20px;width:200px;margin:0 auto 8px"></div><div class="sk" style="height:14px;width:140px;margin:0 auto"></div></div>';
  contentEl.classList.remove('page-enter');
  void contentEl.offsetWidth;
  contentEl.classList.add('page-enter');
  const renders = {
    dashboard:renderDashboard,pdv:renderPDV,clientes:renderClientes,'cadastrar-cliente':renderCadastrarCliente,'historico-clientes':renderHistoricoClientes,'painel-clientes':renderPainelClientes,'como-conheceu':renderComoConheceu,'importar-clientes':renderImportarClientes,
    produtos:renderProdutos,categorias:renderCategorias,colecoes:renderColecoes,
    grades:renderGrades,vendedores:renderVendedores,fornecedores:renderFornecedores,
    'relacao-vendas':renderRelacaoVendas,'consulta-vendas':renderConsultaVendas,'relacao-trocas':renderRelacaoTrocas,'vendas-excluidas':renderVendasExcluidas,'creditos-clientes':renderCreditosClientes,
    crediario:renderCrediario,'contas-receber':renderContasReceber,'efetuar-recebimento':()=>renderCrediario('efetuar-recebimento'),'analise-cliente':()=>renderCrediario('analise-cliente'),'credito-atraso':()=>renderCrediario('credito-atraso'),'parametros-crediario':()=>renderCrediario('parametros-crediario'),
    'listar-contas-receber':renderListarContasReceber,'fluxo-recebimento':renderFluxoRecebimento,'historico-data-venda':renderHistoricoDataVenda,'relacao-recebimento':renderRelacaoRecebimento,
    'cartoes-vendas':renderCartoesVendas,'cartoes-pagamentos':renderCartoesPagamentos,'cartoes-visao-geral':renderCartoesVisaoGeral,'cartoes-maquinas':renderCartoesMaquinas,'cartoes-taxas':renderCartoesTaxas,
    'antecipar-parcelas':renderAnteciparParcelas,'listar-antecipacoes':renderListarAntecipacoes,
    metas:renderMetas,'painel-vendas':renderPainelVendas,comissoes:renderComissoes,
    'notas-fiscais':renderNotasFiscais,duplicatas:renderDuplicatas,
    'gestao-estoque':renderGestaoEstoque,'parametros-estoque':renderParametrosEstoque,'conferencia-estoque':renderConferenciaEstoque,'visao-geral-estoque':renderVisaoGeralEstoque,'visao-detalhada-estoque':renderVisaoDetalhadaEstoque,'giro-estoque':renderGiroEstoque,'curva-abc':renderCurvaABC,'transferencia-lojas':renderTransferenciaLojas,bag:renderBAG,'importar-csv':renderImportarCSV,'cadastrar-produto':renderCadastrarProduto,'cadastrar-fornecedor':renderCadastrarFornecedor,
    caixa:renderCaixa,'painel-financeiro':renderPainelFinanceiro,'caixa-mensal':renderCaixaMensal,'operacoes-caixa':renderOperacoesCaixa,
    despesas:renderDespesas,'painel-despesas':renderPainelDespesas,'cadastrar-classificacao':renderCadastrarClassificacao,'contas-pagar':renderContasPagar,
    'conciliar-extrato':renderConciliarExtrato,'listar-conciliacao':renderListarConciliacao,'cadastrar-conta-corrente':renderCadastrarContaCorrente,
    dre:renderDRE,
    'fluxo-caixa':renderFluxoCaixa,trocas:renderTrocas
  };
  if(renders[page]) renders[page]();
  else renderDashboard();
  setTimeout(()=>lucide.createIcons(),50);
}

// ===== TOAST =====
function toast(msg, type='success') {
  const icons = {success:'check-circle',error:'x-circle',info:'info'};
  const el = document.createElement('div');
  el.className = `toast-item toast-${type}`;
  el.innerHTML = `<i data-lucide="${icons[type]||'info'}"></i><span>${msg}</span>`;
  document.getElementById('toast').appendChild(el);
  lucide.createIcons();
  setTimeout(()=>el.remove(),3500);
}

// ===== MODAL =====
function openModal(html, size='modal-md') {
  const c = document.getElementById('modal-container');
  c.className = `modal ${size}`;
  c.innerHTML = html;
  document.getElementById('modal-overlay').classList.add('open');
  setTimeout(()=>lucide.createIcons(),20);
}
function closeModal(e) {
  if(e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.remove('open');
}
function closeModalDirect() {
  document.getElementById('modal-overlay').classList.remove('open');
}
function closeSizeModal(e) {
  if(e && e.target !== document.getElementById('size-modal-overlay')) return;
  document.getElementById('size-modal-overlay').classList.remove('open');
}
function closeSizeModalDirect() {
  document.getElementById('size-modal-overlay').classList.remove('open');
}

// ===== UTILS =====
const fmt = v => 'R$ '+parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
const fmtNum = v => parseFloat(v||0).toFixed(2).replace('.',',');
const fmtDate = d => d?new Date(d+'T00:00:00').toLocaleDateString('pt-BR'):'—';
const fmtDatetime = d => d?new Date(d).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';

function badgeStatus(status) {
  const map = {
    concluida:'green',cancelada:'red',devolvida:'yellow',
    aberta:'blue',paga:'green',atrasada:'red',quitado:'green',
    pendente:'yellow',pago:'green',recebida:'green',
    aberto:'blue',fechado:'gray',efetivada:'green',retornada:'yellow',
    validada:'green'
  };
  const labels = {
    concluida:'Concluída',cancelada:'Cancelada',devolvida:'Devolvida',
    aberta:'Aberta',paga:'Paga',atrasada:'Atrasada',quitado:'Quitado',
    pendente:'Pendente',pago:'Pago',recebida:'Recebida',
    aberto:'Aberto',fechado:'Fechado',efetivada:'Efetivada',retornada:'Retornada',
    validada:'Validada'
  };
  return `<span class="badge badge-${map[status]||'gray'}">${labels[status]||status}</span>`;
}

// ===== INIT =====
// checkSession() é chamado no index.html após todos os scripts carregarem

// Stubs adicionados via patch — injetados no final
// As funções principais já estão no bundle principal.
// Aqui ficam as funções das novas páginas de estoque.
