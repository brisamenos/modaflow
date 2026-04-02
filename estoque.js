// ===== IMPORTAR ESTOQUE CSV =====
async function renderImportarCSV() {
  renderCRUDPage({title:'Importar Estoque CSV', addBtn:null, content:''});
  document.getElementById('content').innerHTML = `
    <div class="card" style="max-width:900px;margin:0 auto">
      <div style="padding:24px 28px 0">
        <h3 style="margin:0 0 6px;font-size:17px;color:var(--text-1)"><i data-lucide="file-up" style="width:18px;height:18px;vertical-align:-3px;margin-right:6px"></i>Importar Estoque via CSV</h3>
        <p style="margin:0 0 12px;color:var(--text-2);font-size:13.5px">Compatível com o formato de backup: <strong>Cód. Produto; Descrição Produto; UN; CNPJ Fornecedor; Preço Custo; Preço Venda; NCM; Cód de Barras - EAN; Tam - Grade; Qtde; Coleção; Marca; Categoria; Genero; Cor - Hexa; Cor - Descrição; SKU</strong></p>
        <button class="btn btn-secondary" style="font-size:12.5px;padding:6px 14px" onclick="downloadModeloCSV()"><i data-lucide="download" style="width:14px;height:14px"></i> Baixar Modelo CSV</button>
      </div>
      <div style="padding:0 28px 24px;border-bottom:1px solid var(--border)">
        <div style="border:2px dashed var(--border-2);border-radius:var(--radius);padding:32px;text-align:center;background:var(--bg);cursor:pointer" onclick="document.getElementById('csv-file-input').click()" id="csv-drop-zone">
          <i data-lucide="upload-cloud" style="width:40px;height:40px;color:var(--text-2);margin-bottom:10px"></i>
          <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:var(--text-1)">Clique para selecionar o arquivo CSV</p>
          <p style="margin:0;font-size:12.5px;color:var(--text-2)">Separador: ponto e vírgula (;) à Encoding: UTF-8 ou Latin-1</p>
          <input type="file" id="csv-file-input" accept=".csv" style="display:none" onchange="previewCSV(this)">
        </div>
      </div>
      <div id="csv-preview" style="padding:0 28px 24px"></div>
    </div>`;
  lucide.createIcons();
}

function downloadModeloCSV() {
  const header = 'Cód. Produto;Descrição Produto;UN;CNPJ Fornecedor;Preço Custo;Preço Venda;NCM;Cód de Barras - EAN;Tam - Grade;Qtde;Coleção;Marca;Categoria;Genero;Cor - Hexa;Cor - Descrição;SKU';
  const exemplo = '0001;CAMISETA EXEMPLO;UN;00.000.000/0001-00;30.00;59.90;61091000;7891234567890;M;5;VERÃO 2025;MARCA X;Camiseta;F;#FFFFFF;BRANCO;123456';
  const blob = new Blob(['\uFEFF'+header+'\n'+exemplo], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'modelo_importacao_estoque.csv';
  a.click();
}


function parseCSVLine(line) {
  const sep = ';';
  const result = [];
  let cur = '', inQ = false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c==='"'){inQ=!inQ;}
    else if(c===sep&&!inQ){result.push(cur.trim());cur='';}
    else{cur+=c;}
  }
  result.push(cur.trim());
  return result;
}

async function previewCSV(input) {
  const file = input.files[0];
  if(!file) return;
  const text = await new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=e=>res(e.target.result);
    r.onerror=rej;
    r.readAsText(file,'UTF-8');
  });
  const lines = text.split(/\r?\n/).filter(l=>l.trim());
  const headers = parseCSVLine(lines[0]).map(h=>h.replace(/^\uFEFF/,'').trim());
  const rows = lines.slice(1).map(l=>parseCSVLine(l));
  const validRows = rows.filter(r=>r.length>=2&&r[0]);

  // Map column indices
  const col = (name)=>headers.indexOf(name);
  const iCod=col('Cód. Produto'), iDesc=col('Descrição Produto'), iUN=col('UN'),
        iForn=col('CNPJ Fornecedor'), iCusto=col('Preço Custo'), iVenda=col('Preço Venda'),
        iNCM=col('NCM'), iEAN=col('Cód de Barras - EAN'), iTam=col('Tam - Grade'),
        iQtde=col('Qtde'), iCol=col('Coleção'), iMarca=col('Marca'),
        iCat=col('Categoria'), iGen=col('Genero'), iCorHex=col('Cor - Hexa'),
        iCorDesc=col('Cor - Descrição'), iSKU=col('SKU');

  window._csvData = {validRows, iCod,iDesc,iUN,iForn,iCusto,iVenda,iNCM,iEAN,iTam,iQtde,iCol,iMarca,iCat,iGen,iCorHex,iCorDesc,iSKU};

  // Group by produto code+name for summary
  const prodMap = {};
  for(const r of validRows) {
    const key = r[iCod]+'|'+r[iDesc];
    if(!prodMap[key]) prodMap[key]={cod:r[iCod],nome:r[iDesc],cat:r[iCat],marca:r[iMarca],variants:0,qtde:0};
    prodMap[key].variants++;
    prodMap[key].qtde+=parseInt(r[iQtde])||0;
  }
  const prods = Object.values(prodMap);

  document.getElementById('csv-preview').innerHTML = `
    <div style="padding:20px 0 8px">
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px">
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:14px 20px;flex:1;min-width:140px;text-align:center">
          <div style="font-size:26px;font-weight:700;color:var(--accent)">${validRows.length}</div>
          <div style="font-size:12px;color:var(--text-2)">Linhas no CSV</div>
        </div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:14px 20px;flex:1;min-width:140px;text-align:center">
          <div style="font-size:26px;font-weight:700;color:var(--green)">${prods.length}</div>
          <div style="font-size:12px;color:var(--text-2)">Produtos únicos</div>
        </div>
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:14px 20px;flex:1;min-width:140px;text-align:center">
          <div style="font-size:26px;font-weight:700;color:var(--yellow)">${validRows.reduce((s,r)=>s+(parseInt(r[iQtde])||0),0)}</div>
          <div style="font-size:12px;color:var(--text-2)">Peças totais</div>
        </div>
      </div>
      <div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:8px">Prévia dos primeiros 10 produtos:</div>
      <div class="table-wrap" style="margin-bottom:20px"><table class="data-table">
        <thead><tr><th>Código</th><th>Produto</th><th>Categoria</th><th>Marca</th><th>Variantes</th><th>Qtde Total</th></tr></thead>
        <tbody>${prods.slice(0,10).map(p=>`<tr>
          <td>${p.cod||'—'}</td>
          <td><strong>${p.nome}</strong></td>
          <td>${p.cat||'—'}</td>
          <td>${p.marca||'—'}</td>
          <td>${p.variants}</td>
          <td>${p.qtde}</td>
        </tr>`).join('')}
        ${prods.length>10?`<tr><td colspan="6" style="text-align:center;color:var(--text-2)">... e mais ${prods.length-10} produtos</td></tr>`:''}
        </tbody>
      </table></div>
      <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:var(--radius);padding:14px 16px;margin-bottom:20px;font-size:13px;color:#92400e">
        <strong>? Atenção:</strong> A importação irá criar automaticamente categorias, coleções, marcas e fornecedores que ainda não existem no sistema. Produtos com o mesmo Código serão <strong>atualizados</strong>; novos códigos serão criados.
      </div>
      <div id="csv-import-progress" style="display:none;margin-bottom:16px">
        <div style="font-size:13px;color:var(--text-2);margin-bottom:6px" id="csv-progress-label">Importando...</div>
        <div style="background:var(--border);border-radius:100px;height:8px;overflow:hidden">
          <div id="csv-progress-bar" style="background:var(--accent);height:100%;width:0%;transition:width .2s;border-radius:100px"></div>
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-secondary" onclick="renderImportarCSV()"><i data-lucide="x"></i>Cancelar</button>
        <button class="btn btn-primary" onclick="executeImportCSV()" id="csv-import-btn"><i data-lucide="download"></i>Importar ${validRows.length} linhas</button>
      </div>
    </div>`;
  lucide.createIcons();
}

