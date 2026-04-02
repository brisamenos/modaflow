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
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
}

function checkSession() {
  if(localStorage.getItem('loja_session')) {
    currentUser = {email: LOCAL_USER};
    initApp();
  }
}

function initApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  const name = currentUser.email?.split('@')[0]||'Usuário';
  document.getElementById('sidebar-user-name').textContent = name;
  document.getElementById('topnav-initial').textContent = name.charAt(0).toUpperCase();
  lucide.createIcons();
  navigate('dashboard');
  // Fechar dropdowns ao clicar fora
  document.addEventListener('click', e => {
    if(!e.target.closest('.nav-group')) closeNGs();
  });
}

