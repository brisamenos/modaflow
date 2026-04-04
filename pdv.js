let pdvCaixaAberto = false;
let pdvFundoValor = 0;

try {
  const _dtFundo = new Date().toLocaleDateString('pt-BR');
  const _storedFundo = localStorage.getItem('storeos_fundo_caixa');
  if (_storedFundo) {
    const _parsed = JSON.parse(_storedFundo);
    if (_parsed.data === _dtFundo) {
      pdvCaixaAberto = true;
      pdvFundoValor = _parsed.valor;
    } else {
      localStorage.removeItem('storeos_fundo_caixa');
    }
  }
} catch(e) {}

let pdvTab = 'itens';
let pdvPayments = [];

// ===== PDV =====
async function renderPDV() {
  document.getElementById('topbar-actions').innerHTML = ''; // Botões do topbar removidos, a UI mudou para a sidebar esquerda
  document.getElementById('content').classList.add('pdv-active');
  
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
      <div style="border-top:1px solid rgba(255,255,255,0.15);padding-top:8px;margin-top:4px;">
        <button onclick="fecharCaixaPDV()" style="background:#c0392b;color:#fff;border:none;padding:14px 10px;border-radius:6px;font-weight:800;font-size:12px;cursor:pointer;display:flex;justify-content:center;align-items:center;gap:6px;width:100%;">
          <i data-lucide="lock" style="width:15px;height:15px;"></i>Fechar Caixa
        </button>
      </div>
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
              
              <div style="position:relative;width:140px;flex-shrink:0;">
                <input type="text" id="pdv-client-phone" placeholder="Número Celular" style="width:100%;padding:8px 12px;border:1px solid #ccc;border-radius:4px;outline:none;font-size:13px;background:#fff;box-sizing:border-box;" oninput="filterClientesPDV(this.value, 'phone')" autocomplete="off">
                <div id="pdv-client-dd-phone" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #bdc3c7;border-radius:4px;max-height:200px;overflow-y:auto;z-index:999;box-shadow:0 4px 6px rgba(0,0,0,0.1);"></div>
              </div>

              <div style="position:relative;flex:1;min-width:0;">
                <input type="text" id="pdv-client-name" placeholder="Nome abreviado ou completo" style="width:100%;padding:8px 12px;border:1px solid #ccc;border-radius:4px;outline:none;font-size:13px;background:#fff;box-sizing:border-box;" oninput="filterClientesPDV(this.value, 'name')" autocomplete="off">
                <div id="pdv-client-dd-name" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #bdc3c7;border-radius:4px;max-height:200px;overflow-y:auto;z-index:999;box-shadow:0 4px 6px rgba(0,0,0,0.1);"></div>
              </div>
              
              <select id="pdv-client" onchange="cartClient=this.value" style="display:none;">
                <option value="">Consumidor final</option>
              </select>
              <!-- Hidden search button to replace old functionality layout if needed -->
              <button onclick="searchClientePDV()" style="display:none;"><i data-lucide="search" style="width:16px;"></i></button>
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
              <div class="pdv-prod-input-wrap" style="position:relative;">
                 <input type="text" id="pdv-prod-input" style="flex:1;padding:10px 14px;border:1px solid #3498db;border-radius:6px;font-size:15px;font-weight:700;outline:none;min-width:0;box-sizing:border-box;" placeholder="Bipe/Digite o Cód. Barras..." 
                   onkeypress="if(event.key==='Enter')handleProdInput()"
                   oninput="handleProdInputLive(this.value)">
                 <i data-lucide="search" style="width:24px;height:24px;color:#3498db;cursor:pointer;flex-shrink:0;" onclick="handleProdInput()"></i>
                 <div id="pdv-ean-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:white;border:2px solid #3498db;border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.15);z-index:999;max-height:300px;overflow-y:auto;margin-top:2px;"></div>
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

async function confirmarFundoPDV() {
  const v = document.getElementById('pdv-fundo-inicial').value;
  if(!v) return toast('Informe o fundo de caixa para continuar', 'error');
  pdvCaixaAberto = true;
  pdvFundoValor = parseFloat(v) || 0;

  // Salvar o caixa no banco de dados
  try {
    const {data:cx} = await sb.from('caixas').insert({
      saldo_inicial: pdvFundoValor,
      status: 'aberto'
    }).select().single();
    if(cx) {
      localStorage.setItem('storeos_fundo_caixa', JSON.stringify({
        data: new Date().toLocaleDateString('pt-BR'),
        valor: pdvFundoValor,
        caixa_id: cx.id
      }));
    }
  } catch(e) {
    localStorage.setItem('storeos_fundo_caixa', JSON.stringify({
      data: new Date().toLocaleDateString('pt-BR'),
      valor: pdvFundoValor
    }));
  }

  toast('O Fundo de Caixa foi cadastrado corretamente! Obrigado.');
  renderPDV();
}

async function loadAllProducts() {
  const {data} = await sb.from('produtos').select('id,codigo,nome,preco_venda,grade_id,grades(valores)').eq('ativo',true).order('nome');
  renderProductsGrid(data||[]);
}

function filterClientesPDV(val, type) {
  const dd = document.getElementById(type === 'name' ? 'pdv-client-dd-name' : 'pdv-client-dd-phone');
  const otherDd = document.getElementById(type === 'name' ? 'pdv-client-dd-phone' : 'pdv-client-dd-name');
  if(otherDd) otherDd.style.display = 'none';

  if(!val.trim()) { dd.style.display = 'none'; return; }
  
  const term = val.toLowerCase();
  const matches = (window._pdvClientes || []).filter(c => {
     if(type === 'name') {
       return (c.nome && c.nome.toLowerCase().includes(term)) || 
              (c.nome_abreviado && c.nome_abreviado.toLowerCase().includes(term));
     } else {
       return c.celular && c.celular.replace(/\D/g,'').includes(val.replace(/\D/g,''));
     }
  });

  const exactStart = matches.filter(c => type === 'name' && c.nome && c.nome.toLowerCase().startsWith(term));
  const rest = matches.filter(c => !exactStart.includes(c));
  const sorted = [...exactStart, ...rest].slice(0, 15);
  
  if(!sorted.length) {
    dd.innerHTML = '<div style="padding:8px 12px;font-size:12px;color:#7f8c8d;text-align:center;">Não encontrado</div>';
  } else {
    dd.innerHTML = sorted.map(c => `
      <div onclick="selectClientePDV('${c.id}', '${(c.nome_abreviado||c.nome).replace(/'/g,"\\'")}', '${c.celular||''}')" 
           style="padding:8px 12px;font-size:13px;cursor:pointer;border-bottom:1px solid #f1f2f6;color:#2c3e50;font-weight:600;text-align:left;"
           onmouseover="this.style.background='#f0f8ff'" onmouseout="this.style.background='transparent'">
        ${c.nome_abreviado||c.nome} ${c.celular ? `<span style="color:#7f8c8d;font-size:11px;margin-left:6px">${c.celular}</span>` : ''}
      </div>
    `).join('');
  }
  dd.style.display = 'block';
}

function selectClientePDV(id, nome, celular) {
  cartClient = id;
  const cs = document.getElementById('pdv-client');
  if(cs) { cs.innerHTML = `<option value="${id}">${nome}</option>`; cs.value = id; }
  
  const nInp = document.getElementById('pdv-client-name');
  if(nInp) nInp.value = nome;
  
  const pInp = document.getElementById('pdv-client-phone');
  if(pInp) pInp.value = celular;
  
  const dn = document.getElementById('pdv-client-dd-name');
  if(dn) dn.style.display = 'none';
  const dp = document.getElementById('pdv-client-dd-phone');
  if(dp) dp.style.display = 'none';
}

function searchClientePDV() {}

// Global click handler to close dropdowns
document.addEventListener('click', (e) => {
  const dn = document.getElementById('pdv-client-dd-name');
  const dp = document.getElementById('pdv-client-dd-phone');
  if(dn && dn.style.display === 'block' && !e.target.closest('#pdv-client-name') && e.target !== dn) dn.style.display = 'none';
  if(dp && dp.style.display === 'block' && !e.target.closest('#pdv-client-phone') && e.target !== dp) dp.style.display = 'none';
});


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
      <td style="padding:10px 16px;text-align:center;font-weight:700;color:#2c3e50;">${item.cor_descricao||'-'}</td>
      <td style="padding:6px 10px;text-align:center;">
        <div style="display:inline-flex;align-items:center;gap:4px;background:#f4f6f7;border-radius:8px;padding:3px 4px;">
          <button onclick="changeQty(${i},-1)" style="width:26px;height:26px;border-radius:6px;border:none;background:#e74c3c;color:#fff;font-size:16px;font-weight:900;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;">−</button>
          <span style="min-width:28px;text-align:center;font-weight:900;font-size:14px;color:#2c3e50;">${item.qty}</span>
          <button onclick="changeQty(${i},1)" style="width:26px;height:26px;border-radius:6px;border:none;background:#2ecc71;color:#fff;font-size:16px;font-weight:900;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;">+</button>
        </div>
      </td>
      <td style="padding:10px 16px;text-align:right;font-weight:700;color:#2c3e50;">${fmt(item.preco)}</td>
      <td style="padding:10px 16px;text-align:right;font-weight:700;color:#e74c3c;">0,00</td>
      <td style="padding:10px 16px;text-align:right;font-weight:800;color:#2c3e50;">${fmt(item.preco*item.qty)}</td>
      <td style="padding:6px 10px;text-align:center;">
        <button onclick="removeCartItem(${i})" title="Remover item" style="width:30px;height:30px;border-radius:6px;border:none;background:#fef2f2;color:#e74c3c;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;">
          <i data-lucide="trash-2" style="width:15px;height:15px;"></i>
        </button>
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
      </div>
      
      <div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:400px;margin:0 auto;">
         <label style="color:#e74c3c;font-weight:900;font-size:12px;">Celular *</label>
         <input type="text" id="pdv-add-cli-cel" placeholder="DDD + Numero" style="padding:10px;border:1px solid #bdc3c7;border-radius:4px;outline:none;font-weight:700;">
         
         <label style="color:#e74c3c;font-weight:900;font-size:12px;margin-top:6px;">Nome Completo *</label>
         <input type="text" id="pdv-add-cli-nome" style="padding:10px;border:1px solid #bdc3c7;border-radius:4px;outline:none;font-weight:700;">
         
         <label style="color:#e74c3c;font-weight:900;font-size:12px;margin-top:6px;">Nome Abreviado</label>
         <input type="text" id="pdv-add-cli-abrev" style="padding:10px;border:1px solid #bdc3c7;border-radius:4px;outline:none;font-weight:700;">
         
         <label style="color:#2c3e50;font-weight:900;font-size:12px;margin-top:6px;">Email</label>
         <input type="email" id="pdv-add-cli-email" style="padding:10px;border:1px solid #bdc3c7;border-radius:4px;outline:none;font-weight:700;">
         
         <div style="display:flex;gap:20px;margin-top:6px;">
            <div style="display:flex;flex-direction:column;gap:6px;">
              <label style="color:#e74c3c;font-weight:900;font-size:12px;">Sexo</label>
              <div style="display:flex;gap:8px;">
                <button type="button" onclick="this.style.background='#3498db';this.style.color='#fff';this.nextElementSibling.style.background='#fff';this.nextElementSibling.style.color='#7f8c8d';document.getElementById('pdv-add-cli-sexo').value='F'" style="border:1px solid #bdc3c7;background:#fff;padding:8px 12px;border-radius:4px;color:#7f8c8d;font-weight:800;cursor:pointer;">F</button>
                <button type="button" onclick="this.style.background='#3498db';this.style.color='#fff';this.previousElementSibling.style.background='#fff';this.previousElementSibling.style.color='#7f8c8d';document.getElementById('pdv-add-cli-sexo').value='M'" style="border:1px solid #bdc3c7;background:#fff;padding:8px 12px;border-radius:4px;color:#7f8c8d;font-weight:800;cursor:pointer;">M</button>
                <input type="hidden" id="pdv-add-cli-sexo" value="">
              </div>
            </div>
         </div>
         
         <button onclick="salvarClientePDV()" style="width:100%;background:#3498db;color:#fff;border:none;border-radius:6px;padding:14px;font-weight:900;font-size:14px;cursor:pointer;margin-top:10px;box-shadow:0 3px 6px rgba(52,152,219,0.2);">Cadastrar Cliente</button>
      </div>
    </div>
  `, 'modal-md');
  lucide.createIcons();
}

async function salvarClientePDV() {
  const celular = document.getElementById('pdv-add-cli-cel')?.value?.trim();
  const nome = document.getElementById('pdv-add-cli-nome')?.value?.trim();
  if(!celular) return toast('Celular obrigatório','error');
  if(!nome) return toast('Nome obrigatório','error');
  const payload = {
    nome,
    nome_abreviado: document.getElementById('pdv-add-cli-abrev')?.value?.trim()||null,
    celular,
    email: document.getElementById('pdv-add-cli-email')?.value?.trim()||null,
    sexo: document.getElementById('pdv-add-cli-sexo')?.value||null,
    ativo: true
  };
  // Verificar se já existe pelo celular
  const {data:existing} = await sb.from('clientes').select('id,nome').eq('celular',celular).maybeSingle();
  if(existing) {
    cartClient = existing.id;
    selectClientePDV(existing.id, existing.nome, celular);
    closeModalDirect();
    toast('Cliente já cadastrado — selecionado automaticamente','info');
    return;
  }
  const {data:nc,error} = await sb.from('clientes').insert(payload).select().single();
  if(error) return toast('Erro ao salvar: '+error.message,'error');
  // Atualizar cache de clientes
  if(window._pdvClientes) window._pdvClientes.push(nc);
  cartClient = nc.id;
  selectClientePDV(nc.id, nc.nome_abreviado||nc.nome, nc.celular);
  closeModalDirect();
  toast('Cliente cadastrado com sucesso!');
}

let _eanSearchTimer = null;

async function handleProdInputLive(val) {
  const term = (val||'').trim();
  const drop = document.getElementById('pdv-ean-dropdown');
  if(!drop) return;

  if(!term) { drop.style.display='none'; drop.innerHTML=''; return; }

  clearTimeout(_eanSearchTimer);
  if(term.length < 3) { drop.style.display='none'; return; }

  // Mostrar "buscando" imediatamente
  drop.innerHTML = '<div style="padding:10px 14px;color:#888;font-size:13px;">Buscando...</div>';
  drop.style.display = 'block';

  // Debounce: EAN completo (8/13 dígitos) busca imediato, outros 300ms
  const delay = (/^\d{8}$/.test(term) || /^\d{13}$/.test(term)) ? 0 : 300;

  _eanSearchTimer = setTimeout(async () => {
    const items = [];
    const isExactEAN = /^\d{8}$/.test(term) || /^\d{13}$/.test(term);

    // 1. EAN exato (8 ou 13 dígitos) → usa rota dedicada com CAST para funcionar com INTEGER
    if (isExactEAN) {
      try {
        const token = localStorage.getItem('loja_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`/api/busca/ean?ean=${encodeURIComponent(term)}`, { headers });
        if (res.ok) {
          const rows = await res.json();
          rows.forEach(r => {
            const preco = parseFloat(r.preco_venda) || parseFloat(r.prod_preco) || 0;
            const cor = r.cor_descricao ? ` — ${r.cor_descricao}` : '';
            items.push({ prodId: r.produto_id, nome: r.prod_nome, preco, tamanho: r.tamanho,
              codigo: r.prod_codigo, gradeId: r.id,
              label: r.prod_nome, grade: `${r.tamanho||''}${cor}`, estoque: r.estoque||0 });
          });
        }
      } catch(e) {}
    }

    // 2. EAN parcial ou não-numérico → ilike em produto_grades
    if (!items.length && !isExactEAN) {
      const {data:pgRows} = await sb.from('produto_grades')
        .select('id,produto_id,tamanho,ean,estoque,preco_venda,cor_descricao')
        .ilike('ean', `%${term}%`).limit(20);

      if(pgRows && pgRows.length) {
        const pids = [...new Set(pgRows.map(r=>r.produto_id))];
        const prodMap = {};
        for(const pid of pids) {
          const {data:p} = await sb.from('produtos').select('id,codigo,nome,preco_venda').eq('id',pid).maybeSingle();
          if(p) prodMap[pid] = p;
        }
        pgRows.forEach(pg => {
          const p = prodMap[pg.produto_id];
          if(!p) return;
          const preco = parseFloat(pg.preco_venda)||parseFloat(p.preco_venda)||0;
          const cor = pg.cor_descricao ? ` — ${pg.cor_descricao}` : '';
          items.push({ prodId:p.id, nome:p.nome, preco, tamanho:pg.tamanho, codigo:p.codigo, gradeId:pg.id,
            label:`${p.nome}`, grade:`${pg.tamanho||''}${cor}`, estoque:pg.estoque||0 });
        });
      }
    }

    // 3. Buscar por nome/código em produtos (só se não é EAN exato e não achou ainda)
    if(!items.length && !isExactEAN) {
      const {data:prods} = await sb.from('produtos').select('id,codigo,nome,preco_venda').eq('ativo',true)
        .or(`nome.ilike.%${term}%,codigo.ilike.%${term}%`).limit(10);
      if(prods) {
        for(const p of prods) {
          if(items.find(i=>i.prodId===p.id)) continue;
          const {data:pgs} = await sb.from('produto_grades').select('id,tamanho,estoque,preco_venda,cor_descricao').eq('produto_id',p.id).limit(10);
          if(pgs && pgs.length) {
            pgs.forEach(pg => {
              const preco = parseFloat(pg.preco_venda)||parseFloat(p.preco_venda)||0;
              const cor = pg.cor_descricao ? ` — ${pg.cor_descricao}` : '';
              items.push({ prodId:p.id, nome:p.nome, preco, tamanho:pg.tamanho, codigo:p.codigo, gradeId:pg.id,
                label:p.nome, grade:`${pg.tamanho||''}${cor}`, estoque:pg.estoque||0 });
            });
          } else {
            items.push({ prodId:p.id, nome:p.nome, preco:parseFloat(p.preco_venda)||0, tamanho:'Único', codigo:p.codigo, gradeId:'',
              label:p.nome, grade:'Único', estoque:null });
          }
        }
      }
    }

    if(!items.length) {
      drop.innerHTML = '<div style="padding:12px 16px;color:#e74c3c;font-size:13px;font-weight:600;">Nenhum produto encontrado para este código</div>';
      drop.style.display = 'block';
      return;
    }

    drop.innerHTML = items.map((it,i) => `
      <div onclick="selecionarItemEAN(${i})" data-idx="${i}"
        style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;gap:10px;"
        onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='white'">
        <div style="min-width:0">
          <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${it.label}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px">
            ${it.grade ? `<span style="background:#e0f2fe;color:#0369a1;padding:1px 7px;border-radius:10px;font-weight:700;">${it.grade}</span>` : ''}
            ${it.estoque!=null ? `<span style="margin-left:6px;color:#16a34a">Estoque: ${it.estoque}</span>` : ''}
          </div>
        </div>
        <div style="font-weight:800;color:#16a34a;white-space:nowrap;font-size:14px">${fmt(it.preco)}</div>
      </div>`).join('');
    window._pdvDropItems = items;
    drop.style.display = 'block';

    // Se EAN completo e só 1 resultado → adiciona direto ao carrinho
    if((/^\d{8}$/.test(term) || /^\d{13}$/.test(term)) && items.length === 1) {
      drop.style.display = 'none';
      window._eanJustAutoAdded = true; // Impede que o Enter do scanner duplique o item
      selecionarItemEAN(0);
    }
  }, delay);
}


function selecionarItemEAN(idx) {
  const it = window._pdvDropItems?.[idx];
  if(!it) return;
  const drop = document.getElementById('pdv-ean-dropdown');
  if(drop) { drop.style.display='none'; drop.innerHTML=''; }
  if(it.tamanho) {
    addCartFromGrade(it.prodId, it.nome, it.preco, it.tamanho, it.codigo, it.gradeId);
  } else {
    // Sem grade definida — abre modal para escolher
    document.getElementById('pdv-prod-input').value = it.codigo||it.nome;
    openProdutoPDVModal(it.codigo||it.nome);
  }
}

// Fechar dropdown ao clicar fora
document.addEventListener('click', function(e) {
  if(!e.target.closest('#pdv-ean-dropdown') && e.target.id !== 'pdv-prod-input') {
    const d = document.getElementById('pdv-ean-dropdown');
    if(d) { d.style.display='none'; }
  }
});

async function handleProdInput() {
  clearTimeout(_eanSearchTimer); // Cancela auto-add pendente do live handler
  if(window._eanJustAutoAdded) { window._eanJustAutoAdded = false; return; } // Enter do scanner após auto-add: ignora
  const term = document.getElementById('pdv-prod-input')?.value?.trim() || '';
  if(!term) return openProdutoPDVModal('');
  
  // 1. Buscar por EAN via rota dedicada (garante CAST TEXT no SQLite)
  try {
    const token = localStorage.getItem('loja_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`/api/busca/ean?ean=${encodeURIComponent(term)}`, { headers });
    if(res.ok) {
      const rows = await res.json();
      if(rows && rows.length > 0) {
        const r = rows[0];
        const preco = parseFloat(r.preco_venda) || parseFloat(r.prod_preco) || 0;
        if(rows.length === 1) {
          addCartFromGrade(r.produto_id, r.prod_nome, preco, r.tamanho, r.prod_codigo, r.id);
        } else {
          openProdutoPDVModal(term);
        }
        return;
      }
    }
  } catch(e) {}
  
  // 2. Buscar por código do produto
  const {data:byCode} = await sb.from('produtos').select('id,codigo,nome,preco_venda').eq('ativo',true).eq('codigo', term);
  if(byCode && byCode.length === 1) {
    const {data:pgs} = await sb.from('produto_grades').select('id,tamanho,estoque,preco_venda').eq('produto_id',byCode[0].id);
    if(pgs && pgs.length === 1) {
      const preco = parseFloat(pgs[0].preco_venda)||parseFloat(byCode[0].preco_venda)||0;
      addCartFromGrade(byCode[0].id, byCode[0].nome, preco, pgs[0].tamanho, byCode[0].codigo, pgs[0].id);
      return;
    }
  }

  // 3. Abrir modal com busca
  openProdutoPDVModal(term);
}

async function openProdutoPDVModal(initialTerm) {
  const term = typeof initialTerm === 'string' ? initialTerm : (document.getElementById('pdv-prod-input')?.value || '');
  const isNumeric = term && /^\d+$/.test(term);

  openModal(`
    <div class="modal-header" style="border-bottom:none;padding-bottom:0;">
      <h3 style="color:#2c3e50;font-weight:900;font-size:20px;">Seleção de Produto em Estoque</h3>
      <button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button>
    </div>
    <div class="modal-body" style="padding-top:16px;">
      <div style="display:flex;gap:10px;margin-bottom:16px;align-items:flex-end;flex-wrap:wrap;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="color:#e74c3c;font-weight:900;font-size:12px;">Código de barras (EAN)</label>
          <input type="text" id="modal-ean-input" value="${isNumeric ? term : ''}"
            style="padding:6px;border:1px solid #3498db;border-radius:4px;width:160px;outline:none;background:#f0f8ff;"
            onkeypress="if(event.key==='Enter')searchModalProdutos()">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="color:#e74c3c;font-weight:900;font-size:12px;">Código produto</label>
          <input type="text" id="modal-cod-input"
            style="padding:6px;border:1px solid #bdc3c7;border-radius:4px;width:110px;outline:none;"
            onkeypress="if(event.key==='Enter')searchModalProdutos()">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="color:#e74c3c;font-weight:900;font-size:12px;">Descrição produto</label>
          <input type="text" id="modal-desc-input" value="${!isNumeric ? term : ''}"
            style="padding:6px;border:1px solid #bdc3c7;border-radius:4px;width:240px;outline:none;"
            onkeypress="if(event.key==='Enter')searchModalProdutos()">
        </div>
        <button onclick="searchModalProdutos()" style="background:#2ecc71;color:#fff;border:none;border-radius:4px;padding:8px 16px;font-weight:800;font-size:13px;cursor:pointer;">Buscar</button>
      </div>
      <div style="border:1px solid #e1e8ed;max-height:380px;overflow-y:auto;border-radius:6px;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:center;">
          <thead style="background:#f4f6f7;border-bottom:1px solid #e1e8ed;position:sticky;top:0;">
            <tr>
              <th style="padding:8px;font-weight:900;color:#2c3e50;">Cód. Produto</th>
              <th style="padding:8px;font-weight:900;color:#2c3e50;text-align:left;">Descrição</th>
              <th style="padding:8px;font-weight:900;color:#2c3e50;">Grade / Cor</th>
              <th style="padding:8px;font-weight:900;color:#2c3e50;">EAN</th>
              <th style="padding:8px;font-weight:900;color:#2c3e50;">Valor</th>
              <th style="padding:8px;font-weight:900;color:#2c3e50;">Estoque</th>
              <th style="padding:8px;font-weight:900;color:#2c3e50;">Ação</th>
            </tr>
          </thead>
          <tbody id="modal-produtos-tbody">
            <tr><td colspan="7" style="padding:20px;color:#888;">Carregando...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `, 'modal-lg');
  lucide.createIcons();
  // Auto-buscar imediatamente com o termo
  await searchModalProdutos();
}

function renderModalProdRows(data) {
  // Mantido para compatibilidade com código legado
  if(!data || !data.length) return '<tr><td colspan="7" style="padding:20px;font-weight:700;">Nenhum produto encontrado.</td></tr>';
  return data.map(p=>`
    <tr style="border-bottom:1px solid #f1f2f6;">
      <td style="padding:8px;font-weight:700;">${p.codigo||'—'}</td>
      <td style="padding:8px;font-weight:800;text-align:left;">${p.nome}</td>
      <td style="padding:8px;">—</td>
      <td style="padding:8px;font-size:11px;">—</td>
      <td style="padding:8px;font-weight:800;">${fmt(p.preco_venda||0)}</td>
      <td style="padding:8px;">—</td>
      <td style="padding:8px;">
        <button onclick="addCartFromGrade('${p.id}','${p.nome.replace(/'/g,"\\'")}',${p.preco_venda||0},'Único','${p.codigo||''}','');closeModalDirect();"
          style="width:26px;height:26px;border-radius:50%;background:#2ecc71;border:none;color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;">
          <i data-lucide="check" style="width:14px;"></i>
        </button>
      </td>
    </tr>`).join('');
}

async function searchModalProdutos() {
  const ean  = document.getElementById('modal-ean-input')?.value?.trim()  || '';
  const cod  = document.getElementById('modal-cod-input')?.value?.trim()  || '';
  const desc = document.getElementById('modal-desc-input')?.value?.trim() || '';

  const tbody = document.getElementById('modal-produtos-tbody');
  if(!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="padding:20px;text-align:center;font-weight:700;">Buscando...</td></tr>';

  // 1. EAN — usa /api/busca/ean (CAST TEXT + fallback produtos.codigo)
  if(ean) {
    try {
      const token = localStorage.getItem('loja_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/busca/ean?ean=${encodeURIComponent(ean)}`, { headers });
      if(res.ok) {
        const rows = await res.json();
        if(rows && rows.length) {
          tbody.innerHTML = rows.map(r => {
            const preco = parseFloat(r.preco_venda) || parseFloat(r.prod_preco) || 0;
            const corLabel = r.cor_descricao ? ` / ${r.cor_descricao}` : '';
            return `<tr style="border-bottom:1px solid #f1f2f6;background:#fff;">
              <td style="padding:8px;font-weight:700;">${r.prod_codigo||'—'}</td>
              <td style="padding:8px;font-weight:800;">${r.prod_nome}</td>
              <td style="padding:8px;font-weight:700;">${r.tamanho||'Único'}${corLabel}</td>
              <td style="padding:8px;font-family:monospace;font-size:11px;">${r.ean||'—'}</td>
              <td style="padding:8px;font-weight:800;">${fmt(preco)}</td>
              <td style="padding:8px;text-align:center;">${r.estoque||0}</td>
              <td style="padding:8px;">
                <button onclick="addCartFromGrade('${r.produto_id}','${(r.prod_nome||'').replace(/'/g,'\\\'')}',${preco},'${r.tamanho||''}','${r.prod_codigo||''}','${r.id}');closeModalDirect();"
                  style="width:26px;height:26px;border-radius:50%;background:#2ecc71;border:none;color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;">
                  <i data-lucide="check" style="width:14px;"></i>
                </button>
              </td>
            </tr>`;
          }).join('');
          lucide.createIcons();
          return;
        }
      }
    } catch(e) {}
    tbody.innerHTML = `<tr><td colspan="7" style="padding:20px;text-align:center;color:#e74c3c;font-weight:700;">Nenhum produto encontrado para EAN: ${ean}</td></tr>`;
    return;
  }

  // 2. Sem filtro — lista os 50 primeiros
  if(!cod && !desc) {
    const {data} = await sb.from('produtos').select('id,codigo,nome,preco_venda').eq('ativo',true).limit(50);
    tbody.innerHTML = await renderModalProdRowsWithGrades(data||[]);
    lucide.createIcons();
    return;
  }

  // 3. Busca por código ou descrição
  let q = sb.from('produtos').select('id,codigo,nome,preco_venda').eq('ativo',true);
  if(cod)  q = q.ilike('codigo', `%${cod}%`);
  if(desc) q = q.ilike('nome',   `%${desc}%`);
  const {data} = await q.limit(50);
  tbody.innerHTML = await renderModalProdRowsWithGrades(data||[]);
  lucide.createIcons();
}

