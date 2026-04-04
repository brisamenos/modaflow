// ===== CAIXA =====
async function renderCaixa() {
  const {data:caixaAberto}=await sb.from('caixas').select('*').eq('status','aberto').order('created_at',{ascending:false}).limit(1);
  const caixa=caixaAberto?.[0];
  if(!caixa){
    document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="abrirCaixa()"><i data-lucide="unlock"></i>Abrir Caixa</button>`;
    document.getElementById('content').innerHTML=`<div class="card" style="margin-top:20px"><div class="card-body"><div class="empty-state"><i data-lucide="lock"></i><h3>Caixa fechado</h3><p>Abra o caixa para iniciar as operações do dia</p><button class="btn btn-primary" style="margin-top:12px" onclick="abrirCaixa()">Abrir Caixa</button></div></div></div>`;
    lucide.createIcons();return;
  }
  
  // Buscar Vendas referentes ao período do caixa atual
  const {data:vendasData} = await sb.from('vendas').select('total,forma_pagamento').gte('created_at', caixa.created_at).eq('status','concluida');
  const vendas = vendasData || [];
  
  const {data:movs} = await sb.from('movimentos_caixa').select('*').eq('caixa_id', caixa.id).order('created_at',{ascending:false});
  const movimentos = movs || [];

  // Cálculos Detalhados
  const totalVendas = vendas.reduce((sum, v) => sum + parseFloat(v.total||0), 0);
  const detalhe = { cartao: {qtd:0, val:0}, pix: {qtd:0, val:0}, dinheiro: {qtd:0, val:0}, crediario: {qtd:0, val:0} };
  vendas.forEach(v => {
    let fp = (v.forma_pagamento || '').toLowerCase();
    let val = parseFloat(v.total||0);
    if(fp.includes('cart')) { detalhe.cartao.qtd++; detalhe.cartao.val += val; }
    else if(fp.includes('pix') || fp.includes('transfer')) { detalhe.pix.qtd++; detalhe.pix.val += val; }
    else if(fp.includes('dinheiro')) { detalhe.dinheiro.qtd++; detalhe.dinheiro.val += val; }
    else { detalhe.crediario.qtd++; detalhe.crediario.val += val; }
  });

  const suprimentos = movimentos.filter(m=>m.tipo==='suprimento'||m.tipo==='entrada').reduce((sum,m)=>sum+parseFloat(m.valor||0), 0);
  const sangrias = movimentos.filter(m=>m.tipo==='sangria'||m.tipo==='saida').reduce((sum,m)=>sum+parseFloat(m.valor||0), 0);

  const fundoCaixa = parseFloat(caixa.saldo_inicial||0);
  const entradasCaixa = detalhe.dinheiro.val + suprimentos;
  const saidasCaixa = sangrias;
  const saldoCaixa = fundoCaixa + entradasCaixa - saidasCaixa;

  document.getElementById('topbar-actions').innerHTML=`
    <button class="btn btn-secondary" onclick="suprimentoCaixa()"><i data-lucide="plus-circle"></i>Suprimento</button>
    <button class="btn btn-secondary" onclick="sangriaCaixa()"><i data-lucide="minus-circle"></i>Sangria</button>
    <button class="btn btn-danger" onclick="fecharCaixa('${caixa.id}')"><i data-lucide="lock"></i>Fechar Caixa</button>`;

  const cardStyle = `background:#fff;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.03);padding:24px;border:1px solid rgba(0,0,0,0.04);`;
  const labelStyle = `font-size:13px;font-weight:700;color:#2ecc71;margin-bottom:8px;display:flex;align-items:center;gap:6px;`;
  const labelRedStyle = `font-size:13px;font-weight:700;color:#e74c3c;margin-bottom:8px;display:flex;align-items:center;gap:6px;`;
  const labelBlueStyle = `font-size:13px;font-weight:700;color:#3498db;margin-bottom:8px;display:flex;align-items:center;gap:6px;`;
  const labelPurpleStyle = `font-size:13px;font-weight:700;color:#9b59b6;margin-bottom:8px;display:flex;align-items:center;gap:6px;`;
  const valStyle = `font-size:26px;font-weight:800;letter-spacing:-0.5px;`;
  const dataHoje = caixa.created_at.split('T')[0];

  document.getElementById('content').innerHTML=`
    <div style="display:flex;flex-direction:column;gap:18px;padding-bottom:30px;">
      
      <div style="display:flex; align-items:center; gap:8px; background:#fff; padding:8px 16px; border-radius:8px; width:fit-content; border:1px solid #e1e8ed; box-shadow:0 1px 4px rgba(0,0,0,0.03);">
        <span style="font-weight:600;font-size:14px;color:#7f8c8d;">Caixa dia:</span>
        <input type="date" value="${dataHoje}" readonly style="border:none; outline:none; padding:0; margin:0; font-weight:700; font-size:14px; font-family:var(--font-sans); color:#2c3e50; background:transparent;">
        <i data-lucide="calendar" style="color:#bdc3c7;width:18px;height:18px;"></i>
      </div>

      <!-- ROW 1 -->
      <div style="display:grid;grid-template-columns:1fr 1.3fr 1fr;gap:18px;">
        <div style="${cardStyle} display:flex;flex-direction:column;justify-content:center;">
          <div style="${labelPurpleStyle}">Vendas do dia</div>
          <div style="display:flex;align-items:center;gap:12px;color:#9b59b6;margin-top:6px;">
            <i data-lucide="shopping-cart" style="width:34px;height:34px;"></i>
            <div style="${valStyle}">${fmt(totalVendas)}</div>
          </div>
        </div>

        <div style="${cardStyle} padding:20px;">
          <div style="${labelPurpleStyle} margin-bottom:12px;">Detalhamento do dia</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;background:#f8f9fa;padding:10px 14px;border-radius:6px;border:1px solid #f1f2f6;">
               <div style="display:flex;align-items:center;gap:8px;color:var(--text);font-weight:600;font-size:13px;"><i data-lucide="credit-card" style="color:#3498db;width:18px;"></i> Cartão</div>
               <div style="font-weight:700;color:var(--text-2);font-size:13px;">${detalhe.cartao.qtd} — ${fmt(detalhe.cartao.val)}</div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;background:#f8f9fa;padding:10px 14px;border-radius:6px;border:1px solid #f1f2f6;">
               <div style="display:flex;align-items:center;gap:8px;color:var(--text);font-weight:600;font-size:13px;"><i data-lucide="smartphone" style="color:#2ecc71;width:18px;"></i> Depósito/Pix</div>
               <div style="font-weight:700;color:var(--text-2);font-size:13px;">${detalhe.pix.qtd} — ${fmt(detalhe.pix.val)}</div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;background:#f8f9fa;padding:10px 14px;border-radius:6px;border:1px solid #f1f2f6;">
               <div style="display:flex;align-items:center;gap:8px;color:var(--text);font-weight:600;font-size:13px;"><i data-lucide="banknote" style="color:#f1c40f;width:18px;"></i> Dinheiro</div>
               <div style="font-weight:700;color:var(--text-2);font-size:13px;">${detalhe.dinheiro.qtd} — ${fmt(detalhe.dinheiro.val)}</div>
            </div>
          </div>
        </div>

        <div style="${cardStyle} display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
           <h3 style="color:#2c3e50;font-size:16px;margin-bottom:16px;">Status do Caixa</h3>
           <div style="width:70px;height:70px;border-radius:50%;background:#eafaf1;display:flex;align-items:center;justify-content:center;">
             <i data-lucide="check-circle-2" style="width:40px;height:40px;color:#2ecc71;"></i>
           </div>
           <p style="margin-top:14px;font-weight:600;color:var(--text-2);font-size:14px;">Aberto</p>
        </div>
      </div>

      <!-- ROW 2 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">
        <div style="${cardStyle}">
          <div style="${labelStyle}">Total recebido (Entradas no caixa)</div>
          <div style="display:flex;align-items:center;gap:12px;color:#2ecc71;margin-top:6px;">
            <i data-lucide="arrow-down" style="width:30px;height:30px;"></i>
            <div style="${valStyle}">${fmt(entradasCaixa)}</div>
          </div>
        </div>

        <div style="${cardStyle}">
          <div style="${labelRedStyle}">Total pago (Saídas de caixa)</div>
          <div style="display:flex;align-items:center;gap:12px;color:#e74c3c;margin-top:6px;">
            <i data-lucide="arrow-up" style="width:30px;height:30px;"></i>
            <div style="${valStyle}">${fmt(saidasCaixa)}</div>
          </div>
        </div>
      </div>

      <!-- ROW 3 -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;">
        <div style="${cardStyle}">
          <div style="${labelStyle}">Fundo de caixa <i data-lucide="info" style="width:14px;color:#bdc3c7;"></i></div>
          <div style="display:flex;align-items:center;gap:10px;color:#2ecc71;margin-top:6px;">
            <i data-lucide="wallet" style="width:24px;height:24px;"></i>
            <div style="${valStyle}">${fmt(fundoCaixa)}</div>
          </div>
        </div>

        <div style="${cardStyle}">
          <div style="${labelBlueStyle}">Saldo do caixa <i data-lucide="info" style="width:14px;color:#bdc3c7;"></i></div>
          <div style="display:flex;align-items:center;gap:10px;color:#3498db;margin-top:6px;">
            <i data-lucide="arrow-right-circle" style="width:24px;height:24px;"></i>
            <div style="${valStyle}">${fmt(saldoCaixa)}</div>
          </div>
        </div>

        <div style="${cardStyle}">
          <div style="${labelBlueStyle}">Total em dinheiro <i data-lucide="info" style="width:14px;color:#bdc3c7;"></i></div>
          <div style="display:flex;align-items:center;gap:10px;color:#3498db;margin-top:6px;">
            <i data-lucide="coins" style="width:24px;height:24px;"></i>
            <div style="${valStyle}">${fmt(saldoCaixa)}</div>
          </div>
        </div>
      </div>

      <!-- ROW 4: Histórico de Movimentos (Opcional p/ preservar integridade) -->
      <div class="card" style="margin-top:10px">
        <div class="card-header"><h3>Movimentações do Caixa</h3></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Tipo</th><th>Descrição</th><th>Valor</th><th>Horário</th></tr></thead>
          <tbody>${(movimentos).map(m=>`<tr>
            <td><span class="badge badge-${m.tipo==='entrada'||m.tipo==='suprimento'?'green':'red'}" style="text-transform:capitalize">${m.tipo}</span></td>
            <td>${m.descricao||'—'}</td>
            <td><strong style="color:${m.tipo==='entrada'||m.tipo==='suprimento'?'var(--green)':'var(--red)'}">${fmt(m.valor)}</strong></td>
            <td>${fmtDatetime(m.created_at)}</td>
          </tr>`).join('')||'<tr><td colspan="4" style="text-align:center;color:var(--text-2)">Nenhuma movimentação manual</td></tr>'}
          </tbody>
        </table></div>
      </div>

    </div>`;
  lucide.createIcons();
}

async function abrirCaixa() {
  const val=prompt('Saldo inicial do caixa (R$):','0');
  if(val===null) return;
  await sb.from('caixas').insert({saldo_inicial:parseFloat(val||0),status:'aberto'});
  toast('Caixa aberto');renderCaixa();
}

async function fecharCaixa(id) {
  if(!confirm('Fechar o caixa?')) return;
  await sb.from('caixas').update({status:'fechado',data_fechamento:new Date().toISOString()}).eq('id',id);
  toast('Caixa fechado');renderCaixa();
}

async function suprimentoCaixa() {
  const val=prompt('Valor do suprimento (R$):');
  if(!val||isNaN(val)) return;
  const {data:cx}=await sb.from('caixas').select('id').eq('status','aberto').single();
  if(cx) await sb.from('movimentos_caixa').insert({caixa_id:cx.id,tipo:'suprimento',descricao:'Suprimento de caixa',valor:parseFloat(val)});
  toast('Suprimento registrado');renderCaixa();
}

async function sangriaCaixa() {
  const val=prompt('Valor da sangria (R$):');
  if(!val||isNaN(val)) return;
  const {data:cx}=await sb.from('caixas').select('id').eq('status','aberto').single();
  if(cx) await sb.from('movimentos_caixa').insert({caixa_id:cx.id,tipo:'sangria',descricao:'Sangria de caixa',valor:parseFloat(val)});
  toast('Sangria registrada');renderCaixa();
}

// ===== PAINEL FINANCEIRO =====
async function renderPainelFinanceiro() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const m = `${year}-${month}`;

  // Buscar dados do mês focado
  const [{data:vs}, {data:desps}, {data:pagar}] = await Promise.all([
    sb.from('vendas').select('total,forma_pagamento,created_at').gte('created_at', m+'-01').lte('created_at', m+'-31T23:59:59').eq('status','concluida'),
    sb.from('despesas').select('valor,status,data_pagamento,vencimento').gte('vencimento', m+'-01').lte('vencimento', m+'-31'),
    sb.from('contas_pagar').select('valor,status,data_pagamento,vencimento').gte('vencimento', m+'-01').lte('vencimento', m+'-31') // Considerado fornecedores
  ]);

  const days = {};
  
  // Agrupar Vendas
  (vs||[]).forEach(v => {
    const d = v.created_at.split('T')[0];
    if(!days[d]) days[d] = { aVista:0, cartao:0, crediario:0, fornecedores:0, despesas:0 };
    let fp = v.forma_pagamento || '';
    let val = parseFloat(v.total||0);
    if(fp.includes('dinheiro') || fp.includes('pix') || fp.includes('transferencia')) days[d].aVista += val;
    else if(fp.includes('cartao')) days[d].cartao += val;
    else days[d].crediario += val;
  });

  // Agrupar Despesas
  (desps||[]).forEach(d => {
    const dataRef = d.data_pagamento || d.vencimento; // prioriza pagamento pro fluxo
    if(dataRef && dataRef.startsWith(m)) {
      if(!days[dataRef]) days[dataRef] = { aVista:0, cartao:0, crediario:0, fornecedores:0, despesas:0 };
      days[dataRef].despesas += parseFloat(d.valor||0);
    }
  });

  // Agrupar Fornecedores (Contas a Pagar)
  (pagar||[]).forEach(p => {
    const dataRef = p.data_pagamento || p.vencimento;
    if(dataRef && dataRef.startsWith(m)) {
      if(!days[dataRef]) days[dataRef] = { aVista:0, cartao:0, crediario:0, fornecedores:0, despesas:0 };
      days[dataRef].fornecedores += parseFloat(p.valor||0);
    }
  });

  let totVista = 0, totCartao = 0, totCred = 0, totForn = 0, totDesp = 0;
  
  const sortedDays = Object.keys(days).sort();
  const rows = sortedDays.map(d => {
    const item = days[d];
    totVista += item.aVista;
    totCartao += item.cartao;
    totCred += item.crediario;
    totForn += item.fornecedores;
    totDesp += item.despesas;
    
    const rec = item.aVista + item.cartao + item.crediario;
    const pag = item.fornecedores + item.despesas;
    const saldo = rec - pag;
    
    const dStr = d.split('-').reverse().slice(0,2).join('/'); // DD/MM
    
    return `<tr>
      <td style="text-align:center;">
        <span style="display:inline-block; background:${dStr === new Date().toISOString().split('T')[0].split('-').reverse().slice(0,2).join('/') ? '#eafaf1' : '#f8f9fa'}; color:${dStr === new Date().toISOString().split('T')[0].split('-').reverse().slice(0,2).join('/') ? '#27ae60' : '#7f8c8d'}; padding:6px 14px; border-radius:6px; font-weight:700; border:1px solid ${dStr === new Date().toISOString().split('T')[0].split('-').reverse().slice(0,2).join('/') ? '#c9ebd6' : '#e1e8ed'}; font-size:12px;">
          ${dStr}
        </span>
      </td>
      <td style="color:#2ecc71;font-weight:600;text-align:center;">${fmt(item.aVista).replace('R$ ','')}</td>
      <td style="color:#2ecc71;font-weight:600;text-align:center;">${fmt(item.cartao).replace('R$ ','')}</td>
      <td style="color:#2ecc71;font-weight:600;text-align:center;">${fmt(item.crediario).replace('R$ ','')}</td>
      <td style="font-weight:700;color:#27ae60;text-align:center;">${fmt(rec).replace('R$ ','')}</td>
      <td style="color:#e74c3c;font-weight:600;text-align:center;">${fmt(item.fornecedores).replace('R$ ','')}</td>
      <td style="color:#e74c3c;font-weight:600;text-align:center;">${fmt(item.despesas).replace('R$ ','')}</td>
      <td style="font-weight:700;color:#c0392b;text-align:center;">${fmt(pag).replace('R$ ','')}</td>
      <td style="color:#3498db;font-weight:700;text-align:center;">${fmt(saldo).replace('R$ ','')}</td>
      <td style="text-align:center;"><i data-lucide="folder" style="color:#e67e22;width:18px;height:18px;cursor:pointer;"></i></td>
    </tr>`;
  }).join('');

  const recTotal = totVista + totCartao + totCred;
  const pagTotal = totForn + totDesp;
  const saldoFinal = recTotal - pagTotal;

  document.getElementById('topbar-actions').innerHTML = '';

  const filtrosUI = `
    <div style="display:flex;gap:12px;margin-bottom:24px;">
      <select style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:500;">
        <option>Mês</option>
        <option>Dia</option>
      </select>
      <select style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:500;">
        <option>${year}</option>
        <option>${year-1}</option>
      </select>
      <select id="sel-mes-f" style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:500;">
        <option>Janeiro</option><option>Fevereiro</option><option>Março</option><option>Abril</option><option>Maio</option><option>Junho</option><option>Julho</option><option>Agosto</option><option>Setembro</option><option>Outubro</option><option>Novembro</option><option>Dezembro</option>
      </select>
      <select style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:500;">
        <option>Todas as contas correntes</option>
      </select>
    </div>
  `;

  document.getElementById('content').innerHTML = `
    <div style="font-family:var(--font-sans);padding-bottom:30px;">
      ${filtrosUI}

      <!-- CARDS COLORIDOS -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-bottom:30px;">
        
        <!-- CARD RECEBIDO (VERDE) -->
        <div style="background:#2ecc71;border-radius:8px;padding:20px;color:#fff;box-shadow:0 4px 10px rgba(46,204,113,0.2);">
          <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px;margin-bottom:12px;">
            <i data-lucide="arrow-down" style="width:18px;"></i> Total recebido <i data-lucide="info" style="width:14px;opacity:0.7;"></i>
          </div>
          <div style="font-size:28px;font-weight:900;letter-spacing:-1px;margin-bottom:20px;">
            ${fmt(recTotal)}
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;opacity:0.9;">
            <div>À vista:<br>${fmt(totVista).replace('R$ ','')}</div>
            <div>Cartão:<br>${fmt(totCartao).replace('R$ ','')}</div>
            <div>Crediário:<br>${fmt(totCred).replace('R$ ','')}</div>
          </div>
        </div>

        <!-- CARD PAGO (LARANJA) -->
        <div style="background:#f39c12;border-radius:8px;padding:20px;color:#fff;box-shadow:0 4px 10px rgba(243,156,18,0.2);">
          <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px;margin-bottom:12px;">
            <i data-lucide="arrow-up" style="width:18px;"></i> Total pago <i data-lucide="info" style="width:14px;opacity:0.7;"></i>
          </div>
          <div style="font-size:28px;font-weight:900;letter-spacing:-1px;margin-bottom:20px;">
            ${fmt(pagTotal)}
          </div>
          <div style="display:flex;gap:40px;font-size:12px;font-weight:600;opacity:0.9;">
            <div>Fornecedores:<br>${fmt(totForn).replace('R$ ','')}</div>
            <div>Despesas:<br>${fmt(totDesp).replace('R$ ','')}</div>
          </div>
        </div>

        <!-- CARD SALDO (AZUL) -->
        <div style="background:#4facfe;border-radius:8px;padding:20px;color:#fff;box-shadow:0 4px 10px rgba(79,172,254,0.2);">
          <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px;margin-bottom:12px;">
            <i data-lucide="arrow-right-circle" style="width:18px;"></i> Saldo <i data-lucide="info" style="width:14px;opacity:0.7;"></i>
          </div>
          <div style="font-size:28px;font-weight:900;letter-spacing:-1px;margin-bottom:20px;">
            ${fmt(saldoFinal)}
          </div>
          <div style="font-size:12px;font-weight:600;opacity:0.9;">
            ${fmt(recTotal).replace('R$ ','')} - ${fmt(pagTotal).replace('R$ ','')} = ${fmt(saldoFinal).replace('R$ ','')}
          </div>
        </div>

      </div>

      <!-- TABELA -->
      <div style="background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.02);overflow:hidden;border:1px solid #f1f2f6;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead style="background:#fff;border-bottom:2px solid #f1f2f6;">
            <tr>
               <th style="padding:16px;text-align:center;color:var(--text);font-weight:700;">Data</th>
               <th style="padding:16px;text-align:center;color:#2ecc71;font-weight:700;">À Vista</th>
               <th style="padding:16px;text-align:center;color:#2ecc71;font-weight:700;">Cartão Crédito</th>
               <th style="padding:16px;text-align:center;color:#2ecc71;font-weight:700;">Crediário</th>
               <th style="padding:16px;text-align:center;color:#27ae60;font-weight:800;">Total Recebido</th>
               <th style="padding:16px;text-align:center;color:#e74c3c;font-weight:700;">Fornecedores</th>
               <th style="padding:16px;text-align:center;color:#e74c3c;font-weight:700;">Despesas</th>
               <th style="padding:16px;text-align:center;color:#c0392b;font-weight:800;">Total Pago</th>
               <th style="padding:16px;text-align:center;color:#3498db;font-weight:800;">Saldo</th>
               <th style="padding:16px;text-align:center;color:var(--text);font-weight:700;">Ação</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="10" style="text-align:center;padding:24px;color:#95a5a6;">Sem movimentações para o período</td></tr>`}
          </tbody>
          <tfoot style="background:#fcfcfc;border-top:2px solid #eee;">
            <tr>
              <td style="padding:16px;text-align:center;font-weight:800;color:var(--text);">Totais</td>
              <td style="padding:16px;text-align:center;font-weight:800;color:#2ecc71;">${fmt(totVista).replace('R$ ','')}</td>
              <td style="padding:16px;text-align:center;font-weight:800;color:#2ecc71;">${fmt(totCartao).replace('R$ ','')}</td>
              <td style="padding:16px;text-align:center;font-weight:800;color:#2ecc71;">${fmt(totCred).replace('R$ ','')}</td>
              <td style="padding:16px;text-align:center;font-weight:800;color:#27ae60;">${fmt(recTotal).replace('R$ ','')}</td>
              <td style="padding:16px;text-align:center;font-weight:800;color:#e74c3c;">${fmt(totForn).replace('R$ ','')}</td>
              <td style="padding:16px;text-align:center;font-weight:800;color:#e74c3c;">${fmt(totDesp).replace('R$ ','')}</td>
              <td style="padding:16px;text-align:center;font-weight:800;color:#c0392b;">${fmt(pagTotal).replace('R$ ','')}</td>
              <td style="padding:16px;text-align:center;font-weight:800;color:#3498db;">${fmt(saldoFinal).replace('R$ ','')}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  `;
  try { document.getElementById('sel-mes-f').value = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][parseInt(month)-1]; } catch(e){}
  lucide.createIcons();
}

// ===== DESPESAS =====
async function renderDespesas() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openDespesaModal()"><i data-lucide="plus"></i>Nova Despesa</button>`;
  const now=new Date(),m=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const {data}=await sb.from('despesas').select('*,classificacoes(nome)').gte('data_competencia',m+'-01').order('vencimento');
  const totalPend=(data||[]).filter(d=>d.status==='pendente').reduce((a,d)=>a+parseFloat(d.valor||0),0);
  const totalPago=(data||[]).filter(d=>d.status==='pago').reduce((a,d)=>a+parseFloat(d.valor||0),0);
  document.getElementById('content').innerHTML=`
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
      <div class="stat-card"><div class="stat-value">${(data||[]).length}</div><div class="stat-label">Total despesas</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--yellow)">${fmt(totalPend)}</div><div class="stat-label">Pendente</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--green)">${fmt(totalPago)}</div><div class="stat-label">Pago</div></div>
    </div>
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Descrição</th><th>Classificação</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${(data||[]).map(d=>`<tr>
          <td><strong>${d.descricao}</strong></td>
          <td>${d.classificacoes?.nome||'—'}</td>
          <td>${fmtDate(d.vencimento)}</td>
          <td><strong>${fmt(d.valor)}</strong></td>
          <td>${badgeStatus(d.status)}</td>
          <td><div class="actions">
            ${d.status==='pendente'?`<button class="btn btn-sm btn-success" onclick="pagarDespesa('${d.id}')"><i data-lucide="check"></i>Pagar</button>`:''}
            <button class="btn btn-sm btn-danger" onclick="deleteDespesa('${d.id}')"><i data-lucide="trash-2"></i></button>
          </div></td>
        </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--text-2)">Nenhuma despesa</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function openDespesaModal() {
  const {data:cls}=await sb.from('classificacoes').select('id,nome').eq('tipo','despesa');
  
  const now = new Date();
  const mesP = (now.getMonth()+1) + ' / ' + now.getFullYear();

  openModal(`
    <style>
      .dp-modal-focus:focus { border-color:#3498db !important; box-shadow:0 0 0 3px rgba(52,152,219,0.15) !important; }
      .dp-file-area { display:flex; gap:8px; background:#fdfdfd; padding:12px; border-radius:6px; border:1px dashed #bdc3c7;}
    </style>
    <div class="modal-header" style="border-bottom:none;padding-bottom:10px;">
      <h3 style="color:#2c3e50;font-weight:800;font-size:18px;">Nova Despesa</h3>
    </div>
    <div class="modal-body" style="padding-top:0;">
      <div style="font-weight:800;font-size:13px;color:#2c3e50;margin-bottom:16px;">
        Mês de referência: <span style="color:#7f8c8d;">${mesP}</span>
      </div>

      <div class="form-grid" style="display:flex;flex-direction:column;gap:16px;">
        
        <div class="form-group">
          <label style="color:#c0392b;font-weight:800;font-size:12px;margin-bottom:6px;display:block;">Classificação *</label>
          <select id="dp2-cls" class="dp-modal-focus" style="width:100%;border:1px solid #3498db;border-radius:6px;padding:10px 14px;color:#2c3e50;font-weight:600;outline:none;background:#fff;transition:border .2s;">
            <option value="">Selecione uma opção</option>
            ${(cls||[]).map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label style="color:#c0392b;font-weight:800;font-size:12px;margin-bottom:6px;display:block;">Descrição *</label>
          <input id="dp2-desc" class="dp-modal-focus" placeholder="" style="width:100%;border:1px solid #e1e8ed;border-radius:6px;padding:10px 14px;color:#2c3e50;outline:none;transition:border .2s;font-weight:600;">
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="form-group">
            <label style="color:#c0392b;font-weight:800;font-size:12px;margin-bottom:6px;display:block;">Valor *</label>
            <input id="dp2-val" class="dp-modal-focus" type="number" step="0.01" style="width:100%;border:1px solid #e1e8ed;border-radius:6px;padding:10px 14px;color:#2c3e50;outline:none;transition:border .2s;font-weight:800;">
          </div>
          <div class="form-group">
            <label style="color:#c0392b;font-weight:800;font-size:12px;margin-bottom:6px;display:block;">Data vencto *</label>
            <div style="position:relative;">
              <input id="dp2-venc" class="dp-modal-focus" type="date" style="width:100%;border:1px solid #e1e8ed;border-radius:6px;padding:10px 14px;color:#2c3e50;outline:none;transition:border .2s;font-weight:600;">
            </div>
          </div>
        </div>

        <div class="form-group">
          <label style="color:#c0392b;font-weight:800;font-size:12px;margin-bottom:6px;display:block;">Ciclo pagto *</label>
          <select id="dp2-ciclo" class="dp-modal-focus" style="width:100%;border:1px solid #e1e8ed;border-radius:6px;padding:10px 14px;color:#2c3e50;font-weight:600;outline:none;background:#fff;transition:border .2s;">
            <option value="Unico">Selecione uma opção (Único)</option>
            <option value="Mensal">Mensal</option>
            <option value="Quinzenal">Quinzenal</option>
            <option value="Semanal">Semanal</option>
          </select>
        </div>

        <div style="text-align:center; margin-top:4px;">
          <span style="color:#c0392b;font-weight:800;font-size:12px;">Pagamento será feito somente em dia útil?</span>
          <div style="display:flex; justify-content:center; gap:20px; margin-top:10px;">
            <label style="display:flex;align-items:center;gap:6px;font-weight:700;color:#2c3e50;font-size:13px;cursor:pointer;"><input type="radio" name="dp2-util" value="sim" checked style="accent-color:#3498db;width:16px;height:16px;"> Sim</label>
            <label style="display:flex;align-items:center;gap:6px;font-weight:700;color:#2c3e50;font-size:13px;cursor:pointer;"><input type="radio" name="dp2-util" value="nao" style="accent-color:#3498db;width:16px;height:16px;"> Não</label>
          </div>
        </div>

        <div class="form-group" style="margin-top:10px;">
          <label style="color:#2c3e50;font-weight:800;font-size:13px;margin-bottom:8px;display:block;">Selecione o comprovante de despesa</label>
          <div class="dp-file-area">
            <button class="btn btn-sm" style="background:#3498db;color:#fff;border-radius:6px;font-weight:700;padding:8px 16px;border:none;display:flex;align-items:center;gap:4px;"><i data-lucide="plus" style="width:14px;"></i> Selecionar</button>
            <button class="btn btn-sm" style="background:#f1f2f6;color:#95a5a6;border-radius:6px;font-weight:700;padding:8px 16px;border:none;display:flex;align-items:center;gap:4px;box-shadow:none;"><i data-lucide="upload" style="width:14px;"></i> Carregar</button>
            <button class="btn btn-sm" style="background:#f1f2f6;color:#95a5a6;border-radius:6px;font-weight:700;padding:8px 16px;border:none;display:flex;align-items:center;gap:4px;box-shadow:none;"><i data-lucide="x" style="width:14px;"></i> Cancelar</button>
          </div>
        </div>
        
      </div>
    </div>
    
    <div class="modal-footer" style="border-top:none;display:flex;justify-content:space-between;padding-top:20px;">
      <button class="btn" style="background:#e74c3c;color:#fff;border-radius:20px;padding:8px 24px;font-weight:700;border:none;display:flex;align-items:center;gap:6px;box-shadow:0 3px 6px rgba(231,76,60,0.2);" onclick="closeModalDirect()">
        <i data-lucide="arrow-left" style="width:14px;"></i> Voltar
      </button>
      <div style="display:flex; gap:12px;">
         <button class="btn" style="background:#f1f2f6;color:#7f8c8d;border-radius:20px;padding:8px 20px;font-weight:700;border:none;display:flex;align-items:center;gap:6px;" onclick="document.querySelectorAll('.dp-modal-focus').forEach(el=>el.value='')">
           <i data-lucide="eraser" style="width:14px;"></i> Limpar
         </button>
         <button class="btn" style="background:#3498db;color:#fff;border-radius:20px;padding:8px 24px;font-weight:700;border:none;display:flex;align-items:center;gap:6px;box-shadow:0 3px 6px rgba(52,152,219,0.2);" onclick="saveDespesa()">
           <i data-lucide="thumbs-up" style="width:14px;"></i> Salvar
         </button>
      </div>
    </div>
  `,'modal-md');
  lucide.createIcons();
}

