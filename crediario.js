// ===== CREDIÁRIO — Layout idêntico ao Phibo =====

function diasAtraso(vencimento){ if(!vencimento) return 0; const v=new Date(vencimento+'T00:00:00'), h=new Date(); h.setHours(0,0,0,0); return Math.max(0,Math.floor((h-v)/86400000)); }

// =============================================
// 1. EFETUAR RECEBIMENTO
// =============================================
async function renderEfetuarRecebimento() {
  document.getElementById('topbar-actions').innerHTML = '';
  document.getElementById('content').innerHTML = `
    <div style="max-width:900px;margin:0 auto">
      <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:16px">
        <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:12px">Cliente</div>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="er-fone" placeholder="(__) ____-____" style="padding:8px 12px;border:1.5px solid #d1d5db;border-radius:6px;font-size:13px;width:180px;font-family:inherit" onkeypress="if(event.key==='Enter')buscarClienteCrediario()">
          <input id="er-nome" placeholder="Nome abreviado ou completo" style="padding:8px 12px;border:1.5px solid #d1d5db;border-radius:6px;font-size:13px;flex:1;font-family:inherit" onkeypress="if(event.key==='Enter')buscarClienteCrediario()">
          <button onclick="buscarClienteCrediario()" style="padding:8px 14px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center">
            <i data-lucide="search" style="width:18px;height:18px"></i>
          </button>
        </div>
      </div>
      <div id="er-resultado"></div>
    </div>`;
  lucide.createIcons();
}

async function buscarClienteCrediario() {
  const fone = document.getElementById('er-fone')?.value.trim();
  const nome = document.getElementById('er-nome')?.value.trim();
  if(!fone && !nome) return toast('Informe telefone ou nome','error');
  const res = document.getElementById('er-resultado');
  res.innerHTML = '<div style="padding:24px;text-align:center;color:#888">Buscando...</div>';
  let q = sb.from('clientes').select('id,nome,celular,nome_abreviado').eq('ativo',true);
  if(fone) q = q.ilike('celular',`%${fone}%`);
  if(nome) q = q.ilike('nome',`%${nome}%`);
  const {data:clientes} = await q.limit(10);
  if(!clientes||!clientes.length) { res.innerHTML='<div style="padding:24px;text-align:center;color:#e74c3c;font-weight:600">Nenhum cliente encontrado</div>'; return; }
  res.innerHTML = clientes.map(c=>`
    <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="carregarParcelasCliente('${c.id}','${(c.nome_abreviado||c.nome).replace(/'/g,"\\'")}')">
      <div><div style="font-weight:700;font-size:14px">${c.nome||'—'}</div><div style="font-size:12px;color:#6b7280">${c.celular||''}</div></div>
      <i data-lucide="chevron-right" style="width:18px;height:18px;color:#9ca3af"></i>
    </div>`).join('');
  lucide.createIcons();
}

async function carregarParcelasCliente(clienteId, clienteNome) {
  const res = document.getElementById('er-resultado');
  res.innerHTML = '<div style="padding:24px;text-align:center;color:#888">Carregando parcelas...</div>';
  const {data:creds} = await sb.from('crediario').select('id,total,saldo_devedor,num_parcelas,parcelas_pagas,status').eq('cliente_id',clienteId).in('status',['aberto','atrasado']).order('created_at',{ascending:false});
  if(!creds||!creds.length) { res.innerHTML=`<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:24px;text-align:center;color:#16a34a;font-weight:600">✓ ${clienteNome} não possui parcelas em aberto</div>`; return; }
  const params = _crediParams||{multa_pct:2,juros_mes:1};
  let parcelasHTML='';
  for(const cr of creds) {
    const {data:ps} = await sb.from('crediario_parcelas').select('*').eq('crediario_id',cr.id).in('status',['pendente','atrasada']).order('numero_parcela');
    if(!ps||!ps.length) continue;
    ps.forEach(p => {
      const dias=diasAtraso(p.vencimento);
      const multa=dias>0?(p.valor*(params.multa_pct||2)/100):0;
      const juros=dias>0?(p.valor*(params.juros_mes||1)/100*(dias/30)):0;
      const total=p.valor+multa+juros-(p.valor_pago||0);
      parcelasHTML+=`<tr style="border-bottom:1px solid #f1f5f9;${dias>0?'background:#fff5f5':''}">
        <td style="padding:8px 10px;font-size:12px">${clienteNome}</td>
        <td style="padding:8px 10px;font-size:12px;text-align:center">${fmtDate(p.vencimento)}</td>
        <td style="padding:8px 10px;font-size:12px;text-align:center">${p.numero_parcela}</td>
        <td style="padding:8px 10px;font-size:12px;text-align:center;${dias>0?'color:#dc2626;font-weight:700':''}">${dias}</td>
        <td style="padding:8px 10px;text-align:right;font-size:12px">${fmt(p.valor)}</td>
        <td style="padding:8px 10px;text-align:right;font-size:12px;color:#dc2626">${multa>0?fmt(multa):'0,00'}</td>
        <td style="padding:8px 10px;text-align:right;font-size:12px;color:#d97706">${juros>0?fmt(juros):'0,00'}</td>
        <td style="padding:8px 10px;text-align:right;font-size:12px">${p.valor_pago?fmt(p.valor_pago):'0,00'}</td>
        <td style="padding:8px 10px;text-align:right;font-size:13px;font-weight:700;color:#dc2626">${fmt(total)}</td>
        <td style="padding:8px 10px;text-align:center">
          <button onclick="abrirModalReceber('${p.id}','${cr.id}',${total.toFixed(2)},'${clienteNome.replace(/'/g,"\\'")}');" style="padding:5px 12px;background:#16a34a;color:white;border:none;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer">Receber</button>
        </td>
      </tr>`;
    });
  }
  res.innerHTML = `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
    <div style="padding:10px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:700;font-size:13px">Parcelas em aberto — ${clienteNome}</div>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
        <th style="padding:8px 10px;text-align:left">Cliente</th><th style="padding:8px 10px">Data Vencto</th><th style="padding:8px 10px">PN</th><th style="padding:8px 10px">Dias Atraso</th>
        <th style="padding:8px 10px;text-align:right">Vlr Parcela</th><th style="padding:8px 10px;text-align:right">Multa</th><th style="padding:8px 10px;text-align:right">Juros</th>
        <th style="padding:8px 10px;text-align:right">Vlr Pago</th><th style="padding:8px 10px;text-align:right">Total a Pagar</th><th style="padding:8px 10px">Ação</th>
      </tr></thead>
      <tbody>${parcelasHTML||'<tr><td colspan="10" style="padding:20px;text-align:center;color:#888">Nenhuma parcela pendente</td></tr>'}</tbody>
    </table></div>
  </div>`;
  lucide.createIcons();
}

