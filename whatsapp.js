// ===== WHATSAPP INTEGRAÇÃO (EVOLUTION API V2) =====

const WA_URL = 'https://projeto-evolution-api.xtknqq.easypanel.host';
const WA_API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
const WA_INSTANCE = 'StoreOS';

let waConnected = false;
let waCheckInterval = null;
let waPollingInterval = null;
let currentChatJid = null;
let waChatIsOpen = false;

// Helpers
async function fetchWa(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': WA_API_KEY
  };
  try {
    const res = await fetch(`${WA_URL}${endpoint}`, {
      ...options,
      headers
    });
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

// ==== CORE FUNCTIONS ====

async function waCheckStatus() {
  const res = await fetchWa(`/instance/connectionState/${WA_INSTANCE}`);
  if (res.ok && res.data && res.data.instance) {
    if (res.data.instance.state === 'open') {
      waConnected = true;
      document.getElementById('wa-pair-screen').style.display = 'none';
      document.getElementById('wa-main-screen').style.display = 'flex';
      waLoadChats();
    } else {
      waConnected = false;
      document.getElementById('wa-pair-screen').style.display = 'flex';
      document.getElementById('wa-main-screen').style.display = 'none';
      waCreateInstanceAndGetQR();
    }
  } else {
    // Instância provavelmente não existe, criar
    waConnected = false;
    document.getElementById('wa-pair-screen').style.display = 'flex';
    document.getElementById('wa-main-screen').style.display = 'none';
    waCreateInstanceAndGetQR();
  }
}

async function waCreateInstanceAndGetQR() {
  let qrContainer = document.getElementById('wa-qr-img');
  const res = await fetchWa('/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName: WA_INSTANCE,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS"
    })
  });

  // Se já existir, a API pode jogar erro, então chamaremos o connect
  if (!res.ok) {
    const connectRes = await fetchWa(`/instance/connect/${WA_INSTANCE}`);
    if (connectRes.ok && connectRes.data.base64) {
      qrContainer.src = connectRes.data.base64;
    }
  } else {
    // Criou sucesso
    if (res.data.qrcode && res.data.qrcode.base64) {
      qrContainer.src = res.data.qrcode.base64;
    } else if (res.data.base64) {
      qrContainer.src = res.data.base64;
    }
  }

  // Ficar checando até o usuário conectar
  if (waCheckInterval) clearInterval(waCheckInterval);
  waCheckInterval = setInterval(async () => {
    const s = await fetchWa(`/instance/connectionState/${WA_INSTANCE}`);
    if (s.ok && s.data?.instance?.state === 'open') {
      clearInterval(waCheckInterval);
      toast('WhatsApp Conectado com Sucesso!');
      waConnected = true;
      document.getElementById('wa-pair-screen').style.display = 'none';
      document.getElementById('wa-main-screen').style.display = 'flex';
      waLoadChats();
    }
  }, 4000);
}

// Desconectar / Fazer Logout do WhatsApp
async function waLogout() {
  const res = await fetchWa(`/instance/logout/${WA_INSTANCE}`, { method: 'DELETE' });
  if (res.ok) {
    toast('WhatsApp Desconectado');
    currentChatJid = null;
    waCheckStatus();
  } else {
    toast('Erro ao desconectar', 'error');
  }
}

// ==== CHAT / LISTAS ====

async function waLoadChats() {
  const res = await fetchWa(`/chat/findChats/${WA_INSTANCE}`);
  const listEl = document.getElementById('wa-chat-list');
  if (res.ok && Array.isArray(res.data)) {
    listEl.innerHTML = '';
    const chats = res.data.filter(c => !c.id.includes('@g.us') && !c.id.includes('@broadcast')); // Somente PV
    if(chats.length === 0){
        listEl.innerHTML = '<div class="wa-empty">Nenhuma conversa encontrada</div>';
        return;
    }
    chats.forEach(chat => {
      const name = chat.name || chat.pushName || chat.id.split('@')[0];
      const div = document.createElement('div');
      div.className = 'wa-chat-item';
      div.onclick = () => waOpenMessageView(chat.id, name);
      div.innerHTML = `
        <div class="wa-avatar">${name.charAt(0).toUpperCase()}</div>
        <div class="wa-chat-info">
          <h4>${name}</h4>
          <span class="wa-preview">${chat.id.split('@')[0]}</span>
        </div>
      `;
      listEl.appendChild(div);
    });
  } else {
    listEl.innerHTML = '<div class="wa-empty">Erro ao carregar conversas</div>';
  }
}