async function saveDespesa() {
  const payload={
    descricao:document.getElementById('dp2-desc').value.trim(),
    valor:parseFloat(document.getElementById('dp2-val').value||0),
    vencimento:document.getElementById('dp2-venc').value||null,
    data_competencia: new Date().toISOString().split('T')[0],
    classificacao_id:document.getElementById('dp2-cls').value||null
  };
  if(!payload.descricao||!payload.valor||!payload.vencimento) return toast('Preencha os campos obrigatórios em vermelho!','error');
  await sb.from('despesas').insert(payload);
  closeModalDirect();toast('Despesa cadastrada');renderDespesas();
}

async function pagarDespesa(id){await sb.from('despesas').update({status:'pago',data_pagamento:new Date().toISOString().split('T')[0]}).eq('id',id);toast('Despesa paga');renderDespesas();}
async function deleteDespesa(id){if(!confirm('Excluir?'))return;await sb.from('despesas').delete().eq('id',id);toast('Removido');renderDespesas();}

// ===== CONTAS A PAGAR (Dashboard) =====
async function renderContasPagar() {
  document.getElementById('topbar-actions').innerHTML = ''; // Limpa topbar, controle movido pra tela
  
  const now = new Date();
  const m = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const hoje = now.toISOString().split('T')[0];

  // Buscar dados reais do banco
  const [{data:despesas},{data:contas}] = await Promise.all([
    sb.from('despesas').select('valor,status,vencimento').gte('vencimento', m+'-01').lte('vencimento', m+'-31'),
    sb.from('contas_pagar').select('valor,status,vencimento').gte('vencimento', m+'-01').lte('vencimento', m+'-31')
  ]);

  const todos = [...(despesas||[]), ...(contas||[])];
  const totalMes = todos.reduce((a,d) => a + parseFloat(d.valor||0), 0);
  const vencem = todos.filter(d => d.vencimento === hoje && (d.status==='aberta'||d.status==='pendente')).reduce((a,d)=>a+parseFloat(d.valor||0),0);
  const atrasadas = todos.filter(d => d.vencimento < hoje && (d.status==='aberta'||d.status==='pendente')).reduce((a,d)=>a+parseFloat(d.valor||0),0);
  const pagas = todos.filter(d => d.status==='pago'||d.status==='paga').reduce((a,d)=>a+parseFloat(d.valor||0),0);

  document.getElementById('content').innerHTML = `
    <div style="font-family:var(--font-sans);padding-bottom:50px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <h2 style="color:#2c3e50;font-weight:800;font-size:20px;margin:0;">Contas a Pagar (Despesas)</h2>
        <div style="display:flex;gap:12px;align-items:center;">
          <select style="padding:8px 16px;border:1px solid #e1e8ed;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:600;font-size:13px;">
            <option>Mês Atual</option>
          </select>
          <button class="btn" style="background:#3498db;color:#fff;font-weight:700;border-radius:20px;padding:8px 20px;display:flex;align-items:center;gap:6px;border:none;box-shadow:0 3px 8px rgba(52,152,219,0.2);cursor:pointer;" onclick="openContaPagarModal()">
            <i data-lucide="plus" style="width:14px;"></i> Lançar Despesa / Conta
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:20px;margin-bottom:24px;">
        <div style="background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 10px rgba(0,0,0,0.02);border:1px solid #f1f2f6;border-left:4px solid #3498db;">
          <div style="color:#7f8c8d;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Total no Mês</div>
          <div style="color:#2c3e50;font-size:28px;font-weight:900;">${fmt(totalMes)}</div>
        </div>
        <div style="background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 10px rgba(0,0,0,0.02);border:1px solid #f1f2f6;border-left:4px solid #e67e22;">
          <div style="color:#e67e22;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Vencem Hoje</div>
          <div style="color:#2c3e50;font-size:28px;font-weight:900;">${fmt(vencem)}</div>
        </div>
        <div style="background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 10px rgba(0,0,0,0.02);border:1px solid #f1f2f6;border-left:4px solid #e74c3c;">
          <div style="color:#e74c3c;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Atrasadas</div>
          <div style="color:#2c3e50;font-size:28px;font-weight:900;">${fmt(atrasadas)}</div>
        </div>
        <div style="background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 10px rgba(0,0,0,0.02);border:1px solid #f1f2f6;border-left:4px solid #2ecc71;">
          <div style="color:#2ecc71;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Pagas no Mês</div>
          <div style="color:#2c3e50;font-size:28px;font-weight:900;">${fmt(pagas)}</div>
        </div>
      </div>

      <!-- Gráficos VAZIOS -->
      <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:20px;margin-bottom:24px;">
        
        <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,0.02);border:1px solid #f1f2f6;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h3 style="font-size:14px;color:#2c3e50;font-weight:800;margin:0;">Evolução de Pagamentos</h3>
            <i data-lucide="bar-chart-2" style="color:#bdc3c7;width:18px;"></i>
          </div>
          <div style="height:220px;display:flex;align-items:center;justify-content:center;background:#fcfcfc;border-radius:8px;border:1px dashed #e1e8ed;">
            <div style="text-align:center;">
              <i data-lucide="line-chart" style="width:32px;height:32px;color:#dcdde1;margin-bottom:10px;"></i>
              <div style="color:#a4b0be;font-size:13px;font-weight:600;">Sem dados para plotar gráfico.<br>Registre contas pagas no mês.</div>
            </div>
          </div>
        </div>
        
        <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,0.02);border:1px solid #f1f2f6;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h3 style="font-size:14px;color:#2c3e50;font-weight:800;margin:0;">Despesas por Categoria</h3>
            <i data-lucide="pie-chart" style="color:#bdc3c7;width:18px;"></i>
          </div>
          <div style="height:220px;display:flex;align-items:center;justify-content:center;background:#fcfcfc;border-radius:8px;border:1px dashed #e1e8ed;">
             <div style="text-align:center;">
              <i data-lucide="pie-chart" style="width:32px;height:32px;color:#dcdde1;margin-bottom:10px;"></i>
              <div style="color:#a4b0be;font-size:13px;font-weight:600;">Sem dados de categorias.</div>
            </div>
          </div>
        </div>

      </div>

      <!-- Tabela Resumo -->
      <div style="background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.02);border:1px solid #f1f2f6;overflow:hidden;">
        <div style="padding:16px 20px;border-bottom:1px solid #f1f2f6;display:flex;justify-content:space-between;align-items:center;">
           <h3 style="font-size:14px;color:#2c3e50;font-weight:800;margin:0;">Lançamentos de Contas</h3>
           <div style="display:flex;gap:10px;">
             <input type="text" placeholder="Buscar por descrição..." style="padding:8px 12px;border-radius:6px;border:1px solid #e1e8ed;font-size:12px;outline:none;width:240px;font-weight:600;color:#2c3e50;">
             <button class="btn" style="background:#f1f2f6;color:#7f8c8d;border:none;border-radius:6px;padding:0 12px;cursor:pointer;"><i data-lucide="filter" style="width:14px;"></i></button>
           </div>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead style="background:#fcfcfc;border-bottom:2px solid #f1f2f6;">
              <tr>
                <th style="padding:14px 20px;text-align:left;color:#7f8c8d;font-weight:800;">Descrição</th>
                <th style="padding:14px 20px;text-align:left;color:#7f8c8d;font-weight:800;">Categoria / Fornecedor</th>
                <th style="padding:14px 20px;text-align:center;color:#7f8c8d;font-weight:800;">Vencimento</th>
                <th style="padding:14px 20px;text-align:right;color:#7f8c8d;font-weight:800;">Valor (R$)</th>
                <th style="padding:14px 20px;text-align:center;color:#7f8c8d;font-weight:800;">Status</th>
                <th style="padding:14px 20px;text-align:center;color:#7f8c8d;font-weight:800;">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colspan="6" style="padding:60px 20px;text-align:center;color:#bdc3c7;font-weight:600;">Nenhuma conta a pagar registrada neste período.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  lucide.createIcons();
}

async function openContaPagarModal() {
  const [{data:forns},{data:cls}]=await Promise.all([
    sb.from('fornecedores').select('id,razao_social').eq('ativo',true),
    sb.from('classificacoes').select('id,nome').eq('tipo','despesa')
  ]);
  openModal(`
    <div class="modal-header">
      <h3 style="color:#2c3e50;font-weight:800;font-size:16px;">Nova Conta a Pagar</h3>
      <button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button>
    </div>
    <div class="modal-body" style="padding-top:10px;">
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="form-group"><label style="color:#c0392b;font-weight:800;font-size:12px;">Descrição da Despesa *</label>
        <input type="text" id="cp-desc" placeholder="Ex: Conta de Luz" style="width:100%;border:1px solid #e1e8ed;border-radius:6px;padding:10px 14px;color:#2c3e50;font-weight:600;outline:none;font-size:14px;"></div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label style="color:#2c3e50;font-weight:800;font-size:12px;">Fornecedor Adicional</label>
            <select id="cp-forn" style="width:100%;border:1px solid #e1e8ed;border-radius:6px;padding:10px 14px;color:#2c3e50;font-weight:600;outline:none;background:#fff;font-size:14px;">
              <option value="">Nenhum associado</option>
              ${(forns||[]).map(f=>`<option value="${f.id}">${f.razao_social}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label style="color:#c0392b;font-weight:800;font-size:12px;">Classificação *</label>
            <select id="cp-cls" style="width:100%;border:1px solid #e1e8ed;border-radius:6px;padding:10px 14px;color:#2c3e50;font-weight:600;outline:none;background:#fff;font-size:14px;">
              <option value="">Selecione categoria</option>
              ${(cls||[]).map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label style="color:#c0392b;font-weight:800;font-size:12px;">Data Vencimento *</label>
          <input id="cp-venc" type="date" style="width:100%;border:1px solid #e1e8ed;border-radius:6px;padding:10px 14px;color:#7f8c8d;font-weight:600;outline:none;font-size:14px;"></div>
          
          <div class="form-group"><label style="color:#c0392b;font-weight:800;font-size:12px;">Valor Total (R$) *</label>
          <input id="cp-val" type="number" step="0.01" placeholder="0.00" style="width:100%;border:1px solid #e1e8ed;border-radius:6px;padding:10px 14px;color:#2c3e50;font-weight:600;outline:none;font-size:14px;"></div>
        </div>
      </div>
    </div>
    <div class="modal-footer" style="padding-top:20px;display:flex;justify-content:flex-end;gap:12px;">
      <button class="btn" style="background:#ecf0f1;color:#7f8c8d;border-radius:20px;padding:8px 24px;font-weight:800;border:none;cursor:pointer;" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn" style="background:#3498db;color:#fff;border-radius:20px;padding:8px 24px;font-weight:800;border:none;display:flex;align-items:center;gap:6px;box-shadow:0 3px 6px rgba(52,152,219,0.3);" onclick="saveContaPagar()">
        <i data-lucide="save" style="width:14px;"></i> Salvar
      </button>
    </div>`,'modal-md');
  lucide.createIcons();
}

async function saveContaPagar() {
  const payload={descricao:document.getElementById('cp-desc').value.trim(),fornecedor_id:document.getElementById('cp-forn').value||null,valor:parseFloat(document.getElementById('cp-val').value||0),vencimento:document.getElementById('cp-venc').value,classificacao_id:document.getElementById('cp-cls').value||null};
  if(!payload.descricao||!payload.valor||!payload.vencimento) return toast('Preencha os campos obrigatórios em vermelho (*)','error');
  await sb.from('contas_pagar').insert(payload);
  closeModalDirect();toast('Conta a pagar inserida!');renderContasPagar();
}

async function pagarConta(id){await sb.from('contas_pagar').update({status:'paga',data_pagamento:new Date().toISOString().split('T')[0]}).eq('id',id);toast('A conta foi marcada como paga.');renderContasPagar();}

// ===== CONTAS BANCÁRIAS =====
async function renderContasBancarias() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openContaBancariaModal()"><i data-lucide="plus"></i>Nova Conta</button>`;
  const {data}=await sb.from('contas_bancarias').select('*').eq('ativo',true);
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Nome</th><th>Banco</th><th>Agência</th><th>Conta</th><th>Tipo</th><th>Saldo Inicial</th><th>Ações</th></tr></thead>
        <tbody>${(data||[]).map(c=>`<tr>
          <td><strong>${c.nome}</strong></td><td>${c.banco||'—'}</td><td>${c.agencia||'—'}</td><td>${c.conta||'—'}</td>
          <td style="text-transform:capitalize">${c.tipo||'—'}</td><td>${fmt(c.saldo_inicial)}</td>
          <td><button class="btn btn-sm btn-danger" onclick="deleteCB('${c.id}')"><i data-lucide="trash-2"></i></button></td>
        </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:var(--text-2)">Nenhuma conta bancária</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function openContaBancariaModal() {
  openModal(`
    <div class="modal-header"><h3>Nova Conta Bancária</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-row"><div class="form-group"><label>Nome *</label><input id="cb-nome"></div>
      <div class="form-group"><label>Tipo</label><select id="cb-tipo"><option value="corrente">Conta Corrente</option><option value="poupanca">Poupança</option><option value="caixa">Caixa</option></select></div></div>
      <div class="form-row"><div class="form-group"><label>Banco</label><input id="cb-banco"></div>
      <div class="form-group"><label>Agência</label><input id="cb-agencia"></div>
      <div class="form-group"><label>Conta</label><input id="cb-conta"></div></div>
      <div class="form-group"><label>Saldo Inicial (R$)</label><input id="cb-saldo" type="number" step="0.01" value="0"></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveContaBancaria()"><i data-lucide="save"></i>Salvar</button>
    </div>`,'modal-md');
}

async function saveContaBancaria() {
  const payload={nome:document.getElementById('cb-nome').value.trim(),tipo:document.getElementById('cb-tipo').value,banco:document.getElementById('cb-banco').value,agencia:document.getElementById('cb-agencia').value,conta:document.getElementById('cb-conta').value,saldo_inicial:parseFloat(document.getElementById('cb-saldo').value||0)};
  if(!payload.nome) return toast('Nome obrigatório','error');
  await sb.from('contas_bancarias').insert(payload);
  closeModalDirect();toast('Conta cadastrada');renderContasBancarias();
}

async function deleteCB(id){if(!confirm('Excluir conta?'))return;await sb.from('contas_bancarias').update({ativo:false}).eq('id',id);toast('Removido');renderContasBancarias();}

// ===== FLUXO DE CAIXA =====
async function renderFluxoCaixa() {
  const now=new Date(),ano=now.getFullYear();
  const meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const results=await Promise.all(meses.map(async(_,i)=>{
    const m=String(i+1).padStart(2,'0');
    const [{data:vs},{data:ds}]=await Promise.all([
      sb.from('vendas').select('total').gte('created_at',`${ano}-${m}-01`).lt('created_at',`${ano}-${m}-31`).eq('status','concluida'),
      sb.from('despesas').select('valor').gte('data_competencia',`${ano}-${m}-01`).lt('data_competencia',`${ano}-${m}-31`)
    ]);
    const rec=(vs||[]).reduce((a,v)=>a+parseFloat(v.total||0),0);
    const desp=(ds||[]).reduce((a,d)=>a+parseFloat(d.valor||0),0);
    return {mes:meses[i],rec,desp,res:rec-desp};
  }));

  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-header"><h3>Fluxo de Caixa ${ano}</h3></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Resultado</th></tr></thead>
        <tbody>${results.map(r=>`<tr>
          <td><strong>${r.mes}</strong></td>
          <td style="color:var(--green)">${fmt(r.rec)}</td>
          <td style="color:var(--red)">${fmt(r.desp)}</td>
          <td style="color:${r.res>=0?'var(--green)':'var(--red)'}"><strong>${fmt(r.res)}</strong></td>
        </tr>`).join('')}
        <tr style="background:var(--bg)">
          <td><strong>TOTAL</strong></td>
          <td style="color:var(--green)"><strong>${fmt(results.reduce((a,r)=>a+r.rec,0))}</strong></td>
          <td style="color:var(--red)"><strong>${fmt(results.reduce((a,r)=>a+r.desp,0))}</strong></td>
          <td style="color:${results.reduce((a,r)=>a+r.res,0)>=0?'var(--green)':'var(--red)'}"><strong>${fmt(results.reduce((a,r)=>a+r.res,0))}</strong></td>
        </tr>
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

// ===== DRE =====
async function renderDRE() {
  const now=new Date(),ano=now.getFullYear();
  const meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const results=await Promise.all(meses.map(async(_,i)=>{
    const m=String(i+1).padStart(2,'0');
    const [{data:vs},{data:ds},{data:ps}]=await Promise.all([
      sb.from('vendas').select('total').gte('created_at',`${ano}-${m}-01`).lte('created_at',`${ano}-${m}-31T23:59:59`).eq('status','concluida'),
      sb.from('despesas').select('valor').gte('data_competencia',`${ano}-${m}-01`).lte('data_competencia',`${ano}-${m}-31`),
      sb.from('contas_pagar').select('valor').gte('vencimento',`${ano}-${m}-01`).lte('vencimento',`${ano}-${m}-31`).eq('status','paga')
    ]);
    const rec=(vs||[]).reduce((a,v)=>a+parseFloat(v.total||0),0);
    const desp=(ds||[]).reduce((a,d)=>a+parseFloat(d.valor||0),0);
    const pagos=(ps||[]).reduce((a,p)=>a+parseFloat(p.valor||0),0);
    return {mes:meses[i],rec,desp,pagos,lucro:rec-desp-pagos};
  }));

  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="card-header"><h3>DRE — Demonstrativo de Resultado ${ano}</h3></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Conta</th>${meses.map(m=>`<th>${m}</th>`).join('')}<th>Total</th></tr></thead>
        <tbody>
          <tr style="background:var(--green-bg)"><td><strong>Receita de Vendas</strong></td>${results.map(r=>`<td style="color:var(--green)">${fmt(r.rec)}</td>`).join('')}<td><strong style="color:var(--green)">${fmt(results.reduce((a,r)=>a+r.rec,0))}</strong></td></tr>
          <tr><td>Despesas Operacionais</td>${results.map(r=>`<td style="color:var(--red)">${fmt(r.desp)}</td>`).join('')}<td><strong style="color:var(--red)">${fmt(results.reduce((a,r)=>a+r.desp,0))}</strong></td></tr>
          <tr><td>Contas Pagas</td>${results.map(r=>`<td style="color:var(--red)">${fmt(r.pagos)}</td>`).join('')}<td><strong style="color:var(--red)">${fmt(results.reduce((a,r)=>a+r.pagos,0))}</strong></td></tr>
          <tr style="border-top:2px solid var(--border-2)"><td><strong>Lucro Líquido</strong></td>${results.map(r=>`<td><strong style="color:${r.lucro>=0?'var(--green)':'var(--red)'}">${fmt(r.lucro)}</strong></td>`).join('')}<td><strong style="color:${results.reduce((a,r)=>a+r.lucro,0)>=0?'var(--green)':'var(--red)'}">${fmt(results.reduce((a,r)=>a+r.lucro,0))}</strong></td></tr>
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}
// ===== CAIXA MENSAL =====
async function renderCaixaMensal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const m = `${year}-${month}`;

  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-secondary" style="border:1px solid #ddd;box-shadow:0 1px 3px rgba(0,0,0,0.05);background:#fff;color:var(--text);font-weight:600;"><i data-lucide="download" style="width:16px;"></i> Exportar</button>
  `;

  document.getElementById('content').innerHTML = '<div class="loading" style="padding-top:40px;text-align:center;"><div class="sk" style="height:20px;width:200px;margin:0 auto 8px;background:#eee;border-radius:4px;"></div></div>';

  const [{data:vs}, {data:desps}, {data:caixas}, {data:movs}] = await Promise.all([
    sb.from('vendas').select('total,forma_pagamento,created_at').gte('created_at', m+'-01').lte('created_at', m+'-31T23:59:59').eq('status','concluida'),
    sb.from('despesas').select('valor,status,data_pagamento,vencimento').gte('vencimento', m+'-01').lte('vencimento', m+'-31'),
    sb.from('caixas').select('saldo_inicial,created_at').gte('created_at', m+'-01').lte('created_at', m+'-31T23:59:59'),
    sb.from('movimentos_caixa').select('valor,tipo,created_at').gte('created_at', m+'-01').lte('created_at', m+'-31T23:59:59')
  ]);

  const days = {};
  
  const initDay = (d) => {
    if(!days[d]) days[d] = {fundo:0, aVista:0, crediario:0, totalRec:0, despesa:0, sangria:0, totalPago:0, saldo:0, dinheiro:0};
  };

  (caixas||[]).forEach(c => {
    const d = c.created_at.split('T')[0]; initDay(d);
    days[d].fundo += parseFloat(c.saldo_inicial||0);
  });

  (vs||[]).forEach(v => {
    const d = v.created_at.split('T')[0]; initDay(d);
    let fp = v.forma_pagamento || '';
    let val = parseFloat(v.total||0);
    if(fp.includes('crediario')) {
      days[d].crediario += val;
    } else {
      days[d].aVista += val;
      if(fp.includes('dinheiro')) days[d].dinheiro += val;
    }
  });

  (movs||[]).forEach(m_ => {
    const d = m_.created_at.split('T')[0]; initDay(d);
    let val = parseFloat(m_.valor||0);
    if(m_.tipo === 'sangria' || m_.tipo === 'saida') {
      days[d].sangria += val;
    }
  });

  (desps||[]).forEach(de => {
    const d = de.data_pagamento || de.vencimento;
    if(d && d.startsWith(m)) {
      initDay(d);
      days[d].despesa += parseFloat(de.valor||0);
    }
  });

  let tVendaPrazo = 0, tVendaVista = 0;
  let tFundo = 0, tRecVista = 0, tRecCred = 0;
  let tPagoDesp = 0, tPagoSangria = 0;
  let tSaldoDinheiro = 0;

  const sortedDays = Object.keys(days).sort();
  const rows = sortedDays.map(d => {
    const item = days[d];
    
    item.totalRec = item.aVista + item.crediario;
    item.totalPago = item.despesa + item.sangria;
    item.saldo = item.totalRec - item.totalPago; // Math according to Phibo usually: Recebido - Pago

    tFundo += item.fundo;
    tVendaPrazo += item.crediario;
    tVendaVista += item.aVista;
    
    tRecVista += item.aVista;
    tRecCred += item.crediario;
    
    tPagoDesp += item.despesa;
    tPagoSangria += item.sangria;

    tSaldoDinheiro += item.dinheiro;

    const dStr = d.split('-').reverse().slice(0,2).join('/') + '/' + d.substring(2,4); // DD/MM/YY
    
    return `<tr>
      <td style="text-align:center;">
        <span style="display:inline-block; background:${dStr.startsWith(new Date().toISOString().split('T')[0].split('-').reverse().slice(0,2).join('/')) ? '#eafaf1' : '#f8f9fa'}; color:${dStr.startsWith(new Date().toISOString().split('T')[0].split('-').reverse().slice(0,2).join('/')) ? '#27ae60' : '#7f8c8d'}; padding:5px 12px; border-radius:6px; font-weight:700; border:1px solid ${dStr.startsWith(new Date().toISOString().split('T')[0].split('-').reverse().slice(0,2).join('/')) ? '#c9ebd6' : '#e1e8ed'}; font-size:12px;">
          ${dStr}
        </span>
      </td>
      <td style="color:#3498db;font-weight:600;text-align:center;">${fmt(item.fundo).replace('R$ ','')}</td>
      <td style="color:#2ecc71;font-weight:600;text-align:center;">${fmt(item.aVista).replace('R$ ','')}</td>
      <td style="color:#2ecc71;font-weight:600;text-align:center;">${fmt(item.crediario).replace('R$ ','')}</td>
      <td style="font-weight:700;color:#27ae60;text-align:center;">${fmt(item.totalRec).replace('R$ ','')}</td>
      <td style="color:#e74c3c;font-weight:600;text-align:center;">${fmt(item.despesa).replace('R$ ','')}</td>
      <td style="color:#e74c3c;font-weight:600;text-align:center;">${fmt(item.sangria).replace('R$ ','')}</td>
      <td style="font-weight:700;color:#c0392b;text-align:center;">${fmt(item.totalPago).replace('R$ ','')}</td>
      <td style="color:#4facfe;font-weight:700;text-align:center;">${fmt(item.saldo).replace('R$ ','')}</td>
      <td style="color:#2c3e50;font-weight:600;text-align:center;">${fmt(item.dinheiro).replace('R$ ','')}</td>
    </tr>`;
  }).join('');

  const tTotalVendas = tVendaVista + tVendaPrazo;
  const pertVista = tTotalVendas? ((tVendaVista/tTotalVendas)*100).toFixed(0):0;
  const pertPrazo = tTotalVendas? ((tVendaPrazo/tTotalVendas)*100).toFixed(0):0;

  const tTotalRec = tRecVista + tRecCred;
  const tTotalPago = tPagoDesp + tPagoSangria;
  const grandSaldo = tTotalRec - tTotalPago;

  const filtrosUI = `
    <div style="display:flex;gap:12px;margin-bottom:24px;">
      <select style="padding:6px 12px;border:1px solid #ddd;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:500;">
        <option>Mês</option>
      </select>
      <select style="padding:6px 12px;border:1px solid #ddd;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:500;">
        <option>${year}</option>
        <option>${year-1}</option>
      </select>
      <select id="sel-cmes" style="padding:6px 12px;border:1px solid #ddd;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:500;">
        <option>Janeiro</option><option>Fevereiro</option><option>Março</option><option>Abril</option><option>Maio</option><option>Junho</option><option>Julho</option><option>Agosto</option><option>Setembro</option><option>Outubro</option><option>Novembro</option><option>Dezembro</option>
      </select>
    </div>
  `;

  document.getElementById('content').innerHTML = `
    <div style="font-family:var(--font-sans);padding-bottom:30px;">
      ${filtrosUI}

      <!-- CARDS COLORIDOS MENSAL -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:12px;margin-bottom:24px;">
        
        <div style="background:#b762f0;border-radius:6px;padding:16px;color:#fff;box-shadow:0 3px 6px rgba(183,98,240,0.2);">
          <div style="font-weight:700;font-size:12px;display:flex;align-items:center;gap:6px;margin-bottom:8px;">
            <i data-lucide="arrow-down" style="width:14px;"></i> Total venda <i data-lucide="info" style="width:12px;opacity:0.7;"></i>
          </div>
          <div style="font-size:20px;font-weight:800;letter-spacing:-0.5px;margin-bottom:12px;">${fmt(tTotalVendas)}</div>
          <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:600;opacity:0.9;">
            <div>À vista:<br>${fmt(tVendaVista).replace('R$ ','')} (${pertVista}%)</div>
            <div>A prazo:<br>${fmt(tVendaPrazo).replace('R$ ','')} (${pertPrazo}%)</div>
          </div>
        </div>

        <div style="background:#20bf6b;border-radius:6px;padding:16px;color:#fff;box-shadow:0 3px 6px rgba(32,191,107,0.2);">
          <div style="font-weight:700;font-size:12px;display:flex;align-items:center;gap:6px;margin-bottom:8px;">
            <i data-lucide="arrow-down" style="width:14px;"></i> Total fundo caixa <i data-lucide="info" style="width:12px;opacity:0.7;"></i>
          </div>
          <div style="font-size:20px;font-weight:800;letter-spacing:-0.5px;margin-bottom:12px;">${fmt(tFundo)}</div>
        </div>

        <div style="background:#2ecc71;border-radius:6px;padding:16px;color:#fff;box-shadow:0 3px 6px rgba(46,204,113,0.2);">
          <div style="font-weight:700;font-size:12px;display:flex;align-items:center;gap:6px;margin-bottom:8px;">
            <i data-lucide="arrow-down" style="width:14px;"></i> Total recebido <i data-lucide="info" style="width:12px;opacity:0.7;"></i>
          </div>
          <div style="font-size:20px;font-weight:800;letter-spacing:-0.5px;margin-bottom:12px;">${fmt(tTotalRec)}</div>
          <div style="display:flex;gap:30px;font-size:10px;font-weight:600;opacity:0.9;">
            <div>À vista:<br>${fmt(tRecVista).replace('R$ ','')}</div>
            <div>Crediário:<br>${fmt(tRecCred).replace('R$ ','')}</div>
          </div>
        </div>

        <div style="background:#ff9f43;border-radius:6px;padding:16px;color:#fff;box-shadow:0 3px 6px rgba(255,159,67,0.2);">
          <div style="font-weight:700;font-size:12px;display:flex;align-items:center;gap:6px;margin-bottom:8px;">
            <i data-lucide="arrow-up" style="width:14px;"></i> Total pago <i data-lucide="info" style="width:12px;opacity:0.7;"></i>
          </div>
          <div style="font-size:20px;font-weight:800;letter-spacing:-0.5px;margin-bottom:12px;">${fmt(tTotalPago)}</div>
          <div style="display:flex;gap:30px;font-size:10px;font-weight:600;opacity:0.9;">
            <div>Despesa:<br>${fmt(tPagoDesp).replace('R$ ','')}</div>
            <div>Sangria:<br>${fmt(tPagoSangria).replace('R$ ','')}</div>
          </div>
        </div>

        <div style="background:#4bacfe;border-radius:6px;padding:16px;color:#fff;box-shadow:0 3px 6px rgba(79,172,254,0.2);">
          <div style="font-weight:700;font-size:12px;display:flex;align-items:center;gap:6px;margin-bottom:8px;">
            <i data-lucide="arrow-right" style="width:14px;"></i> Saldo <i data-lucide="info" style="width:12px;opacity:0.7;"></i>
          </div>
          <div style="font-size:20px;font-weight:800;letter-spacing:-0.5px;margin-bottom:12px;">${fmt(grandSaldo)}</div>
        </div>

      </div>

      <!-- TABELA CAIXA MENSAL -->
      <div style="background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.02);overflow-x:auto;border:1px solid #f1f2f6;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;white-space:nowrap;">
          <thead style="background:#fff;border-bottom:2px solid #f1f2f6;">
            <tr>
               <th style="padding:14px;text-align:center;color:var(--text);font-weight:700;">Data</th>
               <th style="padding:14px;text-align:center;color:#20bf6b;font-weight:700;">Fundo Caixa</th>
               <th style="padding:14px;text-align:center;color:#2ecc71;font-weight:700;">À Vista</th>
               <th style="padding:14px;text-align:center;color:#2ecc71;font-weight:700;">Crediário</th>
               <th style="padding:14px;text-align:center;color:#27ae60;font-weight:800;">Total Recebido</th>
               <th style="padding:14px;text-align:center;color:#e74c3c;font-weight:700;">Despesa</th>
               <th style="padding:14px;text-align:center;color:#e74c3c;font-weight:700;">Sangria Caixa</th>
               <th style="padding:14px;text-align:center;color:#c0392b;font-weight:800;">Total Pago</th>
               <th style="padding:14px;text-align:center;color:#4facfe;font-weight:800;">Saldo</th>
               <th style="padding:14px;text-align:center;color:var(--text);font-weight:800;">Dinheiro</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="10" style="text-align:center;padding:24px;color:#95a5a6;">Nenhum registro para o período selecionado</td></tr>`}
          </tbody>
          <tfoot style="background:#fcfcfc;border-top:2px solid #eee;">
            <tr>
              <td style="padding:14px;text-align:center;font-weight:800;color:var(--text);font-size:13px;">Totais</td>
              <td style="padding:14px;text-align:center;font-weight:800;color:#20bf6b;">${fmt(tFundo).replace('R$ ','')}</td>
              <td style="padding:14px;text-align:center;font-weight:800;color:#2ecc71;">${fmt(tRecVista).replace('R$ ','')}</td>
              <td style="padding:14px;text-align:center;font-weight:800;color:#2ecc71;">${fmt(tVendaPrazo).replace('R$ ','')}</td>
              <td style="padding:14px;text-align:center;font-weight:800;color:#27ae60;">${fmt(tTotalRec).replace('R$ ','')}</td>
              <td style="padding:14px;text-align:center;font-weight:800;color:#e74c3c;">${fmt(tPagoDesp).replace('R$ ','')}</td>
              <td style="padding:14px;text-align:center;font-weight:800;color:#e74c3c;">${fmt(tPagoSangria).replace('R$ ','')}</td>
              <td style="padding:14px;text-align:center;font-weight:800;color:#c0392b;">${fmt(tTotalPago).replace('R$ ','')}</td>
              <td style="padding:14px;text-align:center;font-weight:800;color:#4facfe;">${fmt(grandSaldo).replace('R$ ','')}</td>
              <td style="padding:14px;text-align:center;font-weight:800;color:var(--text);">${fmt(tSaldoDinheiro).replace('R$ ','')}</td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  `;
  try { document.getElementById('sel-cmes').value = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][parseInt(month)-1]; } catch(e){}
  lucide.createIcons();
}

// ===== OPERAÇÕES DE CAIXA =====
async function renderOperacoesCaixa() {
  const dataStore = document.getElementById('opcx-data')?.value || new Date().toISOString().split('T')[0];
  
  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-success" style="background:#2ecc71;border:none;border-radius:20px;padding:8px 16px;color:#fff;font-weight:700;display:flex;align-items:center;gap:6px;" onclick="openOperacaoCaixaModal()">
      <i data-lucide="plus" style="width:18px;"></i> Nova Operação de Caixa
    </button>
  `;

  // Buscar movimentos do caixa dessa data
  const {data:movs} = await sb.from('movimentos_caixa').select('*').gte('created_at', dataStore+'T00:00:00').lte('created_at', dataStore+'T23:59:59').order('created_at',{ascending:false});
  
  const movRows = (movs||[]).map(m => `
    <tr>
      <td style="color:var(--text-2);font-weight:600;text-align:center;">${fmtDatetime(m.created_at)}</td>
      <td style="text-align:center;">
        <span style="display:inline-block;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;background:${m.tipo==='suprimento'||m.tipo==='entrada'?'#eafaf1':'#fbeee6'};color:${m.tipo==='suprimento'||m.tipo==='entrada'?'#27ae60':'#e67e22'};text-transform:capitalize;">${m.tipo}</span>
      </td>
      <td style="text-align:center;color:var(--text);font-weight:600;">${m.descricao||'—'}</td>
      <td style="text-align:center;font-weight:700;color:${m.tipo==='suprimento'||m.tipo==='entrada'?'#27ae60':'#c0392b'};">${fmt(m.valor)}</td>
      <td style="text-align:center;color:var(--text-3);font-weight:600;">Administrador</td>
      <td style="text-align:center;">
         <button class="btn btn-sm btn-danger" onclick="deleteOpCaixa('${m.id}')" title="Excluir" style="background:transparent;color:#e74c3c;border:none;box-shadow:none;"><i data-lucide="trash-2"></i></button>
      </td>
    </tr>
  `).join('');

  document.getElementById('content').innerHTML = `
    <div style="font-family:var(--font-sans);padding-bottom:30px;">
      
      <div style="display:flex; align-items:center; gap:8px; background:#fff; padding:8px 14px; border-radius:6px; width:fit-content; border:1px solid #e1e8ed; margin-bottom:18px; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
        <span style="font-weight:700;font-size:13px;color:#2c3e50;">Caixa dia:</span>
        <input type="date" id="opcx-data" value="${dataStore}" onchange="renderOperacoesCaixa()" style="border:none; outline:none; font-weight:700; font-family:var(--font-sans); color:#7f8c8d; background:transparent;">
        <i data-lucide="calendar" style="color:#bdc3c7;width:16px;height:16px;"></i>
      </div>

      <div style="background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.02);overflow-x:auto;border:1px solid #f1f2f6;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead style="background:#fcfcfc;border-bottom:2px solid #f1f2f6;">
            <tr>
               <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Data Operação</th>
               <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Tipo Operação</th>
               <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Descrição</th>
               <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Valor</th>
               <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Quem</th>
               <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Ação</th>
            </tr>
          </thead>
          <tbody>
            ${movs && movs.length > 0 ? movRows : `
              <tr><td colspan="6" style="padding:60px 0;text-align:center;color:#95a5a6;background:#fdfdfd;">
                <i data-lucide="arrow-left-right" style="width:40px;height:40px;color:#bdc3c7;margin-bottom:12px;opacity:0.6;"></i><br>
                <span style="font-weight:600;font-size:14px;color:#7f8c8d;">Nenhuma Operação de caixa</span>
              </td></tr>
            `}
          </tbody>
        </table>
      </div>

    </div>
  `;
  lucide.createIcons();
}

async function openOperacaoCaixaModal() {
  openModal(`
    <style>
      .oc-modal-focus:focus { border-color:#3498db !important; box-shadow:0 0 0 3px rgba(52,152,219,0.15) !important; }
    </style>
    <div class="modal-header" style="border-bottom:none;padding-bottom:10px;">
      <h3 style="color:#2c3e50;font-weight:800;font-size:18px;">Nova Operação de Caixa</h3>
    </div>
    <div class="modal-body" style="padding-top:0;">
      <div class="form-grid" style="display:flex;flex-direction:column;gap:14px;">
        <div class="form-group">
          <label style="color:#c0392b;font-weight:800;font-size:12px;margin-bottom:6px;display:block;">Operação *</label>
          <select id="oc-tipo" class="oc-modal-focus" style="width:100%;border:1px solid #3498db;border-radius:6px;padding:10px 14px;color:#2c3e50;font-weight:600;outline:none;background:#fff;transition:all .2s;">
            <option value="">Selecione</option>
            <option value="suprimento">Suprimento (Entrada)</option>
            <option value="sangria">Sangria (Saída)</option>
          </select>
        </div>
        <div class="form-group">
          <label style="color:#2c3e50;font-weight:800;font-size:12px;margin-bottom:6px;display:block;">Descrição</label>
          <input id="oc-desc" class="oc-modal-focus" placeholder="Descrição" style="width:100%;border:1px solid #3498db;border-radius:6px;padding:10px 14px;color:#2c3e50;outline:none;transition:all .2s;font-weight:600;">
        </div>
        <div class="form-group">
          <label style="color:#c0392b;font-weight:800;font-size:12px;margin-bottom:6px;display:block;">Valor *</label>
          <input id="oc-val" class="oc-modal-focus" type="number" step="0.01" style="width:100%;border:1px solid #ecf0f1;border-radius:6px;padding:10px 14px;color:#2c3e50;outline:none;transition:all .2s;font-weight:800;">
        </div>
      </div>
    </div>
    <div class="modal-footer" style="border-top:none;display:flex;justify-content:space-between;padding-top:20px;">
      <button class="btn" style="background:#e74c3c;color:#fff;border-radius:20px;padding:8px 24px;font-weight:800;border:none;display:flex;align-items:center;gap:6px;box-shadow:0 3px 6px rgba(231,76,60,0.2);" onclick="closeModalDirect()">
        <i data-lucide="arrow-left" style="width:14px;"></i> Voltar
      </button>
      <button class="btn" style="background:#3498db;color:#fff;border-radius:20px;padding:8px 24px;font-weight:800;border:none;display:flex;align-items:center;gap:6px;box-shadow:0 3px 6px rgba(52,152,219,0.2);" onclick="saveOperacaoCaixa()">
        <i data-lucide="thumbs-up" style="width:14px;"></i> Salvar
      </button>
    </div>
  `, 'modal-sm');
  lucide.createIcons();
}

async function saveOperacaoCaixa() {
  const tipo = document.getElementById('oc-tipo').value;
  const desc = document.getElementById('oc-desc').value.trim();
  const val = parseFloat(document.getElementById('oc-val').value||0);
  
  if(!tipo) return toast('Selecione a operação (Suprimento/Sangria)','error');
  if(val<=0 || isNaN(val)) return toast('Informe um valor numérico válido','error');

  const {data:cxAber} = await sb.from('caixas').select('*').eq('status','aberto').order('created_at',{ascending:false}).limit(1);
  const cx = cxAber?.[0];
  if(!cx) return toast('Atenção: Não há um caixa aberto no sistema. Vá ao Caixa Diário e abra-o primeiro.','error');

  await sb.from('movimentos_caixa').insert({
    caixa_id: cx.id,
    tipo: tipo,
    descricao: desc || (tipo==='suprimento'?'Suprimento Manual':'Sangria Manual'),
    valor: val
  });

  closeModalDirect();
  toast('Sua operação foi lançada com sucesso no Caixa!');
  renderOperacoesCaixa();
}

async function deleteOpCaixa(id) {
  if(!confirm('Atenção: Deseja realmente excluir esta operação de caixa permanentemente?')) return;
  await sb.from('movimentos_caixa').delete().eq('id',id);
  toast('Registro excluído!');
  renderOperacoesCaixa();
}

// ===== PAINEL DE DESPESAS =====
async function renderPainelDespesas() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const m = `${year}-${month}`;

  document.getElementById('topbar-actions').innerHTML = '';

  document.getElementById('content').innerHTML = '<div class="loading" style="padding-top:60px;text-align:center;"><div class="sk" style="height:20px;width:200px;margin:0 auto 8px;background:#eee;border-radius:4px;"></div></div>';

  const {data:desps} = await sb.from('despesas').select('*, classificacoes(nome)').gte('vencimento', m+'-01').lte('vencimento', m+'-31');

  let totalDesp = 0;
  let totalPagas = 0;
  let totalApagar = 0;

  let byClass = {};
  let byDate = {};
  let byCiclo = {};

  (desps||[]).forEach(d => {
    let val = parseFloat(d.valor||0);
    totalDesp += val;
    let isPaga = d.status === 'pago';
    if(isPaga) totalPagas += val; else totalApagar += val;

    let clsName = d.classificacoes?.nome || 'Outros';
    if(!byClass[clsName]) byClass[clsName] = {total:0, pagas:0, apagar:0};
    byClass[clsName].total += val;
    byClass[clsName][isPaga ? 'pagas' : 'apagar'] += val;

    let dt = (d.vencimento||'').split('T')[0];
    if(dt) {
      if(!byDate[dt]) byDate[dt] = {total:0, pagas:0, apagar:0};
      byDate[dt].total += val;
      byDate[dt][isPaga ? 'pagas' : 'apagar'] += val;
    }

    let ciclo = d.ciclo_pagamento || 'Mensal';
    if(ciclo === 'Unico' || ciclo === 'unico' || !ciclo) ciclo = 'Único';
    if(!byCiclo[ciclo]) byCiclo[ciclo] = {total:0, pagas:0, apagar:0};
    byCiclo[ciclo].total += val;
    byCiclo[ciclo][isPaga ? 'pagas' : 'apagar'] += val;
  });

  const percentScore = (v) => totalDesp > 0 ? Math.round((v.total/totalDesp)*100) : 0;

  const generateRows = (obj, formatKey=null) => {
    return Object.keys(obj).sort().map(k => {
      let v = obj[k];
      let rowPercStr = percentScore(v) + '%';
      
      let label = k;
      if(formatKey === 'date' && k.includes('-')) {
        label = k.split('-').reverse().slice(0,2).join('/') + '/' + k.substring(2,4); 
      }

      return `<tr>
        <td style="padding:16px;color:#7f8c8d;font-weight:600;">${label}</td>
        <td style="padding:16px;text-align:right;font-weight:700;color:var(--text);">${fmt(v.total).replace('R$ ','')}</td>
        <td style="padding:16px;text-align:right;font-weight:600;color:#27ae60;">${fmt(v.pagas).replace('R$ ','')}</td>
        <td style="padding:16px;text-align:right;font-weight:600;color:#e67e22;">${fmt(v.apagar).replace('R$ ','')}</td>
        <td style="padding:16px;text-align:center;font-weight:700;color:#95a5a6;">${rowPercStr}</td>
        <td style="padding:16px;text-align:center;"><i data-lucide="folder" style="width:14px;color:#e67e22;cursor:pointer;"></i></td>
      </tr>`;
    }).join('');
  };

  const cRows = generateRows(byClass);
  const dRows = generateRows(byDate, 'date');
  
  // Ciclos usually don't have the 'Ação' icon in the screenshot, so slightly different row gen:
  const cicRows = Object.keys(byCiclo).sort().map(k => {
      let v = byCiclo[k];
      let rowPercStr = percentScore(v) + '%';
      return `<tr>
        <td style="padding:16px;color:#7f8c8d;font-weight:600;">${k}</td>
        <td style="padding:16px;text-align:right;font-weight:700;color:var(--text);">${fmt(v.total).replace('R$ ','')}</td>
        <td style="padding:16px;text-align:right;font-weight:600;color:#27ae60;">${fmt(v.pagas).replace('R$ ','')}</td>
        <td style="padding:16px;text-align:right;font-weight:600;color:#e67e22;">${fmt(v.apagar).replace('R$ ','')}</td>
        <td style="padding:16px;text-align:center;font-weight:700;color:#95a5a6;">${rowPercStr}</td>
      </tr>`;
  }).join('');


  document.getElementById('content').innerHTML = `
    <div style="font-family:var(--font-sans);padding-bottom:50px;">
      
      <div style="display:flex;gap:12px;margin-bottom:24px;">
        <select style="padding:8px 16px;border:1px solid #e1e8ed;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:600;font-size:13px;">
          <option>${year}</option>
        </select>
        <select style="padding:8px 16px;border:1px solid #e1e8ed;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:600;font-size:13px;">
          <option>Abril</option>
        </select>
        <select style="padding:8px 16px;border:1px solid #e1e8ed;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:600;font-size:13px;">
          <option>Visão contábil</option>
        </select>
      </div>

      <!-- CARDS MENSURAÇÃO -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-bottom:30px;">
        
        <div style="background:#54a0ff;border-radius:8px;padding:24px;color:#fff;box-shadow:0 3px 10px rgba(84,160,255,0.25);">
          <div style="font-weight:800;font-size:14px;margin-bottom:4px;">Total</div>
          <div style="font-size:36px;font-weight:800;letter-spacing:-0.5px;">${fmt(totalDesp)}</div>
        </div>

        <div style="background:#2ed573;border-radius:8px;padding:24px;color:#fff;box-shadow:0 3px 10px rgba(46,213,115,0.25);">
          <div style="font-weight:800;font-size:14px;margin-bottom:4px;">Pagas</div>
          <div style="font-size:36px;font-weight:800;letter-spacing:-0.5px;">${fmt(totalPagas)}</div>
        </div>

        <div style="background:#ff9f43;border-radius:8px;padding:24px;color:#fff;box-shadow:0 3px 10px rgba(255,159,67,0.25);">
          <div style="font-weight:800;font-size:14px;margin-bottom:4px;">A pagar</div>
          <div style="font-size:36px;font-weight:800;letter-spacing:-0.5px;">${fmt(totalApagar)}</div>
        </div>

      </div>

      <!-- SESSÃO 1: Classificações & Datas -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
        
        <div style="background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.02);border:1px solid #f1f2f6;overflow:hidden;min-height:250px;">
           <div style="padding:16px 20px;font-weight:800;color:#3498db;font-size:14px;border-bottom:1px solid #f8f9fa;">Despesas por classificação</div>
           <div style="overflow-x:auto;">
             <table style="width:100%;border-collapse:collapse;font-size:12px;">
               <thead style="background:#fcfcfc;border-bottom:2px solid #f1f2f6;">
                 <tr>
                   <th style="padding:14px;text-align:left;color:#2c3e50;font-weight:800;"></th>
                   <th style="padding:14px;text-align:right;color:#2c3e50;font-weight:800;">Total</th>
                   <th style="padding:14px;text-align:right;color:#2c3e50;font-weight:800;">Pagas</th>
                   <th style="padding:14px;text-align:right;color:#2c3e50;font-weight:800;">A Pagar</th>
                   <th style="padding:14px;text-align:center;color:#2c3e50;font-weight:800;">%</th>
                   <th style="padding:14px;text-align:center;color:#2c3e50;font-weight:800;">Ação</th>
                 </tr>
               </thead>
               <tbody>${cRows || `<tr><td colspan="6" style="text-align:center;padding:40px;color:#bdc3c7;font-weight:600;">Sem dados para o mês selecionado</td></tr>`}</tbody>
             </table>
           </div>
        </div>

        <div style="background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.02);border:1px solid #f1f2f6;overflow:hidden;min-height:250px;">
           <div style="padding:16px 20px;font-weight:800;color:#3498db;font-size:14px;border-bottom:1px solid #f8f9fa;">Despesas por data vencimento dia útil</div>
           <div style="overflow-x:auto;">
             <table style="width:100%;border-collapse:collapse;font-size:12px;">
               <thead style="background:#fcfcfc;border-bottom:2px solid #f1f2f6;">
                 <tr>
                   <th style="padding:14px;text-align:left;color:#2c3e50;font-weight:800;"></th>
                   <th style="padding:14px;text-align:right;color:#2c3e50;font-weight:800;">Total</th>
                   <th style="padding:14px;text-align:right;color:#2c3e50;font-weight:800;">Pagas</th>
                   <th style="padding:14px;text-align:right;color:#2c3e50;font-weight:800;">A Pagar</th>
                   <th style="padding:14px;text-align:center;color:#2c3e50;font-weight:800;">%</th>
                   <th style="padding:14px;text-align:center;color:#2c3e50;font-weight:800;">Ação</th>
                 </tr>
               </thead>
               <tbody>${dRows || `<tr><td colspan="6" style="text-align:center;padding:40px;color:#bdc3c7;font-weight:600;">Sem dados para o mês selecionado</td></tr>`}</tbody>
             </table>
           </div>
        </div>

      </div>

      <!-- SESSÃO 2: Gráfico & Formas Pagt vazias -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
        
        <div style="background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.02);border:1px solid #f1f2f6;overflow:hidden;min-height:270px;display:flex;flex-direction:column;">
           <div style="padding:16px 20px;font-weight:800;color:#3498db;font-size:14px;border-bottom:1px solid #f8f9fa;">Despesas por classificação</div>
           <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;">
              <!-- Empty state graph or pure CSS gradient placeholder matching the UI screenshot -->
              ${totalDesp > 0 ? 
                `<div style="width:150px;height:150px;border-radius:50%;background:conic-gradient(#54a0ff 0% 30%, #2ed573 30% 50%, #ff9f43 50% 80%, #b762f0 80% 100%);box-shadow:0 0 0 6px #fff, 0 4px 15px rgba(0,0,0,0.1) inset;border:2px solid #fff;"></div>
                  <div style="margin-top:20px;font-size:11px;font-weight:700;color:#7f8c8d;text-align:center;">Gráfico em construção...</div>`
               : 
                `<i data-lucide="pie-chart" style="width:48px;height:48px;color:#ecf0f1;margin-bottom:12px;"></i>
                 <div style="color:#bdc3c7;font-weight:600;font-size:13px;">Sem dados para gerar gráfico</div>`
              }
           </div>
        </div>

        <div style="background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.02);border:1px solid #f1f2f6;overflow:hidden;min-height:270px;display:flex;flex-direction:column;">
           <div style="padding:16px 20px;font-weight:800;color:#3498db;font-size:14px;border-bottom:1px solid #f8f9fa;">Despesas pagas por forma pagamento</div>
           <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:40px;">
              ${totalPagas > 0 ? `<div style="color:#bdc3c7;font-weight:600;font-size:13px;">${fmt(totalPagas)} pagas... (Layout a definir)</div>` : `<div style="color:#bdc3c7;font-weight:600;font-size:13px;">Sem dados</div>`}
           </div>
        </div>

      </div>

      <!-- SESSÃO 3: Ciclos -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
        
        <div style="background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.02);border:1px solid #f1f2f6;overflow:hidden;min-height:200px;">
           <div style="padding:16px 20px;font-weight:800;color:#3498db;font-size:14px;border-bottom:1px solid #f8f9fa;">Ciclo despesa</div>
           <div style="overflow-x:auto;">
             <table style="width:100%;border-collapse:collapse;font-size:12px;">
               <thead style="background:#fcfcfc;border-bottom:2px solid #f1f2f6;">
                 <tr>
                   <th style="padding:14px;text-align:left;color:#2c3e50;font-weight:800;"></th>
                   <th style="padding:14px;text-align:right;color:#2c3e50;font-weight:800;">Total</th>
                   <th style="padding:14px;text-align:right;color:#2c3e50;font-weight:800;">Pagas</th>
                   <th style="padding:14px;text-align:right;color:#2c3e50;font-weight:800;">A Pagar</th>
                   <th style="padding:14px;text-align:center;color:#2c3e50;font-weight:800;">%</th>
                 </tr>
               </thead>
               <tbody>${cicRows || `<tr><td colspan="5" style="text-align:center;padding:40px;color:#bdc3c7;font-weight:600;">Sem dados no período</td></tr>`}</tbody>
             </table>
           </div>
        </div>

        <div style="background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.02);border:1px solid #f1f2f6;overflow:hidden;min-height:200px;">
           <div style="padding:16px 20px;font-weight:800;color:#3498db;font-size:14px;border-bottom:1px solid #f8f9fa;">Despesas pagas - Forma pagamento</div>
           <div style="overflow-x:auto;">
             <table style="width:100%;border-collapse:collapse;font-size:12px;">
               <thead style="background:#fcfcfc;border-bottom:2px solid #f1f2f6;">
                 <tr>
                   <th style="padding:14px;text-align:left;color:#2c3e50;font-weight:800;"></th>
                   <th style="padding:14px;text-align:right;color:#2c3e50;font-weight:800;">Valor pago</th>
                   <th style="padding:14px;text-align:center;color:#2c3e50;font-weight:800;">%</th>
                   <th style="padding:14px;text-align:center;color:#2c3e50;font-weight:800;">Ação</th>
                 </tr>
               </thead>
               <tbody><tr><td colspan="4" style="text-align:center;padding:40px;color:#bdc3c7;font-weight:600;">Sem dados no período</td></tr></tbody>
             </table>
           </div>
        </div>

      </div>

    </div>
  `;
  lucide.createIcons();
}