async function executeImportCSV() {
  const {validRows,iCod,iDesc,iUN,iForn,iCusto,iVenda,iNCM,iEAN,iTam,iQtde,iCol,iMarca,iCat,iGen,iCorHex,iCorDesc,iSKU} = window._csvData;
  document.getElementById('csv-import-btn').disabled = true;
  document.getElementById('csv-import-btn').innerHTML = '<i data-lucide="loader"></i>Importando...';
  document.getElementById('csv-import-progress').style.display='block';
  lucide.createIcons();

  const setProgress = (n,total,msg)=>{
    document.getElementById('csv-progress-bar').style.width=(n/total*100)+'%';
    document.getElementById('csv-progress-label').textContent=msg;
  };

  try {
    // --- Caches para evitar duplicatas ---
    const cacheGet = async(table,field,val)=>{
      if(!val) return null;
      const v = val.toString().trim();
      if(!v) return null;
      let {data}=await sb.from(table).select('id').ilike(field,v).eq('ativo',true).limit(1);
      if(data&&data[0]) return data[0].id;
      const ins={}; ins[field]=v;
      const {data:nd}=await sb.from(table).insert(ins).select('id').single();
      return nd?.id||null;
    };
    const catCache={}, colCache={}, fornCache={};
    const getCat=async(n)=>{if(!n)return null;if(!catCache[n])catCache[n]=await cacheGet('categorias','nome',n);return catCache[n];};
    const getCol=async(n)=>{if(!n)return null;if(!colCache[n])colCache[n]=await cacheGet('colecoes','nome',n);return colCache[n];};
    const getForn=async(cnpj)=>{
      if(!cnpj)return null;
      const k=cnpj.toString().trim();
      if(!k)return null;
      if(fornCache[k])return fornCache[k];
      let {data}=await sb.from('fornecedores').select('id').eq('cnpj',k).eq('ativo',true).limit(1);
      if(data&&data[0]){fornCache[k]=data[0].id;return data[0].id;}
      // tenta pelo nome (quando CNPJ Fornecedor à nome em vez de CNPJ numérico)
      let {data:d2}=await sb.from('fornecedores').select('id').ilike('razao_social',k).eq('ativo',true).limit(1);
      if(d2&&d2[0]){fornCache[k]=d2[0].id;return d2[0].id;}
      const {data:nd}=await sb.from('fornecedores').insert({razao_social:k,cnpj:k.replace(/\D/g,'').length>=11?k:null}).select('id').single();
      const id=nd?.id||null; fornCache[k]=id; return id;
    };

    // --- Agrupar linhas por produto (código+nome) ---
    const prodMap={};
    for(const r of validRows){
      const key=(r[iCod]||'')+'^'+(r[iDesc]||'');
      if(!prodMap[key]) prodMap[key]={r, variants:[]};
      prodMap[key].variants.push(r);
    }
    const prodEntries=Object.entries(prodMap);
    let done=0;
    let criados=0, atualizados=0, erros=0;

    for(const [key,{r,variants}] of prodEntries){
      done++;
      setProgress(done,prodEntries.length,`(${done}/${prodEntries.length}) ${r[iDesc]||''}`);

      try{
        const cod=(r[iCod]||'').toString().trim();
        const nome=(r[iDesc]||'').toString().trim();
        if(!nome) continue;

        const cat_id = await getCat(r[iCat]);
        const col_id = await getCol(r[iCol]);
        const forn_id = await getForn(r[iForn]);

        const parseCSVBrMoney = (val) => {
          if(!val) return 0;
          let s = val.toString().replace(/[^\d,\.-]/g, '');
          if(s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
          return parseFloat(s) || 0;
        };
        const custo=parseCSVBrMoney(r[iCusto]);
        const venda=parseCSVBrMoney(r[iVenda]);
        const margem=venda>0?((venda-custo)/venda*100):0;
        const genero=(r[iGen]||'').toString().trim().toUpperCase()||null;

        const payload={
          nome, codigo:cod,
          sku:(r[iSKU]||'').toString().trim()||null,
          marca:(r[iMarca]||'').toString().trim()||null,
          unidade:(r[iUN]||'UN').toString().trim(),
          ncm:(r[iNCM]||'').toString().trim()||null,
          categoria_id:cat_id, colecao_id:col_id, fornecedor_id:forn_id,
          custo, preco_venda:venda, margem_lucro:parseFloat(margem.toFixed(2)),
          genero, ativo:true
        };

        // Upsert por código
        let prodId=null;
        if(cod){
          let {data:ep}=await sb.from('produtos').select('id').eq('codigo',cod).eq('ativo',true).limit(1);
          if(ep&&ep[0]){
            await sb.from('produtos').update(payload).eq('id',ep[0].id);
            prodId=ep[0].id; atualizados++;
          } else {
            const {data:np}=await sb.from('produtos').insert(payload).select('id').single();
            prodId=np?.id; criados++;
          }
        } else {
          let {data:ep}=await sb.from('produtos').select('id').ilike('nome',nome).eq('ativo',true).limit(1);
          if(ep&&ep[0]){
            await sb.from('produtos').update(payload).eq('id',ep[0].id);
            prodId=ep[0].id; atualizados++;
          } else {
            const {data:np}=await sb.from('produtos').insert(payload).select('id').single();
            prodId=np?.id; criados++;
          }
        }

        // Inserir/atualizar variantes (produto_grades)
        if(prodId){
          for(const vr of variants){
            const tam=(vr[iTam]||'único').toString().trim();
            const ean=(vr[iEAN]||'').toString().trim();
            const qtde=parseInt(vr[iQtde])||0;
            const corHex=(vr[iCorHex]||'').toString().trim();
            const corDesc=(vr[iCorDesc]||'').toString().trim();
            const vPayload={produto_id:prodId,tamanho:tam,estoque:qtde,ean:ean||null,cor_hexa:corHex||null,cor_descricao:corDesc||null};
            const {data:ev}=await sb.from('produto_grades').select('id').match({produto_id:prodId,tamanho:tam}).maybeSingle();
            if(ev){await sb.from('produto_grades').update(vPayload).eq('id',ev.id);}
            else{await sb.from('produto_grades').insert(vPayload);}
          }
        }
      } catch(e){ erros++; console.error('Erro na linha',key,e); }
    }

    document.getElementById('csv-import-progress').style.display='none';
    document.getElementById('csv-preview').innerHTML = `
      <div style="padding:24px 0;text-align:center">
        <div style="font-size:40px;margin-bottom:12px">?</div>
        <h3 style="margin:0 0 8px;font-size:18px;color:var(--text-1)">Importação concluída!</h3>
        <p style="color:var(--text-2);margin:0 0 20px;font-size:14px">
          <strong style="color:var(--green)">${criados} criados</strong> &nbsp;—&nbsp;
          <strong style="color:var(--accent)">${atualizados} atualizados</strong>
          ${erros>0?`&nbsp;—&nbsp; <strong style="color:var(--red)">${erros} erros</strong>`:''}
        </p>
        <button class="btn btn-primary" onclick="navigate('produtos')"><i data-lucide="package"></i>Ver Produtos</button>
      </div>`;
    lucide.createIcons();
  } catch(e) {
    toast('Erro na importação: '+e.message,'error');
    console.error(e);
    document.getElementById('csv-import-btn').disabled=false;
  }
}

// ===== VISÃO GERAL ESTOQUE =====
let _vgeTab = 'fornecedores'; // tab ativa
let _vgeCusto = 'gerencial';  // tipo de custo

async function renderVisaoGeralEstoque() {
  document.getElementById('content').innerHTML = `
  <div style="text-align:center;margin-bottom:14px">
    <h2 style="font-size:18px;font-weight:700">Visão Geral Estoque</h2>
  </div>
  <div style="display:flex;gap:16px;align-items:flex-start">

    <!-- SIDEBAR -->
    <div style="width:200px;flex-shrink:0;background:white;border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px">
      <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:10px;display:flex;align-items:center;gap:6px">
        Tipo de Cálculo de Custo
        <span title="Gerencial: usa custo cadastrado. Operacional: inclui despesas operacionais." style="width:16px;height:16px;border-radius:50%;background:var(--accent);color:white;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;cursor:default;flex-shrink:0">i</span>
      </div>
      <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;margin-bottom:8px">
        <input type="radio" name="vge-custo" value="gerencial" checked onchange="_vgeCusto='gerencial';carregarDadosVGE(_vgeTab)">
        Cálculo de Custo Gerencial
      </label>
      <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer">
        <input type="radio" name="vge-custo" value="operacional" onchange="_vgeCusto='operacional';carregarDadosVGE(_vgeTab)">
        Cálculo de Custo Operacional
      </label>
    </div>

    <!-- CONTEÚDO -->
    <div style="flex:1;min-width:0">

      <!-- TABS -->
      <div style="display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:16px">
        ${['fornecedores','colecao','grade','categoria'].map(t=>`
          <button id="vge-tab-${t}" onclick="switchVgeTab('${t}')"
            style="padding:8px 18px;border:none;background:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-2);transition:all .15s">
            ${t==='fornecedores'?'Fornecedores':t==='colecao'?'Coleção':t==='grade'?'Grade':'Categoria'}
          </button>`).join('')}
      </div>

      <!-- GRÁFICO + TABELA -->
      <div id="vge-body">
        <div class="loading" style="padding:48px;text-align:center">Carregando...</div>
      </div>

    </div>
  </div>`;

  // Ativar tab inicial
  setTimeout(()=>{
    switchVgeTab('fornecedores');
    lucide.createIcons();
  },10);
}

function switchVgeTab(tab) {
  _vgeTab = tab;
  ['fornecedores','colecao','grade','categoria'].forEach(t=>{
    const btn = document.getElementById(`vge-tab-${t}`);
    if(!btn) return;
    const active = t===tab;
    btn.style.color = active?'var(--accent)':'var(--text-2)';
    btn.style.borderBottomColor = active?'var(--accent)':'transparent';
  });
  carregarDadosVGE(tab);
}

const PIE_COLORS = [
  '#2563eb','#16a34a','#d97706','#7c3aed','#dc2626','#0891b2','#be185d',
  '#65a30d','#9333ea','#c2410c','#0369a1','#15803d','#b45309','#4f46e5',
  '#0f766e','#a21caf','#84cc16','#f97316','#06b6d4','#8b5cf6','#ef4444',
  '#14b8a6','#f59e0b','#6366f1','#22c55e','#fb923c','#a3e635','#38bdf8'
];

async function carregarDadosVGE(tab) {
  const body = document.getElementById('vge-body');
  if(!body) return;
  body.innerHTML = '<div class="loading" style="padding:32px;text-align:center">Carregando...</div>';

  // Buscar dados de produto_grades com joins
  const {data:grades} = await sb.from('produto_grades')
    .select('estoque,custo,preco_venda,produto_id,produtos!inner(nome,ativo,custo,preco_venda,fornecedor_id,colecao_id,grade_id,categoria_id,fornecedores(cnpj,razao_social),colecoes(nome),grades(nome),categorias(nome))')
    .eq('produtos.ativo',true);

  if(!grades||!grades.length) {
    body.innerHTML = '<div class="empty-state" style="padding:48px"><i data-lucide="package"></i><p>Nenhum produto em estoque</p></div>';
    lucide.createIcons(); return;
  }

  // Montar agrupamento conforme tab
  const map = {};
  let keyFn, cnpjFn, labelFn;

  if(tab==='fornecedores') {
    keyFn = g => g.produtos?.fornecedor_id||'sem-forn';
    labelFn = g => g.produtos?.fornecedores?.razao_social||'Fornecedor padrão';
    cnpjFn  = g => g.produtos?.fornecedores?.cnpj||'';
  } else if(tab==='colecao') {
    keyFn = g => g.produtos?.colecao_id||'sem-col';
    labelFn = g => g.produtos?.colecoes?.nome||'Sem coleção';
    cnpjFn  = () => '';
  } else if(tab==='grade') {
    keyFn = g => g.produtos?.grade_id||'sem-grade';
    labelFn = g => g.produtos?.grades?.nome||'Sem grade';
    cnpjFn  = () => '';
  } else {
    keyFn = g => g.produtos?.categoria_id||'sem-cat';
    labelFn = g => g.produtos?.categorias?.nome||'Sem categoria';
    cnpjFn  = () => '';
  }

  grades.forEach(g => {
    const key = keyFn(g);
    if(!map[key]) map[key] = { label:labelFn(g), cnpj:cnpjFn(g), qtde:0, custo:0, venda:0 };
    const est = g.estoque||0;
    const custUnit = _vgeCusto==='gerencial'
      ? parseFloat(g.custo||g.produtos?.custo||0)
      : parseFloat(g.custo||g.produtos?.custo||0) * 1.15; // operacional +15%
    const vendUnit = parseFloat(g.preco_venda||g.produtos?.preco_venda||0);
    map[key].qtde  += est;
    map[key].custo += est * custUnit;
    map[key].venda += est * vendUnit;
  });

  const entries = Object.values(map).sort((a,b)=>b.qtde-a.qtde);
  const totalQtde = entries.reduce((a,e)=>a+e.qtde,0);

  // Montar dados do gráfico de pizza (SVG)
  const pieHtml = buildPieChart(entries, totalQtde);

  // Tabela
  const tabLabel = tab==='fornecedores'?'Fornecedor':tab==='colecao'?'Coleção':tab==='grade'?'Grade':'Categoria';
  const showCnpj = tab==='fornecedores';

  const tableRows = entries.map((e,i) => {
    const pct = totalQtde>0?((e.qtde/totalQtde)*100).toFixed(1)+'%':'0%';
    return `<tr>
      ${showCnpj?`<td style="font-family:monospace;font-size:11px;color:var(--text-2)">${e.cnpj||''}</td>`:''}
      <td><strong>${e.label}</strong></td>
      <td style="text-align:center">${e.qtde}</td>
      <td style="text-align:right">${fmt(e.custo)}</td>
      <td style="text-align:right">${fmt(e.venda)}</td>
      <td style="text-align:right;font-weight:600">${pct}</td>
    </tr>`;
  }).join('');

  body.innerHTML = `
    <!-- Gráfico -->
    <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;margin-bottom:14px;text-align:center">
      <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:16px">
        Estoque por ${tabLabel}
      </div>
      ${pieHtml}
    </div>

    <!-- Tabela -->
    <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
      <div class="table-wrap"><table class="data-table" style="font-size:13px">
        <thead><tr>
          ${showCnpj?'<th>CNPJ</th>':''}
          <th>${tabLabel}</th>
          <th style="text-align:center">Qtde</th>
          <th style="text-align:right">Valor Total Custo (~)</th>
          <th style="text-align:right">Valor Total Venda</th>
          <th style="text-align:right">Percentual</th>
        </tr></thead>
        <tbody>${tableRows||'<tr><td colspan="6" style="text-align:center;color:var(--text-2);padding:24px">Nenhum dado</td></tr>'}</tbody>
      </table></div>
    </div>`;
}

function buildPieChart(entries, total) {
  if(!total) return '<div style="color:var(--text-3);font-size:13px;padding:32px">Sem estoque</div>';

  const SIZE = 340;
  const CX = SIZE/2, CY = SIZE/2, R = 130;
  let paths = '';
  let legendItems = '';
  let startAngle = -Math.PI/2;

  const top = entries.slice(0,20); // máx 20 fatias

  top.forEach((e,i) => {
    const pct = e.qtde/total;
    const angle = pct * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(endAngle);
    const y2 = CY + R * Math.sin(endAngle);
    const large = angle > Math.PI ? 1 : 0;
    const color = PIE_COLORS[i % PIE_COLORS.length];

    paths += `<path d="M${CX},${CY} L${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z"
      fill="${color}" stroke="white" stroke-width="1.5" style="cursor:pointer" title="${e.label}: ${e.qtde} pcs (${(pct*100).toFixed(1)}%)"/>`;

    // Label no gráfico para fatias grandes
    if(pct > 0.04) {
      const midAngle = startAngle + angle/2;
      const lx = CX + (R*0.65) * Math.cos(midAngle);
      const ly = CY + (R*0.65) * Math.sin(midAngle);
      paths += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="600" fill="white">${(pct*100).toFixed(0)}%</text>`;
    }

    startAngle = endAngle;
    legendItems += `<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-2)">
      <span style="width:10px;height:10px;border-radius:2px;background:${color};flex-shrink:0"></span>
      <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px" title="${e.label}">${e.label}</span>
    </div>`;
  });

  return `
  <div style="display:flex;align-items:center;justify-content:center;gap:24px;flex-wrap:wrap">
    <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
      ${paths}
    </svg>
    <div style="display:flex;flex-direction:column;gap:4px;max-height:320px;overflow-y:auto;padding:4px">
      ${legendItems}
    </div>
  </div>`;
}

// ===== VISÃO DETALHADA ESTOQUE =====
let _vdTab = 'col-forn'; // tab ativa

async function renderVisaoDetalhadaEstoque() {
  document.getElementById('content').innerHTML = `
  <div style="text-align:center;margin-bottom:14px">
    <h2 style="font-size:18px;font-weight:700">Visão Detalhada Estoque</h2>
  </div>

  <!-- TABS -->
  <div style="display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:16px;flex-wrap:wrap">
    ${[
      ['col-forn',  'Coleção por Fornecedor'],
      ['grade-forn','Grade por Fornecedor'],
      ['col-grade', 'Coleção por Grade'],
      ['gen-cat',   'Genero por Categoria']
    ].map(([t,l])=>`
      <button id="vdt-tab-${t}" onclick="switchVdTab('${t}')"
        style="padding:8px 18px;border:none;background:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-2);transition:all .15s;white-space:nowrap">
        ${l}
      </button>`).join('')}
  </div>

  <!-- CORPO -->
  <div id="vdt-body">
    <div class="loading" style="padding:48px;text-align:center">Carregando...</div>
  </div>`;

  setTimeout(()=>switchVdTab('col-forn'), 10);
}

function switchVdTab(tab) {
  _vdTab = tab;
  ['col-forn','grade-forn','col-grade','gen-cat'].forEach(t=>{
    const btn = document.getElementById(`vdt-tab-${t}`);
    if(!btn) return;
    const active = t===tab;
    btn.style.color = active?'var(--accent)':'var(--text-2)';
    btn.style.borderBottomColor = active?'var(--accent)':'transparent';
  });
  carregarVisaoDetalhada(tab);
}

async function carregarVisaoDetalhada(tab) {
  const body = document.getElementById('vdt-body');
  if(!body) return;
  body.innerHTML = '<div class="loading" style="padding:32px;text-align:center">Carregando...</div>';

  // Buscar produto_grades com todos os joins necessários
  const {data:grades} = await sb.from('produto_grades')
    .select('estoque,preco_venda,custo,tamanho,produto_id,produtos!inner(nome,ativo,preco_venda,custo,genero,fornecedor_id,colecao_id,grade_id,categoria_id,fornecedores(cnpj,razao_social),colecoes(nome),grades(nome),categorias(nome))')
    .eq('produtos.ativo', true);

  if(!grades||!grades.length) {
    body.innerHTML = '<div class="empty-state" style="padding:48px"><i data-lucide="package"></i><p>Nenhum produto em estoque</p></div>';
    lucide.createIcons(); return;
  }

  // Cada tab tem: agrupamento principal (linhas de cabeçalho) e secundário (linhas de detalhe)
  // Estrutura: { grupoKey: { grupoLabel, cnpj, total:{qtde,valor}, subs:{ subKey:{label,cnpj,qtde,valor} } } }
  const struct = {};

  const getOrCreate = (gKey, gLabel, gCnpj) => {
    if(!struct[gKey]) struct[gKey] = { label:gLabel, cnpj:gCnpj, qtde:0, valor:0, subs:{} };
    return struct[gKey];
  };

  grades.forEach(g => {
    const est = g.estoque||0;
    const val = est * parseFloat(g.preco_venda||g.produtos?.preco_venda||0);
    const p = g.produtos;

    let gKey, gLabel, gCnpj, sKey, sLabel, sCnpj;

    if(tab==='col-forn') {
      // Agrupado por Coleção, sub por Fornecedor
      gKey   = p?.colecao_id||'sem-col';
      gLabel = p?.colecoes?.nome||'Sem coleção';
      gCnpj  = '';
      sKey   = p?.fornecedor_id||'sem-forn';
      sLabel = p?.fornecedores?.razao_social||'Fornecedor padrão';
      sCnpj  = p?.fornecedores?.cnpj||'';
    } else if(tab==='grade-forn') {
      // Agrupado por Grade, sub por Fornecedor
      gKey   = p?.grade_id||'sem-grade';
      gLabel = p?.grades?.nome||'Sem grade';
      gCnpj  = '';
      sKey   = p?.fornecedor_id||'sem-forn';
      sLabel = p?.fornecedores?.razao_social||'Fornecedor padrão';
      sCnpj  = p?.fornecedores?.cnpj||'';
    } else if(tab==='col-grade') {
      // Agrupado por Coleção, sub por Grade
      gKey   = p?.colecao_id||'sem-col';
      gLabel = p?.colecoes?.nome||'Sem coleção';
      gCnpj  = '';
      sKey   = p?.grade_id||'sem-grade';
      sLabel = p?.grades?.nome||'Sem grade';
      sCnpj  = '';
    } else {
      // Genero por Categoria
      const genMap = {F:'Feminino',M:'Masculino',U:'Unissex',J:'Juvenil'};
      gKey   = p?.genero||'sem-genero';
      gLabel = p?.genero ? (genMap[p.genero]||'Sem gênero') : 'Sem gênero';
      gCnpj  = '';
      sKey   = p?.categoria_id||'sem-cat';
      sLabel = p?.categorias?.nome||'Sem categoria';
      sCnpj  = '';
    }

    const grupo = getOrCreate(gKey, gLabel, gCnpj);
    grupo.qtde  += est;
    grupo.valor += val;

    if(!grupo.subs[sKey]) grupo.subs[sKey] = { label:sLabel, cnpj:sCnpj, qtde:0, valor:0 };
    grupo.subs[sKey].qtde  += est;
    grupo.subs[sKey].valor += val;
  });

  const grupos = Object.values(struct).sort((a,b)=>b.valor-a.valor);
  const totalGeral = grupos.reduce((a,g)=>a+g.valor,0);

  const showCnpj = (tab==='col-forn'||tab==='grade-forn');
  const subHeader = tab==='col-forn'?'Fornecedor':tab==='grade-forn'?'Fornecedor':tab==='col-grade'?'Grade':'Categoria';

  let rows = '';
  grupos.forEach(grupo => {
    const pctGrupo = totalGeral>0?((grupo.valor/totalGeral)*100).toFixed(0)+'%':'0%';

    // Linha de cabeçalho do grupo
    rows += `<tr style="background:#f8fafc">
      <td colspan="${showCnpj?5:4}" style="padding:8px 12px;font-weight:700;font-size:13px;color:var(--text)">
        ${grupo.label}
      </td>
    </tr>`;

    // Subs ordenados por valor desc
    const subs = Object.values(grupo.subs).sort((a,b)=>b.valor-a.valor);
    subs.forEach(sub => {
      const pctSub = grupo.valor>0?((sub.valor/grupo.valor)*100).toFixed(0)+'%':'0%';
      rows += `<tr>
        ${showCnpj?`<td style="padding:7px 12px;font-family:monospace;font-size:11px;color:var(--text-2)">${sub.cnpj||''}</td>`:''}
        <td style="padding:7px 12px;padding-left:${showCnpj?12:24}px;font-size:13px">${sub.label}</td>
        <td style="padding:7px 12px;text-align:center;font-size:13px">${sub.qtde}</td>
        <td style="padding:7px 12px;text-align:right;font-size:13px">${fmtNum(sub.valor)}</td>
        <td style="padding:7px 12px;text-align:right;font-size:13px;color:var(--text-2)">${pctSub}</td>
      </tr>`;
    });

    // Linha de subtotal
    rows += `<tr style="border-top:1px solid var(--border-2)">
      ${showCnpj?'<td></td>':''}
      <td style="padding:7px 12px;text-align:right;font-size:12px;color:var(--text-2);font-style:italic">Subtotal (R$):</td>
      <td style="padding:7px 12px;text-align:center;font-weight:700;font-size:13px">${grupo.qtde}</td>
      <td style="padding:7px 12px;text-align:right;font-weight:700;font-size:13px">${fmtNum(grupo.valor)}</td>
      <td style="padding:7px 12px;text-align:right;font-weight:700;font-size:13px;color:var(--text-2)">${pctGrupo}</td>
    </tr>
    <tr><td colspan="${showCnpj?5:4}" style="height:6px;background:#f1f5f9"></td></tr>`;
  });

  body.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
    <div class="table-wrap"><table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f8fafc;border-bottom:2px solid var(--border)">
          ${showCnpj?'<th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px;min-width:130px">CNPJ</th>':''}
          <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">${subHeader}</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Qtde</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Valor</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Percentual</th>
        </tr>
      </thead>
      <tbody>${rows||'<tr><td colspan="5" style="text-align:center;color:var(--text-2);padding:32px">Nenhum dado</td></tr>'}</tbody>
    </table></div>
  </div>`;
  lucide.createIcons();
}

// ===== GIRO DE ESTOQUE =====
let _giroTab  = 'fornecedores';
let _giroSel  = 'mes';
let _giroAno  = new Date().getFullYear();
let _giroMes  = new Date().getMonth()+1;

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

async function renderGiroEstoque() {
  const now = new Date();
  _giroAno = now.getFullYear();
  _giroMes = now.getMonth()+1;

  document.getElementById('content').innerHTML = `
  <div style="text-align:center;margin-bottom:14px">
    <h2 style="font-size:18px;font-weight:700">Giro Estoque</h2>
  </div>
  <div style="display:flex;gap:16px;align-items:flex-start">

    <!-- SIDEBAR -->
    <div style="width:190px;flex-shrink:0;display:flex;flex-direction:column;gap:10px">
      <button onclick="gerarPlanilhaGiro('estoque')" style="padding:10px 12px;border-radius:var(--radius);border:none;background:#16a34a;color:white;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;width:100%;text-align:left">
        Gerar planilha Estoque
      </button>
      <button onclick="gerarPlanilhaGiro('inventario')" style="padding:10px 12px;border-radius:var(--radius);border:none;background:#16a34a;color:white;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;width:100%;text-align:left">
        Gerar planilha Inventário
      </button>
    </div>

    <!-- CONTEÚDO -->
    <div style="flex:1;min-width:0">

      <!-- FILTROS -->
      <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 20px;margin-bottom:12px;display:flex;gap:24px;align-items:flex-end;flex-wrap:wrap">
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:5px">Seleção</div>
          <select id="giro-sel" onchange="_giroSel=this.value;carregarGiro()"
            style="padding:7px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;background:white;min-width:130px">
            <option value="mes">Por mês</option>
            <option value="trimestre">Por trimestre</option>
            <option value="ano">Por ano</option>
          </select>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:5px">Informe o Ano/Mês:</div>
          <div style="display:flex;gap:6px;align-items:center">
            <select id="giro-ano" onchange="_giroAno=parseInt(this.value);carregarGiro()"
              style="padding:7px 10px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;background:white">
              ${[...Array(5)].map((_,i)=>{const y=now.getFullYear()-i;return `<option value="${y}" ${y===_giroAno?'selected':''}>${y}</option>`;}).join('')}
            </select>
            <select id="giro-mes" onchange="_giroMes=parseInt(this.value);carregarGiro()"
              style="padding:7px 10px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;background:white;min-width:110px">
              ${MESES_PT.map((m,i)=>`<option value="${i+1}" ${i+1===_giroMes?'selected':''}>${m}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- TABS -->
      <div style="display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:0">
        ${['fornecedores','categoria','genero'].map(t=>`
          <button id="giro-tab-${t}" onclick="switchGiroTab('${t}')"
            style="padding:8px 18px;border:none;background:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-2);transition:all .15s">
            ${t==='fornecedores'?'Fornecedores':t==='categoria'?'Categoria':'Gênero'}
          </button>`).join('')}
      </div>

      <!-- TABELA -->
      <div id="giro-body">
        <div class="loading" style="padding:48px;text-align:center">Carregando...</div>
      </div>

    </div>
  </div>`;

  setTimeout(()=>switchGiroTab('fornecedores'),10);
}

function switchGiroTab(tab) {
  _giroTab = tab;
  ['fornecedores','categoria','genero'].forEach(t=>{
    const btn = document.getElementById(`giro-tab-${t}`);
    if(!btn) return;
    const active = t===tab;
    btn.style.color = active?'var(--accent)':'var(--text-2)';
    btn.style.borderBottomColor = active?'var(--accent)':'transparent';
  });
  carregarGiro();
}

async function carregarGiro() {
  const body = document.getElementById('giro-body');
  if(!body) return;
  body.innerHTML = '<div class="loading" style="padding:32px;text-align:center">Carregando...</div>';

  // Calcular intervalo de datas
  const ano = _giroAno, mes = _giroMes;
  let ini, fim;
  if(_giroSel==='ano') {
    ini = `${ano}-01-01`;
    fim = `${ano}-12-31`;
  } else if(_giroSel==='trimestre') {
    const trimStart = Math.floor((mes-1)/3)*3+1;
    ini = `${ano}-${String(trimStart).padStart(2,'0')}-01`;
    const trimEnd = trimStart+2;
    const lastDay = new Date(ano, trimEnd, 0).getDate();
    fim = `${ano}-${String(trimEnd).padStart(2,'0')}-${lastDay}`;
  } else {
    const lastDay = new Date(ano, mes, 0).getDate();
    ini = `${ano}-${String(mes).padStart(2,'0')}-01`;
    fim = `${ano}-${String(mes).padStart(2,'0')}-${lastDay}`;
  }

  // Buscar vendas do período com joins
  const {data:itens} = await sb.from('venda_itens')
    .select('quantidade,total,preco_unitario,produto_id,produtos!inner(nome,custo,preco_venda,fornecedor_id,categoria_id,genero,fornecedores(razao_social),categorias(nome))')
    .gte('created_at', ini)
    .lte('created_at', fim+'T23:59:59');

  if(!itens||!itens.length) {
    body.innerHTML = `<div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg)">
      <div class="empty-state" style="padding:48px"><i data-lucide="package"></i><p>Nenhuma venda no período selecionado</p></div>
    </div>`;
    lucide.createIcons(); return;
  }

  // Agrupar conforme tab
  const map = {};
  itens.forEach(item => {
    const p = item.produtos;
    let key, label;
    if(_giroTab==='fornecedores') {
      key = p.fornecedor_id||'sem-forn';
      label = p.fornecedores?.razao_social||'Fornecedor padrão';
    } else if(_giroTab==='categoria') {
      key = p.categoria_id||'sem-cat';
      label = p.categorias?.nome||'Sem categoria';
    } else {
      const genMap={F:'Feminino',M:'Masculino',U:'Unissex',J:'Juvenil'};
      key = p.genero||'sem-gen';
      label = genMap[p.genero]||'Sem gênero';
    }
    if(!map[key]) map[key] = { label, qtde:0, custo:0, venda:0 };
    const qtd = item.quantidade||0;
    map[key].qtde  += qtd;
    map[key].custo += qtd * parseFloat(p.custo||0);
    map[key].venda += parseFloat(item.total||0);
  });

  const colHeader = _giroTab==='fornecedores'?'Nome Fornecedor':_giroTab==='categoria'?'Categoria':'Gênero';
  const entries = Object.values(map).sort((a,b)=>b.venda-a.venda);

  const rows = entries.map(e=>{
    const ticket = e.qtde>0?(e.venda/e.qtde):0;
    return `<tr>
      <td style="padding:9px 14px;font-size:13px;text-align:center">${e.label}</td>
      <td style="padding:9px 14px;font-size:13px;text-align:center">${e.qtde}</td>
      <td style="padding:9px 14px;font-size:13px;text-align:center">${fmtNum(e.custo)}</td>
      <td style="padding:9px 14px;font-size:13px;text-align:center">${fmtNum(e.venda)}</td>
      <td style="padding:9px 14px;font-size:13px;text-align:center">${fmtNum(ticket)}</td>
      <td style="padding:9px 14px;text-align:center">
        <button onclick="exportarGiroLinha('${e.label.replace(/'/g,"\\\\'")}',${e.qtde},${e.custo.toFixed(2)},${e.venda.toFixed(2)},${ticket.toFixed(2)})"
          style="background:none;border:none;cursor:pointer;color:#d97706;display:flex;align-items:center;justify-content:center;margin:0 auto">
          <i data-lucide="folder" style="width:18px;height:18px"></i>
        </button>
      </td>
    </tr>`;
  }).join('');

  body.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:0 0 var(--radius-lg) var(--radius-lg);overflow:hidden">
    <div style="padding:10px 14px;background:#f8fafc;border-bottom:1px solid var(--border);font-size:13px;font-weight:700;text-align:center;color:var(--text)">
      Saída Estoque - Vendas
    </div>
    <div class="table-wrap"><table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f8fafc;border-bottom:2px solid var(--border)">
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">${colHeader}</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Qtde Itens</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Valor Custo</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Valor Venda</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Ticket Médio</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Ação</th>
        </tr>
      </thead>
      <tbody>${rows||'<tr><td colspan="6" style="text-align:center;color:var(--text-2);padding:32px">Nenhum dado</td></tr>'}</tbody>
    </table></div>
  </div>`;
  lucide.createIcons();
}

function exportarGiroLinha(label, qtde, custo, venda, ticket) {
  const csv = `Fornecedor/Grupo;Qtde Itens;Valor Custo;Valor Venda;Ticket Medio\n${label};${qtde};${custo};${venda};${ticket}`;
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `giro_${label.replace(/\s/g,'_')}.csv`;
  a.click();
}

async function gerarPlanilhaGiro(tipo) {
  const body = document.getElementById('giro-body');
  if(!body) { toast('Carregue os dados primeiro','error'); return; }

  const ano = _giroAno, mes = _giroMes;
  const lastDay = new Date(ano, mes, 0).getDate();
  const ini = `${ano}-${String(mes).padStart(2,'0')}-01`;
  const fim = `${ano}-${String(mes).padStart(2,'0')}-${lastDay}`;

  if(tipo==='estoque') {
    const {data:grades} = await sb.from('produto_grades')
      .select('tamanho,ean,estoque,cor_descricao,produtos(nome,codigo,preco_venda,custo,fornecedores(razao_social))')
      .eq('produtos.ativo',true);

    const rows = (grades||[]).map(g=>
      `${g.produtos?.codigo||''};${g.produtos?.nome||''};${g.tamanho||''};${g.cor_descricao||''};${g.ean||''};${g.estoque||0};${g.produtos?.custo||0};${g.produtos?.preco_venda||0};${g.produtos?.fornecedores?.razao_social||''}`
    ).join('\n');
    const csv = `Codigo;Produto;Tamanho;Cor;EAN;Estoque;Custo;Preco Venda;Fornecedor\n${rows}`;
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`planilha_estoque_${ano}_${mes}.csv`; a.click();
    toast('Planilha de estoque gerada');
  } else {
    const {data:itens} = await sb.from('venda_itens')
      .select('produto_nome,tamanho,quantidade,preco_unitario,total,produtos(codigo,custo,fornecedores(razao_social))')
      .gte('created_at',ini).lte('created_at',fim+'T23:59:59');

    const rows = (itens||[]).map(i=>
      `${i.produtos?.codigo||''};${i.produto_nome||''};${i.tamanho||''};${i.quantidade||0};${i.preco_unitario||0};${i.total||0};${i.produtos?.custo||0};${i.produtos?.fornecedores?.razao_social||''}`
    ).join('\n');
    const csv = `Codigo;Produto;Tamanho;Qtde;Preco Unit;Total Venda;Custo;Fornecedor\n${rows}`;
    const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`inventario_${ano}_${mes}.csv`; a.click();
    toast('Planilha de inventário gerada');
  }
}

// ===== CURVA ABC ESTOQUE =====
let _abcTab  = 'fornecedores';
let _abcSel  = 'mes';
let _abcAno  = new Date().getFullYear();
let _abcMes  = new Date().getMonth()+1;
let _abcVis  = 'global'; // global | detalhada

async function renderCurvaABC() {
  const now = new Date();
  _abcAno = now.getFullYear();
  _abcMes = now.getMonth()+1;

  document.getElementById('content').innerHTML = `
  <div style="text-align:center;margin-bottom:14px">
    <h2 style="font-size:18px;font-weight:700">Curva ABC Estoque</h2>
  </div>

  <!-- FILTROS -->
  <div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 20px;margin-bottom:12px;display:flex;gap:24px;align-items:flex-end;flex-wrap:wrap">
    <div>
      <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:5px">Seleção</div>
      <select id="abc-sel" onchange="_abcSel=this.value;carregarCurvaABC()"
        style="padding:7px 12px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;background:white;min-width:130px">
        <option value="mes">Por mês</option>
        <option value="trimestre">Por trimestre</option>
        <option value="ano">Por ano</option>
      </select>
    </div>
    <div>
      <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:5px">Informe o Ano/Mês:</div>
      <div style="display:flex;gap:6px;align-items:center">
        <select id="abc-ano" onchange="_abcAno=parseInt(this.value);carregarCurvaABC()"
          style="padding:7px 10px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;background:white">
          ${[...Array(5)].map((_,i)=>{const y=new Date().getFullYear()-i;return `<option value="${y}" ${y===_abcAno?'selected':''}>${y}</option>`;}).join('')}
        </select>
        <select id="abc-mes" onchange="_abcMes=parseInt(this.value);carregarCurvaABC()"
          style="padding:7px 10px;border:1.5px solid var(--border-2);border-radius:var(--radius);font-size:13px;background:white;min-width:110px">
          ${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m,i)=>`<option value="${i+1}" ${i+1===_abcMes?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
    </div>
  </div>

  <!-- TABS -->
  <div style="display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:0">
    ${['fornecedores','categoria'].map(t=>`
      <button id="abc-tab-${t}" onclick="switchAbcTab('${t}')"
        style="padding:8px 18px;border:none;background:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-2);transition:all .15s">
        ${t==='fornecedores'?'Fornecedores':'Categoria'}
      </button>`).join('')}
  </div>

  <!-- CORPO -->
  <div id="abc-body">
    <div class="loading" style="padding:48px;text-align:center">Carregando...</div>
  </div>`;

  setTimeout(()=>switchAbcTab('fornecedores'),10);
}

function switchAbcTab(tab) {
  _abcTab = tab;
  ['fornecedores','categoria'].forEach(t=>{
    const btn = document.getElementById(`abc-tab-${t}`);
    if(!btn) return;
    const active = t===tab;
    btn.style.color = active?'var(--accent)':'var(--text-2)';
    btn.style.borderBottomColor = active?'var(--accent)':'transparent';
  });
  _abcVis = 'global';
  carregarCurvaABC();
}

function calcDateRange(sel, ano, mes) {
  if(sel==='ano') return {ini:`${ano}-01-01`, fim:`${ano}-12-31`};
  if(sel==='trimestre') {
    const ts = Math.floor((mes-1)/3)*3+1;
    const te = ts+2;
    return {ini:`${ano}-${String(ts).padStart(2,'0')}-01`, fim:`${ano}-${String(te).padStart(2,'0')}-${new Date(ano,te,0).getDate()}`};
  }
  return {ini:`${ano}-${String(mes).padStart(2,'0')}-01`, fim:`${ano}-${String(mes).padStart(2,'0')}-${new Date(ano,mes,0).getDate()}`};
}

async function carregarCurvaABC() {
  const body = document.getElementById('abc-body');
  if(!body) return;
  body.innerHTML = '<div class="loading" style="padding:32px;text-align:center">Carregando...</div>';

  const {ini, fim} = calcDateRange(_abcSel, _abcAno, _abcMes);

  const {data:itens} = await sb.from('venda_itens')
    .select('quantidade,total,preco_unitario,produto_id,produtos!inner(nome,custo,preco_venda,fornecedor_id,categoria_id,fornecedores(razao_social),categorias(nome))')
    .gte('created_at', ini).lte('created_at', fim+'T23:59:59');

  if(!itens||!itens.length) {
    body.innerHTML = `<div style="background:white;border:1px solid var(--border);border-radius:0 0 var(--radius-lg) var(--radius-lg)">
      <div class="empty-state" style="padding:48px"><i data-lucide="bar-chart-2"></i><p>Nenhuma venda no período selecionado</p></div>
    </div>`;
    lucide.createIcons(); return;
  }

  // Agrupar por fornecedor ou categoria
  const map = {};
  itens.forEach(item => {
    const p = item.produtos;
    let key, label;
    if(_abcTab==='fornecedores') {
      key = p.fornecedor_id||'sem-forn';
      label = p.fornecedores?.razao_social||'Fornecedor padrão';
    } else {
      key = p.categoria_id||'sem-cat';
      label = p.categorias?.nome||'Sem categoria';
    }
    if(!map[key]) map[key] = { label, qtde:0, custo:0, venda:0 };
    const qtd = item.quantidade||0;
    map[key].qtde  += qtd;
    map[key].custo += qtd * parseFloat(p.custo||0);
    map[key].venda += parseFloat(item.total||0);
  });

  const sorted = Object.values(map).sort((a,b)=>b.venda-a.venda);
  const totalVenda = sorted.reduce((a,e)=>a+e.venda,0);
  let acum = 0;

  // Classificar ABC acumulado
  sorted.forEach(e => {
    const pct = totalVenda>0?(e.venda/totalVenda)*100:0;
    acum += pct;
    e.pct = pct;
    e.acum = acum;
    e.curva = acum<=70?'A':acum<=90?'B':'C';
    e.ticket = e.qtde>0?(e.venda/e.qtde):0;
  });

  const colHeader = _abcTab==='fornecedores'?'Nome Fornecedor':'Categoria';

  // Agrupar por curva para exibição
  const grupos = {A:[], B:[], C:[]};
  sorted.forEach(e => grupos[e.curva].push(e));

  let rows = '';
  ['A','B','C'].forEach(curva => {
    if(!grupos[curva].length) return;
    rows += `<tr style="background:#f8fafc">
      <td colspan="5" style="padding:8px 14px;font-size:15px;font-weight:800;color:${curva==='A'?'var(--green)':curva==='B'?'var(--yellow)':'var(--red)'}">
        ${curva}
      </td>
    </tr>`;
    grupos[curva].forEach(e => {
      rows += `<tr>
        <td style="padding:9px 14px;font-size:13px;text-align:center">${e.label}</td>
        <td style="padding:9px 14px;font-size:13px;text-align:center">${e.qtde}</td>
        <td style="padding:9px 14px;font-size:13px;text-align:center">${fmtNum(e.custo)}</td>
        <td style="padding:9px 14px;font-size:13px;text-align:center">${fmtNum(e.venda)}</td>
        <td style="padding:9px 14px;font-size:13px;text-align:center">${fmtNum(e.ticket)}</td>
      </tr>`;
    });
  });

  body.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:0 0 var(--radius-lg) var(--radius-lg);overflow:hidden">
    <!-- subtítulo + link visão detalhada -->
    <div style="padding:12px 14px;border-bottom:1px solid var(--border);text-align:center">
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">
        Curva ABC por ${_abcTab==='fornecedores'?'Fornecedor':'Categoria'} - Visão global
      </div>
      <button onclick="_abcVis='detalhada';carregarCurvaABCDetalhada()" 
        style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:12px;font-weight:600;font-family:inherit;text-decoration:underline">
        Visão detalhada
      </button>
    </div>
    <div class="table-wrap"><table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f8fafc;border-bottom:2px solid var(--border)">
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">${colHeader}</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Qtde Itens</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Valor Custo</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Valor Venda</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Ticket Médio</th>
        </tr>
      </thead>
      <tbody>${rows||'<tr><td colspan="5" style="text-align:center;color:var(--text-2);padding:32px">Nenhum dado</td></tr>'}</tbody>
    </table></div>
  </div>`;
  lucide.createIcons();
}

async function carregarCurvaABCDetalhada() {
  const body = document.getElementById('abc-body');
  if(!body) return;
  body.innerHTML = '<div class="loading" style="padding:32px;text-align:center">Carregando detalhes...</div>';

  const {ini, fim} = calcDateRange(_abcSel, _abcAno, _abcMes);

  const {data:itens} = await sb.from('venda_itens')
    .select('quantidade,total,produto_id,produto_nome,produtos!inner(nome,custo,preco_venda,fornecedor_id,categoria_id,fornecedores(razao_social),categorias(nome))')
    .gte('created_at', ini).lte('created_at', fim+'T23:59:59');

  if(!itens||!itens.length) {
    body.innerHTML = '<div class="empty-state" style="padding:48px"><p>Sem dados no período</p></div>';
    return;
  }

  // Agrupar por produto
  const map = {};
  itens.forEach(item => {
    const p = item.produtos;
    const key = item.produto_id;
    if(!map[key]) {
      map[key] = {
        nome: p.nome||item.produto_nome,
        forn: p.fornecedores?.razao_social||'Fornecedor padrão',
        cat: p.categorias?.nome||'—',
        qtde:0, custo:0, venda:0
      };
    }
    const qtd = item.quantidade||0;
    map[key].qtde  += qtd;
    map[key].custo += qtd * parseFloat(p.custo||0);
    map[key].venda += parseFloat(item.total||0);
  });

  const sorted = Object.values(map).sort((a,b)=>b.venda-a.venda);
  const totalV = sorted.reduce((a,e)=>a+e.venda,0);
  let acum = 0;

  const rows = sorted.map(e => {
    const pct = totalV>0?(e.venda/totalV)*100:0;
    acum += pct;
    const curva = acum<=70?'A':acum<=90?'B':'C';
    const ticket = e.qtde>0?(e.venda/e.qtde):0;
    const cc = curva==='A'?'var(--green)':curva==='B'?'var(--yellow)':'var(--red)';
    return `<tr>
      <td style="padding:8px 14px;font-size:13px">${e.nome}</td>
      <td style="padding:8px 14px;font-size:12px;color:var(--text-2)">${_abcTab==='fornecedores'?e.forn:e.cat}</td>
      <td style="padding:8px 14px;font-size:13px;text-align:center">${e.qtde}</td>
      <td style="padding:8px 14px;font-size:13px;text-align:center">${fmtNum(e.custo)}</td>
      <td style="padding:8px 14px;font-size:13px;text-align:center">${fmtNum(e.venda)}</td>
      <td style="padding:8px 14px;font-size:13px;text-align:center">${fmtNum(ticket)}</td>
      <td style="padding:8px 14px;text-align:center"><span style="font-weight:800;font-size:14px;color:${cc}">${curva}</span></td>
    </tr>`;
  }).join('');

  const colLabel = _abcTab==='fornecedores'?'Fornecedor':'Categoria';
  body.innerHTML = `
  <div style="background:white;border:1px solid var(--border);border-radius:0 0 var(--radius-lg) var(--radius-lg);overflow:hidden">
    <div style="padding:12px 14px;border-bottom:1px solid var(--border);text-align:center">
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">
        Curva ABC por ${_abcTab==='fornecedores'?'Fornecedor':'Categoria'} - Visão detalhada
      </div>
      <button onclick="carregarCurvaABC()"
        style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:12px;font-weight:600;font-family:inherit;text-decoration:underline">
        Visão global
      </button>
    </div>
    <div class="table-wrap"><table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f8fafc;border-bottom:2px solid var(--border)">
          <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Produto</th>
          <th style="padding:10px 14px;text-align:left;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">${colLabel}</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Qtde</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Valor Custo</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Valor Venda</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Ticket Médio</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.5px">Curva</th>
        </tr>
      </thead>
      <tbody>${rows||'<tr><td colspan="7" style="text-align:center;color:var(--text-2);padding:32px">Nenhum dado</td></tr>'}</tbody>
    </table></div>
  </div>`;
  lucide.createIcons();
}

async function renderTransferenciaLojas() {
  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-primary" onclick="openTransferenciaModal()"><i data-lucide="plus"></i>Nova Transferência</button>`;

  const {data} = await sb.from('transferencias_estoque')
    .select('*,produto_grades(tamanho,cor_descricao,produtos(nome))')
    .order('created_at',{ascending:false}).limit(50);

  document.getElementById('content').innerHTML = `
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Data</th><th>Produto</th><th>Grade</th><th>Cor</th><th>Quantidade</th><th>Origem</th><th>Destino</th><th>Status</th></tr></thead>
        <tbody>${(data||[]).map(t=>`<tr>
          <td style="font-size:12px;color:var(--text-2)">${new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
          <td><strong>${t.produto_grades?.produtos?.nome||'—'}</strong></td>
          <td>${t.produto_grades?.tamanho||'—'}</td>
          <td>${t.produto_grades?.cor_descricao||'—'}</td>
          <td style="text-align:center;font-weight:600">${t.quantidade}</td>
          <td style="font-size:12px">${t.loja_origem||'Esta loja'}</td>
          <td style="font-size:12px">${t.loja_destino||'—'}</td>
          <td><span class="badge badge-${t.status==='concluida'?'green':t.status==='cancelada'?'red':'blue'}" style="text-transform:capitalize">${t.status||'pendente'}</span></td>
        </tr>`).join('')||'<tr><td colspan="8" style="text-align:center;color:var(--text-2);padding:32px">Nenhuma transferência registrada</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  lucide.createIcons();
}

async function openTransferenciaModal() {
  const {data:grades} = await sb.from('produto_grades')
    .select('id,tamanho,ean,estoque,produtos(nome)')
    .gt('estoque',0).order('produto_id').limit(200);

  openModal(`
    <div class="modal-header"><h3>Nova Transferência de Estoque</h3><button class="modal-close" onclick="closeModalDirect()"><i data-lucide="x"></i></button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group"><label>Produto / Variação *</label>
        <select id="tr-grade"><option value="">Selecione</option>
          ${(grades||[]).map(g=>`<option value="${g.id}">${g.produtos?.nome||'—'} à ${g.tamanho||'único'} (estoque: ${g.estoque})</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Quantidade *</label><input id="tr-qtde" type="number" min="1" value="1"></div>
        <div class="form-group"><label>Loja Destino *</label><input id="tr-destino" placeholder="Nome da loja destino"></div>
      </div>
      <div class="form-group"><label>Observação</label><textarea id="tr-obs"></textarea></div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModalDirect()">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarTransferencia()"><i data-lucide="arrow-left-right"></i>Transferir</button>
    </div>`,'modal-md');
}

async function salvarTransferencia() {
  const gradeId = document.getElementById('tr-grade')?.value;
  const qtde = parseInt(document.getElementById('tr-qtde')?.value||0);
  const destino = document.getElementById('tr-destino')?.value?.trim();
  if(!gradeId||!qtde||!destino) return toast('Preencha todos os campos obrigatórios','error');

  const {data:pg} = await sb.from('produto_grades').select('estoque').eq('id',gradeId).single();
  if(!pg||pg.estoque<qtde) return toast('Estoque insuficiente para transferência','error');

  await sb.from('transferencias_estoque').insert({
    produto_grade_id:gradeId, quantidade:qtde,
    loja_destino:destino, loja_origem:'Esta loja',
    observacao:document.getElementById('tr-obs')?.value||null,
    status:'concluida'
  });
  await sb.from('produto_grades').update({estoque:pg.estoque-qtde}).eq('id',gradeId);

  closeModalDirect();
  toast('Transferência registrada');
  renderTransferenciaLojas();
}