async function waOpenMessageView(jid, name) {
  currentChatJid = jid;
  document.getElementById('wa-main-screen').style.display = 'none';
  document.getElementById('wa-message-screen').style.display = 'flex';
  document.getElementById('wa-active-name').textContent = name || jid.split('@')[0];
  
  await waLoadMessages();
  
  if (waPollingInterval) clearInterval(waPollingInterval);
  waPollingInterval = setInterval(() => {
    if (waChatIsOpen && currentChatJid) {
      waLoadMessages(true);
    }
  }, 4000); // Polling a cada 4 segundos
}

function waBackToList() {
  currentChatJid = null;
  if(waPollingInterval) clearInterval(waPollingInterval);
  document.getElementById('wa-message-screen').style.display = 'none';
  document.getElementById('wa-main-screen').style.display = 'flex';
  waLoadChats();
}

async function waLoadMessages(silent = false) {
  if (!currentChatJid) return;
  const msgContainer = document.getElementById('wa-messages-container');
  if (!silent) {
    msgContainer.innerHTML = '<div style="text-align:center;padding:20px;font-size:12px;color:#888">Carregando...</div>';
  }

  // O endpoint findMessages da Evolution pode ser POST
  const res = await fetchWa(`/chat/findMessages/${WA_INSTANCE}`, {
    method: 'POST',
    body: JSON.stringify({ where: { remoteJid: currentChatJid } })
  });

  if (res.ok) {
    const data = res.data.messages || res.data; 
    let msgs = Array.isArray(data) ? data : [];
    msgs = msgs.reverse(); // Mais antigas primeiro
    
    let html = '';
    msgs.forEach(m => {
      // Filtrar mensagens validas
      const text = m.message?.conversation || m.message?.extendedTextMessage?.text || (typeof m.message === 'string'? m.message : '');
      if(!text) return;
      
      const isMe = m.key.fromMe;
      // Tratar dados conforme response real
      html += `
        <div class="wa-bubble ${isMe ? 'wa-me' : 'wa-you'}">
          ${text}
        </div>
      `;
    });
    if(!html) html = '<div class="wa-empty" style="font-size:11px">Nenhuma mensagem texto.</div>';
    
    msgContainer.innerHTML = html;
    if(!silent) msgContainer.scrollTop = msgContainer.scrollHeight;
  }
}

async function waSendMessageAction() {
  const input = document.getElementById('wa-input-text');
  const text = input.value.trim();
  if(!text || !currentChatJid) return;

  input.value = '';
  // Add Optimistic bubble
  const msgContainer = document.getElementById('wa-messages-container');
  msgContainer.innerHTML += `<div class="wa-bubble wa-me">${text}</div>`;
  msgContainer.scrollTop = msgContainer.scrollHeight;

  const res = await fetchWa(`/message/sendText/${WA_INSTANCE}`, {
    method: 'POST',
    body: JSON.stringify({
      number: currentChatJid.replace('@s.whatsapp.net',''),
      text: text
    })
  });
  
  if(!res.ok) {
    toast('Erro ao enviar mensagem', 'error');
  }
}

// ==== UI GERAL ====

function toggleWaFloating() {
  const cw = document.getElementById('wa-chat-window');
  if (cw.classList.contains('open')) {
    cw.classList.remove('open');
    waChatIsOpen = false;
    if(waPollingInterval) clearInterval(waPollingInterval);
  } else {
    cw.classList.add('open');
    waChatIsOpen = true;
    waCheckStatus();
  }
}

function waStartNewChat() {
  const phone = prompt("Digite o número com DDD (ex: 11999999999):");
  if(phone) {
    const formatted = formatPhone(phone);
    if(formatted.length < 12) return toast('Número inválido', 'error');
    waOpenMessageView(`${formatted}@s.whatsapp.net`, formatted);
  }
}

// Listeners Keyboard
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const inp = document.getElementById('wa-input-text');
        if(inp) inp.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                waSendMessageAction();
            }
        });
    }, 1000);
});