async function renderModalProdRowsWithGrades(prods) {
  if(!prods.length) return '<tr><td colspan="7" style="padding:20px;font-weight:700;">Nenhum produto encontrado.</td></tr>';
  let rows = '';
  for(const p of prods) {
    const {data:grades} = await sb.from('produto_grades')
      .select('id,tamanho,estoque,preco_venda,cor_descricao').eq('produto_id',p.id).order('tamanho');
    if(grades && grades.length) {
      grades.forEach(pg => {
        const preco = parseFloat(pg.preco_venda)||parseFloat(p.preco_venda)||0;
        const corLabel = pg.cor_descricao ? ` / ${pg.cor_descricao}` : '';
        rows += `<tr style="border-bottom:1px solid #f1f2f6;background:#fff;">
          <td style="padding:8px;font-weight:700;">${p.codigo||'—'}</td>
          <td style="padding:8px;font-weight:800;">${p.nome}</td>
          <td style="padding:8px;font-weight:700;">${pg.tamanho||'Único'}${corLabel}</td>
          <td style="padding:8px;font-size:11px;">—</td>
          <td style="padding:8px;font-weight:800;">${fmt(preco)}</td>
          <td style="padding:8px;text-align:center;">${pg.estoque||0}</td>
          <td style="padding:8px;">
            <button onclick="addCartFromGrade('${p.id}','${p.nome.replace(/'/g,"\\'")}',${preco},'${pg.tamanho||''}','${p.codigo||''}','${pg.id}');closeModalDirect();"
              style="width:26px;height:26px;border-radius:50%;background:#2ecc71;border:none;color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;">
              <i data-lucide="check" style="width:14px;"></i>
            </button>
          </td>
        </tr>`;
      });
    } else {
      const preco = parseFloat(p.preco_venda)||0;
      rows += `<tr style="border-bottom:1px solid #f1f2f6;">
        <td style="padding:8px;font-weight:700;">${p.codigo||'—'}</td>
        <td style="padding:8px;font-weight:800;">${p.nome}</td>
        <td style="padding:8px;">Único</td>
        <td style="padding:8px;font-size:11px;">—</td>
        <td style="padding:8px;font-weight:800;">${fmt(preco)}</td>
        <td style="padding:8px;text-align:center;">—</td>
        <td style="padding:8px;">
          <button onclick="addCartFromGrade('${p.id}','${p.nome.replace(/'/g,"\\'")}',${preco},'Único','${p.codigo||''}','');closeModalDirect();"
            style="width:26px;height:26px;border-radius:50%;background:#2ecc71;border:none;color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;">
            <i data-lucide="check" style="width:14px;"></i>
          </button>
        </td>
      </tr>`;
    }
  }
  return rows || '<tr><td colspan="7" style="padding:20px;font-weight:700;">Nenhum produto encontrado.</td></tr>';
}