// ===== CADASTRAR CLASSIFICAÇÃO =====
async function renderCadastrarClassificacao() {
  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-success" style="border-radius:20px;padding:8px 24px;font-weight:700;" onclick="openClassificacaoModal()">
      <i data-lucide="plus"></i> Nova classificação
    </button>
  `;

  document.getElementById('content').innerHTML = '<div class="loading" style="padding-top:40px;text-align:center;"><div class="sk"></div></div>';

  const {data} = await sb.from('classificacoes').select('*').eq('tipo', 'despesa').order('nome');
  
  let rows = '';
  (data||[]).forEach(c => {
    let dt = c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : 'N/D';
    let visao = c.visao_contabil || 'Fixa';
    rows += `
      <tr style="border-bottom:1px solid #f1f2f6;">
        <td style="padding:16px;text-align:center;color:#7f8c8d;font-weight:600;">${dt}</td>
        <td style="padding:16px;text-align:center;color:#2c3e50;font-weight:700;">${visao}</td>
        <td style="padding:16px;text-align:center;color:#2c3e50;font-weight:600;">${c.nome}</td>
        <td style="padding:16px;text-align:center;">
          <div style="display:flex;gap:10px;justify-content:center;">
            <i data-lucide="edit-3" style="width:16px;color:#3498db;cursor:pointer;"></i>
            <i data-lucide="trash-2" style="width:16px;color:#e74c3c;cursor:pointer;" onclick="deleteClassificacao('${c.id}')"></i>
          </div>
        </td>
      </tr>
    `;
  });

  document.getElementById('content').innerHTML = `
    <div style="font-family:var(--font-sans);padding-bottom:50px;">
      
      <div style="display:flex;gap:12px;margin-bottom:24px;align-items:center;">
        <label style="font-weight:800;color:#2c3e50;font-size:13px;">Filtrar por visão contábil:</label>
        <select style="padding:8px 16px;border:1px solid #e1e8ed;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:600;font-size:13px;">
          <option>Todas...</option>
          <option>Fixa</option>
          <option>Variável</option>
        </select>
      </div>

      <div style="background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.02);border:1px solid #f1f2f6;overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead style="background:#fcfcfc;border-bottom:2px solid #f1f2f6;">
            <tr>
              <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Data Cadastro</th>
              <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Visão Contábil</th>
              <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Classificação ↑↓</th>
              <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Ação</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="4" style="text-align:center;padding:60px 0;color:#bdc3c7;font-weight:600;">Nenhuma classificação encontrada</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
  lucide.createIcons();
}

