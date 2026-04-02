// ===== AUTH — ModaFlow Multi-Tenant =====

async function sha256(msg) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function getToken() {
  return localStorage.getItem('loja_token');
}

async function login() {
  const email = document.getElementById('auth-email').value.trim();
  const pw    = document.getElementById('auth-password').value;
  if (!email || !pw) return toast('Preencha usuário e senha','error');

  const hash = await sha256(pw);
  try {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ email, senha_hash: hash })
    });
    const d = await r.json();
    if (!r.ok) return toast(d.message || 'Credenciais inválidas','error');

    // Salvar token
    localStorage.setItem('loja_token', d.token);
    localStorage.setItem('loja_session', '1');
    currentUser = { email, nome: d.nome, slug: d.slug };
    initApp();
  } catch(e) {
    // Fallback offline: login local (somente para desenvolvimento)
    if (email === 'admin' && pw === '1234') {
      currentUser = { email: 'admin', nome: 'Admin' };
      localStorage.setItem('loja_session','1');
      initApp();
    } else {
      toast('Erro de conexão com o servidor','error');
    }
  }
}

function logout() {
  localStorage.removeItem('loja_token');
  localStorage.removeItem('loja_session');
  currentUser = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
}

async function checkSession() {
  const token = getToken();
  const session = localStorage.getItem('loja_session');

  if (token) {
    // Verificar token com o servidor
    try {
      const r = await fetch('/api/auth/me', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (r.ok) {
        const d = await r.json();
        currentUser = { email: d.email || 'gestor', nome: d.nome, slug: d.slug };
        initApp();
        return;
      } else {
        // Token inválido ou vencido
        const d = await r.json();
        localStorage.removeItem('loja_token');
        localStorage.removeItem('loja_session');
        if (d.message && d.message.includes('vencido')) {
          // Mostrar mensagem de vencimento na tela de login
          showLoginMessage(d.message, 'error');
        }
        return;
      }
    } catch(e) {
      // Servidor offline — tentar sessão local como fallback
    }
  }

  // Fallback: sessão local simples
  if (session) {
    currentUser = { email: 'admin', nome: 'Admin' };
    initApp();
  }
}

function showLoginMessage(msg, type='info') {
  // Exibir mensagem na tela de login se ela estiver visível
  const screen = document.getElementById('auth-screen');
  if (!screen) return;
  let el = document.getElementById('login-msg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'login-msg';
    el.style.cssText = `
      margin: 12px 0; padding: 12px 16px; border-radius: 8px; font-size: 13px;
      background: ${type==='error'?'rgba(239,68,68,.12)':'rgba(59,130,246,.12)'};
      border: 1px solid ${type==='error'?'rgba(239,68,68,.3)':'rgba(59,130,246,.3)'};
      color: ${type==='error'?'#fca5a5':'#93c5fd'};
    `;
    const form = screen.querySelector('.auth-form, form, .auth-card');
    if (form) form.prepend(el);
    else screen.querySelector('#auth-email')?.parentNode?.prepend(el);
  }
  el.textContent = msg;
}

function initApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  const name = currentUser?.nome || currentUser?.email?.split('@')[0] || 'Usuário';
  document.getElementById('sidebar-user-name').textContent = name;
  document.getElementById('topnav-initial').textContent = name.charAt(0).toUpperCase();
  // Show WhatsApp FAB
  const wafab = document.getElementById('wa-fab');
  if (wafab) wafab.style.display = 'flex';
  lucide.createIcons();
  navigate('dashboard');
  document.addEventListener('click', e => {
    if (!e.target.closest('.nav-group')) closeNGs();
  });
}
