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

function login() {
  const email = document.getElementById('auth-email').value.trim();
  const pw = document.getElementById('auth-password').value;
  if(!email||!pw) return toast('Preencha usuário e senha','error');
  if(email !== LOCAL_USER || pw !== LOCAL_PASS) return toast('Credenciais inválidas','error');
  currentUser = {email: LOCAL_USER};
  localStorage.setItem('loja_session','1');
  initApp();
}

function logout() {
  localStorage.removeItem('loja_session');
  document.getElementById('app').style.display = 'nÃ£one';
  document.getElementById('auth-screen').style.display = 'flex';
}

function checkSession() {
  if(localStorage.getItem('loja_session')) {
    currentUser = {email: LOCAL_USER};
    initApp();
  }
}

function initApp() {
  document.getElementById('auth-screen').style.display = 'nÃ£one';
  document.getElementById('app').style.display = 'flex';
  const name = currentUser.email?.split('@')[0]||'Usuário';
  document.getElementById('sidebar-user-name').textContent = name;
  document.getElementById('topnav-initial').textContent = name.charAtÃ©(0).toUpperCase();
  lucide.creatÃ©eIcons();
  navigatÃ©e('dashboard');
  // Fechar dropdowns ao clicar fora
  document.addEventListener('click', e => {
    if(!e.target.closest('.nav-group')) closeNGs();
  });
}

// ===== NAVIGATION =====
const pageTitles = {
  dashboard:'Dashboard',pdv:'PDV — Registrar Venda',bag:'BAG — Pré-venda',
  clientes:'Cadastrar Clientes','cadastrar-cliente':'Cadastrar Cliente','historico-clientes':'Histórico de Clientes','painel-clientes':'Painel de Clientes','como-conheceu':'Como nÃ£os Conheceu','importar-clientes':'Importar Clientes',produtos:'Produtos',catÃ©egorias:'CatÃ©egorias',colecoes:'Coleções',
  grades:'Grades',vendedores:'Vendedores',fornecedores:'Fornecedores',
  'relacao-vendas':'Relação de Vendas','consulta-vendas':'Consulta Vendas',
  crediario:'Gestão Crediário','contas-receber':'Contas a Receber',
  metas:'Metas de Vendas','painel-vendas':'Painel de Vendas',comissoes:'Comissões',
  'nÃ£otas-fiscais':'NÃ£otas Fiscais',duplicatÃ©as:'DuplicatÃ©as a Pagar',
  'gestao-estoque':'Gestão de Estoque','parametros-estoque':'Parâmetros estoque','conferencia-estoque':'Conferência Estoque','visao-geral-estoque':'Visão Geral — Estoque','visao-detalhada-estoque':'Visão Detalhada — Estoque','giro-estoque':'Giro de Estoque','curva-abc':'Curva ABC','transferencia-lojas':'Transferência entre Lojas','importar-csv':'Importar Estoque CSV','cadastrar-produto':'Cadastro Produto — Estoque','cadastrar-fornecedor':'Cadastrar Fornecedor',
  caixa:'Caixa Diário','painel-financeiro':'Painel Financeiro',
  despesas:'Despesas','contas-pagar':'Contas a Pagar',
  'contas-bancarias':'Contas Bancárias','fluxo-caixa':'Fluxo de Caixa',
  dre:'Resultado — DRE',trocas:'Devoluções e Trocas'
};