function openClassificacaoModal() {
  openModal(`
    <style>
      .cl-modal-focus:focus { border-color:#3498db !important; box-shadow:0 0 0 3px rgba(52,152,219,0.15) !important; }
    </style>
    <div class="modal-header" style="border-bottom:none;padding-bottom:10px;">
      <h3 style="color:#2c3e50;font-weight:800;font-size:18px;">Nova Classificação de Despesa</h3>
    </div>
    <div class="modal-body" style="padding-top:0;">
      <div style="display:flex;flex-direction:column;gap:16px;padding-top:10px;">
        <div class="form-group">
          <label style="color:#c0392b;font-weight:800;font-size:13px;margin-bottom:6px;display:block;">Visão Contábil *</label>
          <select id="cl-visao" class="cl-modal-focus" style="width:100%;border:1px solid #3498db;border-radius:6px;padding:10px 14px;color:#2c3e50;font-weight:600;outline:none;background:#fff;transition:border .2s;font-size:14px;">
            <option value="">Selecione</option>
            <option value="Fixa">Fixa</option>
            <option value="Variável">Variável</option>
          </select>
        </div>
        <div class="form-group">
          <label style="color:#c0392b;font-weight:800;font-size:13px;margin-bottom:6px;display:block;">Classificação *</label>
          <input id="cl-nome" class="cl-modal-focus" placeholder="Ex: Aluguel" style="width:100%;border:1px solid #e1e8ed;border-radius:6px;padding:10px 14px;color:#2c3e50;font-weight:600;outline:none;transition:border .2s;font-size:14px;">
        </div>
      </div>
    </div>
    <div class="modal-footer" style="border-top:none;display:flex;justify-content:space-between;padding-top:20px;">
      <button class="btn" style="background:#e74c3c;color:#fff;border-radius:20px;padding:8px 24px;font-weight:800;border:none;display:flex;align-items:center;gap:6px;box-shadow:0 3px 6px rgba(231,76,60,0.2);" onclick="closeModalDirect()">
        <i data-lucide="arrow-left" style="width:14px;"></i> Voltar
      </button>
      <button class="btn" style="background:#3498db;color:#fff;border-radius:20px;padding:8px 24px;font-weight:800;border:none;display:flex;align-items:center;gap:6px;box-shadow:0 3px 6px rgba(52,152,219,0.2);" onclick="saveClassificacao()">
        <i data-lucide="thumbs-up" style="width:14px;"></i> Salvar
      </button>
    </div>
  `, 'modal-md');
  lucide.createIcons();
}

