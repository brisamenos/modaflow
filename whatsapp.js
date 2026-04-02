// ===== WHATSAPP INTEGRAÇÃO (EVOLUTION API V2) =====

const WA_URL = 'https://projeto-evolution-api.xtknqq.easypanel.host';
const WA_API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
const WA_INSTANCE = 'StoreOS';

let waConnected = false;
let waCheckInterval = null;
let waPollingInterval = null;
let currentChatJid = null;
let waChatIsOpen = false;

// ── Helpers ──────────────────────────────────────────────────────────────────
async function fetchWa(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', 'apikey': WA_API_KEY };
  try {
    const res = await fetch(`${WA_URL}${endpoint}`, { ...options, headers });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('WA API Error:', err);
    return { ok: false, error: err };
  }
}

function formatPhone(phone) {
  let p = phone.replace(/\D/g, '');
  if (!p.startsWith('55') && p.length <= 11) p = '55' + p;
  return p;
}

// ── Status dot no FAB ────────────────────────────────────────────────────────
function waSetDot(state) {
  const dot = document.getElementById('wa-fab-dot');
  if (!dot) return;
  dot.className = '';
  if (state === 'green')  dot.classList.add('dot-green');
  if (state === 'yellow') dot.classList.add('dot-yellow');
  if (state === 'red')    dot.classList.add('dot-red');
}

// ── Telas ────────────────────────────────────────────────────────────────────
function _waShowScreen(screen) {
  document.getElementById('wa-pair-screen').style.display    = screen === 'pair'    ? 'flex' : 'none';
  document.getElementById('wa-main-screen').style.display    = screen === 'main'    ? 'flex' : 'none';
  document.getElementById('wa-message-screen').style.display = screen === 'message' ? 'flex' : 'none';
}

function _waResetConnectBtn() {
  const btn    = document.getElementById('wa-connect-btn');
  const status = document.getElementById('wa-connect-status');
  const qrBox  = document.getElementById('wa-qr-box');
  const qrHint = document.getElementById('wa-qr-hint');
  if (btn) {
    btn.disabled = false;
    btn.onclick  = waManualConnect;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1.3" fill="currentColor" stroke="none"/></svg> Criar Instância e Conectar`;
  }
  if (status) status.textContent = 'Crie a instância e escaneie o QR Code';
  if (qrBox)  qrBox.style.display  = 'none';
  if (qrHint) qrHint.style.display = 'none';
}

// ── Verificar estado ao abrir widget ─────────────────────────────────────────
async function waCheckStatus() {
  waSetDot('yellow');
  const res = await fetchWa(`/instance/connectionState/${WA_INSTANCE}`);
  if (res.ok && res.data?.instance?.state === 'open') {
    waConnected = true;
    waSetDot('green');
    _waShowScreen('main');
    waLoadChats();
  } else {
    waConnected = false;
    waSetDot('red');
    _waShowScreen('pair');
    _waResetConnectBtn();
  }
}

