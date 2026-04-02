let pdvCaixaAberto = false;
let pdvFundoValor = 0;
let pdvTab = 'itens';
let pdvPayments = [];

// ===== PDV =====
async function renderPDV() {
  document.getElementById('topbar-actions').innerHTML = ''; // Botões do topbar removidos, a UI mudou para a sidebar esquerda
  
  if (!pdvCaixaAberto) {
    // TELA 1: Abertura do Fundo de Caixa (Estilo Phibo)
    document.getElementById('content').innerHTML = `
      <div class="pdv-fundo-screen">
        
        <div class="pdv-fundo-inner">
          <div style="width:180px;height:180px;display:flex;align-items:center;justify-content:center;">
            <svg viewBox="0 0 200 200" width="180" height="180" xmlns="http://www.w3.org/2000/svg">
              <rect x="30" y="80" width="140" height="90" rx="8" fill="#8B8682" stroke="#5a524e" stroke-width="2"/>
              <rect x="40" y="90" width="60" height="40" rx="4" fill="#a8e6cf" stroke="#5a524e" stroke-width="1.5"/>
              <rect x="50" y="100" width="40" height="8" rx="2" fill="#2c3e50"/>
              <rect x="50" y="112" width="30" height="6" rx="2" fill="#2c3e50" opacity="0.5"/>
              <rect x="110" y="90" width="50" height="40" rx="4" fill="#e0e0e0" stroke="#5a524e" stroke-width="1"/>
              <circle cx="120" cy="100" r="4" fill="#c0392b"/><circle cx="135" cy="100" r="4" fill="#27ae60"/><circle cx="150" cy="100" r="4" fill="#2980b9"/>
              <circle cx="120" cy="115" r="4" fill="#f39c12"/><circle cx="135" cy="115" r="4" fill="#8e44ad"/><circle cx="150" cy="115" r="4" fill="#16a085"/>
              <rect x="35" y="135" width="130" height="30" rx="4" fill="#6d6360" stroke="#5a524e" stroke-width="1"/>
              <rect x="40" y="80" width="120" height="8" rx="2" fill="#bdc3c7"/>
              <rect x="70" y="55" width="60" height="30" rx="4" fill="#f1c40f" stroke="#d4ac0d" stroke-width="1.5"/>
              <rect x="80" y="60" width="40" height="6" rx="1" fill="#2c3e50" opacity="0.6"/>
              <rect x="85" y="70" width="30" height="4" rx="1" fill="#2c3e50" opacity="0.3"/>
            </svg>
          </div>
          
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
            <h3 style="color:#e74c3c;font-size:22px;font-weight:900;margin:0;text-transform:uppercase;">Fundo de Caixa</h3>
            <h4 style="color:#e74c3c;font-size:16px;font-weight:700;margin:0;">Valor</h4>
            
            <input type="number" id="pdv-fundo-inicial" placeholder="0,00" style="width:220px;padding:10px 14px;border:2px solid #00bcd4;border-radius:4px;outline:none;font-size:18px;font-weight:700;color:#2c3e50;text-align:center;margin-top:8px;max-width:100%;box-sizing:border-box;">
          </div>
        </div>
        
        <button onclick="confirmarFundoPDV()" style="margin-top:30px;padding:14px 80px;background:#4caf50;border:none;color:#fff;border-radius:8px;font-weight:900;font-size:16px;cursor:pointer;box-shadow:0 4px 12px rgba(76,175,80,0.35);letter-spacing:0.5px;max-width:100%;box-sizing:border-box;">OK continuar</button>
      </div>
    `;

    return;
  }

  const dtHoje = new Date().toLocaleDateString('pt-BR');
  const html = `
  <div class="pdv-mobile-layout">
    
    <!-- Sidebar de Ações -->
    <div class="pdv-sidebar-actions">
      <button onclick="clearCart()" style="background:#95a5a6;color:#fff;border:none;padding:14px 10px;border-radius:6px;font-weight:800;font-size:13px;cursor:pointer;display:flex;justify-content:center;align-items:center;width:100%;">Limpar</button>
      <button onclick="switchPdvTab('recebimento')" style="background:#2ecc71;color:#fff;border:none;padding:14px 10px;border-radius:6px;font-weight:900;font-size:13px;cursor:pointer;display:flex;justify-content:center;align-items:center;width:100%;">Efetuar Recebimento</button>
      <button onclick="finalizarVenda()" style="background:#3498db;color:#fff;border:none;padding:14px 10px;border-radius:6px;font-weight:900;font-size:13px;cursor:pointer;display:flex;justify-content:center;align-items:center;width:100%;">Concluir Venda</button>
      <button onclick="toast('Módulo Troca em desenvolvimento')" style="background:#95a5a6;color:#fff;border:none;padding:14px 10px;border-radius:6px;font-weight:800;font-size:13px;cursor:pointer;display:flex;justify-content:center;align-items:center;width:100%;">Troca</button>
    </div>

    <!-- Main Content Area -->
    <div class="pdv-main-area">
      
      <!-- Fundo Alert -->
      <div id="pdv-alert-fundo" style="background:#d9edf7;border:1px solid #bce8f1;border-radius:4px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">
        <span style="color:#31708f;font-weight:600;font-size:13px;"><i data-lucide="info" style="width:16px;vertical-align:middle;margin-right:6px;"></i> O Fundo de Caixa foi cadastrado corretamente! Obrigado.</span>
        <i data-lucide="x" style="width:16px;color:#31708f;cursor:pointer;" onclick="document.getElementById('pdv-alert-fundo').style.display='none'"></i>
      </div>

      <!-- Top Area: Filters + Green Total -->
      <div class="pdv-top-section">
        <!-- Filter Form -->
        <div class="pdv-filters-area">
          <div class="pdv-filters-grid">
            <div>
              <label style="display:block;color:#2c3e50;font-weight:900;font-size:12px;margin-bottom:8px;">Vendedor(a)</label>
              <select id="pdv-seller" onchange="cartSeller=this.value" style="width:100%;padding:10px 14px;border:2px solid #2c3e50;border-radius:6px;outline:none;font-size:14px;font-weight:700;color:#2c3e50;background:#fff;box-sizing:border-box;">
                <option value="">Selecione</option>
              </select>
            </div>
            <div>
              <label style="display:block;color:#2c3e50;font-weight:900;font-size:12px;margin-bottom:8px;">Data Venda</label>
              <input type="text" value="${dtHoje}" disabled style="width:100%;padding:10px 14px;border:1px solid #e1e8ed;border-radius:6px;outline:none;font-size:14px;font-weight:700;color:#7f8c8d;background:#fff;text-align:center;box-sizing:border-box;">
            </div>
          </div>

          <div>
             <label style="display:block;color:#2c3e50;font-weight:900;font-size:12px;margin-bottom:8px;">Cliente</label>
             <div class="pdv-client-row" style="display:flex;align-items:center;gap:8px;">
              <button onclick="openClientePDVModal()" style="background:#5cb85c;color:#fff;border:none;border-radius:4px;padding:8px 14px;font-weight:800;font-size:12px;cursor:pointer;white-space:nowrap;">Incluir Cliente</button>
              <input type="text" id="pdv-client-phone" placeholder="Número Celular" style="padding:8px 12px;border:1px solid #ccc;border-radius:4px;outline:none;font-size:13px;width:140px;background:#fff;box-sizing:border-box;">
              <input type="text" id="pdv-client-name" placeholder="Nome abreviado ou completo" style="padding:8px 12px;border:1px solid #ccc;border-radius:4px;outline:none;font-size:13px;flex:1;background:#fff;min-width:0;box-sizing:border-box;" onkeypress="if(event.key==='Enter')searchClientePDV()">
              <select id="pdv-client" onchange="cartClient=this.value" style="display:none;">
                <option value="">Consumidor final</option>
              </select>
              <button onclick="searchClientePDV()" style="background:#fff;border:1px solid #ccc;border-radius:4px;padding:8px 12px;cursor:pointer;flex-shrink:0;"><i data-lucide="search" style="width:16px;"></i></button>
            </div></div>
          </div>
        </div>
        
        <!-- Green Total Box -->
        <div class="pdv-total-box">
          <div style="display:flex;justify-content:space-between;color:#000;font-weight:800;font-size:13px;"><span style="color:#2c3e50">(+) Total Venda:</span><span id="cart-total-sale">0,00</span></div>
          <div style="display:flex;justify-content:space-between;color:#000;font-weight:800;font-size:13px;"><span style="color:#2c3e50">(-) Total Troca:</span><span>0,00</span></div>
          <div style="border-top:1px solid #00b300;margin-top:6px;padding-top:8px;display:flex;justify-content:space-between;color:#000;font-weight:900;font-size:15px;"><span style="color:#2c3e50">(=) Valor Final R$:</span><span id="cart-grand-total">0,00</span></div>
        </div>
      </div>

      <!-- Tabs + Table -->
      <div style="background:#fff;border-radius:12px;border:1px solid #e1e8ed;flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:350px;margin-bottom:10px;">
        
        <!-- Tabs Row -->
        <div style="background:#f4f6f7;display:flex;flex-direction:column;border-bottom:1px solid #e1e8ed;">
          <div style="display:flex;gap:1px;background:#e1e8ed;padding:2px 2px 0 2px;">
            <div id="pdv-tab-btn-itens" style="background:#fff;color:#3498db;font-weight:800;font-size:13px;padding:10px 24px;border-radius:6px 6px 0 0;cursor:pointer;" onclick="switchPdvTab('itens')">Itens Venda</div>
            <div id="pdv-tab-btn-receb" style="background:#ecf0f1;color:#95a5a6;font-weight:800;font-size:13px;padding:10px 24px;border-radius:6px 6px 0 0;cursor:pointer;" onclick="switchPdvTab('recebimento')">Recebimento</div>
          </div>
        </div>

        <!-- TAB: ITENS VENDA -->
        <div id="pdv-tab-itens" style="display:flex;flex-direction:column;flex:1;overflow:hidden;">
          <!-- Inputs -->
          <div class="pdv-qty-prod-row">
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
              <label style="color:#e74c3c;font-weight:900;font-size:13px;">Quantidade</label>
              <input type="number" id="pdv-qty-input" value="1" min="1" style="width:120px;padding:10px;border:1px solid #bdc3c7;border-radius:6px;text-align:center;font-size:15px;font-weight:800;outline:none;box-sizing:border-box;">
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-start;gap:6px;flex:1;min-width:0;">
              <label style="color:#e74c3c;font-weight:900;font-size:13px;">Informe o Produto</label>
              <div class="pdv-prod-input-wrap">
                 <input type="text" id="pdv-prod-input" style="flex:1;padding:10px 14px;border:1px solid #3498db;border-radius:6px;font-size:15px;font-weight:700;outline:none;min-width:0;box-sizing:border-box;" placeholder="Digite o nome..." onkeypress="if(event.key==='Enter')openProdutoPDVModal()">
                 <i data-lucide="search" style="width:24px;height:24px;color:#3498db;cursor:pointer;flex-shrink:0;" onclick="openProdutoPDVModal()"></i>
              </div>
            </div>
          </div>

          <!-- Cart Table -->
          <div class="pdv-cart-table-wrap" style="flex:1;overflow-y:auto;background:#fcfcfc;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead style="background:#fcfcfc;border-bottom:2px solid #e1e8ed;">
                <tr style="background:#f4f6f7;border-bottom:1px solid #e1e8ed;">
                   <th colspan="9" style="padding:8px 16px;text-align:center;color:#2c3e50;font-weight:900;font-size:13px;">Itens da Venda</th>
                </tr>
                <tr>
                  <th style="padding:12px 16px;text-align:left;color:#7f8c8d;font-weight:900;">Código (EAN)</th>
                  <th style="padding:12px 16px;text-align:left;color:#7f8c8d;font-weight:900;">Descrição Produto</th>
                  <th style="padding:12px 16px;text-align:center;color:#7f8c8d;font-weight:900;">Grade</th>
                  <th style="padding:12px 16px;text-align:center;color:#7f8c8d;font-weight:900;">Cor</th>
                  <th style="padding:12px 16px;text-align:center;color:#7f8c8d;font-weight:900;">Qtde</th>
                  <th style="padding:12px 16px;text-align:right;color:#7f8c8d;font-weight:900;">Vlr Un</th>
                  <th style="padding:12px 16px;text-align:right;color:#7f8c8d;font-weight:900;">Descto</th>
                  <th style="padding:12px 16px;text-align:right;color:#7f8c8d;font-weight:900;">Vlr Total</th>
                  <th style="padding:12px 16px;text-align:center;color:#7f8c8d;font-weight:900;">Ação</th>
                </tr>
              </thead>
              <tbody id="cart-items-list">
              </tbody>
              <tfoot style="background:#fcfcfc;border-top:1px solid #e1e8ed;">
                <tr>
                  <td colspan="4" style="padding:12px 16px;text-align:right;color:#7f8c8d;font-weight:900;text-transform:uppercase;">Total:</td>
                  <td style="padding:12px 16px;text-align:center;color:#3498db;font-weight:900;font-size:14px;" id="cart-total-qty">0</td>
                  <td style="padding:12px 16px;text-align:right;"></td>
                  <td style="padding:12px 16px;text-align:right;color:#e74c3c;font-weight:900;font-size:14px;" id="cart-total-desc">0,00</td>
                  <td style="padding:12px 16px;text-align:right;color:#3498db;font-weight:900;font-size:14px;" id="cart-total-val">0,00</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- TAB: RECEBIMENTO -->
        <div id="pdv-tab-recebimento" style="display:none;flex-direction:column;flex:1;overflow:hidden;background:#fff;padding:20px;">
          
          <div class="pdv-rec-top-flex">
            <!-- Desconto e Frete -->
            <div style="flex:1;background:#dff9fb;border:1px solid #badc58;border-radius:8px;padding:16px;">
              <h4 style="color:#2c3e50;font-weight:900;font-size:13px;text-align:center;margin-bottom:10px;">Desconto</h4>
              <div style="display:flex;gap:8px;margin-bottom:12px;">
                <div style="flex:1;background:#fff;border:1px solid #badc58;border-radius:4px;display:flex;align-items:center;justify-content:center;font-weight:800;color:#7f8c8d;">%</div>
                <input type="number" id="pdv-desc-val" style="flex:2;padding:6px;border:1px solid #badc58;border-radius:4px;outline:none;box-sizing:border-box;" oninput="updateCartTotals()">
              </div>
              <h4 style="color:#2c3e50;font-weight:900;font-size:13px;text-align:center;margin-bottom:10px;">Frete</h4>
              <input type="number" id="pdv-frete-val" style="width:100%;padding:6px;border:1px solid #badc58;border-radius:4px;outline:none;margin-bottom:12px;box-sizing:border-box;" oninput="updateCartTotals()">
              <a href="#" style="color:#3498db;font-size:12px;font-weight:800;text-align:center;display:block;">+ Adicionar Cupom de Desconto</a>
            </div>
            
            <!-- Resumo Financeiro -->
            <div style="flex:1.5;background:#00e600;border-radius:8px;padding:20px;display:flex;flex-direction:column;gap:10px;">
              <div style="display:flex;justify-content:space-between;color:#000;font-weight:800;font-size:14px;"><span style="color:#2c3e50">(+) Total Venda:</span><span id="rec-total-venda">0,00</span></div>
              <div style="display:flex;justify-content:space-between;color:#000;font-weight:800;font-size:14px;"><span style="color:#2c3e50">(-) Total Desconto:</span><span id="rec-total-desc">0,00</span></div>
              <div style="display:flex;justify-content:space-between;color:#000;font-weight:800;font-size:14px;"><span style="color:#2c3e50">(+) Valor Frete:</span><span id="rec-total-frete">0,00</span></div>
              <div style="border-top:1px solid #00b300;margin-top:6px;padding-top:10px;display:flex;justify-content:space-between;color:#000;font-weight:900;font-size:16px;"><span style="color:#2c3e50">(=) Valor Final:</span><span id="rec-valor-final">R$ 0,00</span></div>
            </div>
          </div>

          <!-- Formulário Incluir Pagamento -->
          <div class="pdv-rec-form-row">
            <div class="pdv-rec-form-item">
              <label style="color:#e74c3c;font-weight:900;font-size:12px;text-align:center;">Forma Pagto</label>
              <select id="rec-forma" style="padding:10px;border:1px solid #2c3e50;border-radius:6px;outline:none;font-weight:800;font-size:13px;width:100%;box-sizing:border-box;">
                <option value="Dinheiro">Dinheiro</option>
                <option value="Pix">Pix</option>
                <option value="Cartão Crédito">Cartão Crédito</option>
                <option value="Cartão Débito">Cartão Débito</option>
                <option value="Crediário">Crediário</option>
              </select>
            </div>
            <div class="pdv-rec-form-item">
              <label style="color:#e74c3c;font-weight:900;font-size:12px;text-align:center;">Primeiro Vencto</label>
              <input type="text" id="rec-vencto" value="${dtHoje}" disabled style="padding:10px;border:1px solid #e1e8ed;border-radius:6px;outline:none;text-align:center;font-weight:700;color:#7f8c8d;width:100%;background:#fcfcfc;box-sizing:border-box;">
            </div>
            <div class="pdv-rec-form-item">
              <label style="color:#e74c3c;font-weight:900;font-size:12px;text-align:center;">Qtde Parcela</label>
              <select id="rec-parc" style="padding:10px;border:1px solid #e1e8ed;border-radius:6px;outline:none;font-weight:700;width:100%;box-sizing:border-box;">
                <option value="1">1x</option>
                <option value="2">2x</option>
                <option value="3">3x</option>
                <option value="4">4x</option>
                <option value="5">5x</option>
                <option value="6">6x</option>
                <option value="10">10x</option>
                <option value="12">12x</option>
              </select>
            </div>
            <div class="pdv-rec-form-item">
              <label style="color:#e74c3c;font-weight:900;font-size:12px;text-align:center;">Valor</label>
              <div style="display:flex;align-items:center;">
                <input type="number" id="rec-valor" style="padding:10px;border:1px solid #3498db;border-radius:6px 0 0 6px;outline:none;font-weight:900;font-size:14px;width:100%;color:#3498db;box-sizing:border-box;" onkeypress="if(event.key==='Enter')addPdvPayment()">
                <button onclick="addPdvPayment()" style="background:#3498db;border:none;color:#fff;padding:10px 14px;border-radius:0 6px 6px 0;cursor:pointer;flex-shrink:0;"><i data-lucide="plus" style="width:16px;"></i></button>
              </div>
            </div>
          </div>

          <!-- Tabela de Pagamentos -->
          <div class="pdv-cart-table-wrap" style="border:1px solid #e1e8ed;flex:1;overflow-y:auto;border-radius:6px;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead style="background:#f4f6f7;border-bottom:1px solid #e1e8ed;">
                <tr>
                  <th style="padding:10px;font-weight:900;color:#2c3e50;text-align:left;">Forma Pagto</th>
                  <th style="padding:10px;font-weight:900;color:#2c3e50;text-align:center;">Parcelas</th>
                  <th style="padding:10px;font-weight:900;color:#2c3e50;text-align:center;">Primeiro Vencimento</th>
                  <th style="padding:10px;font-weight:900;color:#2c3e50;text-align:right;">Valor</th>
                  <th style="padding:10px;font-weight:900;color:#2c3e50;text-align:center;">Ação</th>
                </tr>
              </thead>
              <tbody id="rec-items-list">
                <tr><td colspan="5" style="padding:16px;text-align:center;color:#7f8c8d;font-weight:700;">Nenhuma Forma de Pagamento para a Venda.</td></tr>
              </tbody>
              <tfoot style="background:#fcfcfc;">
                <tr>
                  <td colspan="3" style="padding:8px 10px;text-align:right;color:#7f8c8d;font-weight:800;">Total pago:</td>
                  <td style="padding:8px 10px;text-align:right;color:#2ecc71;font-weight:900;font-size:14px;border-bottom:1px solid #e1e8ed;" id="rec-total-pago">0,00</td>
                  <td></td>
                </tr>
                <tr>
                  <td colspan="3" style="padding:8px 10px;text-align:right;color:#7f8c8d;font-weight:800;">Total a pagar:</td>
                  <td style="padding:8px 10px;text-align:right;color:#e74c3c;font-weight:900;font-size:14px;" id="rec-total-apagar">0,00</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
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

function confirmarFundoPDV() {
  const v = document.getElementById('pdv-fundo-inicial').value;
  if(!v) return toast('Informe o fundo de caixa para continuar', 'error');
  pdvCaixaAberto = true;
  pdvFundoValor = parseFloat(v) || 0;
  toast('O Fundo de Caixa foi cadastrado corretamente! Obrigado.');
  renderPDV();
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
  if(!cart.length){
    list.innerHTML='<tr><td colspan="9" style="padding:40px;color:#bdc3c7;text-align:center;font-weight:700;">Nenhum Item de Venda.</td></tr>';
    updateCartTotals();
    return;
  }
  list.innerHTML = cart.map((item,i)=>`
    <tr style="border-bottom:1px solid #f1f2f6;background:#fff;">
      <td style="padding:10px 16px;font-weight:600;color:#7f8c8d;">${item.codigo||'-'}</td>
      <td style="padding:10px 16px;font-weight:800;color:#2c3e50;">${item.nome}</td>
      <td style="padding:10px 16px;text-align:center;font-weight:700;color:#2c3e50;">${item.tamanho}</td>
      <td style="padding:10px 16px;text-align:center;font-weight:700;color:#2c3e50;">-</td>
      <td style="padding:10px 16px;text-align:center;font-weight:800;color:#3498db;">${item.qty}</td>
      <td style="padding:10px 16px;text-align:right;font-weight:700;color:#2c3e50;">${fmt(item.preco)}</td>
      <td style="padding:10px 16px;text-align:right;font-weight:700;color:#e74c3c;">0,00</td>
      <td style="padding:10px 16px;text-align:right;font-weight:800;color:#2c3e50;">${fmt(item.preco*item.qty)}</td>
      <td style="padding:10px 16px;text-align:center;">
        <i data-lucide="trash-2" style="color:#e74c3c;cursor:pointer;width:16px;height:16px;display:inline-block;" onclick="removeCartItem(${i})"></i>
      </td>
    </tr>`).join('');
  updateCartTotals();
  lucide.createIcons();
}

function updateCartTotals() {
  const sub = cart.reduce((a,i)=>a+i.preco*i.qty,0);
  const qty = cart.reduce((a,i)=>a+i.qty,0);
  
  const descInput = document.getElementById('pdv-desc-val');
  const freteInput = document.getElementById('pdv-frete-val');
  const disc = parseFloat(descInput?.value||0);
  const frete = parseFloat(freteInput?.value||0);
  const total = Math.max(0, sub - disc + frete);
  
  // Tab Itens totals
  if(document.getElementById('cart-total-qty')) document.getElementById('cart-total-qty').textContent = qty;
  if(document.getElementById('cart-total-val')) document.getElementById('cart-total-val').textContent = fmt(total);
  if(document.getElementById('cart-total-sale')) document.getElementById('cart-total-sale').textContent = fmt(sub);
  if(document.getElementById('cart-grand-total')) document.getElementById('cart-grand-total').textContent = fmt(total);
  
  // Tab Recebimento totals
  if(document.getElementById('rec-total-venda')) document.getElementById('rec-total-venda').textContent = fmt(sub);
  if(document.getElementById('rec-total-desc')) document.getElementById('rec-total-desc').textContent = fmt(disc);
  if(document.getElementById('rec-total-frete')) document.getElementById('rec-total-frete').textContent = fmt(frete);
  if(document.getElementById('rec-valor-final')) document.getElementById('rec-valor-final').textContent = 'R$ ' + fmt(total);
  
  // Payment totals
  const totalPago = pdvPayments.reduce((a,p)=>a+p.valor,0);
  const restante = Math.max(0, total - totalPago);
  
  const recValorInput = document.getElementById('rec-valor');
  if(recValorInput && pdvPayments.length === 0) recValorInput.value = total > 0 ? total.toFixed(2) : '';
  else if(recValorInput) recValorInput.value = restante > 0 ? restante.toFixed(2) : '';
  
  if(document.getElementById('rec-total-pago')) document.getElementById('rec-total-pago').textContent = fmt(totalPago);
  if(document.getElementById('rec-total-apagar')) document.getElementById('rec-total-apagar').textContent = fmt(restante);
}

function switchPdvTab(tab) {
  pdvTab = tab;
  const btnItens = document.getElementById('pdv-tab-btn-itens');
  const btnReceb = document.getElementById('pdv-tab-btn-receb');
  const tabItens = document.getElementById('pdv-tab-itens');
  const tabReceb = document.getElementById('pdv-tab-recebimento');
  
  if(btnItens) { btnItens.style.background = tab==='itens' ? '#fff' : '#ecf0f1'; btnItens.style.color = tab==='itens' ? '#3498db' : '#95a5a6'; }
  if(btnReceb) { btnReceb.style.background = tab==='recebimento' ? '#fff' : '#ecf0f1'; btnReceb.style.color = tab==='recebimento' ? '#3498db' : '#95a5a6'; }
  if(tabItens) tabItens.style.display = tab==='itens' ? 'flex' : 'none';
  if(tabReceb) tabReceb.style.display = tab==='recebimento' ? 'flex' : 'none';
  
  if(tab === 'recebimento') { updateCartTotals(); setTimeout(()=>lucide.createIcons(),10); }
}

function addPdvPayment() {
  const forma = document.getElementById('rec-forma')?.value;
  const parc = document.getElementById('rec-parc')?.value || '1';
  const val = parseFloat(document.getElementById('rec-valor')?.value);
  const dt = document.getElementById('rec-vencto')?.value || new Date().toLocaleDateString('pt-BR');
  
  if(!val || val <= 0) return toast('Informe um valor válido','error');
  
  pdvPayments.push({ forma, parcelas: parc, valor: val, vencimento: dt });
  renderPdvPayments();
  toast('Pagamento adicionado!', 'success');
}

function removePdvPayment(idx) {
  pdvPayments.splice(idx, 1);
  renderPdvPayments();
}

function renderPdvPayments() {
  const list = document.getElementById('rec-items-list');
  if(!list) return;
  if(!pdvPayments.length) {
    list.innerHTML = '<tr><td colspan="5" style="padding:16px;text-align:center;color:#7f8c8d;font-weight:700;">Nenhuma Forma de Pagamento para a Venda.</td></tr>';
    updateCartTotals();
    return;
  }
  list.innerHTML = pdvPayments.map((p,i) => `
    <tr style="border-bottom:1px solid #f1f2f6;background:#fff;">
      <td style="padding:10px;font-weight:800;color:#2c3e50;">${p.forma}</td>
      <td style="padding:10px;text-align:center;font-weight:700;color:#7f8c8d;">${p.parcelas}x</td>
      <td style="padding:10px;text-align:center;font-weight:700;color:#7f8c8d;">${p.vencimento}</td>
      <td style="padding:10px;text-align:right;font-weight:800;color:#3498db;">${fmt(p.valor)}</td>
      <td style="padding:10px;text-align:center;">
        <i data-lucide="trash-2" style="color:#e74c3c;cursor:pointer;width:16px;display:inline-block;" onclick="removePdvPayment(${i})"></i>
      </td>
    </tr>
  `).join('');
  updateCartTotals();
  lucide.createIcons();
}

function openClientePDVModal() {
  openModal(`
    <div class="modal-header" style="border-bottom:none;">
      <h3 style="color:#2c3e50;font-weight:900;font-size:20px;">Incluir Cliente</h3>
      <button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button>
    </div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:20px;padding-top:10px;">
      <div style="display:flex;border-bottom:2px solid #f1f2f6;">
        <div style="padding:10px 20px;color:#3498db;font-weight:800;border-bottom:2px solid #3498db;margin-bottom:-2px;cursor:pointer;">Cliente</div>
        <div style="padding:10px 20px;color:#bdc3c7;font-weight:800;cursor:pointer;">Dados Complementares</div>
        <div style="padding:10px 20px;color:#bdc3c7;font-weight:800;cursor:pointer;">Dados dos Filhos</div>
      </div>
      
      <div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:400px;margin:0 auto;">
         <label style="color:#e74c3c;font-weight:900;font-size:12px;">Celular</label>
         <input type="text" placeholder="DDD + Numero" style="padding:10px;border:1px solid #bdc3c7;border-radius:4px;outline:none;font-weight:700;">
         
         <label style="color:#e74c3c;font-weight:900;font-size:12px;margin-top:6px;">Nome Completo</label>
         <input type="text" id="add-cli-nome" style="padding:10px;border:1px solid #bdc3c7;border-radius:4px;outline:none;font-weight:700;">
         
         <label style="color:#e74c3c;font-weight:900;font-size:12px;margin-top:6px;">Nome Abreviado</label>
         <input type="text" style="padding:10px;border:1px solid #bdc3c7;border-radius:4px;outline:none;font-weight:700;">
         
         <label style="color:#2c3e50;font-weight:900;font-size:12px;margin-top:6px;">Email</label>
         <input type="email" style="padding:10px;border:1px solid #bdc3c7;border-radius:4px;outline:none;font-weight:700;">
         
         <div style="display:flex;gap:20px;margin-top:6px;">
            <div style="display:flex;flex-direction:column;gap:6px;">
              <label style="color:#e74c3c;font-weight:900;font-size:12px;">Sexo</label>
              <div style="display:flex;gap:8px;">
                <button style="border:1px solid #bdc3c7;background:#fff;padding:8px 12px;border-radius:4px;color:#7f8c8d;font-weight:800;">F</button>
                <button style="border:1px solid #bdc3c7;background:#fff;padding:8px 12px;border-radius:4px;color:#7f8c8d;font-weight:800;">M</button>
              </div>
            </div>
         </div>
         
         <button onclick="toast('Cliente cadastrado com sucesso!');closeModalDirect();" style="width:100%;background:#3498db;color:#fff;border:none;border-radius:6px;padding:14px;font-weight:900;font-size:14px;cursor:pointer;margin-top:10px;box-shadow:0 3px 6px rgba(52,152,219,0.2);">Cadastrar Cliente</button>
      </div>
    </div>
  `, 'modal-md');
  lucide.createIcons();
}

async function openProdutoPDVModal() {
  const term = document.getElementById('pdv-prod-input').value;
  const {data} = await sb.from('produtos').select('id,codigo,nome,preco_venda,grade_id,grades(valores)').eq('ativo',true).ilike('nome',`%${term}%`);
  
  openModal(`
    <div class="modal-header" style="border-bottom:none;padding-bottom:0;">
      <h3 style="color:#2c3e50;font-weight:900;font-size:20px;">Seleção de Produto em Estoque</h3>
      <button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button>
    </div>
    <div class="modal-body" style="padding-top:16px;">
      
      <div style="display:flex;justify-content:center;gap:16px;margin-bottom:16px;align-items:flex-end;">
        <div style="display:flex;flex-direction:column;gap:4px;">
           <label style="color:#e74c3c;font-weight:900;font-size:12px;text-align:center;">Código de barras (EAN)</label>
           <input type="text" style="padding:6px;border:1px solid #3498db;border-radius:4px;width:140px;outline:none;background:#f0f8ff;">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
           <label style="color:#e74c3c;font-weight:900;font-size:12px;text-align:center;">Código produto</label>
           <input type="text" style="padding:6px;border:1px solid #bdc3c7;border-radius:4px;width:100px;outline:none;">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
           <label style="color:#e74c3c;font-weight:900;font-size:12px;text-align:center;">Descrição produto</label>
           <input type="text" value="${term}" style="padding:6px;border:1px solid #bdc3c7;border-radius:4px;width:240px;outline:none;">
        </div>
        <button onclick="toast('Buscando...')" style="background:#2ecc71;color:#fff;border:none;border-radius:4px;padding:8px 16px;font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 2px 4px rgba(46,204,113,0.2);margin-bottom:2px;">Buscar</button>
      </div>
      
      <div style="border:1px solid #e1e8ed;max-height:350px;overflow-y:auto;border-radius:6px;">
        <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:center;">
          <thead style="background:#f4f6f7;border-bottom:1px solid #e1e8ed;">
            <tr>
              <th style="padding:10px 8px;font-weight:900;color:#2c3e50;">Fornecedor</th>
              <th style="padding:10px 8px;font-weight:900;color:#2c3e50;">Cód. Produto</th>
              <th style="padding:10px 8px;font-weight:900;color:#2c3e50;">Descrição Produto</th>
              <th style="padding:10px 8px;font-weight:900;color:#2c3e50;">Grade</th>
              <th style="padding:10px 8px;font-weight:900;color:#2c3e50;">Valor Un</th>
              <th style="padding:10px 8px;font-weight:900;color:#2c3e50;">Qtde Estoque</th>
              <th style="padding:10px 8px;font-weight:900;color:#2c3e50;">Ação</th>
            </tr>
          </thead>
          <tbody>
            ${(data||[]).map(p=>`
              <tr style="border-bottom:1px solid #f1f2f6;background:#fff;">
                <td style="padding:10px 8px;font-weight:700;">CENTRAL</td>
                <td style="padding:10px 8px;font-weight:700;">${p.codigo||'-'}</td>
                <td style="padding:10px 8px;color:#7f8c8d;text-align:left;font-weight:800;">${p.nome}</td>
                <td style="padding:10px 8px;font-weight:700;">${p.grades?.valores?.[0]||'Único'}</td>
                <td style="padding:10px 8px;font-weight:800;">${fmt(p.preco_venda)}</td>
                <td style="padding:10px 8px;font-weight:700;">10,0</td>
                <td style="padding:10px 8px;">
                   <button onclick="addModalItemToCart('${p.id}', '${p.nome.replace(/'/g,"\\'")}', ${p.preco_venda}, '${p.codigo||''}');closeModalDirect();" style="width:26px;height:26px;border-radius:50%;background:#2ecc71;border:none;color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 4px rgba(46,204,113,0.3);"><i data-lucide="check" style="width:14px;"></i></button>
                </td>
              </tr>
            `).join('')}
            ${!data?.length ? `<tr><td colspan="7" style="padding:20px;font-weight:700;">Nenhum produto encontrado na busca.</td></tr>` : ''}
          </tbody>
        </table>
      </div>

    </div>
  `, 'modal-lg');
  lucide.createIcons();
}

function addModalItemToCart(id, nome, preco, codigo) {
  const qtyInput = document.getElementById('pdv-qty-input');
  const qty = parseInt(qtyInput && qtyInput.value ? qtyInput.value : 1);
  const existing = cart.find(i=>i.id===id);
  if(existing) {
    existing.qty += qty;
  } else {
    cart.push({id, nome, preco:parseFloat(preco), tamanho:'Único', qty, codigo});
  }
  if(qtyInput) qtyInput.value = 1;
  const pInput = document.getElementById('pdv-prod-input');
  if(pInput) pInput.value = '';
  renderCart();
  toast('Produto adicionado à venda!', 'success');
}

async function loadPDVDropdowns() {
  const [{data:cl},{data:vd}] = await Promise.all([
    sb.from('clientes').select('id,nome,celular').eq('ativo',true).order('nome'),
    sb.from('vendedores').select('id,nome').eq('ativo',true).order('nome')
  ]);
  window._pdvClientes = cl || [];
  const cs = document.getElementById('pdv-client');
  const vs = document.getElementById('pdv-seller');
  if(cs)(cl||[]).forEach(c=>cs.add(new Option(c.nome,c.id)));
  if(vs)(vd||[]).forEach(v=>vs.add(new Option(v.nome,v.id)));
}

async function searchClientePDV() {
  const phone = document.getElementById('pdv-client-phone')?.value?.trim() || '';
  const name = document.getElementById('pdv-client-name')?.value?.trim() || '';
  if(!phone && !name) return toast('Informe celular ou nome para buscar','error');
  
  let query = sb.from('clientes').select('id,nome,celular,nome_abreviado').eq('ativo',true);
  if(phone) query = query.ilike('celular', `%${phone}%`);
  if(name) query = query.or(`(nome.ilike.%${name}%,nome_abreviado.ilike.%${name}%)`);
  
  const {data} = await query;
  if(!data || !data.length) return toast('Nenhum cliente encontrado','error');
  
  const cli = data[0];
  cartClient = cli.id;
  const cs = document.getElementById('pdv-client');
  if(cs) { cs.innerHTML = `<option value="${cli.id}">${cli.nome}</option>`; cs.value = cli.id; }
  if(document.getElementById('pdv-client-phone')) document.getElementById('pdv-client-phone').value = cli.celular || '';
  if(document.getElementById('pdv-client-name')) document.getElementById('pdv-client-name').value = cli.nome || '';
  toast('Cliente selecionado: ' + cli.nome, 'success');
}

async function finalizarVenda() {
  if(!cart.length) return toast('Carrinho vazio','error');
  if(!pdvPayments.length) return toast('Adicione pelo menos uma forma de pagamento na aba Recebimento','error');
  
  const sub = cart.reduce((a,i)=>a+i.preco*i.qty,0);
  const disc = parseFloat(document.getElementById('pdv-desc-val')?.value||0);
  const frete = parseFloat(document.getElementById('pdv-frete-val')?.value||0);
  const total = Math.max(0, sub - disc + frete);
  const totalPago = pdvPayments.reduce((a,p)=>a+p.valor,0);
  
  if(totalPago < total) return toast(`Faltam ${fmt(total - totalPago)} para cobrir a venda. Adicione mais pagamentos.`,'error');
  
  const formaPrincipal = pdvPayments[0]?.forma || 'Dinheiro';
  const parcPrincipal = parseInt(pdvPayments[0]?.parcelas || 1);
  const troco = Math.max(0, totalPago - total);

  const vendaData = {
    cliente_id: cartClient||null,
    vendedor_id: cartSeller||null,
    subtotal: sub, desconto: disc, total,
    forma_pagamento: formaPrincipal, parcelas: parcPrincipal,
    valor_pago: totalPago, troco,
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
  if(formaPrincipal==='Crediário' && cartClient) {
    const valParc = total/parcPrincipal;
    const {data:cred} = await sb.from('crediario').insert({
      venda_id:venda.id, cliente_id:cartClient, total, num_parcelas:parcPrincipal,
      valor_parcela:valParc, saldo_devedor:total, status:'aberto'
    }).select().single();
    if(cred){
      const parcs = Array.from({length:parcPrincipal},(_,k)=>({
        crediario_id:cred.id, numero_parcela:k+1, valor:valParc,
        vencimento:new Date(Date.now()+(k+1)*30*86400000).toISOString().split('T')[0]
      }));
      await sb.from('crediario_parcelas').insert(parcs);
    }
  }

  // Baixar estoque
  for(const i of cart){
    const {data:pg} = await sb.from('produto_grades').select('estoque').match({produto_id:i.id,tamanho:i.tamanho}).maybeSingle();
    if(pg) await sb.from('produto_grades').update({estoque:Math.max(0,(pg.estoque||0)-i.qty)}).match({produto_id:i.id,tamanho:i.tamanho});
  }

  toast(`Venda #${venda.numero_venda} concluída com sucesso!${troco>0?' Troco: '+fmt(troco):''}`, 'success');
  cart = [];
  pdvPayments = [];
  cartClient = null;
  cartSeller = null;
  renderCart();
}