async function saveClassificacao() {
  const visao = document.getElementById('cl-visao').value;
  const nome = document.getElementById('cl-nome').value.trim();
  if(!visao || !nome) return toast('Preencha visão contábil e a classificação!','error');

  await sb.from('classificacoes').insert({nome: nome, tipo: 'despesa', visao_contabil: visao});
  closeModalDirect();
  toast('Classificação salva!');
  renderCadastrarClassificacao();
}

async function deleteClassificacao(id) {
  if(!confirm('Atenção: Deseja excluir esta classificação?')) return;
  await sb.from('classificacoes').delete().eq('id',id);
  toast('Excluída com sucesso!');
  renderCadastrarClassificacao();
}

// ===== CONTAS BANCÁRIAS (SUBMENUS) =====
function renderConciliarExtrato() {
  document.getElementById('topbar-actions').innerHTML = '';
  document.getElementById('content').innerHTML = `
    <div style="font-family:var(--font-sans);padding-bottom:50px;">
      <h2 style="color:#2c3e50;font-weight:800;font-size:16px;margin-bottom:20px;">Conciliação Bancária pelo Extrato</h2>
      
      <div style="background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.02);border:1px solid #f1f2f6;overflow:hidden;">
        
        <div style="padding:16px 20px;">
          <div style="color:#e74c3c;font-weight:800;font-size:12px;margin-bottom:12px;">Buscar e Ler Arquivo de Extrato (OFX) *Funciona p/ os bancos: Itaú e Santander</div>
          <div style="display:flex;gap:12px;">
            <button class="btn" style="background:#3498db;color:#fff;border-radius:6px;padding:8px 16px;font-weight:700;border:none;display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
              <i data-lucide="plus" style="width:14px;"></i> Selecionar
            </button>
            <button class="btn" style="background:#f1f2f6;color:#a4b0be;border-radius:6px;padding:8px 16px;font-weight:700;border:none;display:flex;align-items:center;gap:6px;font-size:13px;cursor:not-allowed;">
              <i data-lucide="upload" style="width:14px;"></i> Salvar
            </button>
            <button class="btn" style="background:#f1f2f6;color:#a4b0be;border-radius:6px;padding:8px 16px;font-weight:700;border:none;display:flex;align-items:center;gap:6px;font-size:13px;cursor:not-allowed;">
              <i data-lucide="x" style="width:14px;"></i> Limpar
            </button>
          </div>
        </div>

        <div style="border-top:1px solid #f1f2f6;min-height:50px;background:#fff;"></div>

      </div>
    </div>
  `;
  lucide.createIcons();
}