// ── BOTÃO: Criar Instância e Conectar ────────────────────────────────────────
async function waManualConnect() {
  const btn    = document.getElementById('wa-connect-btn');
  const status = document.getElementById('wa-connect-status');
  const qrBox  = document.getElementById('wa-qr-box');
  const qrImg  = document.getElementById('wa-qr-img');
  const qrHint = document.getElementById('wa-qr-hint');

  btn.disabled = true;
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" style="width:15px;height:15px;animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Conectando...`;
  waSetDot('yellow');

  // Passo 1 — já conectado?
  status.textContent = 'Verificando instância existente...';
  const stateRes = await fetchWa(`/instance/connectionState/${WA_INSTANCE}`);
  if (stateRes.ok && stateRes.data?.instance?.state === 'open') {
    waConnected = true;
    waSetDot('green');
    toast('WhatsApp já conectado!', 'success');
    _waShowScreen('main');
    waLoadChats();
    return;
  }

  // Passo 2 — criar instância
  status.textContent = 'Criando instância...';
  const createRes = await fetchWa('/instance/create', {
    method: 'POST',
    body: JSON.stringify({ instanceName: WA_INSTANCE, qrcode: true, integration: 'WHATSAPP-BAILEYS' })
  });

  let qrBase64 = null;

  if (createRes.ok) {
    qrBase64 = createRes.data?.qrcode?.base64 || createRes.data?.base64 || null;
    status.textContent = 'Instância criada! Aguardando QR...';
  } else {
    // Já existe — só pedir QR
    status.textContent = 'Obtendo QR Code...';
    const connectRes = await fetchWa(`/instance/connect/${WA_INSTANCE}`);
    qrBase64 = connectRes.data?.base64 || connectRes.data?.qrcode?.base64 || null;
  }

  // Passo 3 — exibir QR
  if (qrBase64) {
    qrImg.src = qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`;
    qrBox.style.display  = 'flex';
    qrHint.style.display = 'block';
    status.textContent = 'Escaneie com o WhatsApp';
    btn.disabled = false;
    btn.innerHTML = '↻ Atualizar QR Code';
    btn.onclick = waRefreshQR;
  } else {
    status.textContent = 'QR não retornado. Tente novamente.';
    waSetDot('red');
    _waResetConnectBtn();
    return;
  }

  // Passo 4 — polling até conectar
  if (waCheckInterval) clearInterval(waCheckInterval);
  waCheckInterval = setInterval(async () => {
    const s = await fetchWa(`/instance/connectionState/${WA_INSTANCE}`);
    if (s.ok && s.data?.instance?.state === 'open') {
      clearInterval(waCheckInterval);
      waConnected = true;
      waSetDot('green');
      toast('WhatsApp conectado! 🎉', 'success');
      _waShowScreen('main');
      waLoadChats();
    }
  }, 4000);
}

