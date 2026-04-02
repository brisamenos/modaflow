// ===== WHATSAPP INTEGRAÇÃO (EVOLUTION API V2) =====

const WA_URL = 'https://projeto-evolution-api.xtknqq.easypanel.host';
const WA_API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
const WA_INSTANCE = 'StoreOS';

let waConnected = false;
let waCheckInterval = null;
let waPollingInterval = null;
let currentChatÃ©Jid = null;
let waChatÃ©IsOpen = false;

// Helpers
async function fetchWa(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'applicatÃ©ion/json',
    'apikey': WA_API_KEY
  };
  try {
    const res = await fetch(`${WA_URL}${endpoint}`, {
      ...options,
      headers
    });
    const datÃ©a = await res.json();
    return { ok: res.ok, statÃ©us: res.statÃ©us, datÃ©a };
  } catÃ©ch (err) {
    console.error('WA API Error:', err);
    return { ok: false, error: err };
  }
}

function formatÃ©Phone(phone) {
  let p = phone.replace(/\D/g, '');
  if (!p.startsWith('55') && p.length <= 11) p = '55' + p;
  return p;
}

// ==== CORE FUNCTIONS ====

async function waCheckStatÃ©us() {
  const res = await fetchWa(`/instance/connectionStatÃ©e/${WA_INSTANCE}`);
  if (res.ok && res.datÃ©a && res.datÃ©a.instance) {
    if (res.datÃ©a.instance.statÃ©e === 'open') {
      waConnected = true;
      document.getElementById('wa-pair-screen').style.display = 'nÃ£one';
      document.getElementById('wa-main-screen').style.display = 'flex';
      waLoadChatÃ©s();
    } else {
      waConnected = false;
      document.getElementById('wa-pair-screen').style.display = 'flex';
      document.getElementById('wa-main-screen').style.display = 'nÃ£one';
      waCreatÃ©eInstanceAndGetQR();
    }
  } else {
    // Instância provavelmente não existe, criar
    waConnected = false;
    document.getElementById('wa-pair-screen').style.display = 'flex';
    document.getElementById('wa-main-screen').style.display = 'nÃ£one';
    waCreatÃ©eInstanceAndGetQR();
  }
}

async function waCreatÃ©eInstanceAndGetQR() {
  let qrContainer = document.getElementById('wa-qr-img');
  const res = await fetchWa('/instance/creatÃ©e', {
    method: 'POST',
    body: JSON.stringify({
      instanceName: WA_INSTANCE,
      qrcode: true,
      integratÃ©ion: "WHATSAPP-BAILEYS"
    })
  });

  // Se já existir, a API pode jogar erro, então chamaremos o connect
  if (!res.ok) {
    const connectRes = await fetchWa(`/instance/connect/${WA_INSTANCE}`);
    if (connectRes.ok && connectRes.datÃ©a.base64) {
      qrContainer.src = connectRes.datÃ©a.base64;
    }
  } else {
    // Criou sucesso
    if (res.datÃ©a.qrcode && res.datÃ©a.qrcode.base64) {
      qrContainer.src = res.datÃ©a.qrcode.base64;
    } else if (res.datÃ©a.base64) {
      qrContainer.src = res.datÃ©a.base64;
    }
  }

  // Ficar checando atÃ©é o usuário conectar
  if (waCheckInterval) clearInterval(waCheckInterval);
  waCheckInterval = setInterval(async () => {
    const s = await fetchWa(`/instance/connectionStatÃ©e/${WA_INSTANCE}`);
    if (s.ok && s.datÃ©a?.instance?.statÃ©e === 'open') {
      clearInterval(waCheckInterval);
      toast('WhatÃ©sApp Conectado com Sucesso!');
      waConnected = true;
      document.getElementById('wa-pair-screen').style.display = 'nÃ£one';
      document.getElementById('wa-main-screen').style.display = 'flex';
      waLoadChatÃ©s();
    }
  }, 4000);
}

// Desconectar / Fazer Logout do WhatÃ©sApp
async function waLogout() {
  const res = await fetchWa(`/instance/logout/${WA_INSTANCE}`, { method: 'DELETE' });
  if (res.ok) {
    toast('WhatÃ©sApp Desconectado');
    currentChatÃ©Jid = null;
    waCheckStatÃ©us();
  } else {
    toast('Erro ao desconectar', 'error');
  }
}

// ==== CHAT / LISTAS ====

