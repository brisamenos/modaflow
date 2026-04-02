// ===== WHATSAPP INTEGRAÇÃO (EVOLUTION API V2) =====

const WA_URL     = 'https://projeto-evolution-api.xtknqq.easypanel.host';
const WA_API_KEY = '429683C4C977415CAAFCCE10F7D57E11';

// Nome da instância vem do input (persistido em localStorage)
function waGetInstance() {
  return localStorage.getItem('wa_instance_name') || '';
}
function waSetInstance(name) {
  localStorage.setItem('wa_instance_name', name.trim().replace(/\s/g, ''));
}

let waConnected       = false;
let waCheckInterval   = null;
let waPollingInterval = null;
let waBirthdayInterval = null;
let currentChatJid    = null;
let waChatIsOpen      = false;

// ── Helpers ──────────────────────────────────────────────────────────────────
async function fetchWa(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', 'apikey': WA_API_KEY };
  try {
    const res  = await fetch(`${WA_URL}${endpoint}`, { ...options, headers });
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
    btn.disabled  = false;
    btn.onclick   = waManualConnect;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1.3" fill="currentColor" stroke="none"/></svg> Conectar`;
  }
  if (status) status.textContent = '';
  if (qrBox)  qrBox.style.display  = 'none';
  if (qrHint) qrHint.style.display = 'none';
}

// ── Tabs (Conversas / Automações) ─────────────────────────────────────────────
function waSwitchTab(tab) {
  document.getElementById('wa-tab-chats').classList.toggle('active', tab === 'chats');
  document.getElementById('wa-tab-auto').classList.toggle('active', tab === 'auto');
  document.getElementById('wa-tab-chats-panel').style.display = tab === 'chats' ? 'flex' : 'none';
  document.getElementById('wa-tab-auto-panel').style.display  = tab === 'auto'  ? 'block' : 'none';
  if (tab === 'chats') waLoadChats();
  if (tab === 'auto')  waLoadAutoConfig();
}

// ── Verificar estado ao abrir widget ─────────────────────────────────────────
async function waCheckStatus() {
  const inst = waGetInstance();
  const inp  = document.getElementById('wa-instance-input');
  if (inp && inst) inp.value = inst;

  if (!inst) {
    waSetDot('red');
    _waShowScreen('pair');
    _waResetConnectBtn();
    return;
  }

  waSetDot('yellow');
  const res = await fetchWa(`/instance/connectionState/${inst}`);
  if (res.ok && res.data?.instance?.state === 'open') {
    waConnected = true;
    waSetDot('green');
    document.getElementById('wa-header-instance').textContent = inst;
    _waShowScreen('main');
    waLoadChats();
    waStartBirthdayScheduler();
  } else {
    waConnected = false;
    waSetDot('red');
    _waShowScreen('pair');
    _waResetConnectBtn();
  }
}

// ── BOTÃO: Conectar ───────────────────────────────────────────────────────────
async function waManualConnect() {
  const inp  = document.getElementById('wa-instance-input');
  const name = (inp?.value || '').trim().replace(/\s/g, '');
  if (!name) {
    if (inp) inp.focus();
    document.getElementById('wa-connect-status').textContent = 'Informe um nome para continuar.';
    return;
  }
  waSetInstance(name);

  const btn    = document.getElementById('wa-connect-btn');
  const status = document.getElementById('wa-connect-status');
  const qrBox  = document.getElementById('wa-qr-box');
  const qrImg  = document.getElementById('wa-qr-img');
  const qrHint = document.getElementById('wa-qr-hint');

  btn.disabled  = true;
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" style="width:15px;height:15px;animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Conectando...`;
  waSetDot('yellow');

  status.textContent = 'Verificando...';
  const stateRes = await fetchWa(`/instance/connectionState/${name}`);
  if (stateRes.ok && stateRes.data?.instance?.state === 'open') {
    waConnected = true;
    waSetDot('green');
    toast('WhatsApp já conectado!', 'success');
    document.getElementById('wa-header-instance').textContent = name;
    _waShowScreen('main');
    waLoadChats();
    waStartBirthdayScheduler();
    return;
  }

  status.textContent = 'Criando instância...';
  const createRes = await fetchWa('/instance/create', {
    method: 'POST',
    body: JSON.stringify({ instanceName: name, qrcode: true, integration: 'WHATSAPP-BAILEYS' })
  });

  let qrBase64 = null;
  if (createRes.ok) {
    qrBase64 = createRes.data?.qrcode?.base64 || createRes.data?.base64 || null;
    status.textContent = 'Instância criada! Aguardando QR...';
  } else {
    status.textContent = 'Obtendo QR Code...';
    const connectRes = await fetchWa(`/instance/connect/${name}`);
    qrBase64 = connectRes.data?.base64 || connectRes.data?.qrcode?.base64 || null;
  }

  if (qrBase64) {
    qrImg.src            = qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`;
    qrBox.style.display  = 'flex';
    qrHint.style.display = 'block';
    status.textContent   = 'Escaneie com o WhatsApp';
    btn.disabled  = false;
    btn.innerHTML = '↻ Atualizar QR Code';
    btn.onclick   = waRefreshQR;
  } else {
    status.textContent = 'QR não retornado. Tente novamente.';
    waSetDot('red');
    _waResetConnectBtn();
    return;
  }

  if (waCheckInterval) clearInterval(waCheckInterval);
  waCheckInterval = setInterval(async () => {
    const s = await fetchWa(`/instance/connectionState/${name}`);
    if (s.ok && s.data?.instance?.state === 'open') {
      clearInterval(waCheckInterval);
      waConnected = true;
      waSetDot('green');
      toast('WhatsApp conectado! 🎉', 'success');
      document.getElementById('wa-header-instance').textContent = name;
      _waShowScreen('main');
      waLoadChats();
      waStartBirthdayScheduler();
    }
  }, 4000);
}

