// ===== PDV =====
async function renderPDV() {
  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-danger btn-sm" onclick="clearCart()"><i data-lucide="trash-2"></i>Limpar</button>`;

  const html = `
  <div class="pdv-layout" style="padding-bottom:0">
    <div class="pdv-left">
      <div class="card">
        <div class="card-body" style="padding:12px">
          <div class="pdv-search">
            <input type="text" id="pdv-search" placeholder="Buscar produto por nome ou código..." oninput="searchProducts(this.value)">
            <button class="btn btn-secondary" onclick="loadAllProducts()"><i data-lucide="refresh-cw"></i></button>
          </div>
        </div>
      </div>
      <div class="card" style="flex:1;overflow:hidden">
        <div class="card-body" style="height:100%;overflow-y:auto;padding:12px">
          <div id="products-grid" class="products-grid"></div>
        </div>
      </div>
    </div>
    <div class="pdv-right">
      <div class="card" style="padding:12px;gap:8px;display:flex;flex-direction:column">
        <div class="form-row">
          <div class="form-group">
            <label>Cliente</label>
            <select id="pdv-client" onchange="cartClient=this.value">
              <option value="">Consumidor final</option>
            </select>
          </div>
          <div class="form-group">
            <label>Vendedor</label>
            <select id="pdv-seller" onchange="cartSeller=this.value">
              <option value="">Nenhum</option>
            </select>
          </div>
        </div>
      </div>
      <div class="cart" style="flex:1">
        <div class="card-header"><h3>Carrinho</h3><span id="cart-count" class="badge badge-blue">0 itens</span></div>
        <div class="cart-items" id="cart-items-list"></div>
        <div class="cart-totals">
          <div class="cart-total-row"><span>Subtotal</span><span id="cart-subtotal">R$ 0,00</span></div>
          <div class="cart-total-row">
            <span>Desconto</span>
            <span><input type="number" id="cart-discount" value="0" min="0" style="width:70px;padding:2px 6px;border:1px solid var(--border-2);border-radius:4px;font-size:12px" onchange="updateCartTotals()"> R$</span>
          </div>
          <div class="cart-total-row grand"><span>TOTAL</span><span id="cart-total">R$ 0,00</span></div>
        </div>
        <div style="padding:10px 14px;border-top:1px solid var(--border)">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-2);margin-bottom:8px">Forma de Pagamento</div>
          <div class="pay-btns">
            <div class="pay-btn selected" id="pay-dinheiro" onclick="selectPayment('dinheiro')">Dinheiro</div>
            <div class="pay-btn" id="pay-debito" onclick="selectPayment('debito')">Débito</div>
            <div class="pay-btn" id="pay-credito" onclick="selectPayment('credito')">Crédito</div>
            <div class="pay-btn" id="pay-pix" onclick="selectPayment('pix')">PIX</div>
            <div class="pay-btn" id="pay-crediario" onclick="selectPayment('crediario')">Crediário</div>
            <div class="pay-btn" id="pay-misto" onclick="selectPayment('misto')">Misto</div>
          </div>
          <div id="pay-extra" style="margin-top:8px"></div>
        </div>
        <div style="padding:12px 14px;border-top:1px solid var(--border)">
          <button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px;font-size:15px" onclick="finalizarVenda()">
            <i data-lucide="check-circle"></i> Finalizar Venda
          </button>
        </div>
      </div>
    </div>
  </div>`;
  document.getElementById('content').innerHTML = html;
  setTimeout(()=>lucide.createIcons(),10);
  loadAllProducts();
  loadPDVDropdowns();
  renderCart();
}

async function loadAllProducts() {
  const {data} = await sb.from('produtos').select('id,codigo,nome,preco_venda,grade_id,grades(valores)').eq('ativo',true).order('nome');
  renderProductsGrid(data||[]);
}

async function searchProducts(q) {
  if(!q.trim()){loadAllProducts();return;}
  const {data} = await sb.from('produtos').select('id,codigo,nome,preco_venda,grade_id,grades(valores)').eq('ativo',true).ilike('nome',`%${q}%`);
  renderProductsGrid(data||[]);
}