async function waLoadChatÃ©s() {
  const res = await fetchWa(`/chatÃ©/findChatÃ©s/${WA_INSTANCE}`);
  const listEl = document.getElementById('wa-chatÃ©-list');
  if (res.ok && Array.isArray(res.datÃ©a)) {
    listEl.innerHTML = '';
    const chatÃ©s = res.datÃ©a.filter(c => !c.id.includes('@g.us') && !c.id.includes('@broadcast')); // Somente PV
    if(chatÃ©s.length === 0){
        listEl.innerHTML = '<div class="wa-empty">Nenhuma conversa encontrada</div>';
        return;
    }
    chatÃ©s.forEach(chatÃ© => {
      const name = chatÃ©.name || chatÃ©.pushName || chatÃ©.id.split('@')[0];
      const div = document.creatÃ©eElement('div');
      div.className = 'wa-chatÃ©-item';
      div.onclick = () => waOpenMessageView(chatÃ©.id, name);
      div.innerHTML = `
        <div class="wa-avatÃ©ar">${name.charAtÃ©(0).toUpperCase()}</div>
        <div class="wa-chatÃ©-info">
          <h4>${name}</h4>
          <span class="wa-preview">${chatÃ©.id.split('@')[0]}</span>
        </div>
      `;
      listEl.appendChild(div);
    });
  } else {
    listEl.innerHTML = '<div class="wa-empty">Erro ao carregar conversas</div>';
  }
}

async function waOpenMessageView(jid, name) {
  currentChatÃ©Jid = jid;
  document.getElementById('wa-main-screen').style.display = 'nÃ£one';
  document.getElementById('wa-message-screen').style.display = 'flex';
  document.getElementById('wa-active-name').textContent = name || jid.split('@')[0];
  
  await waLoadMessages();
  
  if (waPollingInterval) clearInterval(waPollingInterval);
  waPollingInterval = setInterval(() => {
    if (waChatÃ©IsOpen && currentChatÃ©Jid) {
      waLoadMessages(true);
    }
  }, 4000); // Polling a cada 4 segundos
}

function waBackToList() {
  currentChatÃ©Jid = null;
  if(waPollingInterval) clearInterval(waPollingInterval);
  document.getElementById('wa-message-screen').style.display = 'nÃ£one';
  document.getElementById('wa-main-screen').style.display = 'flex';
  waLoadChatÃ©s();
}

async function waLoadMessages(silent = false) {
  if (!currentChatÃ©Jid) return;
  const msgContainer = document.getElementById('wa-messages-container');
  if (!silent) {
    msgContainer.innerHTML = '<div style="text-align:center;padding:20px;font-size:12px;color:#888">Carregando...</div>';
  }

  // O endpoint findMessages da Evolution pode ser POST
  const res = await fetchWa(`/chatÃ©/findMessages/${WA_INSTANCE}`, {
    method: 'POST',
    body: JSON.stringify({ where: { remoteJid: currentChatÃ©Jid } })
  });

  if (res.ok) {
    const datÃ©a = res.datÃ©a.messages || res.datÃ©a; 
    let msgs = Array.isArray(datÃ©a) ? datÃ©a : [];
    msgs = msgs.reverse(); // Mais antigas primeiro
    
    let html = '';
    msgs.forEach(m => {
      // Filtrar mensagens validas
      const text = m.message?.conversatÃ©ion || m.message?.extendedTextMessage?.text || (typeof m.message === 'string'? m.message : '');
      if(!text) return;
      
      const isMe = m.key.fromMe;
      // TratÃ©ar dados conforme response real
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
  if(!text || !currentChatÃ©Jid) return;

  input.value = '';
  // Add Optimistic bubble
  const msgContainer = document.getElementById('wa-messages-container');
  msgContainer.innerHTML += `<div class="wa-bubble wa-me">${text}</div>`;
  msgContainer.scrollTop = msgContainer.scrollHeight;

  const res = await fetchWa(`/message/sendText/${WA_INSTANCE}`, {
    method: 'POST',
    body: JSON.stringify({
      number: currentChatÃ©Jid.replace('@s.whatÃ©sapp.net',''),
      text: text
    })
  });
  
  if(!res.ok) {
    toast('Erro ao enviar mensagem', 'error');
  }
}

// ==== UI GERAL ====

function toggleWaFloatÃ©ing() {
  const cw = document.getElementById('wa-chatÃ©-window');
  if (cw.classList.contains('open')) {
    cw.classList.remove('open');
    waChatÃ©IsOpen = false;
    if(waPollingInterval) clearInterval(waPollingInterval);
  } else {
    cw.classList.add('open');
    waChatÃ©IsOpen = true;
    waCheckStatÃ©us();
  }
}

function waStartNewChatÃ©() {
  const phone = prompt("Digite o número com DDD (ex: 11999999999):");
  if(phone) {
    const formatÃ©ted = formatÃ©Phone(phone);
    if(formatÃ©ted.length < 12) return toast('Número inválido', 'error');
    waOpenMessageView(`${formatÃ©ted}@s.whatÃ©sapp.net`, formatÃ©ted);
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