function renderListarConciliacao() {
  document.getElementById('topbar-actions').innerHTML = '';
  document.getElementById('content').innerHTML = `
    <div style="font-family:var(--font-sans);padding-bottom:50px;">
      <h2 style="color:#2c3e50;font-weight:800;font-size:18px;margin-bottom:20px;">Listar Conciliação</h2>
      
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <div style="display:flex;gap:12px;">
          <select style="padding:8px 16px;border:1px solid #e1e8ed;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:600;font-size:13px;">
            <option>Mês</option>
          </select>
          <select style="padding:8px 16px;border:1px solid #e1e8ed;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:600;font-size:13px;">
            <option>2026</option>
          </select>
          <select style="padding:8px 16px;border:1px solid #e1e8ed;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:600;font-size:13px;">
            <option>Abril</option>
          </select>
          <select style="padding:8px 16px;border:1px solid #e1e8ed;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:600;font-size:13px;min-width:260px;">
            <option>Bradesco - 5395/0000001738-4</option>
          </select>
        </div>
        <button class="btn" style="background:#e1e8ed;color:#2c3e50;border-radius:20px;padding:6px 16px;font-weight:700;border:none;display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;" onclick="openLegendaConciliacaoModal()">
          <i data-lucide="info" style="width:14px;"></i> Legenda
        </button>
      </div>
      
      <div style="background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.02);border:1px solid #f1f2f6;overflow-x:auto;">
        <div style="padding:16px;text-align:center;font-weight:800;color:#2c3e50;border-bottom:1px solid #f1f2f6;font-size:14px;">
          Bradesco - 5395/0000001738-4
        </div>
        
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead style="background:#fcfcfc;border-bottom:1px solid #f1f2f6;">
            <tr>
              <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Data</th>
              <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Descrição</th>
              <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Valor</th>
              <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Status</th>
              <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Ação</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="5" style="text-align:center;padding:60px 0;color:#bdc3c7;font-weight:600;">Nenhuma conciliação encontrada neste período</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
  lucide.createIcons();
}

function openLegendaConciliacaoModal() {
  openModal(`
    <div class="modal-header" style="border-bottom:none;padding-bottom:10px;text-align:center;">
      <h3 style="color:#2c3e50;font-weight:800;font-size:16px;">Legenda</h3>
    </div>
    <div class="modal-body" style="padding-top:0;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tbody>
          <tr style="border-bottom:1px solid #f1f2f6;">
            <td style="padding:12px 16px;width:40px;"><div style="width:18px;height:18px;border-radius:50%;background:#bdc3c7;color:#fff;display:flex;align-items:center;justify-content:center;"><i data-lucide="x" style="width:12px;"></i></div></td>
            <td style="padding:12px 16px;color:#7f8c8d;font-weight:600;font-size:12px;">Movimento não está sendo validado</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f2f6;">
            <td style="padding:12px 16px;"><div style="width:18px;height:18px;border-radius:50%;background:#2ecc71;color:#fff;display:flex;align-items:center;justify-content:center;"><i data-lucide="check" style="width:12px;"></i></div></td>
            <td style="padding:12px 16px;color:#7f8c8d;font-weight:600;font-size:12px;">OK Movto identificado e valores batidos</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f2f6;">
            <td style="padding:12px 16px;"><div style="width:18px;height:18px;border-radius:50%;background:#3498db;color:#fff;display:flex;align-items:center;justify-content:center;"><i data-lucide="x" style="width:12px;"></i></div></td>
            <td style="padding:12px 16px;color:#7f8c8d;font-weight:600;font-size:12px;">OK Movto identificado mas valores NÃO batem</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;"><div style="width:18px;height:18px;border-radius:50%;background:#e74c3c;color:#fff;display:flex;align-items:center;justify-content:center;"><i data-lucide="x" style="width:12px;"></i></div></td>
            <td style="padding:12px 16px;color:#7f8c8d;font-weight:600;font-size:12px;">Movimento não identificado no sistema</td>
          </tr>
        </tbody>
      </table>
    </div>
  `, 'modal-sm');
  lucide.createIcons();
}

// ===== CADASTRAR CONTA CORRENTE =====
const BRAZILIAN_BANKS = [
  "001 - Banco do Brasil S.A.", "033 - Banco Santander (Brasil) S.A.", "104 - Caixa Econômica Federal", "237 - Banco Bradesco S.A.", "341 - Itaú Unibanco S.A.", "077 - Banco Inter S.A.", "260 - Nu Pagamentos S.A. (Nubank)", "380 - PicPay Serviços S.A.", "212 - Banco Original S.A.", "336 - Banco C6 S.A.", "290 - PagSeguro Internet IP S.A. (PagBank)", "323 - Mercado Pago IP Ltda.", "073 - Neon Pagamentos S.A.", "422 - Banco Safra S.A.", "003 - Banco da Amazônia S.A.", "004 - Banco do Nordeste do Brasil S.A.", "021 - BANESTES S.A.", "031 - Banco Beg S.A.", "32 - ZOOP TECNOLOGIA - PAYTIME",
  "318 - Banco BMG S.A.", "070 - BRB - Banco de Brasília", "047 - Banco do Estado de Sergipe", "041 - Banco do Estado do Rio Grande do Sul", "340 - Super Pagamentos e Adm de Meios Eletrônicos", "208 - Banco BTG Pactual S.A.", "Cora Sociedade de Crédito Direto S.A", "Banco XP S.A.", "Will Bank S.A.", "Banco Pan S.A.", "Banco Votorantim S.A. (Neon)", "Mercantil do Brasil", "Cielo S.A."
].sort();

async function renderCadastrarContaCorrente() {
  document.getElementById('topbar-actions').innerHTML = ''; // Limpado, movido pro header da pagina
  document.getElementById('content').innerHTML = '<div class="loading" style="padding-top:40px;text-align:center;"><div class="sk"></div></div>';

  const {data} = await sb.from('contas_correntes').select('*').order('created_at', {ascending: false});
  
  let rows = '';
  (data||[]).forEach(c => {
    let dtCad = c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : 'N/D';
    let dtSal = c.data ? new Date(c.data+'T12:00:00').toLocaleDateString('pt-BR') : 'N/D';
    let emiteBol = c.emite_boleto || 'Não';
    let sStatus = c.status === 1 ? 'checked' : '';
    let val = parseFloat(c.saldo||0);
    let colorVal = val >= 0 ? '#3498db' : '#e74c3c';

    rows += `
      <tr style="border-bottom:1px solid #f1f2f6;">
        <td style="padding:16px;text-align:center;color:#7f8c8d;font-weight:600;">${dtCad}</td>
        <td style="padding:16px;text-align:center;color:#2c3e50;font-weight:700;">${c.banco}</td>
        <td style="padding:16px;text-align:center;color:#7f8c8d;font-weight:600;">${c.agencia} / ${c.conta}</td>
        <td style="padding:16px;text-align:center;color:${colorVal};font-weight:700;">${fmt(val).replace('R$ ','')}</td>
        <td style="padding:16px;text-align:center;color:#7f8c8d;font-weight:600;">${dtSal}</td>
        <td style="padding:16px;text-align:center;color:#7f8c8d;font-weight:600;">${emiteBol}</td>
        <td style="padding:16px;text-align:center;">
          <input type="checkbox" ${sStatus} onchange="toggleStatusConta('${c.id}', this.checked)" style="accent-color:#3498db;cursor:pointer;width:34px;height:20px;border-radius:20px;position:relative;top:4px;">
        </td>
        <td style="padding:16px;text-align:center;">
          <div style="display:flex;gap:10px;justify-content:center;">
            <i data-lucide="edit-3" style="width:16px;color:#3498db;cursor:pointer;"></i>
            <i data-lucide="trash-2" style="width:16px;color:#e74c3c;cursor:pointer;" onclick="deleteConta('${c.id}')"></i>
          </div>
        </td>
      </tr>
    `;
  });

  document.getElementById('content').innerHTML = `
    <div style="font-family:var(--font-sans);padding-bottom:50px;">
      <h2 style="color:#2c3e50;font-weight:800;font-size:18px;margin-bottom:20px;">Cadastrar Conta Corrente</h2>
      
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <div style="display:flex;gap:12px;align-items:center;">
          <label style="font-weight:800;color:#2c3e50;font-size:13px;">Filtrar por status:</label>
          <select style="padding:8px 16px;border:1px solid #e1e8ed;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:600;font-size:13px;">
            <option>Ativa</option>
            <option>Inativa</option>
            <option>Todas</option>
          </select>
        </div>
        <button class="btn btn-success" style="border-radius:20px;padding:8px 24px;font-weight:800;border:none;display:flex;align-items:center;gap:6px;font-size:13px;" onclick="openContaCorrenteModal()">
          <i data-lucide="plus" style="width:14px;"></i> Nova conta corrente
        </button>
      </div>

      <div style="background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.02);border:1px solid #f1f2f6;overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead style="background:#fcfcfc;border-bottom:2px solid #f1f2f6;">
            <tr>
              <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Data Cadastro</th>
              <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Banco</th>
              <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Agência / Conta</th>
              <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Saldo</th>
              <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Data Saldo</th>
              <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Emite Boleto</th>
              <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Status</th>
              <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Ação</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="8" style="text-align:center;padding:60px;color:#bdc3c7;font-weight:600;">Nenhuma conta cadastrada</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
  lucide.createIcons();
}