function addCartFromGrade(prodId, nome, preco, tamanho, codigo, gradeId) {
  const qtyInput = document.getElementById('pdv-qty-input');
  const qty = parseInt(qtyInput?.value || 1);
  const existing = cart.find(i => i.id === prodId && i.tamanho === tamanho);
  if(existing) { existing.qty += qty; }
  else { cart.push({ id: prodId, nome, preco: parseFloat(preco), tamanho: tamanho||'Único', qty, codigo, grade_id: gradeId }); }
  if(qtyInput) qtyInput.value = 1;
  const pInput = document.getElementById('pdv-prod-input');
  if(pInput) pInput.value = '';
  renderCart();
  toast(`${nome} (${tamanho||'Único'}) adicionado!`, 'success');
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
    sb.from('clientes').select('id,nome,nome_abreviado,celular').eq('ativo',true).order('nome'),
    sb.from('vendedores').select('id,nome').eq('ativo',true).order('nome')
  ]);
  window._pdvClientes = cl || [];
  const cs = document.getElementById('pdv-client');
  const vs = document.getElementById('pdv-seller');
  if(cs)(cl||[]).forEach(c=>cs.add(new Option(c.nome_abreviado||c.nome,c.id)));
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
    if(i.grade_id) {
      const {data:pg} = await sb.from('produto_grades').select('estoque').eq('id',i.grade_id).maybeSingle();
      if(pg) await sb.from('produto_grades').update({estoque:Math.max(0,(pg.estoque||0)-i.qty)}).eq('id',i.grade_id);
    } else {
      const {data:pg} = await sb.from('produto_grades').select('id,estoque').match({produto_id:i.id,tamanho:i.tamanho}).maybeSingle();
      if(pg) await sb.from('produto_grades').update({estoque:Math.max(0,(pg.estoque||0)-i.qty)}).eq('id',pg.id);
    }
  }

  // Atualizar ultima_compra do cliente
  if(cartClient) {
    try { await sb.from('clientes').update({ultima_compra: new Date().toISOString().split('T')[0]}).eq('id',cartClient); } catch(e) {}
  }

  toast(`Venda #${venda.numero_venda} concluída com sucesso!${troco>0?' Troco: '+fmt(troco):''}`, 'success');
  cart = [];
  pdvPayments = [];
  cartClient = null;
  cartSeller = null;
  renderCart();
}