async function abrirModalReceber(parcId, credId, totalDue, clienteNome) {
  openModal(`
    <div class="modal-header"><h3>Registrar Recebimento</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body">
      <p style="margin-bottom:16px;color:#374151">Cliente: <strong>${clienteNome}</strong></p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label>Valor a Pagar (R$)</label><input id="rec-valor-parc" type="number" step="0.01" value="${totalDue.toFixed(2)}" style="font-size:15px;font-weight:700;color:#2563eb"></div>
        <div class="form-group"><label>Forma de Pagamento</label><select id="rec-forma"><option>Dinheiro</option><option>PIX</option><option>Cartão Débito</option><option>Cartão Crédito</option></select></div>
        <div class="form-group"><label>Data Pagamento</label><input id="rec-data" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group"><label>Desconto (R$)</label><input id="rec-desc" type="number" step="0.01" value="0"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="confirmarRecebimento('${parcId}','${credId}')"><i data-lucide="check"></i>Confirmar Recebimento</button>
    </div>`,'modal-md');
}

async function confirmarRecebimento(parcId, credId) {
  const valor=parseFloat(document.getElementById('rec-valor-parc')?.value||0);
  const forma=document.getElementById('rec-forma')?.value||'Dinheiro';
  const data=document.getElementById('rec-data')?.value||new Date().toISOString().split('T')[0];
  const desc=parseFloat(document.getElementById('rec-desc')?.value||0);
  if(!valor) return toast('Informe o valor','error');
  await sb.from('crediario_parcelas').update({status:'paga',data_pagamento:data,valor_pago:valor,forma_pagamento:forma,desconto:desc}).eq('id',parcId);
  const {data:cred}=await sb.from('crediario').select('*').eq('id',credId).single();
  if(cred){ const pagas=(cred.parcelas_pagas||0)+1,saldo=Math.max(0,(cred.saldo_devedor||0)-valor+desc); await sb.from('crediario').update({parcelas_pagas:pagas,saldo_devedor:saldo,status:pagas>=cred.num_parcelas?'quitado':'aberto'}).eq('id',credId); }
  closeModalDirect(); toast('Recebimento registrado com sucesso!'); renderEfetuarRecebimento();
}

// =============================================
// 2. GESTÃO CREDIÁRIO
// =============================================
let _crediParams = null;

async function renderCrediario(subPage) {
  if(subPage==='efetuar-recebimento') return renderEfetuarRecebimento();
  if(subPage==='analise-cliente') return renderAnaliseCliente();
  if(subPage==='credito-atraso') return renderCreditoAtraso();
  if(subPage==='parametros-crediario') return renderParametrosCrediario();
  document.getElementById('topbar-actions').innerHTML='';
  const {data:cfgP}=await sb.from('configuracoes').select('valor').eq('chave','crediario_params').maybeSingle();
  try{_crediParams=cfgP?JSON.parse(cfgP.valor):{multa_pct:2,juros_mes:1,prazo_dias:0};}catch(e){_crediParams={multa_pct:2,juros_mes:1,prazo_dias:0};}
  const hoje=new Date().toISOString().split('T')[0];
  const [{data:todos},{data:atrasadas},{data:emDia},{data:clientes}]=await Promise.all([
    sb.from('crediario_parcelas').select('id,valor,vencimento,status').in('status',['pendente','atrasada']),
    sb.from('crediario_parcelas').select('id,valor').eq('status','atrasada'),
    sb.from('crediario_parcelas').select('id,valor').eq('status','pendente').gte('vencimento',hoje),
    sb.from('crediario').select('id,status').in('status',['aberto','atrasado'])
  ]);
  const totalAbertas=(todos||[]).length,valorAberto=(todos||[]).reduce((a,p)=>a+parseFloat(p.valor||0),0);
  const qtdEmDia=(emDia||[]).length,valorEmDia=(emDia||[]).reduce((a,p)=>a+parseFloat(p.valor||0),0);
  const qtdAtraso=(atrasadas||[]).length,valorAtraso=(atrasadas||[]).reduce((a,p)=>a+parseFloat(p.valor||0),0);
  const totalClientes=(clientes||[]).length,clientesEmDia=(clientes||[]).filter(c=>c.status==='aberto').length,clientesAtraso=(clientes||[]).filter(c=>c.status==='atrasado').length;
  const atrasoPct=totalAbertas>0?Math.round((qtdAtraso/totalAbertas)*100):0;
  const inadimplencia=totalClientes>0?Math.round((clientesAtraso/totalClientes)*100):0;
  let totalDias=0,contDias=0;(atrasadas||[]).forEach(p=>{const d=diasAtraso(p.vencimento);if(d>0){totalDias+=d;contDias++;}});
  const prazoMedio=contDias>0?Math.round(totalDias/contDias):0;
  document.getElementById('content').innerHTML=`
  <div style="display:flex;gap:14px;align-items:flex-start">
    <div style="width:220px;flex-shrink:0;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:14px">
      <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:14px">Gestão de crediário</div>
      <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Relatórios</div>
      <div onclick="navigate('analise-cliente')" style="padding:7px 10px;border-radius:6px;font-size:13px;cursor:pointer;color:#374151;display:flex;align-items:center;gap:8px;margin-bottom:2px" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='white'"><i data-lucide="bar-chart-2" style="width:14px;height:14px;color:#6b7280"></i> Histórico - Visão geral</div>
      <div style="padding:7px 10px;border-radius:6px;font-size:13px;color:#9ca3af;display:flex;align-items:center;gap:8px;margin-bottom:2px"><i data-lucide="alert-circle" style="width:14px;height:14px"></i> Crédito em aberto</div>
      <div onclick="navigate('contas-receber')" style="padding:7px 10px;border-radius:6px;font-size:13px;cursor:pointer;color:#374151;display:flex;align-items:center;gap:8px;margin-bottom:12px" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='white'"><i data-lucide="check-circle" style="width:14px;height:14px;color:#6b7280"></i> Recebimento Efetuado</div>
      <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Controle</div>
      <div style="padding:7px 10px;border-radius:6px;font-size:13px;cursor:pointer;color:#374151;display:flex;align-items:center;gap:8px;margin-bottom:2px" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='white'"><i data-lucide="user-x" style="width:14px;height:14px;color:#6b7280"></i> Bloquear cliente</div>
      <div onclick="navigate('parametros-crediario')" style="padding:7px 10px;border-radius:6px;font-size:13px;cursor:pointer;color:#374151;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='white'"><i data-lucide="settings" style="width:14px;height:14px;color:#6b7280"></i> Parâmetros</div>
      <div style="margin-top:20px">
        <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:10px">Indicadores crediário</div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin-bottom:8px"><div style="font-size:12px;color:#6b7280;margin-bottom:2px">Atraso Geral</div><div style="font-size:22px;font-weight:900;color:#dc2626">${atrasoPct}%</div><div style="font-size:10px;color:#9ca3af">Parcelas em atraso / Parcelas a receber</div></div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin-bottom:8px"><div style="font-size:12px;color:#6b7280;margin-bottom:2px">Inadimplência Geral</div><div style="font-size:22px;font-weight:900;color:#dc2626">${inadimplencia}%</div><div style="font-size:10px;color:#9ca3af">Parcelas com atraso maior que 90 dias</div></div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin-bottom:12px"><div style="font-size:12px;color:#6b7280;margin-bottom:2px">Prazo Médio Atraso</div><div style="font-size:22px;font-weight:900;color:#dc2626">${prazoMedio}</div><div style="font-size:10px;color:#9ca3af">Número de dias de atraso, em média</div></div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <div style="background:#16a34a;color:white;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:700">Saudável</div>
          <div style="background:#f59e0b;color:white;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:700">Atenção</div>
          <div style="background:#dc2626;color:white;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:700">Em risco</div>
        </div>
        <button onclick="openFiltrarPeriodosCredi()" style="width:100%;margin-top:14px;padding:8px;background:#6b7280;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px"><i data-lucide="filter" style="width:13px;height:13px"></i> Filtrar períodos</button>
      </div>
    </div>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:12px">
      <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:14px">
        <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:12px">Resumo do crediário em aberto</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px">
            <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px">Crediário em aberto</div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:4px">Qtde parcelas</div>
            <div style="font-size:28px;font-weight:900;color:#2563eb;text-align:center;margin-bottom:12px">${totalAbertas}</div>
            <div style="border-top:1px solid #f1f5f9;padding-top:10px">
              <div style="font-size:12px;color:#6b7280;margin-bottom:4px">Valor A Receber R$</div>
              <div style="font-size:22px;font-weight:900;color:#16a34a">${fmt(valorAberto)}</div>
            </div>
          </div>
          <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px">
            <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:10px">Fluxo de recebimento</div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:6px">Total em dia</div>
            <div style="display:flex;gap:8px;margin-bottom:10px">
              <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px;text-align:center"><div style="font-size:10px;color:#6b7280">Quantidade</div><div style="font-size:20px;font-weight:900;color:#16a34a">${qtdEmDia}</div></div>
              <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px;text-align:center"><div style="font-size:10px;color:#6b7280">Valor R$</div><div style="font-size:14px;font-weight:900;color:#16a34a">${fmt(valorEmDia)}</div></div>
            </div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:6px">Total em atraso</div>
            <div style="display:flex;gap:8px">
              <div style="flex:1;background:#fef2f2;border:2px solid #fecaca;border-radius:6px;padding:8px;text-align:center"><div style="font-size:10px;color:#6b7280">Quantidade</div><div style="font-size:20px;font-weight:900;color:#dc2626">${qtdAtraso}</div></div>
              <div style="flex:1;background:#fef2f2;border:2px solid #fecaca;border-radius:6px;padding:8px;text-align:center"><div style="font-size:10px;color:#6b7280">Valor R$</div><div style="font-size:14px;font-weight:900;color:#dc2626">${fmt(valorAtraso)}</div></div>
            </div>
          </div>
          <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px">
            <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:10px">Clientes</div>
            <div style="text-align:center;margin-bottom:12px"><div style="font-size:12px;color:#6b7280">Quantidade</div><div style="font-size:28px;font-weight:900;color:#2563eb">${totalClientes}</div></div>
            <div style="display:flex;justify-content:space-between">
              <div style="text-align:center"><div style="font-size:10px;color:#6b7280">Em dia</div><div style="font-size:18px;font-weight:900;color:#16a34a">${clientesEmDia}</div></div>
              <div style="text-align:center"><div style="font-size:10px;color:#6b7280">Em atraso</div><div style="font-size:18px;font-weight:900;color:#dc2626">${clientesAtraso}</div></div>
            </div>
          </div>
        </div>
      </div>
      <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <div style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#374151">Listar parcelas do crediário em aberto</div>
        <div style="padding:10px 16px;border-bottom:1px solid #f1f5f9;display:flex;gap:10px;align-items:center">
          <span style="font-size:13px;font-weight:600;color:#374151">Filtro</span>
          <div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:4px">Listar Parcelas que:</div>
            <select id="credi-filtro" onchange="filtrarParcelasGestao()" style="padding:7px 12px;border:1.5px solid #d1d5db;border-radius:6px;font-size:13px;min-width:260px;background:white">
              <option value="3dias">Vencem nos próximos 3 dias</option>
              <option value="7dias">Vencem nos próximos 7 dias</option>
              <option value="15dias">Vencem nos próximos 15 dias</option>
              <option value="mes">Vencem neste mês</option>
              <option value="todas">Todas em aberto</option>
              <option value="atraso">Somente em atraso</option>
            </select>
          </div>
        </div>
        <div id="credi-tabela-wrap" style="overflow-x:auto"><div style="padding:24px;text-align:center;color:#888">Carregando...</div></div>
      </div>
    </div>
  </div>`;
  lucide.createIcons();
  filtrarParcelasGestao();
}

