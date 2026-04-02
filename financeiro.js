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
    let fp = v.forma_pagamento || '';
    let val = parseFloat(v.total||0);
    if(fp.includes('cartao')) { detalhe.cartao.qtd++; detalhe.cartao.val += val; }
    else if(fp.includes('pix') || fp.includes('transferencia')) { detalhe.pix.qtd++; detalhe.pix.val += val; }
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
  openModal(`
    <div class="modal-header"><h3>Nova Despesa</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>Descrição *</label><input id="dp2-desc"></div>
      <div class="form-row">
        <div class="form-group"><label>Valor (R$) *</label><input id="dp2-val" type="number" step="0.01"></div>
        <div class="form-group"><label>Vencimento</label><input id="dp2-venc" type="date"></div>
        <div class="form-group"><label>Competência</label><input id="dp2-comp" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
      </div>
      <div class="form-group"><label>Classificação</label><select id="dp2-cls"><option value="">Nenhuma</option>${(cls||[]).map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}</select></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveDespesa()"><i data-lucide="save"></i>Salvar</button>
    </div>`,'modal-md');
}

async function saveDespesa() {
  const payload={descricao:document.getElementById('dp2-desc').value.trim(),valor:parseFloat(document.getElementById('dp2-val').value||0),vencimento:document.getElementById('dp2-venc').value||null,data_competencia:document.getElementById('dp2-comp').value,classificacao_id:document.getElementById('dp2-cls').value||null};
  if(!payload.descricao||!payload.valor) return toast('Preencha descrição e valor','error');
  await sb.from('despesas').insert(payload);
  closeModalDirect();toast('Despesa cadastrada');renderDespesas();
}

async function pagarDespesa(id){await sb.from('despesas').update({status:'pago',data_pagamento:new Date().toISOString().split('T')[0]}).eq('id',id);toast('Despesa paga');renderDespesas();}
async function deleteDespesa(id){if(!confirm('Excluir?'))return;await sb.from('despesas').delete().eq('id',id);toast('Removido');renderDespesas();}

// ===== CONTAS A PAGAR =====
async function renderContasPagar() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-primary" onclick="openContaPagarModal()"><i data-lucide="plus"></i>Nova Conta</button>`;
  const {data}=await sb.from('contas_pagar').select('*,fornecedores(razao_social),classificacoes(nome)').order('vencimento');
  document.getElementById('content').innerHTML=`
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Descrição</th><th>Fornecedor</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${(data||[]).map(c=>`<tr>
          <td>${c.descricao}</td>
          <td>${c.fornecedores?.razao_social||'—'}</td>
          <td>${fmtDate(c.vencimento)}</td>
          <td><strong>${fmt(c.valor)}</strong></td>
          <td>${badgeStatus(c.status)}</td>
          <td>${c.status==='aberta'?`<button class="btn btn-sm btn-success" onclick="pagarConta('${c.id}')"><i data-lucide="check"></i>Pagar</button>`:''}</td>
        </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--text-2)">Nenhuma conta</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function openContaPagarModal() {
  const [{data:forns},{data:cls}]=await Promise.all([
    sb.from('fornecedores').select('id,razao_social').eq('ativo',true),
    sb.from('classificacoes').select('id,nome').eq('tipo','despesa')
  ]);
  openModal(`
    <div class="modal-header"><h3>Nova Conta a Pagar</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>Descrição *</label><input id="cp-desc"></div>
      <div class="form-row">
        <div class="form-group"><label>Fornecedor</label><select id="cp-forn"><option value="">Nenhum</option>${(forns||[]).map(f=>`<option value="${f.id}">${f.razao_social}</option>`).join('')}</select></div>
        <div class="form-group"><label>Valor (R$) *</label><input id="cp-val" type="number" step="0.01"></div>
        <div class="form-group"><label>Vencimento *</label><input id="cp-venc" type="date"></div>
      </div>
      <div class="form-group"><label>Classificação</label><select id="cp-cls"><option value="">Nenhuma</option>${(cls||[]).map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}</select></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveContaPagar()"><i data-lucide="save"></i>Salvar</button>
    </div>`,'modal-md');
}

async function saveContaPagar() {
  const payload={descricao:document.getElementById('cp-desc').value.trim(),fornecedor_id:document.getElementById('cp-forn').value||null,valor:parseFloat(document.getElementById('cp-val').value||0),vencimento:document.getElementById('cp-venc').value,classificacao_id:document.getElementById('cp-cls').value||null};
  if(!payload.descricao||!payload.valor||!payload.vencimento) return toast('Preencha os campos obrigatórios','error');
  await sb.from('contas_pagar').insert(payload);
  closeModalDirect();toast('Conta cadastrada');renderContasPagar();
}

async function pagarConta(id){await sb.from('contas_pagar').update({status:'paga',data_pagamento:new Date().toISOString().split('T')[0]}).eq('id',id);toast('Conta paga');renderContasPagar();}

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