// ── Atualizar QR Code ────────────────────────────────────────────────────────
async function waRefreshQR() {
  const name   = waGetInstance();
  const btn    = document.getElementById('wa-connect-btn');
  const qrImg  = document.getElementById('wa-qr-img');
  const status = document.getElementById('wa-connect-status');
  btn.disabled = true;
  status.textContent = 'Atualizando QR Code...';
  const res = await fetchWa(`/instance/connect/${name}`);
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
  const name = waGetInstance();
  if (waCheckInterval)     clearInterval(waCheckInterval);
  if (waBirthdayInterval)  clearInterval(waBirthdayInterval);
  await fetchWa(`/instance/logout/${name}`, { method: 'DELETE' });
  waConnected    = false;
  currentChatJid = null;
  waSetDot('red');
  _waShowScreen('pair');
  _waResetConnectBtn();
  toast('WhatsApp desconectado');
}

// ── Chats ────────────────────────────────────────────────────────────────────
async function waLoadChats() {
  const inst   = waGetInstance();
  const listEl = document.getElementById('wa-chat-list');
  if (!listEl) return;
  listEl.innerHTML = '<div class="wa-empty">Carregando conversas...</div>';
  const res = await fetchWa(`/chat/findChats/${inst}`);
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
  const inst         = waGetInstance();
  const msgContainer = document.getElementById('wa-messages-container');
  if (!silent) msgContainer.innerHTML = '<div style="text-align:center;padding:20px;font-size:12px;color:#888">Carregando...</div>';
  const res = await fetchWa(`/chat/findMessages/${inst}`, {
    method: 'POST',
    body: JSON.stringify({ where: { remoteJid: currentChatJid } })
  });
  if (res.ok) {
    const data = res.data.messages || res.data;
    let msgs   = (Array.isArray(data) ? data : []).reverse();
    let html   = '';
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
  const inst  = waGetInstance();
  const input = document.getElementById('wa-input-text');
  const text  = input.value.trim();
  if (!text || !currentChatJid) return;
  input.value = '';
  const msgContainer = document.getElementById('wa-messages-container');
  msgContainer.innerHTML += `<div class="wa-bubble wa-me">${text}</div>`;
  msgContainer.scrollTop  = msgContainer.scrollHeight;
  const res = await fetchWa(`/message/sendText/${inst}`, {
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

// ── Automações — Config ───────────────────────────────────────────────────────
function waLoadAutoConfig() {
  const cfg  = waGetAutoConfig();
  const tog  = document.getElementById('wa-aniv-toggle');
  const msg  = document.getElementById('wa-aniv-msg');
  const time = document.getElementById('wa-aniv-time');
  if (tog)  tog.checked  = cfg.enabled;
  if (msg)  msg.value    = cfg.message;
  if (time) time.value   = cfg.time;
  waRenderBirthdayLog();
}

function waGetAutoConfig() {
  try {
    const raw = localStorage.getItem('wa_auto_config');
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return {
    enabled: false,
    message: 'Olá {nome}! 🎉 A equipe da nossa loja deseja um feliz aniversário! Que seu dia seja muito especial. 🎂',
    time: '09:00'
  };
}

function waSaveAutoConfig() {
  const cfg = {
    enabled: document.getElementById('wa-aniv-toggle')?.checked || false,
    message: document.getElementById('wa-aniv-msg')?.value || '',
    time:    document.getElementById('wa-aniv-time')?.value || '09:00'
  };
  localStorage.setItem('wa_auto_config', JSON.stringify(cfg));
}

function waRenderBirthdayLog() {
  const logEl = document.getElementById('wa-aniv-log');
  if (!logEl) return;
  try {
    const raw = localStorage.getItem('wa_birthday_log');
    if (!raw) { logEl.innerHTML = 'Nenhum envio registrado.'; return; }
    const log   = JSON.parse(raw);
    const today = waTodayBR();
    const label = log.date === today ? `<strong>Hoje (${today}):</strong>` : `Último envio: <strong>${log.date}</strong>`;
    logEl.innerHTML = `${label}<br>${log.summary}`;
  } catch(e) {
    logEl.innerHTML = 'Nenhum envio registrado.';
  }
}

// ── Aniversários — Verificação e Envio ────────────────────────────────────────
function waTodayBR() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const dd  = String(now.getDate()).padStart(2, '0');
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${now.getFullYear()}`;
}

function waTodayDDMM() {
  // Retorna "MM-DD" para comparar com data_nascimento "YYYY-MM-DD"
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const dd  = String(now.getDate()).padStart(2, '0');
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  return `${mm}-${dd}`;
}

function waAlreadySentToday() {
  try {
    const raw = localStorage.getItem('wa_birthday_log');
    if (!raw) return false;
    const log = JSON.parse(raw);
    return log.date === waTodayBR() && log.auto === true;
  } catch(e) { return false; }
}

async function waRunBirthdayCheck(manual = false) {
  const cfg = waGetAutoConfig();
  if (!cfg.enabled && !manual) return;
  if (!waConnected) return;
  if (!manual && waAlreadySentToday()) return;

  const ddmm = waTodayDDMM(); // "MM-DD"
  let clientes = [];
  try {
    const res = await window.sb.from('clientes')
      .select('id,nome,nome_abreviado,celular,data_nascimento')
      .eq('ativo', true)
      .ilike('data_nascimento', `%-${ddmm}`);
    clientes = res.data || [];
  } catch(e) {
    console.error('Erro ao buscar aniversariantes:', e);
    if (manual) toast('Erro ao buscar clientes', 'error');
    return;
  }

  const aniversariantes = clientes.filter(c => c.celular && c.celular.replace(/\D/g,'').length >= 10);

  if (!aniversariantes.length) {
    const summary = 'Nenhum aniversariante hoje.';
    localStorage.setItem('wa_birthday_log', JSON.stringify({ date: waTodayBR(), auto: !manual, summary }));
    waRenderBirthdayLog();
    if (manual) toast('Nenhum aniversariante hoje.', 'info');
    return;
  }

  const inst   = waGetInstance();
  let enviados = 0, falhas = 0;
  const nomes  = [];

  for (const cli of aniversariantes) {
    const nome   = cli.nome_abreviado || cli.nome?.split(' ')[0] || 'cliente';
    const texto  = cfg.message.replace(/\{nome\}/gi, nome);
    const numero = formatPhone(cli.celular);
    try {
      const r = await fetchWa(`/message/sendText/${inst}`, {
        method: 'POST',
        body: JSON.stringify({ number: numero, text: texto })
      });
      if (r.ok) { enviados++; nomes.push(cli.nome); }
      else falhas++;
    } catch(e) { falhas++; }
    await new Promise(r => setTimeout(r, 800));
  }

  const summary = `Enviado para: ${nomes.length ? nomes.join(', ') : '—'}<br>✅ ${enviados} enviado(s)${falhas ? ` &nbsp;❌ ${falhas} falha(s)` : ''}`;
  localStorage.setItem('wa_birthday_log', JSON.stringify({ date: waTodayBR(), auto: !manual, summary }));
  waRenderBirthdayLog();
  if (manual) toast(`Felicitações enviadas: ${enviados} cliente(s)`, 'success');
}

// ── Agendador ─────────────────────────────────────────────────────────────────
function waStartBirthdayScheduler() {
  if (waBirthdayInterval) clearInterval(waBirthdayInterval);

  // Verifica a cada 60s se bateu o horário configurado
  waBirthdayInterval = setInterval(() => {
    const cfg = waGetAutoConfig();
    if (!cfg.enabled) return;
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const hh  = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    if (`${hh}:${min}` === cfg.time && !waAlreadySentToday()) {
      waRunBirthdayCheck(false);
    }
  }, 60000);

  // Verificação inicial (não envia se já enviou hoje)
  waRunBirthdayCheck(false);
}

// ── Eventos ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const inp = document.getElementById('wa-input-text');
    if (inp) inp.addEventListener('keypress', e => { if (e.key === 'Enter') waSendMessageAction(); });
  }, 1000);
});

const _waStyle = document.createElement('style');
_waStyle.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(_waStyle);