async function filtrarParcelasGestao() {
  const filtro=document.getElementById('credi-filtro')?.value||'3dias';
  const wrap=document.getElementById('credi-tabela-wrap'); if(!wrap) return;
  wrap.innerHTML='<div style="padding:20px;text-align:center;color:#888">Carregando...</div>';
  const hoje=new Date(); hoje.setHours(0,0,0,0); const hojeStr=hoje.toISOString().split('T')[0];
  let q=sb.from('crediario_parcelas').select('id,numero_parcela,vencimento,valor,valor_pago,status,crediario_id,crediario(cliente_id,clientes(nome,celular))').order('vencimento');
  if(filtro==='atraso'){q=q.eq('status','atrasada');}
  else if(filtro==='todas'){q=q.in('status',['pendente','atrasada']);}
  else{const dias=filtro==='3dias'?3:filtro==='7dias'?7:filtro==='15dias'?15:30;const limite=new Date(hoje);limite.setDate(limite.getDate()+dias);q=q.in('status',['pendente','atrasada']).lte('vencimento',limite.toISOString().split('T')[0]);}
  const {data:parcelas}=await q.limit(200);
  if(!parcelas||!parcelas.length){wrap.innerHTML='<div style="padding:24px;text-align:center;color:#888">Nenhum crédito em aberto encontrado.</div>';return;}
  const params=_crediParams||{multa_pct:2,juros_mes:1};
  let totV=0,totM=0,totJ=0,totP=0,totT=0;
  const rows=parcelas.map(p=>{
    const dias=diasAtraso(p.vencimento),multa=dias>0?(p.valor*(params.multa_pct||2)/100):0,juros=dias>0?(p.valor*(params.juros_mes||1)/100*(dias/30)):0,pago=p.valor_pago||0,total=p.valor+multa+juros-pago;
    totV+=p.valor;totM+=multa;totJ+=juros;totP+=pago;totT+=total;
    return `<tr style="border-bottom:1px solid #f1f5f9;${dias>0?'background:#fffbfb':''}">
      <td style="padding:7px 10px;font-size:12px">${p.crediario?.clientes?.nome||'—'}</td>
      <td style="padding:7px 10px;text-align:center;font-size:11px">${fmtDate(p.vencimento)}</td>
      <td style="padding:7px 10px;text-align:center;font-size:12px">${p.numero_parcela}</td>
      <td style="padding:7px 10px;text-align:center;font-size:11px">${fmtDate(p.vencimento)}</td>
      <td style="padding:7px 10px;text-align:center;font-size:12px;${dias>0?'color:#dc2626;font-weight:700':''}">${dias}</td>
      <td style="padding:7px 10px;text-align:right;font-size:12px">${fmt(p.valor)}</td>
      <td style="padding:7px 10px;text-align:right;font-size:12px;color:#dc2626">${multa>0?fmt(multa):'0,00'}</td>
      <td style="padding:7px 10px;text-align:right;font-size:12px;color:#d97706">${juros>0?fmt(juros):'0,00'}</td>
      <td style="padding:7px 10px;text-align:right;font-size:12px">${pago>0?fmt(pago):'0,00'}</td>
      <td style="padding:7px 10px;text-align:right;font-size:13px;font-weight:700;color:#dc2626">${fmt(total)}</td>
      <td style="padding:7px 10px;text-align:center"><span style="background:${dias>0?'#fef2f2':'#f0fdf4'};color:${dias>0?'#dc2626':'#16a34a'};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">${dias>0?'Em atraso':'Em dia'}</span></td>
      <td style="padding:7px 10px;text-align:center"><button onclick="abrirModalReceber('${p.id}','${p.crediario_id}',${total.toFixed(2)},'${(p.crediario?.clientes?.nome||'').replace(/'/g,"\'")}');" style="padding:4px 10px;background:#2563eb;color:white;border:none;border-radius:4px;font-size:11px;cursor:pointer">Enviar</button></td>
    </tr>`;
  }).join('');
  wrap.innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
      <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:700;color:#6b7280">Cliente</th>
      <th style="padding:8px 10px;font-size:11px;font-weight:700;color:#6b7280">Data Venda</th>
      <th style="padding:8px 10px;font-size:11px;font-weight:700;color:#6b7280">PN</th>
      <th style="padding:8px 10px;font-size:11px;font-weight:700;color:#6b7280">Data Vencto</th>
      <th style="padding:8px 10px;font-size:11px;font-weight:700;color:#6b7280">Dias em Atraso</th>
      <th style="padding:8px 10px;text-align:right;font-size:11px;font-weight:700;color:#6b7280">Valor Parcela</th>
      <th style="padding:8px 10px;text-align:right;font-size:11px;font-weight:700;color:#6b7280">Multa</th>
      <th style="padding:8px 10px;text-align:right;font-size:11px;font-weight:700;color:#6b7280">Juros</th>
      <th style="padding:8px 10px;text-align:right;font-size:11px;font-weight:700;color:#6b7280">Valor Pago</th>
      <th style="padding:8px 10px;text-align:right;font-size:11px;font-weight:700;color:#6b7280">Valor Total a Pagar</th>
      <th style="padding:8px 10px;font-size:11px;font-weight:700;color:#6b7280">Parcela Status</th>
      <th style="padding:8px 10px;font-size:11px;font-weight:700;color:#6b7280">Enviar Mensagem</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr style="background:#f8fafc;border-top:2px solid #e2e8f0;font-weight:700">
      <td colspan="5" style="padding:8px 10px;text-align:right;font-size:12px">Total (R$):</td>
      <td style="padding:8px 10px;text-align:right;font-size:12px">${fmt(totV)}</td>
      <td style="padding:8px 10px;text-align:right;font-size:12px">${fmt(totM)}</td>
      <td style="padding:8px 10px;text-align:right;font-size:12px">${fmt(totJ)}</td>
      <td style="padding:8px 10px;text-align:right;font-size:12px">${fmt(totP)}</td>
      <td style="padding:8px 10px;text-align:right;font-size:12px">${fmt(totT)}</td>
      <td colspan="2"></td>
    </tfoot>
  </table>`;
}

function openFiltrarPeriodosCredi() {
  openModal(`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #e2e8f0"><h3 style="font-size:16px;font-weight:700;margin:0">Filtros Avancados</h3><button onclick="closeModalDirect()" style="background:none;border:none;cursor:pointer;font-size:20px;color:#6b7280">&times;</button></div>
    <div style="padding:20px">
      <div class="form-group" style="margin-bottom:16px"><label style="font-weight:600;margin-bottom:6px;display:block">Período:</label>
        <select id="credi-periodo" style="width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:6px;font-size:13px;background:white">
          <option>últimos 12 meses</option><option>últimos 6 meses</option><option>últimos 3 meses</option><option>Este mês</option>
        </select>
      </div>
      <button onclick="closeModalDirect();renderCrediario()" style="width:100%;padding:11px;background:#2563eb;color:white;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
        <i data-lucide="filter" style="width:15px;height:15px"></i> Aplicar Filtro
      </button>
    </div>`,'modal-sm');
  lucide.createIcons();
}

// =============================================
// 3. ANÁLISE POR CLIENTE
// =============================================
async function renderAnaliseCliente() {
  document.getElementById('topbar-actions').innerHTML='';
  document.getElementById('content').innerHTML=`
    <div style="background:white;border:1px solid #e2e8f0;border-radius:8px">
      <div style="padding:12px 16px;border-bottom:1px solid #e2e8f0">
        <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:10px">Buscar Cliente</div>
        <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end">
          <div>
            <label style="font-size:11px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px">Celular</label>
            <input id="ac-fone" placeholder="Número do celular" style="width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box"
              onkeypress="if(event.key==='Enter')buscarAnaliseCliente()">
          </div>
          <div>
            <label style="font-size:11px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px">Nome</label>
            <input id="ac-nome" placeholder="Nome completo ou abreviado" style="width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box"
              onkeypress="if(event.key==='Enter')buscarAnaliseCliente()">
          </div>
          <div style="display:flex;gap:6px">
            <button onclick="buscarAnaliseCliente()" title="Buscar" style="padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;white-space:nowrap">
              <i data-lucide="search" style="width:15px;height:15px"></i> Buscar
            </button>
            <button onclick="buscarAnaliseCliente(true)" title="Ver todos" style="padding:8px 12px;background:#f1f5f9;color:#374151;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap">
              Ver todos
            </button>
          </div>
        </div>
      </div>

      <!-- Lista de clientes com crediário -->
      <div id="ac-clientes-lista" style="padding:12px 16px;border-bottom:1px solid #e2e8f0;display:none">
        <div style="font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Clientes encontrados — clique para ver parcelas</div>
        <div id="ac-clientes-chips" style="display:flex;flex-wrap:wrap;gap:8px"></div>
      </div>

      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0">
              <th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:700;color:#6b7280" rowspan="2">PN</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:700;color:#6b7280" rowspan="2">Vencimento</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:700;color:#6b7280" rowspan="2">Valor Parcela</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:700;color:#6b7280" rowspan="2">Status</th>
              <th colspan="4" style="padding:8px 10px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;border-left:2px solid #e2e8f0">Recebimento</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:700;color:#6b7280" rowspan="2">Dias Atraso</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:700;color:#6b7280" rowspan="2">Parcela</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:700;color:#6b7280" rowspan="2">Multa</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:700;color:#6b7280" rowspan="2">Juros</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:700;color:#6b7280" rowspan="2">Total</th>
            </tr>
            <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
              <th style="padding:6px 8px;text-align:center;font-size:10px;font-weight:700;color:#6b7280;border-left:2px solid #e2e8f0">Data Pagto</th>
              <th style="padding:6px 8px;text-align:center;font-size:10px;font-weight:700;color:#6b7280">Valor Pago</th>
              <th style="padding:6px 8px;text-align:center;font-size:10px;font-weight:700;color:#6b7280">Desconto</th>
              <th style="padding:6px 8px;text-align:center;font-size:10px;font-weight:700;color:#6b7280">Forma</th>
            </tr>
          </thead>
          <tbody id="ac-tbody"><tr><td colspan="13" style="padding:24px;text-align:center;color:#888">Pesquise um cliente ou clique em "Ver todos".</td></tr></tbody>
          <tfoot><tr style="border-top:2px solid #e2e8f0;background:#f8fafc">
            <td colspan="9" style="padding:8px 10px;text-align:right;font-size:12px;font-weight:700">Total a pagar:</td>
            <td colspan="4" id="ac-total" style="padding:8px 10px"></td>
          </tr></tfoot>
        </table>
      </div>
    </div>`;
  lucide.createIcons();
  // Carrega automaticamente todos os clientes com crediário aberto
  await buscarAnaliseCliente(true);
}

async function buscarAnaliseCliente(todos) {
  const fone = document.getElementById('ac-fone')?.value.trim() || '';
  const nome = document.getElementById('ac-nome')?.value.trim() || '';
  const tbody = document.getElementById('ac-tbody');
  if(!tbody) return;

  // Se não é "todos" e não tem filtro, mostra instrução
  if(!todos && !fone && !nome) {
    tbody.innerHTML='<tr><td colspan="13" style="padding:24px;text-align:center;color:#888">Digite celular ou nome para pesquisar.</td></tr>';
    return;
  }

  tbody.innerHTML='<tr><td colspan="13" style="padding:16px;text-align:center;color:#888">Buscando...</td></tr>';

  if(!_crediParams){
    const {data:cfgP}=await sb.from('configuracoes').select('valor').eq('chave','crediario_params').maybeSingle();
    try{_crediParams=cfgP?JSON.parse(cfgP.valor):{multa_pct:2,juros_mes:1};}catch(e){_crediParams={multa_pct:2,juros_mes:1};}
  }
  const params = _crediParams||{multa_pct:2,juros_mes:1};

  let clientes = [];

  if(todos) {
    // Busca todos os clientes que têm crediário (aberto, atrasado ou quitado)
    const {data:creds} = await sb.from('crediario').select('cliente_id').not('cliente_id','is',null);
    const ids = [...new Set((creds||[]).map(c=>c.cliente_id))];
    if(ids.length) {
      const {data:clis} = await sb.from('clientes').select('id,nome,celular').in('id', ids);
      clientes = clis||[];
    }
  } else {
    let q = sb.from('clientes').select('id,nome,celular').eq('ativo',true);
    if(fone) q = q.ilike('celular',`%${fone}%`);
    if(nome) q = q.ilike('nome',`%${nome}%`);
    const {data:clis} = await q.limit(10);
    clientes = clis||[];
  }

  if(!clientes.length) {
    tbody.innerHTML='<tr><td colspan="13" style="padding:16px;text-align:center;color:#e74c3c">Nenhum cliente com crediário encontrado.</td></tr>';
    const lista = document.getElementById('ac-clientes-lista');
    if(lista) lista.style.display='none';
    return;
  }

  // Mostra chips de clientes para seleção rápida
  const lista = document.getElementById('ac-clientes-lista');
  const chips = document.getElementById('ac-clientes-chips');
  if(lista && chips) {
    lista.style.display = 'block';
    chips.innerHTML = clientes.map(c=>`
      <button onclick="carregarParcelasCliente('${c.id}','${(c.nome||'').replace(/'/g,"\\'")}',this)"
        style="padding:6px 14px;border:1.5px solid #e2e8f0;border-radius:20px;background:white;cursor:pointer;font-size:12px;font-weight:600;color:#374151;display:flex;align-items:center;gap:6px">
        <i data-lucide="user" style="width:12px;height:12px;color:#6b7280"></i>
        ${c.nome} ${c.celular?`<span style="color:#94a3b8;font-weight:400">${c.celular}</span>`:''}
      </button>`).join('');
    lucide.createIcons();
  }

  // Se só um cliente, carrega automaticamente
  if(clientes.length === 1) {
    await carregarParcelasCliente(clientes[0].id, clientes[0].nome, null);
  } else {
    tbody.innerHTML='<tr><td colspan="13" style="padding:24px;text-align:center;color:#888">Selecione um cliente acima para ver as parcelas.</td></tr>';
    const tot=document.getElementById('ac-total'); if(tot) tot.innerHTML='';
  }
}

async function carregarParcelasCliente(clienteId, clienteNome, btnEl) {
  // Destaca o botão selecionado
  document.querySelectorAll('#ac-clientes-chips button').forEach(b=>{
    b.style.background='white'; b.style.borderColor='#e2e8f0'; b.style.color='#374151';
  });
  if(btnEl) { btnEl.style.background='#eff6ff'; btnEl.style.borderColor='#2563eb'; btnEl.style.color='#2563eb'; }

  const tbody = document.getElementById('ac-tbody');
  if(!tbody) return;
  tbody.innerHTML='<tr><td colspan="13" style="padding:16px;text-align:center;color:#888">Carregando parcelas...</td></tr>';

  if(!_crediParams){
    const {data:cfgP}=await sb.from('configuracoes').select('valor').eq('chave','crediario_params').maybeSingle();
    try{_crediParams=cfgP?JSON.parse(cfgP.valor):{multa_pct:2,juros_mes:1};}catch(e){_crediParams={multa_pct:2,juros_mes:1};}
  }
  const params = _crediParams||{multa_pct:2,juros_mes:1};

  const {data:creds} = await sb.from('crediario').select('id,total,num_parcelas,status').eq('cliente_id',clienteId);
  if(!creds||!creds.length) {
    tbody.innerHTML=`<tr><td colspan="13" style="padding:20px;text-align:center;color:#888">Nenhum crediário encontrado para ${clienteNome}.</td></tr>`;
    return;
  }

  let rows='', totalPagar=0;
  for(const cr of creds) {
    const {data:ps} = await sb.from('crediario_parcelas').select('*').eq('crediario_id',cr.id).order('numero_parcela');
    // Cabeçalho separador por crediário
    rows += `<tr style="background:#f0f9ff;border-top:2px solid #bfdbfe">
      <td colspan="13" style="padding:6px 12px;font-size:11px;font-weight:700;color:#2563eb">
        Crediário — Total: ${fmt(cr.total)} | ${cr.num_parcelas}x | Status: ${cr.status}
      </td>
    </tr>`;
    (ps||[]).forEach(p=>{
      const dias=diasAtraso(p.vencimento);
      const multa=dias>0?(p.valor*(params.multa_pct||2)/100):0;
      const juros=dias>0?(p.valor*(params.juros_mes||1)/100*(dias/30)):0;
      const total=Math.max(0, p.valor+multa+juros-(p.valor_pago||0));
      totalPagar+=total;
      const stCor=p.status==='paga'?'#16a34a':p.status==='atrasada'?'#dc2626':'#2563eb';
      rows+=`<tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:7px 10px;text-align:center">${p.numero_parcela}</td>
        <td style="padding:7px 10px;text-align:center">${fmtDate(p.vencimento)}</td>
        <td style="padding:7px 10px;text-align:center">${fmt(p.valor)}</td>
        <td style="padding:7px 10px;text-align:center"><span style="background:${stCor}22;color:${stCor};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">${p.status}</span></td>
        <td style="padding:7px 10px;text-align:center;border-left:2px solid #e2e8f0">${p.data_pagamento?fmtDate(p.data_pagamento):'—'}</td>
        <td style="padding:7px 10px;text-align:center">${p.valor_pago?fmt(p.valor_pago):'—'}</td>
        <td style="padding:7px 10px;text-align:center">${p.desconto?fmt(p.desconto):'—'}</td>
        <td style="padding:7px 10px;text-align:center">${p.forma_pagamento||'—'}</td>
        <td style="padding:7px 10px;text-align:center;color:#dc2626">${dias>0?dias:0}</td>
        <td style="padding:7px 10px;text-align:center">${fmt(p.valor)}</td>
        <td style="padding:7px 10px;text-align:center;color:#dc2626">${fmt(multa)}</td>
        <td style="padding:7px 10px;text-align:center;color:#d97706">${fmt(juros)}</td>
        <td style="padding:7px 10px;text-align:center;font-weight:700;color:#dc2626">${fmt(total)}</td>
      </tr>`;
    });
  }
  tbody.innerHTML=rows||`<tr><td colspan="13" style="padding:20px;text-align:center;color:#888">Nenhuma parcela encontrada.</td></tr>`;
  const tot=document.getElementById('ac-total');
  if(tot) tot.innerHTML=`<strong style="color:#dc2626">${fmt(totalPagar)}</strong>`;
}

// =============================================
// 4. CRÉDITO EM ATRASO
// =============================================
async function renderCreditoAtraso() {
  document.getElementById('topbar-actions').innerHTML='';
  document.getElementById('content').innerHTML='<div style="padding:32px;text-align:center;color:#888">Carregando...</div>';
  if(!_crediParams){const {data:cfgP}=await sb.from('configuracoes').select('valor').eq('chave','crediario_params').maybeSingle();try{_crediParams=cfgP?JSON.parse(cfgP.valor):{multa_pct:2,juros_mes:1};}catch(e){_crediParams={multa_pct:2,juros_mes:1};}}
  const params=_crediParams;
  const {data:parcelas}=await sb.from('crediario_parcelas').select('id,numero_parcela,vencimento,valor,valor_pago,status,crediario_id,crediario(cliente_id,clientes(nome,celular))').eq('status','atrasada').order('vencimento');
  let totV=0,totM=0,totJ=0,totP=0,totT=0;
  const rows=(parcelas||[]).map(p=>{
    const dias=diasAtraso(p.vencimento),multa=p.valor*(params.multa_pct||2)/100,juros=p.valor*(params.juros_mes||1)/100*(dias/30),total=p.valor+multa+juros-(p.valor_pago||0);
    totV+=p.valor;totM+=multa;totJ+=juros;totP+=p.valor_pago||0;totT+=total;
    return `<tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:8px 10px;font-size:12px">${p.crediario?.clientes?.celular||'—'}</td>
      <td style="padding:8px 10px;font-size:12px;font-weight:600">${p.crediario?.clientes?.nome||'—'}</td>
      <td style="padding:8px 10px;text-align:center;font-size:12px">${fmtDate(p.vencimento)}</td>
      <td style="padding:8px 10px;text-align:center;font-size:12px">${p.numero_parcela}</td>
      <td style="padding:8px 10px;text-align:center;font-size:12px">${fmtDate(p.vencimento)}</td>
      <td style="padding:8px 10px;text-align:center;font-size:13px;font-weight:700;color:#dc2626">${dias}</td>
      <td style="padding:8px 10px;text-align:right;font-size:12px">${fmt(p.valor)}</td>
      <td style="padding:8px 10px;text-align:right;font-size:12px;color:#dc2626">${fmt(multa)}</td>
      <td style="padding:8px 10px;text-align:right;font-size:12px;color:#d97706">${fmt(juros)}</td>
      <td style="padding:8px 10px;text-align:right;font-size:12px">${p.valor_pago?fmt(p.valor_pago):'0,00'}</td>
      <td style="padding:8px 10px;text-align:right;font-size:13px;font-weight:700;color:#dc2626">${fmt(total)}</td>
    </tr>`;
  }).join('');
  document.getElementById('content').innerHTML=`
    <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0">
            <th style="padding:9px 10px;text-align:left;font-weight:700;color:#374151">Fone</th>
            <th style="padding:9px 10px;text-align:left;font-weight:700;color:#374151">Cliente</th>
            <th style="padding:9px 10px;text-align:center;font-weight:700;color:#374151">Data Venda</th>
            <th style="padding:9px 10px;text-align:center;font-weight:700;color:#374151">P</th>
            <th style="padding:9px 10px;text-align:center;font-weight:700;color:#374151">Data Vencto</th>
            <th style="padding:9px 10px;text-align:center;font-weight:700;color:#374151">Dias em Atraso</th>
            <th style="padding:9px 10px;text-align:right;font-weight:700;color:#374151">Valor Parcela</th>
            <th style="padding:9px 10px;text-align:right;font-weight:700;color:#374151">Multa</th>
            <th style="padding:9px 10px;text-align:right;font-weight:700;color:#374151">Juros</th>
            <th style="padding:9px 10px;text-align:right;font-weight:700;color:#374151">Valor Pago</th>
            <th style="padding:9px 10px;text-align:right;font-weight:700;color:#374151">Valor Total a Pagar</th>
          </tr></thead>
          <tbody>${rows||'<tr><td colspan="11" style="padding:24px;text-align:center;color:#888">Nenhum crédito em atraso encontrado</td></tr>'}</tbody>
          <tfoot><tr style="background:#f8fafc;border-top:2px solid #e2e8f0;font-weight:700">
            <td colspan="6" style="padding:8px 10px;text-align:right">Total:</td>
            <td style="padding:8px 10px;text-align:right">${fmt(totV)}</td>
            <td style="padding:8px 10px;text-align:right">${fmt(totM)}</td>
            <td style="padding:8px 10px;text-align:right">${fmt(totJ)}</td>
            <td style="padding:8px 10px;text-align:right">${fmt(totP)}</td>
            <td style="padding:8px 10px;text-align:right">${fmt(totT)}</td>
          </tfoot>
        </table>
      </div>
      <div style="padding:10px 16px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#6b7280">Existem ${(parcelas||[]).length} parcelas em atraso.</div>
    </div>`;
  lucide.createIcons();
}

// =============================================
// 5. RECEBIMENTO EFETUADO
// =============================================
async function renderContasReceber() {
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-secondary" onclick="openFiltrarPeriodosCredi()"><i data-lucide="filter"></i>Filtrar períodos</button>`;
  const hoje=new Date(),mesNome=hoje.toLocaleString('pt-BR',{month:'long'}),ano=hoje.getFullYear();
  const ini=`${ano}-${String(hoje.getMonth()+1).padStart(2,'0')}-01`,fim=`${ano}-${String(hoje.getMonth()+1).padStart(2,'0')}-${new Date(ano,hoje.getMonth()+1,0).getDate()}`;
  const {data:pagas}=await sb.from('crediario_parcelas').select('id,numero_parcela,vencimento,valor,valor_pago,desconto,forma_pagamento,data_pagamento,crediario(clientes(nome))').eq('status','paga').gte('data_pagamento',ini).lte('data_pagamento',fim).order('data_pagamento',{ascending:false});
  const totalRecebido=(pagas||[]).reduce((a,p)=>a+parseFloat(p.valor_pago||0),0);
  const {data:abertas}=await sb.from('crediario_parcelas').select('valor').in('status',['pendente','atrasada']);
  const totalAReceber=(abertas||[]).reduce((a,p)=>a+parseFloat(p.valor||0),0);
  const pctRecebido=(totalRecebido+totalAReceber)>0?Math.round(totalRecebido/(totalRecebido+totalAReceber)*100):0;
  const fluxoMap={};(pagas||[]).forEach(p=>{if(!p.data_pagamento)return;const d=new Date(p.data_pagamento+'T00:00:00'),k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;fluxoMap[k]=(fluxoMap[k]||0)+parseFloat(p.valor_pago||0);});
  const fluxoRows=Object.entries(fluxoMap).map(([k,v])=>{const [y,m]=k.split('-');return `<tr><td style="padding:7px 12px">${y}</td><td style="padding:7px 12px">${new Date(+y,+m-1).toLocaleString('pt-BR',{month:'long'})}</td><td style="padding:7px 12px;text-align:right">${fmt(v)}</td></tr>`;}).join('');
  const formaMap={};(pagas||[]).forEach(p=>{const f=p.forma_pagamento||'Dinheiro';formaMap[f]=(formaMap[f]||0)+parseFloat(p.valor_pago||0);});
  const formaRows=Object.entries(formaMap).map(([f,v])=>`<tr><td style="padding:7px 12px">${f}</td><td style="padding:7px 12px;text-align:right">${fmt(v)}</td></tr>`).join('');
  const detRows=(pagas||[]).map(p=>`<tr style="border-bottom:1px solid #f1f5f9">
    <td style="padding:7px 10px;font-size:12px">${p.crediario?.clientes?.nome||'—'}</td>
    <td style="padding:7px 10px;text-align:center;font-size:12px">${fmtDate(p.data_pagamento)}</td>
    <td style="padding:7px 10px;text-align:center;font-size:12px">${p.numero_parcela}</td>
    <td style="padding:7px 10px;text-align:center;font-size:12px">${fmtDate(p.vencimento)}</td>
    <td style="padding:7px 10px;text-align:right;font-size:12px">${fmt(p.valor)}</td>
    <td style="padding:7px 10px;text-align:right;font-size:12px">${p.desconto?fmt(p.desconto):'—'}</td>
    <td style="padding:7px 10px;text-align:right;font-size:12px">—</td>
    <td style="padding:7px 10px;text-align:right;font-size:13px;font-weight:700;color:#16a34a">${fmt(p.valor_pago||0)}</td>
    <td style="padding:7px 10px;text-align:right;font-size:12px">${fmt(p.valor)}</td>
    <td style="padding:7px 10px;text-align:center"><span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">paga</span></td>
  </tr>`).join('');
  document.getElementById('content').innerHTML=`
    <div style="font-size:12px;color:#16a34a;font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:6px">✓ mês atual - ${mesNome} / ${ano}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
      <div style="background:#3b82f6;border-radius:8px;padding:16px 20px"><div style="font-size:12px;color:rgba(255,255,255,.8);margin-bottom:6px;font-weight:600">Valor total recebido</div><div style="font-size:26px;font-weight:900;color:white">${fmtNum(totalRecebido)}</div></div>
      <div style="background:#16a34a;border-radius:8px;padding:16px 20px"><div style="font-size:12px;color:rgba(255,255,255,.8);margin-bottom:6px;font-weight:600">Valor total a receber</div><div style="font-size:26px;font-weight:900;color:white">${fmtNum(totalAReceber)}</div></div>
      <div style="background:#f59e0b;border-radius:8px;padding:16px 20px"><div style="font-size:12px;color:rgba(255,255,255,.8);margin-bottom:6px;font-weight:600">% recebido</div><div style="font-size:26px;font-weight:900;color:white">${pctRecebido}%</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <div style="padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:700;text-align:center">Fluxo de recebimento pelo ano/mês da venda</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="border-bottom:1px solid #e2e8f0"><th style="padding:7px 12px;text-align:left">Ano da venda</th><th style="padding:7px 12px;text-align:left">Mês da venda</th><th style="padding:7px 12px;text-align:right">Valor recebido</th></tr></thead>
          <tbody>${fluxoRows||'<tr><td colspan="3" style="padding:16px;text-align:center;color:#888">Nenhum recebimento identificada.</td></tr>'}</tbody>
        </table>
      </div>
      <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <div style="padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:700;text-align:center">Fluxo de recebimento pela forma de pagamento</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="border-bottom:1px solid #e2e8f0"><th style="padding:7px 12px;text-align:left">Forma de pagamento</th><th style="padding:7px 12px;text-align:right">Valor recebido</th></tr></thead>
          <tbody>${formaRows||'<tr><td colspan="2" style="padding:16px;text-align:center;color:#888">Nenhum recebimento identificada.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
    <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
      <div style="padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:700;text-align:center">Recebimentos de crediário efetuados no perido</div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="border-bottom:2px solid #e2e8f0">
            <th style="padding:7px 10px;text-align:left;font-weight:700">Cliente</th><th style="padding:7px 10px;text-align:center;font-weight:700">Data Venda</th><th style="padding:7px 10px;text-align:center;font-weight:700">PN</th><th style="padding:7px 10px;text-align:center;font-weight:700">Data Vencto</th>
            <th style="padding:7px 10px;text-align:right;font-weight:700">Parcela</th><th style="padding:7px 10px;text-align:right;font-weight:700">Multa</th><th style="padding:7px 10px;text-align:right;font-weight:700">Juros</th>
            <th style="padding:7px 10px;text-align:right;font-weight:700">Valor Pago no dia</th><th style="padding:7px 10px;text-align:right;font-weight:700">Valor Total A Pagar</th><th style="padding:7px 10px;text-align:center;font-weight:700">Parcela Status</th>
          </tr></thead>
          <tbody>${detRows||'<tr><td colspan="10" style="padding:20px;text-align:center;color:#888">Nenhum recebimento de crediário encontrado no período informado.</td></tr>'}</tbody>
          <tfoot><tr style="border-top:2px solid #e2e8f0;background:#f8fafc">
            <td colspan="7" style="padding:8px 10px;text-align:right;font-weight:700">Total:</td>
            <td style="padding:8px 10px;text-align:right;font-weight:700;color:#16a34a">${fmt(totalRecebido)}</td><td colspan="2"></td>
          </tfoot>
        </table>
      </div>
    </div>`;
  lucide.createIcons();
}