// ===== FECHAR / ABRIR CAIXA NO PDV =====
async function fecharCaixaPDV() {
  // Buscar dados do caixa atual
  let caixaId = null;
  try {
    const stored = JSON.parse(localStorage.getItem('storeos_fundo_caixa') || '{}');
    caixaId = stored.caixa_id || null;
  } catch(e) {}

  // Buscar o caixa aberto no banco
  const {data:cxArr} = await sb.from('caixas').select('*').eq('status','aberto').order('created_at',{ascending:false}).limit(1);
  const cx = cxArr?.[0];
  if(!cx && !caixaId) {
    // Não há caixa no banco — fechar apenas o fundo local
    if(!confirm('Fechar o caixa do PDV?\n\nIsso encerrará a sessão atual.')) return;
    pdvCaixaAberto = false;
    pdvFundoValor = 0;
    localStorage.removeItem('storeos_fundo_caixa');
    toast('Caixa fechado!');
    renderPDV();
    return;
  }

  const cxFinal = cx || { id: caixaId, saldo_inicial: pdvFundoValor, created_at: new Date().toISOString() };

  // Buscar vendas deste caixa
  const {data:vendas} = await sb.from('vendas')
    .select('total,forma_pagamento')
    .gte('created_at', cxFinal.created_at)
    .eq('status','concluida');

  const detalhe = { dinheiro:0, pix:0, cartao:0, crediario:0 };
  let totalVendas = 0;
  (vendas||[]).forEach(v => {
    const val = parseFloat(v.total||0);
    totalVendas += val;
    const fp = (v.forma_pagamento||'').toLowerCase();
    if(fp.includes('dinheiro')) detalhe.dinheiro += val;
    else if(fp.includes('pix') || fp.includes('transfer')) detalhe.pix += val;
    else if(fp.includes('cart')) detalhe.cartao += val;
    else detalhe.crediario += val;
  });

  // Buscar movimentos
  const {data:movs} = await sb.from('movimentos_caixa').select('*').eq('caixa_id', cxFinal.id);
  const suprimentos = (movs||[]).filter(m=>m.tipo==='suprimento'||m.tipo==='entrada').reduce((a,m)=>a+parseFloat(m.valor||0),0);
  const sangrias    = (movs||[]).filter(m=>m.tipo==='sangria'||m.tipo==='saida').reduce((a,m)=>a+parseFloat(m.valor||0),0);

  const fundo       = parseFloat(cxFinal.saldo_inicial||0);
  const saldoFisico = fundo + detalhe.dinheiro + suprimentos - sangrias;
  const abertura    = new Date(cxFinal.created_at).toLocaleString('pt-BR');
  const agora       = new Date().toLocaleString('pt-BR');

  const fmt2 = n => 'R$ ' + parseFloat(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});

  openModal(`
    <div class="modal-header" style="background:#c0392b;padding:20px 24px;border-radius:8px 8px 0 0;">
      <h3 style="color:#fff;font-weight:900;font-size:18px;margin:0;display:flex;align-items:center;gap:10px;">
        <i data-lucide="lock" style="width:20px;height:20px;"></i>Fechamento de Caixa
      </h3>
      <button class="modal-close" onclick="closeModalDirect()" style="color:#fff;opacity:0.8;"></button>
    </div>
    <div class="modal-body" style="padding:0;">

      <!-- Período -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1px solid #f1f2f6;">
        <div style="padding:14px 20px;border-right:1px solid #f1f2f6;">
          <div style="font-size:11px;font-weight:700;color:#7f8c8d;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Abertura</div>
          <div style="font-weight:700;color:#2c3e50;font-size:13px;">${abertura}</div>
        </div>
        <div style="padding:14px 20px;">
          <div style="font-size:11px;font-weight:700;color:#7f8c8d;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Fechamento</div>
          <div style="font-weight:700;color:#2c3e50;font-size:13px;">${agora}</div>
        </div>
      </div>

      <!-- Resumo de vendas -->
      <div style="padding:16px 20px;border-bottom:1px solid #f1f2f6;">
        <div style="font-size:12px;font-weight:800;color:#2c3e50;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">Vendas por Forma de Pagamento</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${[
            {icon:'banknote',   cor:'#f1c40f', label:'Dinheiro',  val:detalhe.dinheiro},
            {icon:'smartphone', cor:'#2ecc71', label:'Pix',       val:detalhe.pix},
            {icon:'credit-card',cor:'#3498db', label:'Cartão',    val:detalhe.cartao},
            {icon:'file-text',  cor:'#9b59b6', label:'Crediário', val:detalhe.crediario},
          ].map(r=>`
            <div style="background:#f8f9fa;border-radius:8px;padding:12px 14px;display:flex;align-items:center;gap:10px;">
              <i data-lucide="${r.icon}" style="width:20px;height:20px;color:${r.cor};flex-shrink:0;"></i>
              <div>
                <div style="font-size:11px;color:#7f8c8d;font-weight:700;">${r.label}</div>
                <div style="font-size:15px;font-weight:900;color:#2c3e50;">${fmt2(r.val)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Saldo físico em caixa -->
      <div style="padding:16px 20px;border-bottom:1px solid #f1f2f6;">
        <div style="font-size:12px;font-weight:800;color:#2c3e50;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">Resumo do Caixa</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${[
            {label:'Fundo de caixa (abertura)', val:fundo,       cor:'#7f8c8d'},
            {label:'Suprimentos',               val:suprimentos, cor:'#2ecc71'},
            {label:'Sangrias',                  val:-sangrias,   cor:'#e74c3c'},
            {label:'Total vendas',              val:totalVendas, cor:'#3498db'},
          ].map(r=>`
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;">
              <span style="color:#7f8c8d;font-weight:600;">${r.label}</span>
              <span style="font-weight:800;color:${r.cor};">${fmt2(Math.abs(r.val))}${r.val<0?' (-)':''}</span>
            </div>
          `).join('')}
          <div style="border-top:2px solid #e1e8ed;padding-top:10px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:800;color:#2c3e50;font-size:14px;">Saldo físico em caixa (dinheiro)</span>
            <span style="font-weight:900;color:#2ecc71;font-size:18px;">${fmt2(saldoFisico)}</span>
          </div>
        </div>
      </div>

      <!-- Conferência -->
      <div style="padding:16px 20px;">
        <label style="font-size:12px;font-weight:800;color:#c0392b;display:block;margin-bottom:8px;">Valor conferido no caixa (R$)</label>
        <input type="number" id="pdv-fecho-conferido" step="0.01" placeholder="0,00"
          value="${saldoFisico.toFixed(2)}"
          style="width:100%;padding:12px 14px;border:2px solid #c0392b;border-radius:6px;outline:none;font-size:16px;font-weight:800;color:#2c3e50;box-sizing:border-box;">
        <div style="font-size:11px;color:#95a5a6;margin-top:6px;">
          Preencha com o valor que você contou fisicamente no caixa para gerar o relatório de diferença.
        </div>
      </div>

    </div>
    <div class="modal-footer" style="padding:16px 20px;display:flex;justify-content:space-between;gap:12px;">
      <button onclick="closeModalDirect()" style="background:#ecf0f1;color:#7f8c8d;border:none;border-radius:6px;padding:12px 24px;font-weight:800;font-size:13px;cursor:pointer;">
        Cancelar
      </button>
      <button onclick="confirmarFechamentoCaixaPDV('${cxFinal.id}',${saldoFisico.toFixed(2)})" style="background:#c0392b;color:#fff;border:none;border-radius:6px;padding:12px 28px;font-weight:900;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(192,57,43,0.3);">
        <i data-lucide="lock" style="width:16px;height:16px;"></i>Confirmar Fechamento
      </button>
    </div>
  `, 'modal-lg');
  lucide.createIcons();
}

async function confirmarFechamentoCaixaPDV(caixaId, saldoEsperado) {
  const conferido = parseFloat(document.getElementById('pdv-fecho-conferido')?.value || saldoEsperado);
  const diferenca = conferido - saldoEsperado;

  // Fechar caixa no banco
  if(caixaId && caixaId !== 'null' && caixaId !== 'undefined') {
    try {
      await sb.from('caixas').update({
        status: 'fechado',
        data_fechamento: new Date().toISOString()
      }).eq('id', caixaId);
    } catch(e) {}
  }

  // Resetar estado local
  pdvCaixaAberto = false;
  pdvFundoValor = 0;
  cart = [];
  pdvPayments = [];
  cartClient = null;
  cartSeller = null;
  localStorage.removeItem('storeos_fundo_caixa');

  closeModalDirect();

  const difMsg = diferenca !== 0
    ? `\nDiferença: ${diferenca > 0 ? '+' : ''}R$ ${diferenca.toLocaleString('pt-BR',{minimumFractionDigits:2})}`
    : '';
  toast(`Caixa fechado com sucesso!${difMsg}`, diferenca === 0 ? 'success' : 'info');

  // Retornar à tela de abertura de caixa
  setTimeout(() => renderPDV(), 500);
}