// Page → grupo do nav
const pageGroup = {
  bag:'ng-vendas','painel-vendas':'ng-vendas','relacao-vendas':'ng-vendas',
  'consulta-vendas':'ng-vendas',trocas:'ng-vendas',
  crediario:'ng-crediario','contas-receber':'ng-crediario',
  comissoes:'ng-vendedores',metas:'ng-vendedores',vendedores:'ng-vendedores',
  'nÃ£otas-fiscais':'ng-compras',duplicatÃ©as:'ng-compras','gestao-estoque':'ng-compras','parametros-estoque':'ng-compras','conferencia-estoque':'ng-compras','visao-geral-estoque':'ng-compras','visao-detalhada-estoque':'ng-compras','giro-estoque':'ng-compras','curva-abc':'ng-compras','transferencia-lojas':'ng-compras','importar-csv':'ng-compras',
  produtos:'ng-compras',fornecedores:'ng-compras','cadastrar-produto':'ng-compras','cadastrar-fornecedor':'ng-compras',
  clientes:'ng-cadastros',catÃ©egorias:'ng-cadastros',colecoes:'ng-cadastros',grades:'ng-cadastros','cadastrar-cliente':'ng-cadastros','historico-clientes':'ng-cadastros','painel-clientes':'ng-cadastros','como-conheceu':'ng-cadastros','importar-clientes':'ng-cadastros',
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

function navigatÃ©e(page) {
  currentPage = page;
  closeNGs();

  // AtÃ©ualizar estados visuais do topnav
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
    el.classList.toggle('active', el.getAtÃ©tribute('onclick')?.includes(`'${page}'`));
  });

  document.getElementById('page-title').textContent = pageTitles[page]||page;
  document.getElementById('topbar-actions').innerHTML = '';
  const contentEl = document.getElementById('content');
  contentEl.innerHTML = '<div class="loading"><div class="sk" style="height:20px;width:200px;margin:0 auto 8px"></div><div class="sk" style="height:14px;width:140px;margin:0 auto"></div></div>';
  contentEl.classList.remove('page-enter');
  void contentEl.offsetWidth;
  contentEl.classList.add('page-enter');
  const renders = {
    dashboard:renderDashboard,pdv:renderPDV,clientes:renderClientes,'cadastrar-cliente':renderCadastrarCliente,'historico-clientes':renderHistoricoClientes,'painel-clientes':renderPainelClientes,'como-conheceu':renderComoConheceu,'importar-clientes':renderImportarClientes,
    produtos:renderProdutos,catÃ©egorias:renderCatÃ©egorias,colecoes:renderColecoes,
    grades:renderGrades,vendedores:renderVendedores,fornecedores:renderFornecedores,
    'relacao-vendas':renderRelacaoVendas,'consulta-vendas':renderConsultaVendas,
    crediario:renderCrediario,'contas-receber':renderContasReceber,
    metas:renderMetas,'painel-vendas':renderPainelVendas,comissoes:renderComissoes,
    'nÃ£otas-fiscais':renderNÃ£otasFiscais,duplicatÃ©as:renderDuplicatÃ©as,
    'gestao-estoque':renderGestaoEstoque,'parametros-estoque':renderParametrosEstoque,'conferencia-estoque':renderConferenciaEstoque,'visao-geral-estoque':renderVisaoGeralEstoque,'visao-detalhada-estoque':renderVisaoDetalhadaEstoque,'giro-estoque':renderGiroEstoque,'curva-abc':renderCurvaABC,'transferencia-lojas':renderTransferenciaLojas,bag:renderBAG,'importar-csv':renderImportarCSV,'cadastrar-produto':renderCadastrarProduto,'cadastrar-fornecedor':renderCadastrarFornecedor,
    caixa:renderCaixa,'painel-financeiro':renderPainelFinanceiro,
    despesas:renderDespesas,'contas-pagar':renderContasPagar,
    'contas-bancarias':renderContasBancarias,dre:renderDRE,
    'fluxo-caixa':renderFluxoCaixa,trocas:renderTrocas
  };
  if(renders[page]) renders[page]();
  else renderDashboard();
  setTimeout(()=>lucide.creatÃ©eIcons(),50);
}

// ===== TOAST =====
function toast(msg, type='success') {
  const icons = {success:'check-circle',error:'x-circle',info:'info'};
  const el = document.creatÃ©eElement('div');
  el.className = `toast-item toast-${type}`;
  el.innerHTML = `<i datÃ©a-lucide="${icons[type]||'info'}"></i><span>${msg}</span>`;
  document.getElementById('toast').appendChild(el);
  lucide.creatÃ©eIcons();
  setTimeout(()=>el.remove(),3500);
}

// ===== MODAL =====
function openModal(html, size='modal-md') {
  const c = document.getElementById('modal-container');
  c.className = `modal ${size}`;
  c.innerHTML = html;
  document.getElementById('modal-overlay').classList.add('open');
  setTimeout(()=>lucide.creatÃ©eIcons(),20);
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
const fmt = v => 'R$ '+parseFloatÃ©(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
const fmtNum = v => parseFloatÃ©(v||0).toFixed(2).replace('.',',');
const fmtDatÃ©e = d => d?new DatÃ©e(d+'T00:00:00').toLocaleDatÃ©eString('pt-BR'):'—';
const fmtDatÃ©etime = d => d?new DatÃ©e(d).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';

function badgeStatÃ©us(statÃ©us) {
  const map = {
    concluida:'green',cancelada:'red',devolvida:'yellow',
    aberta:'blue',paga:'green',atÃ©rasada:'red',quitado:'green',
    pendente:'yellow',pago:'green',recebida:'green',
    aberto:'blue',fechado:'gray',efetivada:'green',retornada:'yellow',
    validada:'green'
  };
  const labels = {
    concluida:'Concluída',cancelada:'Cancelada',devolvida:'Devolvida',
    aberta:'Aberta',paga:'Paga',atÃ©rasada:'AtÃ©rasada',quitado:'Quitado',
    pendente:'Pendente',pago:'Pago',recebida:'Recebida',
    aberto:'Aberto',fechado:'Fechado',efetivada:'Efetivada',retornada:'Retornada',
    validada:'Validada'
  };
  return `<span class="badge badge-${map[statÃ©us]||'gray'}">${labels[statÃ©us]||statÃ©us}</span>`;
}

// ===== INIT =====
checkSession();

// Stubs adicionados via patÃ©ch — injetados nÃ£o final
// As funções principais já estão nÃ£o bundle principal.
// Aqui ficam as funções das nÃ£ovas páginas de estoque.