// =============================================
// 6. PARÂMETROS DO CREDIÁRIO
// =============================================
async function renderParametrosCrediario() {
  document.getElementById('topbar-actions').innerHTML='';
  const {data:cfg}=await sb.from('configuracoes').select('valor').eq('chave','crediario_params').maybeSingle();
  let p={prazo_dias:0,multa_pct:2,juros_mes:8.45,forma_calculo:'vencimento',recalcular:false,ordem_pagamento:'aleatoria',valor_limite:'',bloqueio_parcelas:'1'};
  try{if(cfg)p={...p,...JSON.parse(cfg.valor)};}catch(e){}
  const hoje=new Date().toLocaleDateString('pt-BR');
  document.getElementById('content').innerHTML=`
    <div style="max-width:700px;background:white;border:1px solid #e2e8f0;border-radius:8px">
      <div style="padding:14px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:14px;font-weight:700;color:#374151">Parâmetros do Crediário</span>
        <span style="font-size:12px;color:#9ca3af">registrado em ${hoje}</span>
      </div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;align-items:center;gap:12px">
          <label style="width:240px;font-size:13px;font-weight:600;color:#374151;text-align:right">Prazo de pagamento:</label>
          <span style="font-size:13px">a partir de</span>
          <input id="pc-prazo" type="number" min="0" value="${p.prazo_dias||0}" style="width:60px;padding:6px 10px;border:1.5px solid #d1d5db;border-radius:6px;font-size:13px;text-align:center">
          <span style="font-size:13px">dias em atraso.</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <label style="width:240px;font-size:13px;font-weight:600;color:#374151;text-align:right">Multa:</label>
          <input id="pc-multa" type="text" value="${p.multa_pct||2}%" style="width:120px;padding:6px 10px;border:1.5px solid #d1d5db;border-radius:6px;font-size:13px">
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <label style="width:240px;font-size:13px;font-weight:600;color:#374151;text-align:right">Juros ao mês:</label>
          <input id="pc-juros" type="text" value="${p.juros_mes||8.45}%" style="width:120px;padding:6px 10px;border:1.5px solid #d1d5db;border-radius:6px;font-size:13px">
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <label style="width:240px;font-size:13px;font-weight:600;color:#374151;text-align:right">Forma de Cálculo:</label>
          <select id="pc-forma" style="padding:6px 10px;border:1.5px solid #d1d5db;border-radius:6px;font-size:13px;background:white;min-width:240px">
            <option value="vencimento" ${p.forma_calculo==='vencimento'?'selected':''}>A partir da Data de Vencimento</option>
            <option value="pagamento" ${p.forma_calculo==='pagamento'?'selected':''}>A partir da Data de Pagamento</option>
          </select>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <label style="width:240px;font-size:13px;font-weight:600;color:#374151;text-align:right">Recalcular:</label>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
            <input type="checkbox" id="pc-recalc" ${p.recalcular?'checked':''} style="width:16px;height:16px"> Juros total de todas as parcelas em atraso.
          </label>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <label style="width:240px;font-size:13px;font-weight:600;color:#374151;text-align:right">Ordem de pagamento de parcelas:</label>
          <select id="pc-ordem" style="padding:6px 10px;border:1.5px solid #d1d5db;border-radius:6px;font-size:13px;background:white;min-width:240px">
            <option value="aleatoria" ${p.ordem_pagamento==='aleatoria'?'selected':''}>Pagamento em ordem aleatória</option>
            <option value="cronologica" ${p.ordem_pagamento==='cronologica'?'selected':''}>Pagamento em ordem cronológica</option>
          </select>
        </div>
        <div style="border-top:1px solid #e2e8f0;padding-top:14px">
          <div style="font-size:14px;font-weight:700;color:#374151;margin-bottom:12px">Bloquear crediário</div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <label style="width:240px;font-size:13px;font-weight:600;color:#374151;text-align:right">Valor limite:</label>
            <input id="pc-limite" type="number" step="0.01" value="${p.valor_limite||''}" style="width:180px;padding:6px 10px;border:1.5px solid #d1d5db;border-radius:6px;font-size:13px">
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <label style="width:240px;font-size:13px;font-weight:600;color:#374151;text-align:right">Qtde parcelas em atraso:</label>
            <div style="display:flex;gap:16px">
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="radio" name="pc-parcelas" value="1" ${p.bloqueio_parcelas==='1'?'checked':''}> Uma parcela</label>
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="radio" name="pc-parcelas" value="2" ${p.bloqueio_parcelas==='2'?'checked':''}> Duas parcelas</label>
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="radio" name="pc-parcelas" value="3" ${p.bloqueio_parcelas==='3'?'checked':''}> Três parcelas</label>
            </div>
          </div>
        </div>
        <div style="border-top:1px solid #e2e8f0;padding-top:12px;font-size:12px;color:#6b7280"><strong>Obs:</strong> Conforme diz o Código de Defesa do Consumidor, alguns limites devem ser respeitados para que a cobrança de juros e multas em parcelas de crediário seja aplicada corretamente. Segundo a lei, os juros de mora podem representar no máximo 1% ao mês e são cobrados por dia de atraso, enquanto a multa por atraso pode corresponder a até 2% do valor total da parcela.</div>
        <div style="display:flex;justify-content:flex-end;padding-top:4px">
          <button onclick="salvarParametrosCrediario()" style="padding:9px 24px;background:#2563eb;color:white;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">Salvar</button>
        </div>
      </div>
    </div>`;
  lucide.createIcons();
}