function openContaCorrenteModal() {
  const bankOpts = BRAZILIAN_BANKS.map(b => `<option value="${b}">${b}</option>`).join('');
  let today = new Date().toISOString().split('T')[0];
  
  openModal(`
    <style>
      .cc-modal-f:focus { border-color:#3498db !important; box-shadow:0 0 0 3px rgba(52,152,219,0.15) !important; }
    </style>
    <div class="modal-header" style="border-bottom:none;padding-bottom:10px;">
      <h3 style="color:#2c3e50;font-weight:800;font-size:18px;">Nova Conta Corrente</h3>
    </div>
    <div class="modal-body" style="padding-top:0;">
      <div style="color:#34495e;font-weight:800;font-size:13px;margin-bottom:16px;">Nova Conta Corrente</div>
      
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="form-group">
          <label style="color:#c0392b;font-weight:800;font-size:12px;margin-bottom:6px;display:block;">Banco *</label>
          <select id="cc-banco" class="cc-modal-f" style="width:100%;border:1px solid #3498db;border-radius:6px;padding:10px 14px;color:#2c3e50;font-weight:600;outline:none;background:#fff;transition:border .2s;font-size:14px;">
            <option value="">Selecione</option>
            ${bankOpts}
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="form-group">
            <label style="color:#c0392b;font-weight:800;font-size:12px;margin-bottom:6px;display:block;">Agência *</label>
            <input type="text" id="cc-agencia" class="cc-modal-f" style="width:100%;border:1px solid #e1e8ed;border-radius:6px;padding:10px 14px;color:#2c3e50;font-weight:600;outline:none;font-size:14px;">
          </div>
          <div class="form-group">
            <label style="color:#c0392b;font-weight:800;font-size:12px;margin-bottom:6px;display:block;">Conta *</label>
            <input type="text" id="cc-conta" class="cc-modal-f" style="width:100%;border:1px solid #e1e8ed;border-radius:6px;padding:10px 14px;color:#2c3e50;font-weight:600;outline:none;font-size:14px;">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="form-group">
            <label style="color:#c0392b;font-weight:800;font-size:12px;margin-bottom:6px;display:block;">Saldo *</label>
            <input type="number" step="0.01" id="cc-saldo" placeholder="0,00" class="cc-modal-f" style="width:100%;border:1px solid #e1e8ed;border-radius:6px;padding:10px 14px;color:#2c3e50;font-weight:600;outline:none;font-size:14px;">
          </div>
          <div class="form-group">
            <label style="color:#c0392b;font-weight:800;font-size:12px;margin-bottom:6px;display:block;">Data *</label>
            <input type="date" id="cc-data" value="${today}" class="cc-modal-f" style="width:100%;border:1px solid #e1e8ed;border-radius:6px;padding:10px 14px;color:#2c3e50;font-weight:600;outline:none;font-size:14px;color:#7f8c8d;">
          </div>
        </div>

        <div class="form-group" style="padding-top:8px;">
          <label style="color:#2c3e50;font-weight:800;font-size:13px;margin-bottom:6px;display:block;">Emitir boleto?</label>
          <div style="display:flex;gap:16px;align-items:center;">
             <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#2c3e50;cursor:pointer;">
               <input type="radio" name="cc-boleto" value="Não" checked style="accent-color:#3498db;width:16px;height:16px;"> Não
             </label>
             <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#2c3e50;cursor:pointer;">
               <input type="radio" name="cc-boleto" value="Sim" style="accent-color:#3498db;width:16px;height:16px;"> Sim
             </label>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer" style="border-top:none;display:flex;justify-content:space-between;padding-top:20px;">
      <button class="btn" style="background:#e74c3c;color:#fff;border-radius:20px;padding:8px 24px;font-weight:800;border:none;display:flex;align-items:center;gap:6px;box-shadow:0 3px 6px rgba(231,76,60,0.2);" onclick="closeModalDirect()">
        <i data-lucide="arrow-left" style="width:14px;"></i> Voltar
      </button>
      <div style="display:flex;gap:12px;">
        <button class="btn" style="background:#f1f2f6;color:#a4b0be;border-radius:20px;padding:8px 24px;font-weight:800;border:none;display:flex;align-items:center;gap:6px;cursor:pointer;" onclick="document.querySelectorAll('.cc-modal-f').forEach(el=>el.value='')">
          <i data-lucide="x" style="width:14px;"></i> Limpar
        </button>
        <button class="btn" style="background:#3498db;color:#fff;border-radius:20px;padding:8px 24px;font-weight:800;border:none;display:flex;align-items:center;gap:6px;box-shadow:0 3px 6px rgba(52,152,219,0.2);" onclick="saveContaCorrente()">
          <i data-lucide="thumbs-up" style="width:14px;"></i> Salvar
        </button>
      </div>
    </div>
  `, 'modal-md');
  lucide.createIcons();
}

async function saveContaCorrente() {
  const banco = document.getElementById('cc-banco').value;
  const agencia = document.getElementById('cc-agencia').value.trim();
  const conta = document.getElementById('cc-conta').value.trim();
  const saldo = document.getElementById('cc-saldo').value;
  const dt = document.getElementById('cc-data').value;
  const boleto = document.querySelector('input[name="cc-boleto"]:checked').value;

  if(!banco || !agencia || !conta || !saldo || !dt) return toast('Preencha todos os campos obrigatórios (*)','error');

  await sb.from('contas_correntes').insert({
    banco, agencia, conta, saldo: parseFloat(saldo), data: dt, emite_boleto: boleto, status: 1
  });

  closeModalDirect();
  toast('Conta corrente salva!');
  renderCadastrarContaCorrente();
}

async function deleteConta(id) {
  if(!confirm('Atenção: Excluir esta conta?')) return;
  await sb.from('contas_correntes').delete().eq('id',id);
  toast('Excluída com sucesso!');
  renderCadastrarContaCorrente();
}

async function toggleStatusConta(id, checked) {
  await sb.from('contas_correntes').update({status: checked ? 1 : 0}).eq('id',id);
  toast('Status alterado!');
}

// ===== FLUXO DE CAIXA =====
function renderFluxoCaixa() {
  document.getElementById('topbar-actions').innerHTML = '';
  document.getElementById('content').innerHTML = `
    <div style="font-family:var(--font-sans);padding-bottom:50px;">
      <h2 style="color:#2c3e50;font-weight:800;font-size:18px;margin-bottom:20px;">Fluxo de Caixa</h2>
      
      <div style="background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.02);border:1px solid #f1f2f6;overflow:hidden;margin-bottom:16px;">
        <div style="padding:16px 20px;border-bottom:1px solid #f1f2f6;display:flex;align-items:center;gap:16px;">
          <label style="font-weight:800;color:#2c3e50;font-size:13px;">Informe o Ano/Mês:</label>
          <select style="padding:6px 12px;border:1px solid #e1e8ed;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:600;font-size:13px;width:100px;">
            <option>2026</option>
          </select>
          <select style="padding:6px 12px;border:1px solid #e1e8ed;border-radius:6px;outline:none;background:#fff;color:var(--text);font-weight:600;font-size:13px;width:120px;">
            <option>Abril</option>
          </select>
        </div>

        <div style="padding:16px 20px 0;">
          <div style="display:flex;gap:8px;">
            <button style="background:#fff;border:1px solid #e1e8ed;border-bottom:none;border-radius:8px 8px 0 0;padding:10px 24px;font-weight:800;color:#3498db;font-size:13px;box-shadow:0 -4px 6px -4px rgba(0,0,0,0.05);cursor:pointer;position:relative;top:1px;">Previsto</button>
            <button style="background:transparent;border:none;padding:10px 24px;font-weight:700;color:#7f8c8d;font-size:13px;cursor:pointer;">Realizado</button>
          </div>
        </div>

        <div style="border-top:1px solid #e1e8ed;overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead style="background:#fcfcfc;border-bottom:1px solid #f1f2f6;">
              <tr>
                <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Data</th>
                <th style="padding:16px;text-align:center;color:#2ecc71;font-weight:800;">Fluxo Caixa Diário</th>
                <th style="padding:16px;text-align:center;color:#2ecc71;font-weight:800;">Contas a Receber</th>
                <th style="padding:16px;text-align:center;color:#2ecc71;font-weight:800;">Total Entrada</th>
                <th style="padding:16px;text-align:center;color:#e67e22;font-weight:800;">Contas a Pagar</th>
                <th style="padding:16px;text-align:center;color:#3498db;font-weight:800;">Total Geral</th>
                <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Saldo</th>
                <th style="padding:16px;text-align:center;color:#2c3e50;font-weight:800;">Ação</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colspan="8" style="text-align:center;padding:60px 0;color:#bdc3c7;font-weight:600;">Sem registros de fluxo neste período</td></tr>
            </tbody>
            <tfoot style="background:#fcfcfc;border-top:2px solid #e1e8ed;">
              <tr>
                <td style="padding:12px 16px;text-align:right;color:#2c3e50;font-weight:800;">Totais:</td>
                <td style="padding:12px 16px;text-align:center;color:#2ecc71;font-weight:800;">0,00</td>
                <td style="padding:12px 16px;text-align:center;color:#2ecc71;font-weight:800;">0,00</td>
                <td style="padding:12px 16px;text-align:center;color:#2ecc71;font-weight:800;">0,00</td>
                <td style="padding:12px 16px;text-align:center;color:#e74c3c;font-weight:800;">0,00</td>
                <td style="padding:12px 16px;text-align:center;color:#3498db;font-weight:800;">0,00</td>
                <td style="padding:12px 16px;text-align:center;color:#3498db;font-weight:800;">0,00</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      <div style="display:flex;justify-content:flex-end;">
        <button class="btn" style="background:#e1e8ed;color:#2c3e50;border-radius:20px;padding:6px 20px;font-weight:700;border:none;display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;">
          <i data-lucide="file-down" style="width:14px;height:14px;"></i> Exportar
        </button>
      </div>
    </div>
  `;
  lucide.createIcons();
}

// ===== CARTÕES =====

function _cartoesShell(subtitulo, conteudo) {
  document.getElementById('content').innerHTML = `
    <div style="max-width:1100px;margin:0 auto;padding:4px 0">
      <div style="background:#fff;border:1px solid var(--border);border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:20px 28px;display:flex;align-items:center;gap:12px">
          <i data-lucide="credit-card" style="width:22px;height:22px;color:#fff"></i>
          <div>
            <div style="color:#fff;font-weight:800;font-size:16px">Cartões</div>
            <div style="color:rgba(255,255,255,0.65);font-size:12px">${subtitulo}</div>
          </div>
        </div>
        <div style="padding:28px">${conteudo}</div>
      </div>
    </div>`;
  lucide.createIcons();
}

async function renderCartoesVendas() {
  const {data:vendas} = await sb.from('vendas')
    .select('numero_venda,total,forma_pagamento,created_at,parcelas')
    .ilike('forma_pagamento','%cart%').eq('status','concluida').order('created_at',{ascending:false}).limit(100);

  const rows = (vendas||[]).map(v=>`
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:9px 12px;font-weight:700">#${v.numero_venda||'—'}</td>
      <td style="padding:9px 12px">${new Date(v.created_at).toLocaleDateString('pt-BR')}</td>
      <td style="padding:9px 12px">${v.forma_pagamento||'—'}</td>
      <td style="padding:9px 12px;text-align:center">${v.parcelas||1}x</td>
      <td style="padding:9px 12px;text-align:right;font-weight:700;color:#16a34a">R$ ${fmt(v.total)}</td>
    </tr>`).join('') || '<tr><td colspan="5" style="padding:32px;text-align:center;color:var(--text-2)">Nenhuma venda no cartão encontrada</td></tr>';

  const total = (vendas||[]).reduce((a,v)=>a+parseFloat(v.total||0),0);
  _cartoesShell('Suas vendas no cartão', `
    <div style="display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap">
      <div style="background:#eff6ff;border-radius:8px;padding:14px 20px;flex:1;min-width:160px">
        <div style="font-size:11px;color:#3b82f6;font-weight:700;text-transform:uppercase">Total vendas</div>
        <div style="font-size:22px;font-weight:900;color:#1e40af">R$ ${fmt(total)}</div>
      </div>
      <div style="background:#f0fdf4;border-radius:8px;padding:14px 20px;flex:1;min-width:160px">
        <div style="font-size:11px;color:#16a34a;font-weight:700;text-transform:uppercase">Qtde transações</div>
        <div style="font-size:22px;font-weight:900;color:#15803d">${(vendas||[]).length}</div>
      </div>
    </div>
    <div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead style="background:#f8fafc">
          <tr><th style="padding:10px 12px;text-align:left">Nº Venda</th><th style="padding:10px 12px;text-align:left">Data</th><th style="padding:10px 12px;text-align:left">Bandeira/Forma</th><th style="padding:10px 12px;text-align:center">Parcelas</th><th style="padding:10px 12px;text-align:right">Valor</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`);
}

async function renderCartoesPagamentos() {
  _cartoesShell('Seus pagamentos recebidos', `
    <div style="text-align:center;padding:40px;color:var(--text-2)">
      <i data-lucide="receipt" style="width:48px;height:48px;opacity:0.3;margin-bottom:12px"></i>
      <div style="font-weight:700">Pagamentos de cartão</div>
      <div style="font-size:13px;margin-top:6px">Integre com sua operadora de cartão para visualizar os créditos agendados.</div>
    </div>`);
}

async function renderCartoesVisaoGeral() {
  const {data:vendas} = await sb.from('vendas')
    .select('total,forma_pagamento,parcelas').ilike('forma_pagamento','%cart%').eq('status','concluida');

  const porBandeira = {};
  (vendas||[]).forEach(v=>{
    const k = (v.forma_pagamento||'Outros').split('/')[0].trim();
    porBandeira[k] = (porBandeira[k]||0) + parseFloat(v.total||0);
  });
  const total = Object.values(porBandeira).reduce((a,b)=>a+b,0);
  const cores = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444'];

  const bars = Object.entries(porBandeira).map(([k,v],i)=>`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <div style="width:120px;font-size:12px;font-weight:600;color:var(--text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${k}</div>
      <div style="flex:1;height:10px;background:#e8edf3;border-radius:99px;overflow:hidden">
        <div style="height:100%;background:${cores[i%cores.length]};border-radius:99px;width:${total>0?Math.round(v/total*100):0}%"></div>
      </div>
      <div style="width:80px;text-align:right;font-size:12px;font-weight:700">R$ ${fmt(v)}</div>
      <div style="width:36px;text-align:right;font-size:11px;color:var(--text-2)">${total>0?Math.round(v/total*100):0}%</div>
    </div>`).join('') || '<div style="color:var(--text-2);text-align:center;padding:24px">Sem dados de cartão</div>';

  _cartoesShell('Visão geral', `
    <div style="font-weight:800;font-size:15px;margin-bottom:16px">Distribuição por bandeira</div>
    ${bars}
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-weight:800">
      <span>Total</span><span style="color:#2563eb">R$ ${fmt(total)}</span>
    </div>`);
}



// ===== ANTECIPAR PARCELAS =====

let _antecipacoes = [];
async function renderAnteciparParcelas() {
  const {data:parcelas} = await sb.from('crediario_parcelas')
    .select('id,numero_parcela,valor,vencimento,status,crediario_id')
    .eq('status','pendente').order('vencimento').limit(200);

  const rows = (parcelas||[]).map(p=>`
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:9px 12px;text-align:center"><input type="checkbox" class="antec-chk" data-id="${p.id}" data-val="${p.valor}"></td>
      <td style="padding:9px 12px">Crediário #${p.crediario_id}</td>
      <td style="padding:9px 12px;text-align:center">Parcela ${p.numero_parcela}</td>
      <td style="padding:9px 12px">${new Date(p.vencimento+'T00:00').toLocaleDateString('pt-BR')}</td>
      <td style="padding:9px 12px;text-align:right;font-weight:700">R$ ${fmt(p.valor)}</td>
    </tr>`).join('') || '<tr><td colspan="5" style="padding:32px;text-align:center;color:var(--text-2)">Nenhuma parcela pendente</td></tr>';

  document.getElementById('content').innerHTML = `
    <div style="max-width:1000px;margin:0 auto">
      <div style="background:#fff;border:1px solid var(--border);border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);padding:20px 28px;display:flex;align-items:center;gap:12px">
          <i data-lucide="zap" style="width:22px;height:22px;color:#fff"></i>
          <div>
            <div style="color:#fff;font-weight:800;font-size:16px">Antecipar Parcelas</div>
            <div style="color:rgba(255,255,255,0.65);font-size:12px">Selecione as parcelas a antecipar</div>
          </div>
        </div>
        <div style="padding:20px 28px">
          <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:16px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
            <div>
              <div style="font-size:12px;color:#7c3aed;font-weight:700">VALOR SELECIONADO</div>
              <div id="antec-total" style="font-size:24px;font-weight:900;color:#6d28d9">R$ 0,00</div>
            </div>
            <button onclick="_efetuarAntecipacao()" class="btn btn-primary" style="background:#7c3aed;border:none">
              <i data-lucide="zap" style="width:14px;height:14px"></i> Confirmar Antecipação
            </button>
          </div>
          <div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead style="background:#f8fafc"><tr>
                <th style="padding:10px 12px;text-align:center"><input type="checkbox" onchange="document.querySelectorAll('.antec-chk').forEach(c=>{c.checked=this.checked;_calcAntecTotal()})"></th>
                <th style="padding:10px 12px;text-align:left">Crediário</th>
                <th style="padding:10px 12px;text-align:center">Parcela</th>
                <th style="padding:10px 12px;text-align:left">Vencimento</th>
                <th style="padding:10px 12px;text-align:right">Valor</th>
              </tr></thead>
              <tbody id="antec-tbody" onchange="_calcAntecTotal()">${rows}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
  lucide.createIcons();
}
function _calcAntecTotal(){
  const total = [...document.querySelectorAll('.antec-chk:checked')].reduce((a,c)=>a+parseFloat(c.dataset.val||0),0);
  const el = document.getElementById('antec-total');
  if(el) el.textContent = 'R$ ' + fmt(total);
}
async function _efetuarAntecipacao(){
  const selecionados = [...document.querySelectorAll('.antec-chk:checked')].map(c=>c.dataset.id);
  if(!selecionados.length) return toast('Selecione ao menos uma parcela','error');
  if(!confirm(`Antecipar ${selecionados.length} parcela(s)?`)) return;
  for(const id of selecionados){
    await sb.from('crediario_parcelas').update({status:'pago',data_pagamento:new Date().toISOString().split('T')[0]}).eq('id',id);
  }
  // Salvar registro de antecipação
  const total = [...document.querySelectorAll('.antec-chk:checked')].reduce((a,c)=>a+parseFloat(c.dataset.val||0),0);
  const {data:atual} = await sb.from('configuracoes').select('valor').eq('chave','antecipacoes_hist').maybeSingle();
  const hist = atual?.valor ? JSON.parse(atual.valor) : [];
  hist.unshift({data:new Date().toISOString().split('T')[0],qtd:selecionados.length,valor:total});
  await sb.from('configuracoes').upsert({chave:'antecipacoes_hist',valor:JSON.stringify(hist.slice(0,100))});
  toast(`${selecionados.length} parcela(s) antecipada(s)!`,'success');
  renderAnteciparParcelas();
}

async function renderListarAntecipacoes() {
  const {data} = await sb.from('configuracoes').select('valor').eq('chave','antecipacoes_hist').maybeSingle();
  const hist = data?.valor ? JSON.parse(data.valor) : [];

  const rows = hist.map(h=>`
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:9px 12px">${new Date(h.data+'T00:00').toLocaleDateString('pt-BR')}</td>
      <td style="padding:9px 12px;text-align:center">${h.qtd} parcela(s)</td>
      <td style="padding:9px 12px;text-align:right;font-weight:700;color:#7c3aed">R$ ${fmt(h.valor)}</td>
    </tr>`).join('') || '<tr><td colspan="3" style="padding:32px;text-align:center;color:var(--text-2)">Nenhuma antecipação realizada</td></tr>';

  document.getElementById('content').innerHTML = `
    <div style="max-width:800px;margin:0 auto">
      <div style="background:#fff;border:1px solid var(--border);border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);padding:20px 28px;display:flex;align-items:center;gap:12px">
          <i data-lucide="list" style="width:22px;height:22px;color:#fff"></i>
          <div style="color:#fff;font-weight:800;font-size:16px">Histórico de Antecipações</div>
        </div>
        <div style="padding:24px">
          <div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead style="background:#f8fafc"><tr>
                <th style="padding:10px 12px;text-align:left">Data</th>
                <th style="padding:10px 12px;text-align:center">Parcelas</th>
                <th style="padding:10px 12px;text-align:right">Valor Total</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
  lucide.createIcons();
}