function renderProductsGrid(prods) {
  const grid = document.getElementById('products-grid');
  if(!grid) return;
  if(!prods.length){grid.innerHTML='<div class="empty-state"><i data-lucide="package"></i><h3>Nenhum produto encontrado</h3></div>';lucide.createIcons();return;}
  grid.innerHTML = prods.map(p=>`
    <div class="product-card" onclick="addToCart('${p.id}','${p.nome.replace(/'/g,"\\'")}',${p.preco_venda},${JSON.stringify(p.grades?.valores||null)})">
      <h4>${p.nome}</h4>
      <div class="price">${fmt(p.preco_venda)}</div>
      ${p.codigo?`<div class="stock">${p.codigo}</div>`:''}
    </div>`).join('');
  lucide.createIcons();
}

function addToCart(id, nome, preco, grades) {
  if(grades && JSON.parse(typeof grades==='string'?grades:JSON.stringify(grades)).length>1) {
    openSizeSelector(id, nome, preco, typeof grades==='string'?grades:JSON.stringify(grades));
    return;
  }
  pushCartItem(id, nome, preco, 'Único');
}

function openSizeSelector(id, nome, preco, gradesJson) {
  const sizes = JSON.parse(gradesJson);
  document.getElementById('size-modal-container').innerHTML = `
    <div class="modal-header"><h3>Selecionar Tamanho</h3><button class="modal-close" onclick="closeSizeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--text-2);margin-bottom:12px"><strong>${nome}</strong> — ${fmt(preco)}</p>
      <div class="sizes-grid">${sizes.map(s=>`<div class="size-btn" onclick="selectSize('${id}','${nome.replace(/'/g,"\\'")}',${preco},'${s}')">${s}</div>`).join('')}</div>
    </div>`;
  document.getElementById('size-modal-overlay').classList.add('open');
  setTimeout(()=>lucide.createIcons(),10);
}

function selectSize(id, nome, preco, size) {
  closeSizeModalDirect();
  pushCartItem(id, nome, preco, size);
}

function pushCartItem(id, nome, preco, tamanho) {
  const existing = cart.find(i=>i.id===id&&i.tamanho===tamanho);
  if(existing){existing.qty++;} else {cart.push({id,nome,preco:parseFloat(preco),tamanho,qty:1});}
  renderCart();
}

function changeQty(idx, delta) {
  cart[idx].qty += delta;
  if(cart[idx].qty<=0) cart.splice(idx,1);
  renderCart();
}

function removeCartItem(idx) { cart.splice(idx,1); renderCart(); }

function clearCart() { cart=[]; cartClient=null; cartSeller=null; renderCart(); }

function renderCart() {
  const list = document.getElementById('cart-items-list');
  if(!list) return;
  if(!cart.length){list.innerHTML='<div class="empty-state" style="padding:24px"><i data-lucide="shopping-cart"></i><p>Carrinho vazio</p></div>';lucide.createIcons();updateCartTotals();return;}
  list.innerHTML = cart.map((item,i)=>`
    <div class="cart-item">
      <div class="cart-item-info">
        <h4>${item.nome}</h4>
        <span>${item.tamanho} — ${fmt(item.preco)}</span>
      </div>
      <div class="cart-qty">
        <button onclick="changeQty(${i},-1)">-</button>
        <span>${item.qty}</span>
        <button onclick="changeQty(${i},1)">+</button>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="cart-item-price">${fmt(item.preco*item.qty)}</span>
        <button onclick="removeCartItem(${i})" style="background:none;color:var(--red);display:flex"><i data-lucide="x" style="width:12px;height:12px"></i></button>
      </div>
    </div>`).join('');
  updateCartTotals();
  lucide.createIcons();
}

function updateCartTotals() {
  const sub = cart.reduce((a,i)=>a+i.preco*i.qty,0);
  const disc = parseFloat(document.getElementById('cart-discount')?.value||0);
  const total = Math.max(0,sub-disc);
  const el = (id)=>document.getElementById(id);
  if(el('cart-subtotal')) el('cart-subtotal').textContent=fmt(sub);
  if(el('cart-total')) el('cart-total').textContent=fmt(total);
  if(el('cart-count')) el('cart-count').textContent=cart.reduce((a,i)=>a+i.qty,0)+' itens';
}

function selectPayment(tipo) {
  cartPayment = tipo;
  document.querySelectorAll('.pay-btn').forEach(b=>b.classList.remove('selected'));
  document.getElementById(`pay-${tipo}`)?.classList.add('selected');
  const extra = document.getElementById('pay-extra');
  if(!extra) return;
  if(tipo==='credito'||tipo==='crediario'){
    extra.innerHTML=`<div class="form-group"><label>Parcelas</label><select id="pay-parcelas" style="padding:6px 10px;border:1.5px solid var(--border-2);border-radius:var(--radius)"><option value="1">1x sem juros</option><option value="2">2x</option><option value="3">3x</option><option value="4">4x</option><option value="5">5x</option><option value="6">6x</option><option value="10">10x</option><option value="12">12x</option></select></div>`;
  } else if(tipo==='dinheiro'){
    extra.innerHTML=`<div class="form-group"><label>Valor Recebido (R$)</label><input type="number" id="pay-valor-recebido" placeholder="0,00" style="padding:6px 10px;border:1.5px solid var(--border-2);border-radius:var(--radius)"></div>`;
  } else { extra.innerHTML=''; }
}

async function loadPDVDropdowns() {
  const [{data:cl},{data:vd}] = await Promise.all([
    sb.from('clientes').select('id,nome').eq('ativo',true).order('nome'),
    sb.from('vendedores').select('id,nome').eq('ativo',true).order('nome')
  ]);
  const cs = document.getElementById('pdv-client');
  const vs = document.getElementById('pdv-seller');
  if(cs)(cl||[]).forEach(c=>cs.add(new Option(c.nome,c.id)));
  if(vs)(vd||[]).forEach(v=>vs.add(new Option(v.nome,v.id)));
}

async function finalizarVenda() {
  if(!cart.length) return toast('Carrinho vazio','error');
  const sub = cart.reduce((a,i)=>a+i.preco*i.qty,0);
  const disc = parseFloat(document.getElementById('cart-discount')?.value||0);
  const total = Math.max(0,sub-disc);
  const parcelas = parseInt(document.getElementById('pay-parcelas')?.value||1);
  const valorPago = parseFloat(document.getElementById('pay-valor-recebido')?.value||total);

  const vendaData = {
    cliente_id: cartClient||null,
    vendedor_id: cartSeller||null,
    subtotal: sub, desconto: disc, total,
    forma_pagamento: cartPayment, parcelas,
    valor_pago: valorPago, troco: Math.max(0,valorPago-total),
    status: 'concluida'
  };

  const {data:venda,error} = await sb.from('vendas').insert(vendaData).select().single();
  if(error) return toast('Erro ao salvar venda: '+error.message,'error');

  // Itens
  const itens = cart.map(i=>({
    venda_id:venda.id, produto_id:i.id, produto_nome:i.nome,
    tamanho:i.tamanho, quantidade:i.qty, preco_unitario:i.preco,
    total:i.preco*i.qty
  }));
  await sb.from('venda_itens').insert(itens);

  // Crediário
  if(cartPayment==='crediario' && cartClient) {
    const valParc = total/parcelas;
    const {data:cred} = await sb.from('crediario').insert({
      venda_id:venda.id, cliente_id:cartClient, total, num_parcelas:parcelas,
      valor_parcela:valParc, saldo_devedor:total, status:'aberto'
    }).select().single();
    if(cred){
      const parcs = Array.from({length:parcelas},(_,k)=>({
        crediario_id:cred.id, numero_parcela:k+1, valor:valParc,
        vencimento:new Date(Date.now()+(k+1)*30*86400000).toISOString().split('T')[0]
      }));
      await sb.from('crediario_parcelas').insert(parcs);
    }
  }

  // Baixar estoque
  for(const i of cart){
    await sb.from('produto_grades').update({estoque:sb.rpc?undefined:0}).match({produto_id:i.id,tamanho:i.tamanho});
    const {data:pg} = await sb.from('produto_grades').select('estoque').match({produto_id:i.id,tamanho:i.tamanho}).maybeSingle();
    if(pg) await sb.from('produto_grades').update({estoque:Math.max(0,(pg.estoque||0)-i.qty)}).match({produto_id:i.id,tamanho:i.tamanho});
  }

  const troco = Math.max(0,valorPago-total);
  toast(`Venda #${venda.numero_venda} concluída!${troco>0?' Troco: '+fmt(troco):''}`, 'success');
  cart = [];
  renderCart();
}