async function salvarParametrosCrediario() {
  const multa=parseFloat((document.getElementById('pc-multa')?.value||'2').replace('%',''))||2;
  const juros=parseFloat((document.getElementById('pc-juros')?.value||'1').replace('%',''))||1;
  const params={prazo_dias:parseInt(document.getElementById('pc-prazo')?.value||0),multa_pct:multa,juros_mes:juros,forma_calculo:document.getElementById('pc-forma')?.value||'vencimento',recalcular:document.getElementById('pc-recalc')?.checked||false,ordem_pagamento:document.getElementById('pc-ordem')?.value||'aleatoria',valor_limite:document.getElementById('pc-limite')?.value||'',bloqueio_parcelas:document.querySelector('input[name="pc-parcelas"]:checked')?.value||'1'};
  _crediParams=params;
  const val=JSON.stringify(params);
  const {data:ex}=await sb.from('configuracoes').select('id').eq('chave','crediario_params').maybeSingle();
  if(ex)await sb.from('configuracoes').update({valor:val}).eq('chave','crediario_params');
  else await sb.from('configuracoes').insert({chave:'crediario_params',valor:val});
  toast('Parâmetros salvos com sucesso!');
}

function badgeStatus(s){const m={'aberto':'#2563eb','atrasado':'#dc2626','quitado':'#16a34a','paga':'#16a34a','pendente':'#d97706','atrasada':'#dc2626'};return `<span style="background:${m[s]||'#6b7280'}22;color:${m[s]||'#6b7280'};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;text-transform:capitalize">${s||'—'}</span>`;}