// ===== CARTÕES — MAQUINETAS & TAXAS =====

var _MAQUINETAS_DEFAULT = [
  { id:'cielo',       nome:'Cielo',       cor:'#003087', taxas:[
    {bandeira:'Todas',tipo:'Débito',parc:1,taxa:1.99},
    {bandeira:'Todas',tipo:'Crédito à vista',parc:1,taxa:2.99},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:6,taxa:3.59},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:12,taxa:4.59},
  ]},
  { id:'rede',        nome:'Rede',        cor:'#FF6600', taxas:[
    {bandeira:'Todas',tipo:'Débito',parc:1,taxa:1.69},
    {bandeira:'Todas',tipo:'Crédito à vista',parc:1,taxa:2.79},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:6,taxa:3.49},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:12,taxa:4.49},
  ]},
  { id:'stone',       nome:'Stone',       cor:'#00B14F', taxas:[
    {bandeira:'Todas',tipo:'Débito',parc:1,taxa:1.59},
    {bandeira:'Todas',tipo:'Crédito à vista',parc:1,taxa:2.69},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:6,taxa:3.49},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:12,taxa:4.49},
  ]},
  { id:'ton',         nome:'Ton',         cor:'#00B14F', taxas:[
    {bandeira:'Todas',tipo:'Débito',parc:1,taxa:1.59},
    {bandeira:'Todas',tipo:'Crédito à vista',parc:1,taxa:2.69},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:6,taxa:3.59},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:12,taxa:4.89},
  ]},
  { id:'pagseguro',   nome:'PagSeguro',   cor:'#0db800', taxas:[
    {bandeira:'Todas',tipo:'Débito',parc:1,taxa:1.99},
    {bandeira:'Todas',tipo:'Crédito à vista',parc:1,taxa:3.19},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:6,taxa:4.49},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:12,taxa:5.49},
  ]},
  { id:'mercadopago', nome:'Mercado Pago',cor:'#009ee3', taxas:[
    {bandeira:'Todas',tipo:'Débito',parc:1,taxa:1.58},
    {bandeira:'Todas',tipo:'Crédito à vista',parc:1,taxa:2.98},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:6,taxa:3.49},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:12,taxa:4.49},
  ]},
  { id:'sumup',       nome:'SumUp',       cor:'#1A1A2E', taxas:[
    {bandeira:'Todas',tipo:'Débito',parc:1,taxa:1.90},
    {bandeira:'Todas',tipo:'Crédito à vista',parc:1,taxa:2.90},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:6,taxa:3.90},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:12,taxa:4.90},
  ]},
  { id:'infinitepay', nome:'InfinitePay', cor:'#6C3CE1', taxas:[
    {bandeira:'Todas',tipo:'Débito',parc:1,taxa:1.38},
    {bandeira:'Todas',tipo:'Crédito à vista',parc:1,taxa:2.68},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:6,taxa:2.99},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:12,taxa:3.49},
  ]},
  { id:'getnet',      nome:'Getnet',      cor:'#EC0000', taxas:[
    {bandeira:'Todas',tipo:'Débito',parc:1,taxa:1.99},
    {bandeira:'Todas',tipo:'Crédito à vista',parc:1,taxa:2.99},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:6,taxa:3.79},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:12,taxa:4.79},
  ]},
  { id:'picpay',      nome:'PicPay',      cor:'#11C76F', taxas:[
    {bandeira:'Todas',tipo:'Débito',parc:1,taxa:1.99},
    {bandeira:'Todas',tipo:'Crédito à vista',parc:1,taxa:3.49},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:6,taxa:4.49},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:12,taxa:5.49},
  ]},
  { id:'safra',       nome:'Safra Pay',   cor:'#F26522', taxas:[
    {bandeira:'Todas',tipo:'Débito',parc:1,taxa:1.79},
    {bandeira:'Todas',tipo:'Crédito à vista',parc:1,taxa:2.89},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:6,taxa:3.69},
    {bandeira:'Todas',tipo:'Crédito parcelado',parc:12,taxa:4.69},
  ]},
];

let _maqData = null; // cache

async function _loadMaqData() {
  if(_maqData) return _maqData;
  const {data} = await sb.from('configuracoes').select('valor').eq('chave','cartoes_maquinetas_v2').maybeSingle();
  _maqData = data?.valor ? JSON.parse(data.valor) : JSON.parse(JSON.stringify(_MAQUINETAS_DEFAULT));
  return _maqData;
}

async function _saveMaqData() {
  await sb.from('configuracoes').upsert({chave:'cartoes_maquinetas_v2', valor:JSON.stringify(_maqData)});
}

async function renderCartoesMaquinas() {
  const maq = await _loadMaqData();
  _renderMaquinetasPage(maq, null);
}

async function renderCartoesTaxas() { renderCartoesMaquinas(); }

function _renderMaquinetasPage(maq, editKey) {
  // editKey = "maqIdx:taxaIdx" or null
  const cards = maq.map((m, mi) => {
    const taxaRows = m.taxas.map((t, ti) => {
      const key = `${mi}:${ti}`;
      if(editKey === key) {
        return `<tr style="background:#faf5ff;border-bottom:1px solid #e9d5ff">
          <td style="padding:6px 10px">
            <input id="ed-band" value="${t.bandeira}" style="width:90px;padding:4px 6px;border:1px solid #c4b5fd;border-radius:4px;font-size:12px">
          </td>
          <td style="padding:6px 10px">
            <select id="ed-tipo" style="padding:4px 6px;border:1px solid #c4b5fd;border-radius:4px;font-size:12px">
              ${['Débito','Crédito à vista','Crédito parcelado'].map(o=>`<option${o===t.tipo?' selected':''}>${o}</option>`).join('')}
            </select>
          </td>
          <td style="padding:6px 10px;text-align:center">
            <input id="ed-parc" type="number" min="1" max="12" value="${t.parc}" style="width:48px;padding:4px 6px;border:1px solid #c4b5fd;border-radius:4px;font-size:12px;text-align:center">
          </td>
          <td style="padding:6px 10px;text-align:right">
            <input id="ed-taxa" type="number" step="0.01" value="${t.taxa}" style="width:64px;padding:4px 6px;border:1px solid #c4b5fd;border-radius:4px;font-size:12px;text-align:right">%
          </td>
          <td style="padding:6px 10px;text-align:center;white-space:nowrap">
            <button onclick="_saveTaxaEdit(${mi},${ti})" style="background:#7c3aed;color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;margin-right:4px">✓ Salvar</button>
            <button onclick="_renderMaquinetasPage(window._maqData,null)" style="background:#f1f5f9;color:#64748b;border:none;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer">✕</button>
          </td>
        </tr>`;
      }
      const cor = t.tipo==='Débito'?'#0369a1':t.tipo==='Crédito à vista'?'#15803d':'#7c3aed';
      return `<tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:7px 10px;font-size:12px">${t.bandeira}</td>
        <td style="padding:7px 10px"><span style="font-size:11px;font-weight:700;color:${cor};background:${cor}15;padding:2px 8px;border-radius:10px">${t.tipo}</span></td>
        <td style="padding:7px 10px;text-align:center;font-size:12px">${t.parc}x</td>
        <td style="padding:7px 10px;text-align:right;font-weight:800;font-size:13px;color:#dc2626">${t.taxa}%</td>
        <td style="padding:7px 10px;text-align:center;white-space:nowrap">
          <button onclick="_renderMaquinetasPage(window._maqData,'${key}')" title="Editar" style="background:#eff6ff;color:#2563eb;border:none;border-radius:4px;width:26px;height:26px;cursor:pointer;font-size:12px">✏</button>
          <button onclick="_delTaxa(${mi},${ti})" title="Remover" style="background:#fef2f2;color:#dc2626;border:none;border-radius:4px;width:26px;height:26px;cursor:pointer;margin-left:2px;font-size:12px">✕</button>
        </td>
      </tr>`;
    }).join('');

    return `<div style="background:#fff;border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:16px">
      <div style="background:${m.cor};padding:12px 16px;display:flex;align-items:center;justify-content:space-between">
        <div style="color:#fff;font-weight:800;font-size:14px;display:flex;align-items:center;gap:8px">
          <i data-lucide="credit-card" style="width:16px;height:16px"></i>${m.nome}
        </div>
        <div style="display:flex;gap:6px">
          <button onclick="_addTaxaForm(${mi})" style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:4px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer">+ Taxa</button>
          <button onclick="_delMaquineta(${mi})" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer">Remover</button>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead style="background:#f8fafc"><tr>
          <th style="padding:7px 10px;text-align:left;color:var(--text-2)">Bandeira</th>
          <th style="padding:7px 10px;text-align:left;color:var(--text-2)">Tipo</th>
          <th style="padding:7px 10px;text-align:center;color:var(--text-2)">Parcelas</th>
          <th style="padding:7px 10px;text-align:right;color:var(--text-2)">Taxa</th>
          <th style="padding:7px 10px;text-align:center;color:var(--text-2)">Ação</th>
        </tr></thead>
        <tbody>${taxaRows}</tbody>
      </table>
    </div>`;
  }).join('');

  document.getElementById('content').innerHTML = `
    <div style="max-width:1000px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:20px 28px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <div style="display:flex;align-items:center;gap:12px">
          <i data-lucide="credit-card" style="width:22px;height:22px;color:#fff"></i>
          <div>
            <div style="color:#fff;font-weight:800;font-size:16px">Maquinetas & Taxas</div>
            <div style="color:rgba(255,255,255,0.65);font-size:12px">Clique em ✏ para editar qualquer taxa</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button onclick="_addMaquinetaForm()" class="btn" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.4);font-size:12px">
            <i data-lucide="plus" style="width:13px;height:13px"></i> Nova maquineta
          </button>
          <button onclick="_resetMaquinetas()" class="btn" style="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);border:1px solid rgba(255,255,255,0.2);font-size:12px">
            <i data-lucide="rotate-ccw" style="width:13px;height:13px"></i> Restaurar padrão
          </button>
        </div>
      </div>
      <div id="maq-add-form"></div>
      ${cards}
    </div>`;
  window._maqData = maq;
  lucide.createIcons();
}

async function _saveTaxaEdit(mi, ti) {
  _maqData[mi].taxas[ti] = {
    bandeira: document.getElementById('ed-band')?.value.trim()||'Todas',
    tipo:     document.getElementById('ed-tipo')?.value||'Débito',
    parc:     parseInt(document.getElementById('ed-parc')?.value||1),
    taxa:     parseFloat(document.getElementById('ed-taxa')?.value||0),
  };
  await _saveMaqData();
  toast('Taxa atualizada!','success');
  _renderMaquinetasPage(_maqData, null);
}

async function _delTaxa(mi, ti) {
  if(!confirm('Remover esta taxa?')) return;
  _maqData[mi].taxas.splice(ti,1);
  await _saveMaqData();
  _renderMaquinetasPage(_maqData, null);
}

async function _delMaquineta(mi) {
  if(!confirm(`Remover ${_maqData[mi].nome} e todas suas taxas?`)) return;
  _maqData.splice(mi,1);
  await _saveMaqData();
  _renderMaquinetasPage(_maqData, null);
}

function _addTaxaForm(mi) {
  openModal(`
    <div class="modal-header"><h3>Nova Taxa — ${_maqData[mi].nome}</h3>
      <button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Bandeira</label>
        <input id="nt-band" value="Todas" style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px;font-size:13px;box-sizing:border-box"></div>
      <div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Tipo</label>
        <select id="nt-tipo" style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px;font-size:13px;box-sizing:border-box">
          <option>Débito</option><option>Crédito à vista</option><option>Crédito parcelado</option></select></div>
      <div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Até parcela</label>
        <input id="nt-parc" type="number" min="1" max="12" value="1" style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px;font-size:13px;box-sizing:border-box"></div>
      <div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Taxa (%)</label>
        <input id="nt-taxa" type="number" step="0.01" placeholder="Ex: 2.99" style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px;font-size:13px;box-sizing:border-box"></div>
    </div>
    <div style="padding:16px 24px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--border)">
      <button onclick="closeModalDirect()" class="btn btn-secondary">Cancelar</button>
      <button onclick="_confirmAddTaxa(${mi})" class="btn btn-primary">Adicionar</button>
    </div>`,'modal-sm');
  lucide.createIcons();
}
async function _confirmAddTaxa(mi) {
  const taxa = parseFloat(document.getElementById('nt-taxa')?.value||0);
  if(!taxa) return toast('Informe a taxa','error');
  _maqData[mi].taxas.push({
    bandeira: document.getElementById('nt-band')?.value.trim()||'Todas',
    tipo:     document.getElementById('nt-tipo')?.value,
    parc:     parseInt(document.getElementById('nt-parc')?.value||1),
    taxa
  });
  await _saveMaqData();
  closeModalDirect();
  toast('Taxa adicionada!','success');
  _renderMaquinetasPage(_maqData, null);
}

function _addMaquinetaForm() {
  openModal(`
    <div class="modal-header"><h3>Nova Maquineta</h3>
      <button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div style="grid-column:1/-1"><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Nome da Maquineta</label>
        <input id="nm-nome" placeholder="Ex: Vero, GetPay..." style="width:100%;padding:8px;border:1px solid var(--border-2);border-radius:6px;font-size:13px;box-sizing:border-box"></div>
      <div><label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Cor (hex)</label>
        <input id="nm-cor" type="color" value="#3b82f6" style="width:100%;height:38px;border:1px solid var(--border-2);border-radius:6px;cursor:pointer"></div>
    </div>
    <div style="padding:16px 24px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--border)">
      <button onclick="closeModalDirect()" class="btn btn-secondary">Cancelar</button>
      <button onclick="_confirmAddMaquineta()" class="btn btn-primary">Criar</button>
    </div>`,'modal-sm');
  lucide.createIcons();
}
async function _confirmAddMaquineta() {
  const nome = document.getElementById('nm-nome')?.value.trim();
  if(!nome) return toast('Informe o nome','error');
  _maqData.push({id: nome.toLowerCase().replace(/\s+/g,''), nome, cor: document.getElementById('nm-cor')?.value||'#3b82f6', taxas:[]});
  await _saveMaqData();
  closeModalDirect();
  toast('Maquineta criada!','success');
  _renderMaquinetasPage(_maqData, null);
}

async function _resetMaquinetas() {
  if(!confirm('Restaurar todas as maquinetas e taxas para o padrão? Suas edições serão perdidas.')) return;
  _maqData = JSON.parse(JSON.stringify(_MAQUINETAS_DEFAULT));
  await _saveMaqData();
  toast('Taxas restauradas para o padrão!','success');
  _renderMaquinetasPage(_maqData, null);
}