// ── Atualizar QR Code ────────────────────────────────────────────────────────
async function waRefreshQR() {
  const btn    = document.getElementById('wa-connect-btn');
  const qrImg  = document.getElementById('wa-qr-img');
  const status = document.getElementById('wa-connect-status');
  btn.disabled = true;
  status.textContent = 'Atualizando QR Code...';
  const res = await fetchWa(`/instance/connect/${WA_INSTANCE}`);
  const qrBase64 = res.data?.base64 || res.data?.qrcode?.base64 || null;
  if (qrBase64) {
    qrImg.src = qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`;
    status.textContent = 'Escaneie com o WhatsApp';
  } else {
    status.textContent = 'Erro ao atualizar. Tente recriar.';
  }
  btn.disabled = false;
}

// ── Logout ───────────────────────────────────────────────────────────────────
async function waLogout() {
  if (!confirm('Desconectar o WhatsApp?')) return;
  if (waCheckInterval) clearInterval(waCheckInterval);
  await fetchWa(`/instance/logout/${WA_INSTANCE}`, { method: 'DELETE' });
  waConnected = false;
  waSetDot('red');
  currentChatJid = null;
  _waShowScreen('pair');
  _waResetConnectBtn();
  toast('WhatsApp desconectado');
}

// ── Chats ────────────────────────────────────────────────────────────────────
async function waLoadChats() {
  const listEl = document.getElementById('wa-chat-list');
  listEl.innerHTML = '<div class="wa-empty">Carregando conversas...</div>';
  const res = await fetchWa(`/chat/findChats/${WA_INSTANCE}`);
  if (res.ok && Array.isArray(res.data)) {
    const chats = res.data.filter(c => !c.id.includes('@g.us') && !c.id.includes('@broadcast'));
    if (!chats.length) { listEl.innerHTML = '<div class="wa-empty">Nenhuma conversa ainda</div>'; return; }
    listEl.innerHTML = '';
    chats.forEach(chat => {
      const name = chat.name || chat.pushName || chat.id.split('@')[0];
      const div  = document.createElement('div');
      div.className = 'wa-chat-item';
      div.onclick   = () => waOpenMessageView(chat.id, name);
      div.innerHTML = `
        <div class="wa-avatar">${name.charAt(0).toUpperCase()}</div>
        <div class="wa-chat-info">
          <h4>${name}</h4>
          <span class="wa-preview">${chat.id.split('@')[0]}</span>
        </div>`;
      listEl.appendChild(div);
    });
  } else {
    listEl.innerHTML = '<div class="wa-empty">Erro ao carregar conversas</div>';
  }
}

async function waOpenMessageView(jid, name) {
  currentChatJid = jid;
  _waShowScreen('message');
  document.getElementById('wa-active-name').textContent = name || jid.split('@')[0];
  await waLoadMessages();
  if (waPollingInterval) clearInterval(waPollingInterval);
  waPollingInterval = setInterval(() => {
    if (waChatIsOpen && currentChatJid) waLoadMessages(true);
  }, 4000);
}

function waBackToList() {
  currentChatJid = null;
  if (waPollingInterval) clearInterval(waPollingInterval);
  _waShowScreen('main');
  waLoadChats();
}

async function waLoadMessages(silent = false) {
  if (!currentChatJid) return;
  const msgContainer = document.getElementById('wa-messages-container');
  if (!silent) msgContainer.innerHTML = '<div style="text-align:center;padding:20px;font-size:12px;color:#888">Carregando...</div>';
  const res = await fetchWa(`/chat/findMessages/${WA_INSTANCE}`, {
    method: 'POST',
    body: JSON.stringify({ where: { remoteJid: currentChatJid } })
  });
  if (res.ok) {
    const data = res.data.messages || res.data;
    let msgs = (Array.isArray(data) ? data : []).reverse();
    let html = '';
    msgs.forEach(m => {
      const text = m.message?.conversation || m.message?.extendedTextMessage?.text || (typeof m.message === 'string' ? m.message : '');
      if (!text) return;
      html += `<div class="wa-bubble ${m.key.fromMe ? 'wa-me' : 'wa-you'}">${text}</div>`;
    });
    if (!html) html = '<div class="wa-empty" style="font-size:11px">Nenhuma mensagem de texto ainda.</div>';
    msgContainer.innerHTML = html;
    if (!silent) msgContainer.scrollTop = msgContainer.scrollHeight;
  }
}

async function waSendMessageAction() {
  const input = document.getElementById('wa-input-text');
  const text  = input.value.trim();
  if (!text || !currentChatJid) return;
  input.value = '';
  const msgContainer = document.getElementById('wa-messages-container');
  msgContainer.innerHTML += `<div class="wa-bubble wa-me">${text}</div>`;
  msgContainer.scrollTop = msgContainer.scrollHeight;
  const res = await fetchWa(`/message/sendText/${WA_INSTANCE}`, {
    method: 'POST',
    body: JSON.stringify({ number: currentChatJid.replace('@s.whatsapp.net', ''), text })
  });
  if (!res.ok) toast('Erro ao enviar mensagem', 'error');
}

// ── FAB toggle ───────────────────────────────────────────────────────────────
function toggleWaFloating() {
  const cw = document.getElementById('wa-chat-window');
  if (cw.classList.contains('open')) {
    cw.classList.remove('open');
    waChatIsOpen = false;
    if (waPollingInterval) clearInterval(waPollingInterval);
  } else {
    cw.classList.add('open');
    waChatIsOpen = true;
    waCheckStatus();
  }
}

function waStartNewChat() {
  const phone = prompt('Digite o número com DDD (ex: 11999999999):');
  if (!phone) return;
  const formatted = formatPhone(phone);
  if (formatted.length < 12) return toast('Número inválido', 'error');
  waOpenMessageView(`${formatted}@s.whatsapp.net`, formatted);
}

// Enter para enviar
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const inp = document.getElementById('wa-input-text');
    if (inp) inp.addEventListener('keypress', e => { if (e.key === 'Enter') waSendMessageAction(); });
  }, 1000);
});

// keyframe spin para o loading do botão
const _waStyle = document.createElement('style');
_waStyle.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(_waStyle);
