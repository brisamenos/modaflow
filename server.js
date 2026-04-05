const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// =============================================
// ADMIN DATABASE
// =============================================
const adminDb = new Database(path.join(dataDir, 'admin.sqlite'));
adminDb.pragma('journal_mode = WAL');
adminDb.exec(`
  CREATE TABLE IF NOT EXISTS admin_usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL, email TEXT UNIQUE NOT NULL, senha_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS gestores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL, plano TEXT DEFAULT 'basico',
    ativo INTEGER DEFAULT 1, expires_at DATE,
    ia_enabled INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS ia_global_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chave TEXT UNIQUE NOT NULL,
    valor TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrações do adminDb — adiciona colunas que podem não existir em bancos antigos
const adminMigrations = [
  'ALTER TABLE gestores ADD COLUMN ia_enabled INTEGER DEFAULT 0',
  'ALTER TABLE gestores ADD COLUMN ia_api_key TEXT',
];
for (const m of adminMigrations) {
  try { adminDb.exec(m); } catch(e) { /* coluna já existe — ignora */ }
}

// Admin padrão
if (!adminDb.prepare('SELECT id FROM admin_usuarios WHERE email=?').get('admin@modaflow.com')) {
  const h = crypto.createHash('sha256').update('admin123').digest('hex');
  adminDb.prepare('INSERT INTO admin_usuarios (nome,email,senha_hash) VALUES (?,?,?)').run('Super Admin','admin@modaflow.com',h);
  console.log('Admin criado: admin@modaflow.com / admin123 — TROQUE A SENHA!');
}

// =============================================
// TOKENS
// =============================================
const SECRET = process.env.TOKEN_SECRET || 'modaflow-2025';
function gerarToken(p) {
  const d = JSON.stringify({...p, iat:Date.now()});
  const s = crypto.createHmac('sha256',SECRET).update(d).digest('hex');
  return Buffer.from(d).toString('base64')+'.'+s;
}
function verificarToken(token) {
  try {
    const [b,s] = token.split('.');
    const d = Buffer.from(b,'base64').toString();
    if(crypto.createHmac('sha256',SECRET).update(d).digest('hex')!==s) return null;
    return JSON.parse(d);
  } catch { return null; }
}

// =============================================
// MULTI-TENANT DBS
// =============================================
const tenantDbs = {};
function getTenantDb(slug) {
  if (tenantDbs[slug]) return tenantDbs[slug];
  const tdb = new Database(path.join(dataDir, `tenant_${slug}.sqlite`));
  tdb.pragma('journal_mode = WAL');
  tdb.pragma('foreign_keys = ON');
  tenantDbs[slug] = tdb;
  return tdb;
}

function iniciarBancoGestor(slug) {
  const tdb = getTenantDb(slug);
  const schemaPath = path.join(__dirname, 'database_schema.sql');
  if (fs.existsSync(schemaPath)) {
    let sql = fs.readFileSync(schemaPath,'utf8');
    sql = sql.replace(/SERIAL PRIMARY KEY/g,'INTEGER PRIMARY KEY AUTOINCREMENT')
             .replace(/JSONB/g,'TEXT').replace(/BOOLEAN/g,'INTEGER')
             .replace(/VARCHAR\(\d+\)\s+UNIQUE/g,'TEXT UNIQUE')
             .replace(/VARCHAR\(\d+\)/g,'TEXT').replace(/DECIMAL\(\d+,\d+\)/g,'REAL');
    try { tdb.exec(sql); } catch(e) {}
  }
  aplicarMigracoes(tdb);
  return tdb;
}

function aplicarMigracoes(tdb) {
  const sc = sql => { try { tdb.exec(sql); } catch(e){} };
  const ac = (t,c,tp) => { try { tdb.exec(`ALTER TABLE "${t}" ADD COLUMN "${c}" ${tp}`); } catch(e){} };
  sc(`CREATE TABLE IF NOT EXISTS como_conheceu (id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, ativo INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS cliente_filhos (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, nome TEXT, nome_abreviado TEXT, sexo TEXT, data_nascimento DATE, grade_id INTEGER, grade_nome TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS agenda (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, titulo TEXT, descricao TEXT, data DATE, hora TEXT, concluido INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS transferencias_estoque (id INTEGER PRIMARY KEY AUTOINCREMENT, produto_grade_id INTEGER, quantidade INTEGER DEFAULT 0, loja_origem TEXT, loja_destino TEXT, observacao TEXT, status TEXT DEFAULT 'concluida', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS agenda_tarefas (id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT, descricao TEXT, data_tarefa DATE, concluida INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS changelog (id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, data_lancamento DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS configuracoes (id INTEGER PRIMARY KEY AUTOINCREMENT, chave TEXT UNIQUE, valor TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS ia_config (id INTEGER PRIMARY KEY AUTOINCREMENT, chave TEXT UNIQUE NOT NULL, valor TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS contas_bancarias (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, banco TEXT, agencia TEXT, conta TEXT, saldo REAL DEFAULT 0, ativo INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS metas_vendas (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT DEFAULT 'loja', vendedor_id INTEGER, mes INTEGER, ano INTEGER, valor_meta REAL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS bags (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, vendedor_id INTEGER, total REAL NOT NULL, data_retorno DATE, status TEXT DEFAULT 'aberta', observacoes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS bag_itens (id INTEGER PRIMARY KEY AUTOINCREMENT, bag_id INTEGER, produto_id INTEGER, produto_nome TEXT, tamanho TEXT, quantidade INTEGER NOT NULL, preco_unitario REAL NOT NULL, total REAL NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS trocas (id INTEGER PRIMARY KEY AUTOINCREMENT, venda_id INTEGER, cliente_id INTEGER, produto_id INTEGER, produto_nome TEXT, tamanho TEXT, valor REAL, motivo TEXT, status TEXT DEFAULT 'pendente', tipo TEXT DEFAULT 'troca', valor_credito REAL DEFAULT 0, data_troca DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS fornecedor_marcas (id INTEGER PRIMARY KEY AUTOINCREMENT, fornecedor_id INTEGER, nome TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS notas_fiscais (id INTEGER PRIMARY KEY AUTOINCREMENT, numero TEXT, chave TEXT, fornecedor_id INTEGER, valor REAL NOT NULL, data_emissao DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS duplicatas (id INTEGER PRIMARY KEY AUTOINCREMENT, nota_id INTEGER, valor REAL NOT NULL, vencimento DATE NOT NULL, status TEXT DEFAULT 'pendente', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS movimentos_caixa (id INTEGER PRIMARY KEY AUTOINCREMENT, caixa_id INTEGER, tipo TEXT, descricao TEXT, valor REAL NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS caixas (id INTEGER PRIMARY KEY AUTOINCREMENT, saldo_inicial REAL DEFAULT 0, status TEXT DEFAULT 'aberto', data_fechamento TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS despesas (id INTEGER PRIMARY KEY AUTOINCREMENT, classificacao_id INTEGER, descricao TEXT NOT NULL, valor REAL NOT NULL, data_competencia DATE, vencimento DATE, data_pagamento DATE, status TEXT DEFAULT 'aberta', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS contas_pagar (id INTEGER PRIMARY KEY AUTOINCREMENT, fornecedor_id INTEGER, descricao TEXT, valor REAL NOT NULL, vencimento DATE, data_pagamento DATE, status TEXT DEFAULT 'aberta', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS classificacoes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, tipo TEXT)`);
  sc(`CREATE TABLE IF NOT EXISTS contas_correntes (id INTEGER PRIMARY KEY AUTOINCREMENT, banco TEXT, agencia TEXT, conta TEXT, saldo REAL DEFAULT 0, data DATE, emite_boleto TEXT DEFAULT 'Não', status INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS contas_receber (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, descricao TEXT, valor REAL, vencimento DATE, data_pagamento DATE, data_recebimento DATE, status TEXT DEFAULT 'aberta', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS crediario (id INTEGER PRIMARY KEY AUTOINCREMENT, venda_id INTEGER, cliente_id INTEGER, total REAL NOT NULL, saldo_devedor REAL DEFAULT 0, num_parcelas INTEGER DEFAULT 1, parcelas_pagas INTEGER DEFAULT 0, valor_parcela REAL DEFAULT 0, status TEXT DEFAULT 'aberto', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS crediario_parcelas (id INTEGER PRIMARY KEY AUTOINCREMENT, crediario_id INTEGER, numero_parcela INTEGER DEFAULT 1, valor REAL NOT NULL, valor_pago REAL, vencimento DATE NOT NULL, data_pagamento DATE, status TEXT DEFAULT 'pendente', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS conferencias_estoque (id INTEGER PRIMARY KEY AUTOINCREMENT, status TEXT DEFAULT 'aberta', total_lido INTEGER DEFAULT 0, data_fim TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS conferencia_itens (id INTEGER PRIMARY KEY AUTOINCREMENT, conferencia_id INTEGER, produto_grade_id INTEGER, ean TEXT, produto_nome TEXT, quantidade INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  ac('clientes','nome_abreviado','TEXT'); ac('clientes','cpf','TEXT'); ac('clientes','instagram','TEXT');
  ac('clientes','sexo','TEXT'); ac('clientes','data_nascimento','DATE'); ac('clientes','observacoes','TEXT');
  ac('clientes','logradouro','TEXT'); ac('clientes','numero','TEXT'); ac('clientes','bairro','TEXT');
  ac('clientes','cep','TEXT'); ac('clientes','estado','TEXT'); ac('clientes','cidade','TEXT');
  ac('clientes','ultima_compra','DATE');
  // Colunas que estavam no schema mas faltavam nas migrações
  ac('clientes','dia_nascimento','INTEGER');
  ac('clientes','mes_nascimento','INTEGER');
  ac('clientes','rg','TEXT');
  ac('clientes','ie','TEXT');
  ac('clientes','tipo_pessoa','TEXT DEFAULT "PF"');
  ac('clientes','como_conheceu','TEXT');
  ac('clientes','complemento','TEXT');
  ac('clientes','codigo_externo','TEXT');
  ac('clientes','documento','TEXT');
  ac('clientes','origem','TEXT');
  ac('clientes','endereco','TEXT');
  ac('clientes','nome_abreviado_2','TEXT');
  ac('vendas','numero_venda','INTEGER'); ac('vendas','subtotal','REAL'); ac('vendas','parcelas','INTEGER');
  ac('vendas','valor_pago','REAL'); ac('vendas','troco','REAL'); ac('vendas','data_pagamento','DATE');
  ac('fornecedores','razao_social','TEXT'); ac('fornecedores','nome_fantasia','TEXT');
  ac('fornecedores','cnpj','TEXT'); ac('fornecedores','celular','TEXT');
  ac('fornecedores','cidade','TEXT'); ac('fornecedores','estado','TEXT');
  ac('fornecedores','observacoes','TEXT'); ac('fornecedores','contato','TEXT');
  ac('fornecedores','endereco','TEXT'); ac('fornecedores','site','TEXT');
  ac('fornecedores','ie','TEXT');
  ac('produtos','sku','TEXT'); ac('produtos','marca','TEXT'); ac('produtos','colecao_id','INTEGER');
  ac('produtos','ncm_descricao','TEXT'); ac('produtos','ncm','TEXT'); ac('produtos','genero','TEXT');
  ac('produtos','unidade','TEXT'); ac('produtos','custo','REAL'); ac('produtos','margem_lucro','REAL');
  ac('produtos','fornecedor_cnpj','TEXT'); ac('produtos','preco_custo','REAL'); ac('produtos','preco_venda','REAL');
  ac('produto_grades','ean','TEXT'); ac('produto_grades','cor_hexa','TEXT');
  ac('produto_grades','cor_descricao','TEXT'); ac('produto_grades','custo','REAL');
  ac('produto_grades','preco_venda','REAL'); ac('produto_grades','margem_lucro','REAL');
  ac('vendedores','cpf','TEXT'); ac('vendedores','telefone','TEXT'); ac('vendedores','email','TEXT'); ac('vendedores','meta_mensal','REAL DEFAULT 0');
  ac('categorias','ativo','INTEGER'); ac('colecoes','ativo','INTEGER'); ac('grades','ativo','INTEGER');
  ac('crediario_parcelas','forma_pagamento','TEXT');
  ac('crediario_parcelas','desconto','REAL DEFAULT 0');
  // Tabela de tamanhos individuais (igual ao Phibo - Cadastrar Grade)
  sc(`CREATE TABLE IF NOT EXISTS grades_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tamanho TEXT NOT NULL UNIQUE,
    faixa_etaria TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  ac('trocas','tipo','TEXT DEFAULT "troca"'); ac('trocas','valor_credito','REAL DEFAULT 0'); ac('trocas','data_troca','DATE');
  ac('bags','numero_bag','INTEGER'); ac('bags','observacoes','TEXT');
  ac('classificacoes','visao_contabil','TEXT');
  ac('classificacoes','created_at','TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  ac('contas_receber','data_recebimento','DATE');
  ac('despesas','ciclo_pagamento','TEXT DEFAULT \'Unico\'');
  try { tdb.exec(`UPDATE categorias SET ativo=1 WHERE ativo IS NULL`); } catch(e){}
  try { tdb.exec(`UPDATE colecoes SET ativo=1 WHERE ativo IS NULL`); } catch(e){}
  try { tdb.exec(`UPDATE grades SET ativo=1 WHERE ativo IS NULL`); } catch(e){}
  try { tdb.exec(`UPDATE fornecedores SET razao_social=nome WHERE (razao_social IS NULL OR razao_social='') AND nome IS NOT NULL`); } catch(e){}
  // Sincronizar preco_custo com custo quando preco_custo estiver vazio
  try { tdb.exec(`UPDATE produtos SET preco_custo=custo WHERE (preco_custo IS NULL OR preco_custo=0) AND custo IS NOT NULL AND custo>0`); } catch(e){}
  try { tdb.exec(`UPDATE produtos SET preco_venda=0 WHERE preco_venda IS NULL`); } catch(e){}
  // Auto-numerar bags existentes sem numero_bag
  try { tdb.exec(`UPDATE bags SET numero_bag=id WHERE numero_bag IS NULL`); } catch(e){}
  // Ativar fornecedores importados via CSV que ficaram com ativo=NULL
  try { tdb.exec(`UPDATE fornecedores SET ativo=1 WHERE ativo IS NULL`); } catch(e){}
  // Ativar categorias e coleções criadas pelo import sem ativo
  try { tdb.exec(`UPDATE categorias SET ativo=1 WHERE ativo IS NULL`); } catch(e){}
  try { tdb.exec(`UPDATE colecoes SET ativo=1 WHERE ativo IS NULL`); } catch(e){}
  // Sincronizar dia_nascimento e mes_nascimento a partir de data_nascimento para clientes antigos
  // (resolve o caso de clientes importados antes das colunas existirem)
  try {
    tdb.exec(`UPDATE clientes SET
      dia_nascimento = CAST(strftime('%d', data_nascimento) AS INTEGER),
      mes_nascimento = CAST(strftime('%m', data_nascimento) AS INTEGER)
      WHERE data_nascimento IS NOT NULL
        AND data_nascimento != ''
        AND (dia_nascimento IS NULL OR dia_nascimento = 0)
        AND (mes_nascimento IS NULL OR mes_nascimento = 0)`);
  } catch(e){}
  // Sincronizar data_nascimento a partir de dia_nascimento/mes_nascimento quando data_nascimento está vazia
  try {
    tdb.exec(`UPDATE clientes SET
      data_nascimento = '2000-' || printf('%02d', mes_nascimento) || '-' || printf('%02d', dia_nascimento)
      WHERE dia_nascimento IS NOT NULL AND dia_nascimento > 0
        AND mes_nascimento IS NOT NULL AND mes_nascimento > 0
        AND (data_nascimento IS NULL OR data_nascimento = '')`);
  } catch(e){}
}

// =============================================
// DB LEGADO (compatibilidade)
// =============================================
const legacyDbPath = path.join(dataDir, 'database.sqlite');
const legacyExists = fs.existsSync(legacyDbPath);
const legacyDb = new Database(legacyDbPath);
legacyDb.pragma('journal_mode = WAL');
legacyDb.pragma('foreign_keys = ON');
if (!legacyExists) {
  const schemaPath = path.join(__dirname, 'database_schema.sql');
  if (fs.existsSync(schemaPath)) {
    let sql = fs.readFileSync(schemaPath,'utf8');
    sql = sql.replace(/SERIAL PRIMARY KEY/g,'INTEGER PRIMARY KEY AUTOINCREMENT')
             .replace(/JSONB/g,'TEXT').replace(/BOOLEAN/g,'INTEGER')
             .replace(/VARCHAR\(\d+\)\s+UNIQUE/g,'TEXT UNIQUE')
             .replace(/VARCHAR\(\d+\)/g,'TEXT').replace(/DECIMAL\(\d+,\d+\)/g,'REAL');
    legacyDb.exec(sql);
  }
}
aplicarMigracoes(legacyDb);

// Iniciar bancos de gestores já cadastrados
for (const g of adminDb.prepare('SELECT slug FROM gestores WHERE ativo=1').all()) {
  const dbFile = path.join(dataDir, `tenant_${g.slug}.sqlite`);
  if (fs.existsSync(dbFile)) { getTenantDb(g.slug); aplicarMigracoes(getTenantDb(g.slug)); }
  else iniciarBancoGestor(g.slug);
}

// =============================================
// MIDDLEWARE: resolve o DB correto
// =============================================
function resolveDb(req, res, next) {
  const auth = req.headers['authorization'];
  if (auth) {
    const payload = verificarToken(auth.replace('Bearer ',''));
    if (payload && payload.tipo === 'gestor') {
      const g = adminDb.prepare('SELECT ativo,expires_at FROM gestores WHERE id=?').get(payload.id);
      if (!g || !g.ativo) return res.status(403).json({ message:'Conta bloqueada' });
      if (g.expires_at && new Date(g.expires_at) < new Date()) {
        return res.status(403).json({ message:`Sistema vencido em ${new Date(g.expires_at).toLocaleDateString('pt-BR')}. Renove seu plano.` });
      }
      req.db = getTenantDb(payload.slug);
      req.gestor = payload;
      return next();
    }
  }
  // Fallback: banco legado (compatibilidade com sessão antiga)
  req.db = legacyDb;
  next();
}

// =============================================
// ROTAS ADMIN
// =============================================
function adminAuth(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ message:'Não autenticado' });
  const p = verificarToken(auth.replace('Bearer ',''));
  if (!p || p.tipo !== 'admin') return res.status(401).json({ message:'Token inválido' });
  req.admin = p; next();
}

app.post('/api/admin/login', (req,res) => {
  try {
    const { email, senha_hash } = req.body;
    const adm = adminDb.prepare('SELECT * FROM admin_usuarios WHERE email=?').get(email);
    if (!adm || adm.senha_hash !== senha_hash) return res.status(401).json({ message:'Credenciais inválidas' });
    const token = gerarToken({ tipo:'admin', id:adm.id, nome:adm.nome, email:adm.email });
    res.json({ token, nome:adm.nome });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/admin/me', adminAuth, (req,res) => res.json({ nome:req.admin.nome, email:req.admin.email }));

app.get('/api/admin/gestores', adminAuth, (req,res) => {
  res.json(adminDb.prepare('SELECT id,nome,slug,email,plano,ativo,expires_at,ia_enabled,ia_api_key,created_at FROM gestores ORDER BY created_at DESC').all());
});

app.post('/api/admin/gestores', adminAuth, (req,res) => {
  try {
    const { nome,slug,email,senha_hash,plano='basico',ativo=1,expires_at=null } = req.body;
    if (!nome||!slug||!email||!senha_hash) return res.status(400).json({ message:'Campos obrigatórios faltando' });
    if (adminDb.prepare('SELECT id FROM gestores WHERE slug=? OR email=?').get(slug,email))
      return res.status(400).json({ message:'Slug ou e-mail já cadastrado' });
    const info = adminDb.prepare('INSERT INTO gestores (nome,slug,email,senha_hash,plano,ativo,expires_at) VALUES (?,?,?,?,?,?,?)')
      .run(nome,slug,email,senha_hash,plano,ativo?1:0,expires_at);
    iniciarBancoGestor(slug);
    res.json({ id:info.lastInsertRowid, nome, slug, email });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.patch('/api/admin/gestores/:id', adminAuth, (req,res) => {
  try {
    const { id } = req.params;
    const permitidos = ['nome','slug','email','senha_hash','plano','ativo','expires_at'];
    const sets=[],vals=[];
    for (const [k,v] of Object.entries(req.body)) {
      if (permitidos.includes(k)) { sets.push(`"${k}"=?`); vals.push(k==='ativo'?(v?1:0):v); }
    }
    if (!sets.length) return res.status(400).json({ message:'Nada para atualizar' });
    vals.push(id);
    adminDb.prepare(`UPDATE gestores SET ${sets.join(',')} WHERE id=?`).run(...vals);
    res.json({ ok:true });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

// =============================================
// LOGIN DO GESTOR
// =============================================
app.post('/api/auth/login', (req,res) => {
  try {
    const { email, senha_hash } = req.body;
    const g = adminDb.prepare('SELECT * FROM gestores WHERE email=?').get(email);
    if (!g || g.senha_hash !== senha_hash) return res.status(401).json({ message:'E-mail ou senha incorretos' });
    if (!g.ativo) return res.status(403).json({ message:'Conta bloqueada. Entre em contato com o suporte.' });
    if (g.expires_at && new Date(g.expires_at) < new Date())
      return res.status(403).json({ message:`Sistema vencido em ${new Date(g.expires_at).toLocaleDateString('pt-BR')}. Renove seu plano.` });
    const token = gerarToken({ tipo:'gestor', id:g.id, slug:g.slug, nome:g.nome, email:g.email });
    res.json({ token, nome:g.nome, slug:g.slug });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

app.get('/api/auth/me', (req,res) => {
  try {
    const auth = req.headers['authorization'];
    if (!auth) return res.status(401).json({ message:'Não autenticado' });
    const p = verificarToken(auth.replace('Bearer ',''));
    if (!p) return res.status(401).json({ message:'Token inválido' });
    if (p.tipo === 'admin') return res.json({ nome:p.nome, tipo:'admin' });
    const g = adminDb.prepare('SELECT ativo,expires_at FROM gestores WHERE id=?').get(p.id);
    if (!g||!g.ativo) return res.status(403).json({ message:'Conta bloqueada' });
    if (g.expires_at&&new Date(g.expires_at)<new Date()) return res.status(403).json({ message:'Sistema vencido' });
    res.json({ nome:p.nome, slug:p.slug });
  } catch(e) { res.status(500).json({ message:e.message }); }
});

// =============================================
// HELPERS (reutilizados das rotas)
// =============================================

function parseSelect(selectStr) {
  if (!selectStr || selectStr === '*') return { fields: '*', relations: [] };
  const fields = [], relations = [];
  let current = '';
  for (let i = 0; i < selectStr.length; i++) {
    const char = selectStr[i];
    if (char === '(') {
      const relName = current.trim().replace(/[!:].*$/, '').trim();
      current = '';
      let relFields = '', depth = 1; i++;
      while (i < selectStr.length && depth > 0) {
        if (selectStr[i] === '(') depth++;
        else if (selectStr[i] === ')') { depth--; if (depth === 0) { i++; break; } }
        relFields += selectStr[i]; i++;
      }
      i--;
      if (relName) relations.push({ table: relName, fields: relFields });
    } else if (char === ',') {
      const f = current.trim().replace(/"/g,'').replace(/[!:].*$/,'').trim();
      if (f) fields.push(f); current = '';
    } else { current += char; }
  }
  const last = current.trim().replace(/"/g,'').replace(/[!:].*$/,'').trim();
  if (last) fields.push(last);
  const clean = fields.filter(f=>f);
  return { fields: clean.length ? clean.map(f => f === '*' ? '*' : `"${f}"`).join(',') : '*', relations };
}

function coerceBool(v) {
  if (v === 'true') return 1; if (v === 'false') return 0;
  if (v === '1') return 1; if (v === '0') return 0;
  return v;
}

function buildWhere(query) {
  const clauses = [], params = [];
  for (const [key, rawVal] of Object.entries(query)) {
    if (['select','order','limit','or'].includes(key)) continue;
    const vals = Array.isArray(rawVal) ? rawVal : [rawVal];
    for (const val of vals) {
      if (typeof val !== 'string') continue;
      
      let leftSide = `"${key}"`;
      let rightSideClose = ``;
      
      if (key.includes('.')) {
        const parts = key.split('.');
        if (parts.length === 2) {
          let fk = parts[0].toLowerCase();
          if (fk.endsWith('oes')) fk = fk.slice(0,-3) + 'ao';
          else if (fk.endsWith('s')) fk = fk.slice(0,-1);
          fk += '_id';
          leftSide = `"${fk}" IN (SELECT "id" FROM "${parts[0]}" WHERE "${parts[1]}"`;
          rightSideClose = `)`;
        }
      }

      const pushC = (op, paramVal) => { clauses.push(`${leftSide} ${op} ?${rightSideClose}`); params.push(coerceBool(paramVal)); };
      const pushDirect = (op) => { clauses.push(`${leftSide} ${op}${rightSideClose}`); };

      if (val.startsWith('not.')) {
        const rest = val.slice(4);
        if (rest === 'is.null') pushDirect('IS NOT NULL');
        else if (rest.startsWith('in.(')) {
          const list = rest.slice(4,-1).split(',').map(v=>v.trim()).filter(Boolean);
          if (list.length) { clauses.push(`${leftSide} NOT IN (${list.map(()=>'?').join(',')})${rightSideClose}`); params.push(...list.map(coerceBool)); }
        } else if (rest.startsWith('eq.')) { pushC('!=', rest.slice(3)); }
        else if (rest.startsWith('ilike.')||rest.startsWith('like.')) {
          const p = rest.startsWith('ilike.') ? 6 : 5;
          pushC('NOT LIKE', rest.slice(p).replace(/\*/g,'%'));
        }
        continue;
      }
      if (val.startsWith('eq.'))        {
        // EAN pode ser INTEGER no SQLite — usar CAST para comparação segura
        if (key === 'ean') { clauses.push(`CAST("ean" AS TEXT) = ?`); params.push(coerceBool(val.slice(3))); }
        else pushC('=', val.slice(3));
      }
      else if (val.startsWith('neq.'))  { pushC('!=', val.slice(4)); }
      else if (val.startsWith('gt.'))   { pushC('>', val.slice(3)); }
      else if (val.startsWith('gte.'))  { pushC('>=', val.slice(4)); }
      else if (val.startsWith('lt.'))   { pushC('<', val.slice(3)); }
      else if (val.startsWith('lte.'))  { pushC('<=', val.slice(4)); }
      else if (val.startsWith('ilike.')||val.startsWith('like.')) {
        const p = val.startsWith('ilike.') ? 6 : 5;
        const pattern = val.slice(p).replace(/\*/g,'%');
        // EAN pode ser INTEGER — usar CAST para LIKE funcionar
        if (key === 'ean') { clauses.push(`CAST("ean" AS TEXT) LIKE ?`); params.push(pattern); }
        else pushC('LIKE', pattern);
      } else if (val.startsWith('in.(')) {
        const list = val.slice(4,-1).split(',').map(v=>v.trim()).filter(Boolean);
        if (list.length) { clauses.push(`${leftSide} IN (${list.map(()=>'?').join(',')})${rightSideClose}`); params.push(...list.map(coerceBool)); }
      } else if (val === 'is.null')     { pushDirect('IS NULL'); }
      else if (val === 'not.is.null')   { pushDirect('IS NOT NULL'); }
      else                              { pushC('=', val); }
    }
  }
  if (query.or) {
    const orClauses = [];
    const orItems = query.or.replace(/^\(|\)$/g, '').split(',');
    for (const part of orItems) {
      const dot = part.indexOf('.');
      if (dot === -1) continue;
      
      let leftSide = `"${part.slice(0,dot)}"`;
      let rightSideClose = ``;
      let col = part.slice(0,dot);
      const rest = part.slice(dot+1);

      if (col.includes('.')) {
        const parts = col.split('.');
        if (parts.length === 2) {
          let fk = parts[0].toLowerCase();
          if (fk.endsWith('oes')) fk = fk.slice(0,-3) + 'ao';
          else if (fk.endsWith('s')) fk = fk.slice(0,-1);
          fk += '_id';
          leftSide = `"${fk}" IN (SELECT "id" FROM "${parts[0]}" WHERE "${parts[1]}"`;
          rightSideClose = `)`;
        }
      }

      if (rest.startsWith('ilike.')||rest.startsWith('like.')) {
        const p = rest.startsWith('ilike.') ? 6 : 5;
        orClauses.push(`${leftSide} LIKE ?${rightSideClose}`); params.push(rest.slice(p).replace(/\*/g,'%'));
      } else if (rest.startsWith('eq.')) { 
        orClauses.push(`${leftSide} = ?${rightSideClose}`); params.push(rest.slice(3)); 
      }
    }
    if (orClauses.length) clauses.push(`(${orClauses.join(' OR ')})`);
  }
  return { where: clauses.length ? 'WHERE '+clauses.join(' AND ') : '', params };
}

const FK_MAP = {
  clientes:'cliente_id', produtos:'produto_id', vendedores:'vendedor_id', fornecedores:'fornecedor_id',
  categorias:'categoria_id', colecoes:'colecao_id', grades:'grade_id', vendas:'venda_id',
  crediario:'crediario_id', bags:'bag_id', caixas:'caixa_id', notas_fiscais:'nota_id',
  classificacoes:'classificacao_id', produto_grades:'produto_grade_id', contas_bancarias:'conta_bancaria_id',
};

function fetchRelations(db, table, results, relations) {
  if (!results.length || !relations.length) return;
  for (const rel of relations) {
    let isHasMany = false;
    let parentFk = null;
    if (table === 'produtos' && rel.table === 'produto_grades') { isHasMany = true; parentFk = 'produto_id'; }
    else if (table === 'vendas' && rel.table === 'venda_itens') { isHasMany = true; parentFk = 'venda_id'; }
    else if (table === 'bags' && rel.table === 'bag_itens') { isHasMany = true; parentFk = 'bag_id'; }
    else if (table === 'conferencias_estoque' && rel.table === 'conferencia_itens') { isHasMany = true; parentFk = 'conferencia_id'; }

    let relFieldsSql = '*';
    if (rel.fields && rel.fields.trim() && rel.fields.trim() !== '*') {
      const cols = rel.fields.split(',').map(f=>f.trim().replace(/"/g,'').replace(/[!:].*$/,'').trim()).filter(f=>f&&!f.includes('('));
      if (cols.length) {
        relFieldsSql = cols.map(c => c === '*' ? '*' : `"${c}"`).join(',');
      }
    }

    if (isHasMany) {
      let stmt; try { stmt = db.prepare(`SELECT ${relFieldsSql} FROM "${rel.table}" WHERE "${parentFk}"=?`); } catch(e) { continue; }
      for (const row of results) {
        try {
          const r = stmt.all(row.id);
          if(r) parseJsonFields(r);
          row[rel.table] = r || [];
        } catch(e) { row[rel.table] = []; }
      }
    } else {
      let fk = FK_MAP[rel.table];
      if (!fk) {
        let s = rel.table;
        if (s.endsWith('oes')) s = s.slice(0,-3)+'ao';
        else if (s.endsWith('s')) s = s.slice(0,-1);
        fk = s+'_id';
      }
      let stmt; try { stmt = db.prepare(`SELECT ${relFieldsSql} FROM "${rel.table}" WHERE id=? LIMIT 1`); } catch(e) { continue; }
      for (const row of results) {
        const fkVal = row[fk];
        if (fkVal != null && fkVal !== '') {
          try { const r = stmt.get(fkVal); if(r) parseJsonFields([r]); row[rel.table]=r||null; } catch(e) { row[rel.table]=null; }
        } else { row[rel.table]=null; }
      }
    }
  }
}

function parseJsonFields(rows) {
  for (const row of rows) {
    for (const [k,v] of Object.entries(row)) {
      if (typeof v==='string' && (v.startsWith('[')||v.startsWith('{'))) {
        try { row[k]=JSON.parse(v); } catch(e) {}
      }
    }
  }
}

function toSQLiteValue(val) {
  if (val===null||val===undefined) return null;
  if (typeof val==='boolean') return val?1:0;
  if (typeof val==='object') return JSON.stringify(val);
  return val;
}

// =============================================
// API ROUTES (multi-tenant via resolveDb)
// =============================================



// Rota de diagnóstico — mostra o que há no banco sobre um EAN
app.get('/api/debug/ean', resolveDb, (req, res) => {
  try {
    const db = req.db;
    const ean = (req.query.ean || '').toString().trim();
    const totalGrades = db.prepare(`SELECT COUNT(*) as c FROM produto_grades`).get();
    const totalProdutos = db.prepare(`SELECT COUNT(*) as c FROM produtos WHERE ativo=1`).get();
    const comEan = db.prepare(`SELECT COUNT(*) as c FROM produto_grades WHERE ean IS NOT NULL AND ean != ''`).get();
    const amostra = db.prepare(`SELECT id, produto_id, tamanho, ean, typeof(ean) as tipo_ean FROM produto_grades WHERE ean IS NOT NULL LIMIT 5`).all();
    let buscaExata = [], buscaLike = [];
    if (ean) {
      buscaExata = db.prepare(`SELECT pg.id, pg.ean, typeof(pg.ean) as tipo, p.nome, p.codigo FROM produto_grades pg JOIN produtos p ON p.id=pg.produto_id WHERE CAST(pg.ean AS TEXT)=? LIMIT 5`).all(ean);
      buscaLike  = db.prepare(`SELECT pg.id, pg.ean, typeof(pg.ean) as tipo, p.nome, p.codigo FROM produto_grades pg JOIN produtos p ON p.id=pg.produto_id WHERE CAST(pg.ean AS TEXT) LIKE ? LIMIT 5`).all(`%${ean}%`);
    }
    res.json({ totalGrades: totalGrades.c, totalProdutos: totalProdutos.c, comEan: comEan.c, amostra, buscaExata, buscaLike });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Zera estoque: apaga variantes e opcionalmente produtos
app.post('/api/manutencao/zerar-estoque', resolveDb, (req, res) => {
  try {
    const db = req.db;
    const apagarProdutos = req.query.apagar_produtos === '1';
    db.prepare(`DELETE FROM produto_grades`).run();
    let msg = 'Todas as variantes foram apagadas.';
    if(apagarProdutos) {
      db.prepare(`DELETE FROM produtos`).run();
      msg = 'Todos os produtos e variantes foram apagados.';
    }
    res.json({ ok: true, message: msg });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Remove produtos duplicados criados por importação com/sem zeros no código
// GET /api/manutencao/deduplicar-produtos  → dry-run (só lista)
// POST /api/manutencao/deduplicar-produtos → executa a limpeza
app.all('/api/manutencao/deduplicar-produtos', resolveDb, (req, res) => {
  try {
    const db = req.db;
    const dryRun = req.method === 'GET';
    // Encontra pares de produtos com mesmo LTRIM(codigo,'0') e mesmo nome
    const dups = db.prepare(`
      SELECT a.id as id_manter, b.id as id_remover,
             a.codigo as cod_manter, b.codigo as cod_remover, a.nome
      FROM produtos a
      JOIN produtos b ON (
        a.id < b.id
        AND a.ativo = 1 AND b.ativo = 1
        AND LOWER(TRIM(a.nome)) = LOWER(TRIM(b.nome))
        AND LTRIM(CAST(a.codigo AS TEXT),'0') = LTRIM(CAST(b.codigo AS TEXT),'0')
      )
    `).all();

    if(dryRun) return res.json({ total: dups.length, pares: dups });

    let removidos = 0;
    for(const dup of dups) {
      // Move grades do duplicado para o original
      db.prepare(`UPDATE produto_grades SET produto_id=? WHERE produto_id=? AND NOT EXISTS (
        SELECT 1 FROM produto_grades g2 WHERE g2.produto_id=? AND g2.tamanho=produto_grades.tamanho AND g2.ean=produto_grades.ean
      )`).run(dup.id_manter, dup.id_remover, dup.id_manter);
      // Desativa o duplicado
      db.prepare(`UPDATE produtos SET ativo=0 WHERE id=?`).run(dup.id_remover);
      removidos++;
    }
    res.json({ removidos, detalhes: dups });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/busca/ean', resolveDb, (req, res) => {
  try {
    const db = req.db;
    const ean = (req.query.ean || '').toString().trim();
    if (!ean) return res.json([]);

    // 1. Busca exata em produto_grades.ean (CAST para funcionar com INTEGER)
    let rows = db.prepare(`
      SELECT pg.id, pg.produto_id, pg.tamanho, pg.ean, pg.estoque,
             pg.preco_venda, pg.cor_hexa, pg.cor_descricao,
             p.id as prod_id, p.nome as prod_nome, p.codigo as prod_codigo, p.preco_venda as prod_preco
      FROM produto_grades pg
      JOIN produtos p ON p.id = pg.produto_id
      WHERE CAST(pg.ean AS TEXT) = ? AND p.ativo = 1
      LIMIT 10
    `).all(ean);

    // 2. Fallback: produtos.codigo exato OU normalizado (zeros à esquerda)
    if (!rows.length) {
      rows = db.prepare(`
        SELECT pg.id, pg.produto_id, pg.tamanho, pg.ean, pg.estoque,
               pg.preco_venda, pg.cor_hexa, pg.cor_descricao,
               p.id as prod_id, p.nome as prod_nome, p.codigo as prod_codigo, p.preco_venda as prod_preco
        FROM produto_grades pg
        JOIN produtos p ON p.id = pg.produto_id
        WHERE (CAST(p.codigo AS TEXT) = ?
           OR LTRIM(CAST(p.codigo AS TEXT),'0') = LTRIM(?,'0'))
          AND p.ativo = 1
        LIMIT 10
      `).all(ean, ean);
    }

    // 3. Fallback LIKE: zeros à esquerda, espaços extras ou EAN parcial
    if (!rows.length) {
      rows = db.prepare(`
        SELECT pg.id, pg.produto_id, pg.tamanho, pg.ean, pg.estoque,
               pg.preco_venda, pg.cor_hexa, pg.cor_descricao,
               p.id as prod_id, p.nome as prod_nome, p.codigo as prod_codigo, p.preco_venda as prod_preco
        FROM produto_grades pg
        JOIN produtos p ON p.id = pg.produto_id
        WHERE (CAST(pg.ean AS TEXT) LIKE ? OR CAST(p.codigo AS TEXT) LIKE ?) AND p.ativo = 1
        LIMIT 10
      `).all(`%${ean}%`, `%${ean}%`);
    }

    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Busca produto por nome/código/EAN (PDV modal + estoque)
// Aceita: ?q=termo  ou  ?ean=X  ou  ?cod=X  ou  ?desc=X
app.get('/api/busca/produto', resolveDb, (req, res) => {
  try {
    const db = req.db;
    const q    = (req.query.q    || '').toString().trim();
    const ean  = (req.query.ean  || q).toString().trim();
    const cod  = (req.query.cod  || q).toString().trim();
    const desc = (req.query.desc || q).toString().trim();
    if (!q && !req.query.ean && !req.query.cod && !req.query.desc) return res.json([]);

    const rows = db.prepare(`
      SELECT p.id, p.codigo, p.nome, p.preco_venda,
             pg.id as grade_id, pg.tamanho, pg.ean, pg.estoque,
             pg.preco_venda as grade_preco, pg.cor_descricao,
             pg.produto_id, p.nome as prod_nome, p.codigo as prod_codigo,
             p.preco_venda as prod_preco, pg.id as prod_grade_id
      FROM produtos p
      LEFT JOIN produto_grades pg ON pg.produto_id = p.id
      WHERE p.ativo = 1
        AND (
          p.nome LIKE ?
          OR CAST(p.codigo AS TEXT) LIKE ?
          OR LTRIM(CAST(p.codigo AS TEXT),'0') = LTRIM(?,'0')
          OR CAST(pg.ean AS TEXT) LIKE ?
        )
      ORDER BY p.nome
      LIMIT 100
    `).all(`%${desc}%`, `%${cod}%`, cod, `%${ean}%`);
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/:table', resolveDb, (req, res) => {
  try {
    const db = req.db;
    const table = req.params.table;
    let { fields, relations } = parseSelect(req.query.select);
    if (fields==='"*"') fields='*';
    const { where, params } = buildWhere(req.query);
    let orderClause = '';
    if (req.query.order) {
      const parts = req.query.order.split('.');
      orderClause = `ORDER BY "${parts[0]}" ${(parts[1]||'').toUpperCase()==='DESC'?'DESC':'ASC'}`;
    }
    let limitClause = req.query.limit ? `LIMIT ${parseInt(req.query.limit)}` : '';
    const sql = `SELECT ${fields} FROM "${table}" ${where} ${orderClause} ${limitClause}`;
    const results = db.prepare(sql).all(...params);
    parseJsonFields(results);
    fetchRelations(db, table, results, relations);
    res.json(results);
  } catch(err) { console.error('GET error:',err.message); res.status(500).json({ message:err.message }); }
});

app.post('/api/:table', resolveDb, (req, res) => {
  try {
    const db = req.db;
    const table = req.params.table;
    let items = Array.isArray(req.body) ? req.body : [req.body];
    if (!items.length) return res.json([]);
    if (table==='vendas') {
      try {
        const row = db.prepare(`SELECT COALESCE(MAX(numero_venda),0) as mx FROM "vendas"`).get();
        let n = (row?row.mx:0)+1;
        for (const item of items) { if (!item.numero_venda) item.numero_venda=n++; }
      } catch(e) {}
    }
    if (table==='bags') {
      try {
        const row = db.prepare(`SELECT COALESCE(MAX(numero_bag),0) as mx FROM "bags"`).get();
        let n = (row?row.mx:0)+1;
        for (const item of items) { if (!item.numero_bag) item.numero_bag=n++; }
      } catch(e) {}
    }
    if (table==='fornecedores') {
      for (const item of items) { if (item.razao_social&&!item.nome) item.nome=item.razao_social; }
    }
    const keys = Object.keys(items[0]);
    const placeholders = keys.map(()=>'?').join(',');
    const insertSql = `INSERT INTO "${table}" (${keys.map(k=>`"${k}"`).join(',')}) VALUES (${placeholders})`;
    const stmt = db.prepare(insertSql);
    const results = [];
    db.transaction(rows => {
      for (const row of rows) {
        const values = keys.map(k=>toSQLiteValue(row[k]));
        const info = stmt.run(values);
        try { const ins=db.prepare(`SELECT * FROM "${table}" WHERE rowid=?`).get(info.lastInsertRowid); if(ins){parseJsonFields([ins]);results.push(ins);} } catch(e){}
      }
    })(items);
    const finalResult = Array.isArray(req.body)?results:(results[0]||{});
    res.json(finalResult);

    // Dispara notificações IA assíncronamente (não bloqueia a resposta)
    if (results.length && req.gestor) {
      const slug = req.gestor.slug;
      setImmediate(() => {
        try {
          if (table === 'vendas') {
            const v = results[0];
            dispararNotificacaoIA(slug, 'nova_venda', {
              id: v.id || v.numero_venda,
              total: v.total,
              forma: v.forma_pagamento,
              cliente: v.cliente_id
            });
          } else if (table === 'clientes') {
            dispararNotificacaoIA(slug, 'novo_cliente', {
              nome: results[0].nome,
              telefone: results[0].telefone
            });
          }
        } catch(e) {}
      });
    }
  } catch(err) { console.error('POST error:',err.message); res.status(500).json({ message:err.message }); }
});

app.patch('/api/:table', resolveDb, (req, res) => {
  try {
    const db = req.db;
    const table = req.params.table;
    if (table==='fornecedores'&&req.body.razao_social&&!req.body.nome) req.body.nome=req.body.razao_social;
    const setClauses=[], setParams=[];
    for (const [k,v] of Object.entries(req.body)) { setClauses.push(`"${k}"=?`); setParams.push(toSQLiteValue(v)); }
    const { where, params: whereParams } = buildWhere(req.query);
    const info = db.prepare(`UPDATE "${table}" SET ${setClauses.join(',')} ${where}`).run(...setParams,...whereParams);
    if (info.changes>0) {
      try { const sel=db.prepare(`SELECT * FROM "${table}" ${where} LIMIT 1`).get(...whereParams); if(sel)parseJsonFields([sel]); return res.json(sel||{}); } catch(e){}
    }
    res.json({});
  } catch(err) { console.error('PATCH error:',err.message); res.status(500).json({ message:err.message }); }
});

app.delete('/api/:table', resolveDb, (req, res) => {
  try {
    const db = req.db;
    const { where, params } = buildWhere(req.query);
    if (!where) return res.status(400).json({ message:'DELETE sem filtro bloqueado' });
    db.prepare(`DELETE FROM "${req.params.table}" ${where}`).run(...params);
    res.status(204).send();
  } catch(err) { console.error('DELETE error:',err.message); res.status(500).json({ message:err.message }); }
});

app.post('/api/rpc/:fn', resolveDb, (req, res) => {
  const db = req.db;
  const fn = req.params.fn;
  
  if (fn === 'repairBirthdays') {
    try {
      // Popula dia/mês a partir de data_nascimento (para clientes importados antes das colunas existirem)
      const r1 = db.prepare(`UPDATE clientes SET
        dia_nascimento = CAST(strftime('%d', data_nascimento) AS INTEGER),
        mes_nascimento = CAST(strftime('%m', data_nascimento) AS INTEGER)
        WHERE data_nascimento IS NOT NULL AND data_nascimento != ''
          AND (dia_nascimento IS NULL OR dia_nascimento = 0)
          AND (mes_nascimento IS NULL OR mes_nascimento = 0)`).run();
      
      // Popula data_nascimento a partir de dia/mês (para clientes que tinham só dia/mês)
      const r2 = db.prepare(`UPDATE clientes SET
        data_nascimento = '2000-' || printf('%02d', mes_nascimento) || '-' || printf('%02d', dia_nascimento)
        WHERE dia_nascimento IS NOT NULL AND dia_nascimento > 0
          AND mes_nascimento IS NOT NULL AND mes_nascimento > 0
          AND (data_nascimento IS NULL OR data_nascimento = '')`).run();
      
      // Conta clientes com aniversário agora
      const total = db.prepare(`SELECT COUNT(*) as n FROM clientes WHERE dia_nascimento > 0 AND mes_nascimento > 0`).get();
      
      return res.json({ ok: true, from_data_niver: r1.changes, from_dia_mes: r2.changes, total_com_aniversario: total.n });
    } catch(e) {
      return res.status(500).json({ message: e.message });
    }
  }
  
  console.log('RPC:', fn, req.body);
  res.json({});
});

// Rota admin para reparar aniversários em todos os tenants
app.post('/api/admin/repair-birthdays', adminAuth, (req, res) => {
  try {
    const results = [];
    const gestores = adminDb.prepare('SELECT slug FROM gestores WHERE ativo=1').all();
    
    for (const g of gestores) {
      const db = getTenantDb(g.slug);
      try {
        const r1 = db.prepare(`UPDATE clientes SET
          dia_nascimento = CAST(strftime('%d', data_nascimento) AS INTEGER),
          mes_nascimento = CAST(strftime('%m', data_nascimento) AS INTEGER)
          WHERE data_nascimento IS NOT NULL AND data_nascimento != ''
            AND (dia_nascimento IS NULL OR dia_nascimento = 0)
            AND (mes_nascimento IS NULL OR mes_nascimento = 0)`).run();
        const r2 = db.prepare(`UPDATE clientes SET
          data_nascimento = '2000-' || printf('%02d', mes_nascimento) || '-' || printf('%02d', dia_nascimento)
          WHERE dia_nascimento IS NOT NULL AND dia_nascimento > 0
            AND mes_nascimento IS NOT NULL AND mes_nascimento > 0
            AND (data_nascimento IS NULL OR data_nascimento = '')`).run();
        results.push({ slug: g.slug, r1: r1.changes, r2: r2.changes });
      } catch(e) { results.push({ slug: g.slug, error: e.message }); }
    }
    
    // Também faz no banco legado
    try {
      const r1 = legacyDb.prepare(`UPDATE clientes SET
        dia_nascimento = CAST(strftime('%d', data_nascimento) AS INTEGER),
        mes_nascimento = CAST(strftime('%m', data_nascimento) AS INTEGER)
        WHERE data_nascimento IS NOT NULL AND data_nascimento != ''
          AND (dia_nascimento IS NULL OR dia_nascimento = 0)
          AND (mes_nascimento IS NULL OR mes_nascimento = 0)`).run();
      const r2 = legacyDb.prepare(`UPDATE clientes SET
        data_nascimento = '2000-' || printf('%02d', mes_nascimento) || '-' || printf('%02d', dia_nascimento)
        WHERE dia_nascimento IS NOT NULL AND dia_nascimento > 0
          AND mes_nascimento IS NOT NULL AND mes_nascimento > 0
          AND (data_nascimento IS NULL OR data_nascimento = '')`).run();
      results.push({ slug: 'legacy', r1: r1.changes, r2: r2.changes });
    } catch(e) { results.push({ slug: 'legacy', error: e.message }); }
    
    res.json({ ok: true, results });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`StoreOS Multi-Tenant rodando na porta ${PORT}`));

// =============================================
// JOB: Atualizar parcelas vencidas para "atrasada"
// Roda 1x ao iniciar e depois a cada hora
// =============================================
function marcarParcelasAtrasadas(db) {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    // Marcar parcelas pendentes vencidas como atrasadas
    const r1 = db.prepare(`
      UPDATE crediario_parcelas
      SET status = 'atrasada'
      WHERE status = 'pendente'
        AND vencimento < ?
    `).run(hoje);
    // Atualizar status do crediário pai para atrasado
    db.prepare(`
      UPDATE crediario SET status = 'atrasado'
      WHERE id IN (
        SELECT DISTINCT crediario_id FROM crediario_parcelas WHERE status = 'atrasada'
      ) AND status = 'aberto'
    `).run();
    if(r1.changes > 0) console.log(`[Crediário] ${r1.changes} parcela(s) marcada(s) como atrasada`);
  } catch(e) { console.error('[Crediário job]', e.message); }
}

// Roda ao iniciar
setTimeout(() => {
  marcarParcelasAtrasadas(legacyDb);
  for(const g of adminDb.prepare('SELECT slug FROM gestores WHERE ativo=1').all()) {
    try { marcarParcelasAtrasadas(getTenantDb(g.slug)); } catch(e){}
  }
}, 2000);

// Roda a cada hora
setInterval(() => {
  marcarParcelasAtrasadas(legacyDb);
  for(const g of adminDb.prepare('SELECT slug FROM gestores WHERE ativo=1').all()) {
    try { marcarParcelasAtrasadas(getTenantDb(g.slug)); } catch(e){}
  }
}, 3600000);

// =============================================
// IA — ADMIN GLOBAL CONFIG
// =============================================
function iaConfigGet(key) {
  const r = adminDb.prepare('SELECT valor FROM ia_global_config WHERE chave=?').get(key);
  return r ? r.valor : null;
}
function iaConfigSet(key, val) {
  adminDb.prepare('INSERT INTO ia_global_config (chave,valor,updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor,updated_at=CURRENT_TIMESTAMP').run(key, val);
}

app.get('/api/admin/ia-config', adminAuth, (req, res) => {
  res.json({
    openai_key:   iaConfigGet('openai_key')    || '',
    evo_url:      iaConfigGet('evo_url')        || '',
    evo_key:      iaConfigGet('evo_key')        || '',
    evo_instance: iaConfigGet('evo_instance')   || ''
  });
});

app.post('/api/admin/ia-config', adminAuth, (req, res) => {
  const { openai_key, evo_url, evo_key, evo_instance } = req.body;
  if (openai_key   !== undefined) iaConfigSet('openai_key',   openai_key);
  if (evo_url      !== undefined) iaConfigSet('evo_url',      evo_url);
  if (evo_key      !== undefined) iaConfigSet('evo_key',      evo_key);
  if (evo_instance !== undefined) iaConfigSet('evo_instance', evo_instance);
  res.json({ ok: true });
});

app.patch('/api/admin/gestores/:id/ia', adminAuth, (req, res) => {
  const { ia_enabled } = req.body;
  adminDb.prepare('UPDATE gestores SET ia_enabled=? WHERE id=?').run(ia_enabled ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/ia-whatsapp-status', adminAuth, async (req, res) => {
  try {
    const evo_url = iaConfigGet('evo_url'), evo_key = iaConfigGet('evo_key'), evo_inst = iaConfigGet('evo_instance');
    if (!evo_url || !evo_key || !evo_inst) return res.json({ connected: false, reason: 'Não configurado' });
    const r = await fetch(`${evo_url}/instance/connectionState/${evo_inst}`, { headers: { 'apikey': evo_key } });
    const d = await r.json();
    res.json({ connected: d?.instance?.state === 'open', state: d?.instance?.state });
  } catch(e) { res.json({ connected: false, reason: e.message }); }
});

// =============================================
// IA — TENANT CONFIG
// =============================================
function ensureIaConfigTable(db) {
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS ia_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chave TEXT NOT NULL,
      valor TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    // Garante que não há duplicatas antes de criar o índice único
    db.exec(`DELETE FROM ia_config WHERE id NOT IN (
      SELECT MIN(id) FROM ia_config GROUP BY chave
    )`);
    try { db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ia_config_chave ON ia_config(chave)`); } catch(e){}
  } catch(e){}
}

function tenantIaGet(db, key) {
  try {
    ensureIaConfigTable(db);
    const r = db.prepare('SELECT valor FROM ia_config WHERE chave=?').get(key);
    return r ? r.valor : null;
  } catch(e) {
    console.error('[tenantIaGet] erro:', e.message);
    return null;
  }
}

function tenantIaSet(db, key, val) {
  try {
    ensureIaConfigTable(db);
    // SELECT + UPDATE/INSERT — não depende de constraint UNIQUE
    const exists = db.prepare('SELECT id FROM ia_config WHERE chave=?').get(key);
    if (exists) {
      db.prepare('UPDATE ia_config SET valor=?, updated_at=CURRENT_TIMESTAMP WHERE chave=?').run(val, key);
    } else {
      db.prepare('INSERT INTO ia_config (chave, valor) VALUES (?, ?)').run(key, val);
    }
  } catch(e) {
    console.error('[tenantIaSet] erro ao salvar chave', key, ':', e.message);
  }
}

app.get('/api/ia/config', resolveDb, (req, res) => {
  try {
    const db = req.db;
    ensureIaConfigTable(db);
    res.json({
      numero:              tenantIaGet(db,'numero')              || '',
      evo_url:             tenantIaGet(db,'evo_url')             || '',
      evo_key:             tenantIaGet(db,'evo_key')             || '',
      evo_instance:        tenantIaGet(db,'evo_instance')        || '',
      notify_nova_venda:   tenantIaGet(db,'notify_nova_venda')   ?? '1',
      notify_estoque:      tenantIaGet(db,'notify_estoque')      ?? '1',
      notify_novo_cliente: tenantIaGet(db,'notify_novo_cliente') ?? '1',
      notify_relatorio:    tenantIaGet(db,'notify_relatorio')    ?? '0',
      relatorio_horario:   tenantIaGet(db,'relatorio_horario')   || '08:00',
      relatorio_periodo:   tenantIaGet(db,'relatorio_periodo')   || 'diario',
      ia_enabled:          tenantIaGet(db,'ia_enabled')          ?? '0'
    });
  } catch(e) {
    console.error('[IA Config GET] Erro:', e.message);
    res.status(500).json({ message: e.message });
  }
});

// /api/ia/config POST → movido para seção de features abaixo

app.get('/api/ia/resumo', resolveDb, (req, res) => {
  try {
    const db = req.db;
    const hoje = new Date().toISOString().slice(0,10);
    const semana = new Date(Date.now()-7*86400000).toISOString().slice(0,10);
    const mes = new Date().toISOString().slice(0,7);
    const vendas_hoje   = db.prepare(`SELECT COUNT(*) as c,COALESCE(SUM(total),0) as t FROM vendas WHERE DATE(created_at)=? AND status!='cancelada'`).get(hoje);
    const vendas_semana = db.prepare(`SELECT COUNT(*) as c,COALESCE(SUM(total),0) as t FROM vendas WHERE DATE(created_at)>=? AND status!='cancelada'`).get(semana);
    const vendas_mes    = db.prepare(`SELECT COUNT(*) as c,COALESCE(SUM(total),0) as t FROM vendas WHERE strftime('%Y-%m',created_at)=? AND status!='cancelada'`).get(mes);
    const estoque_baixo = db.prepare(`SELECT COUNT(*) as c FROM produto_grades pg JOIN produtos p ON p.id=pg.produto_id WHERE pg.estoque<=3 AND pg.estoque>=0 AND p.ativo=1`).get();
    const clientes_mes  = db.prepare(`SELECT COUNT(*) as c FROM clientes WHERE strftime('%Y-%m',created_at)=?`).get(mes);
    const ticket_medio  = db.prepare(`SELECT COALESCE(AVG(total),0) as t FROM vendas WHERE DATE(created_at)=? AND status!='cancelada'`).get(hoje);
    res.json({ vendas_hoje:{qtd:vendas_hoje.c,total:vendas_hoje.t}, vendas_semana:{qtd:vendas_semana.c,total:vendas_semana.t}, vendas_mes:{qtd:vendas_mes.c,total:vendas_mes.t}, estoque_baixo:estoque_baixo.c, clientes_mes:clientes_mes.c, ticket_medio:ticket_medio.t });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// SSE — notificações tempo real
const iaClients = new Map();
app.get('/api/ia/sse', resolveDb, (req, res) => {
  const slug = req.headers['x-slug'] || req.query.slug || '';
  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.flushHeaders();
  if (!iaClients.has(slug)) iaClients.set(slug, new Set());
  iaClients.get(slug).add(res);
  const ping = setInterval(()=>res.write(': ping\n\n'),25000);
  req.on('close',()=>{ clearInterval(ping); iaClients.get(slug)?.delete(res); });
});

function emitIAEvent(slug, type, data) {
  const clients = iaClients.get(slug);
  if (!clients?.size) return;
  const payload = JSON.stringify({ type, data, ts: Date.now() });
  for (const r of clients) { try { r.write(`data: ${payload}\n\n`); } catch(e){} }
}
app._emitIAEvent = emitIAEvent;

// Chat IA (conversa via WhatsApp com número cadastrado)

// =============================================
// =============================================
// IA — WEBHOOK GLOBAL SIMPLES
// Uma instância Evolution → um webhook → identifica
// o cliente pelo número que ele salvou no sistema.
// =============================================

// Normaliza número WhatsApp
function cleanNum(n) {
  if (!n) return '';
  return String(n).replace(/\D/g,'').split('@')[0].split(':')[0];
}

// Compara números com tolerância (com/sem código do país)
function numMatch(a, b) {
  const ca = cleanNum(a), cb = cleanNum(b);
  if (!ca || !cb) return false;
  return ca === cb || ca.slice(-11) === cb.slice(-11) || ca.slice(-8) === cb.slice(-8);
}

// Acha qual tenant tem esse número cadastrado
function tenantPorNumero(numero) {
  const gestores = adminDb.prepare(`SELECT slug, nome FROM gestores WHERE ativo=1 AND ia_enabled=1`).all();
  for (const g of gestores) {
    try {
      const db  = getTenantDb(g.slug);
      const row = db.prepare(`SELECT valor FROM ia_config WHERE chave='numero'`).get();
      if (row?.valor && numMatch(row.valor, numero)) return { ...g, db };
    } catch(e) {}
  }
  return null;
}

// Busca histórico de conversa
function getHistorico(db, numero) {
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS ia_conversas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT, role TEXT, content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    return db.prepare(`SELECT role,content FROM ia_conversas WHERE numero=? ORDER BY created_at DESC LIMIT 10`).all(numero).reverse();
  } catch(e) { return []; }
}

function salvarMsg(db, numero, role, content) {
  try {
    db.prepare(`INSERT INTO ia_conversas (numero,role,content) VALUES (?,?,?)`).run(numero, role, content);
    db.prepare(`DELETE FROM ia_conversas WHERE numero=? AND id NOT IN (SELECT id FROM ia_conversas WHERE numero=? ORDER BY created_at DESC LIMIT 50)`).run(numero, numero);
  } catch(e) {}
}

// Coleta dados da loja para o GPT
function dadosDaLoja(db, nome) {
  try {
    const hoje   = new Date().toISOString().slice(0,10);
    const semana = new Date(Date.now()-7*86400000).toISOString().slice(0,10);
    const mes    = new Date().toISOString().slice(0,7);
    const R = v => 'R$ '+Number(v||0).toFixed(2);

    // Vendas
    const vH  = db.prepare(`SELECT COUNT(*) c,COALESCE(SUM(total),0) t FROM vendas WHERE DATE(created_at)=? AND status!='cancelada'`).get(hoje);
    const vS  = db.prepare(`SELECT COUNT(*) c,COALESCE(SUM(total),0) t FROM vendas WHERE DATE(created_at)>=? AND status!='cancelada'`).get(semana);
    const vM  = db.prepare(`SELECT COUNT(*) c,COALESCE(SUM(total),0) t FROM vendas WHERE strftime('%Y-%m',created_at)=? AND status!='cancelada'`).get(mes);
    const tkt = db.prepare(`SELECT COALESCE(AVG(total),0) t FROM vendas WHERE DATE(created_at)=? AND status!='cancelada'`).get(hoje);

    // Top 5 produtos mais vendidos hoje
    let topHoje = '';
    try {
      const top = db.prepare(`
        SELECT p.nome, SUM(vi.quantidade) q, SUM(vi.preco_unit*vi.quantidade) t
        FROM venda_itens vi JOIN produtos p ON p.id=vi.produto_id JOIN vendas v ON v.id=vi.venda_id
        WHERE DATE(v.created_at)=? AND v.status!='cancelada'
        GROUP BY vi.produto_id ORDER BY q DESC LIMIT 5
      `).all(hoje);
      if (top.length) topHoje = top.map(x=>`${x.nome}(${x.q}un/${R(x.t)})`).join(', ');
    } catch(e){}

    // Estoque
    const estTotal  = db.prepare(`SELECT COUNT(*) c FROM produto_grades pg JOIN produtos p ON p.id=pg.produto_id WHERE p.ativo=1`).get();
    const estBaixo  = db.prepare(`SELECT COUNT(*) c FROM produto_grades pg JOIN produtos p ON p.id=pg.produto_id WHERE pg.estoque<=3 AND pg.estoque>0 AND p.ativo=1`).get();
    const estZerado = db.prepare(`SELECT COUNT(*) c FROM produto_grades pg JOIN produtos p ON p.id=pg.produto_id WHERE pg.estoque=0 AND p.ativo=1`).get();

    // Top 5 produtos com estoque crítico
    let estCritico = '';
    try {
      const crit = db.prepare(`
        SELECT p.nome, p.codigo, pg.tamanho, pg.estoque
        FROM produto_grades pg JOIN produtos p ON p.id=pg.produto_id
        WHERE pg.estoque<=3 AND p.ativo=1
        ORDER BY pg.estoque ASC LIMIT 5
      `).all();
      if (crit.length) estCritico = crit.map(x=>`${x.nome} tam:${x.tamanho||'-'} qtd:${x.estoque}`).join('; ');
    } catch(e){}

    // Clientes
    const cliTotal = db.prepare(`SELECT COUNT(*) c FROM clientes`).get();
    const cliMes   = db.prepare(`SELECT COUNT(*) c FROM clientes WHERE strftime('%Y-%m',created_at)=?`).get(mes);

    // Crediário em aberto
    let crediario = '';
    try {
      const cr = db.prepare(`SELECT COUNT(*) c, COALESCE(SUM(valor_parcela),0) t FROM crediario_parcelas WHERE status='pendente'`).get();
      const at = db.prepare(`SELECT COUNT(*) c, COALESCE(SUM(valor_parcela),0) t FROM crediario_parcelas WHERE status='atrasada'`).get();
      crediario = `${cr.c} parcelas pendentes (${R(cr.t)}), ${at.c} atrasadas (${R(at.t)})`;
    } catch(e){}

    // Produtos cadastrados
    const prodTotal = db.prepare(`SELECT COUNT(*) c FROM produtos WHERE ativo=1`).get();

    return `=== DADOS DA LOJA "${nome}" ===
VENDAS:
- Hoje: ${vH.c} vendas | Faturamento: ${R(vH.t)} | Ticket médio: ${R(tkt.t)}
- Semana: ${vS.c} vendas | ${R(vS.t)}
- Mês: ${vM.c} vendas | ${R(vM.t)}
${topHoje ? '- Mais vendidos hoje: '+topHoje : ''}

ESTOQUE:
- Total de variantes: ${estTotal.c} | Produtos ativos: ${prodTotal.c}
- Estoque baixo (≤3): ${estBaixo.c} itens | Zerado: ${estZerado.c} itens
${estCritico ? '- Críticos: '+estCritico : ''}

CLIENTES:
- Total: ${cliTotal.c} | Novos este mês: ${cliMes.c}

CREDIÁRIO:
- ${crediario || 'sem dados'}`;
  } catch(e) {
    console.error('[IA] dadosDaLoja erro:', e.message);
    return `Loja: ${nome}`;
  }
}

// Executa ações via IA (alterar estoque, buscar produto, etc.)
async function executarAcaoIA(db, acao, params) {
  const resultados = [];
  try {
    if (acao === 'buscar_produto') {
      const termo = params.termo || '';
      const rows = db.prepare(`
        SELECT p.id, p.nome, p.codigo, p.preco_venda,
               SUM(pg.estoque) as estoque_total,
               COUNT(pg.id) as variantes
        FROM produtos p LEFT JOIN produto_grades pg ON pg.produto_id=p.id
        WHERE p.ativo=1 AND (LOWER(p.nome) LIKE ? OR p.codigo LIKE ?)
        GROUP BY p.id ORDER BY p.nome LIMIT 10
      `).all(`%${termo.toLowerCase()}%`, `%${termo}%`);
      return rows.map(r => `${r.nome} | Cód: ${r.codigo||'-'} | Preço: R$${Number(r.preco_venda||0).toFixed(2)} | Estoque: ${r.estoque_total||0}un (${r.variantes} variantes)`).join('\n');
    }

    if (acao === 'ver_estoque_produto') {
      const termo = params.produto || '';
      const rows = db.prepare(`
        SELECT p.nome, pg.tamanho, pg.cor_descricao, pg.estoque, pg.preco_venda, pg.ean
        FROM produto_grades pg JOIN produtos p ON p.id=pg.produto_id
        WHERE p.ativo=1 AND (LOWER(p.nome) LIKE ? OR p.codigo LIKE ?)
        ORDER BY p.nome, pg.tamanho LIMIT 20
      `).all(`%${termo.toLowerCase()}%`, `%${termo}%`);
      if (!rows.length) return 'Produto não encontrado.';
      const nome = rows[0].nome;
      const grades = rows.map(r => `  Tam: ${r.tamanho||'-'} | Cor: ${r.cor_descricao||'-'} | Estoque: ${r.estoque} | Preço: R$${Number(r.preco_venda||0).toFixed(2)}`).join('\n');
      return `Estoque de "${nome}":
${grades}`;
    }

    if (acao === 'alterar_estoque') {
      const produto = params.produto || '';
      const tamanho = params.tamanho || '';
      const qtd     = parseInt(params.quantidade);
      const tipo    = params.tipo || 'definir'; // 'definir', 'adicionar', 'subtrair'
      if (isNaN(qtd)) return 'Quantidade inválida.';

      const grade = db.prepare(`
        SELECT pg.id, pg.estoque, p.nome, pg.tamanho
        FROM produto_grades pg JOIN produtos p ON p.id=pg.produto_id
        WHERE p.ativo=1 AND LOWER(p.nome) LIKE ?
        ${tamanho ? "AND (pg.tamanho=? OR LOWER(pg.tamanho) LIKE ?)" : ""}
        LIMIT 1
      `).get(...(tamanho ? [`%${produto.toLowerCase()}%`, tamanho, `%${tamanho.toLowerCase()}%`] : [`%${produto.toLowerCase()}%`]));

      if (!grade) return `Produto "${produto}"${tamanho?' tamanho '+tamanho:''} não encontrado.`;

      let novoEstoque;
      if (tipo === 'adicionar') novoEstoque = grade.estoque + qtd;
      else if (tipo === 'subtrair') novoEstoque = Math.max(0, grade.estoque - qtd);
      else novoEstoque = qtd;

      db.prepare(`UPDATE produto_grades SET estoque=? WHERE id=?`).run(novoEstoque, grade.id);
      return `✅ Estoque de "${grade.nome}" (tam: ${grade.tamanho||'-'}) atualizado: ${grade.estoque} → ${novoEstoque}`;
    }

    if (acao === 'listar_clientes') {
      const rows = db.prepare(`SELECT nome, telefone, email, created_at FROM clientes ORDER BY created_at DESC LIMIT 10`).all();
      return rows.map(r => `${r.nome} | Tel: ${r.telefone||'-'} | ${new Date(r.created_at).toLocaleDateString('pt-BR')}`).join('\n');
    }

    if (acao === 'ultimas_vendas') {
      const rows = db.prepare(`
        SELECT v.id, v.total, v.forma_pagamento, v.created_at, c.nome as cliente
        FROM vendas v LEFT JOIN clientes c ON c.id=v.cliente_id
        WHERE v.status!='cancelada' ORDER BY v.created_at DESC LIMIT 10
      `).all();
      return rows.map(r => `Venda #${r.id} | ${r.cliente||'Avulso'} | R$${Number(r.total).toFixed(2)} | ${r.forma_pagamento||'-'} | ${new Date(r.created_at).toLocaleDateString('pt-BR')}`).join('\n');
    }

  } catch(e) {
    return `Erro ao executar ação: ${e.message}`;
  }
  return 'Ação não reconhecida.';
}

// Envia mensagem pelo WhatsApp global
async function enviarMsg(numero, texto) {
  const url  = iaConfigGet('evo_url');
  const key  = iaConfigGet('evo_key');
  const inst = iaConfigGet('evo_instance');
  if (!url || !key || !inst) throw new Error('Evolution API não configurada no painel admin');
  let num = cleanNum(numero);
  if (num.length <= 11) num = '55' + num;
  const r = await fetch(`${url}/message/sendText/${inst}`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'apikey': key },
    body: JSON.stringify({ number: num, text: texto })
  });
  if (!r.ok) { const e = await r.text(); throw new Error(`Evolution ${r.status}: ${e.slice(0,100)}`); }
  return r.json();
}

// ─────────────────────────────────────
// POST /api/ia/webhook  — recebe tudo
// Configure esse URL na Evolution API
// ─────────────────────────────────────
app.post('/api/ia/webhook', async (req, res) => {
  res.status(200).json({ ok: true }); // responde rápido para Evolution não retentar

  try {
    const body  = req.body;
    const event = body.event || body.type || '';

    // Só processa mensagens recebidas
    if (!['messages.upsert','MESSAGES_UPSERT'].includes(event)) return;

    // Extrai dados da mensagem (Evolution v2)
    const data = body.data || body;
    const key  = data.key || {};

    if (key.fromMe)                        return; // bot falando — ignora
    if ((key.remoteJid||'').includes('@g')) return; // grupo — ignora

    const jid      = key.remoteJid || '';
    const remetente = cleanNum(jid);
    if (!remetente) return;

    // Extrai texto
    const mc    = data.message || {};
    const texto = (mc.conversation || mc.extendedTextMessage?.text || mc.imageMessage?.caption || '').trim();
    if (!texto) return;

    console.log(`[IA] Mensagem de ${remetente}: "${texto.slice(0,50)}"`);

    // Acha o tenant pelo número
    const tenant = tenantPorNumero(remetente);
    if (!tenant) {
      console.log(`[IA] Número ${remetente} não cadastrado em nenhuma loja`);
      return;
    }
    console.log(`[IA] Tenant: ${tenant.slug} (${tenant.nome})`);

    const openai_key = iaConfigGet('openai_key');
    if (!openai_key) { console.log('[IA] OpenAI key não configurada'); return; }

    const historico = getHistorico(tenant.db, remetente);
    const dados     = dadosDaLoja(tenant.db, tenant.nome);

    const systemPrompt = `Você é o assistente de IA do ModaFlow para a loja "${tenant.nome}".
Responda SEMPRE em português, de forma curta e objetiva (mensagem de WhatsApp).
Você tem acesso completo aos dados e pode executar ações na loja.

AÇÕES DISPONÍVEIS — use as tools quando o cliente pedir:
- buscar_produto: busca produtos por nome ou código
- ver_estoque_produto: mostra estoque detalhado por tamanho/cor
- alterar_estoque: altera quantidade em estoque (definir/adicionar/subtrair)
- listar_clientes: lista clientes recentes
- ultimas_vendas: mostra últimas vendas

${dados}

REGRAS:
- Para alterar estoque, confirme com o cliente antes de executar se não ficou claro
- Respostas curtas — máx 300 palavras
- Nunca mencione outras lojas`;

    const tools = [
      {
        type: 'function',
        function: {
          name: 'executar_acao',
          description: 'Executa uma ação na loja: buscar produto, ver estoque, alterar estoque, listar clientes, ver vendas',
          parameters: {
            type: 'object',
            properties: {
              acao: {
                type: 'string',
                enum: ['buscar_produto','ver_estoque_produto','alterar_estoque','listar_clientes','ultimas_vendas'],
                description: 'Qual ação executar'
              },
              produto:    { type:'string', description:'Nome ou código do produto' },
              termo:      { type:'string', description:'Termo de busca' },
              tamanho:    { type:'string', description:'Tamanho do produto (P, M, G, 38, etc)' },
              quantidade: { type:'number', description:'Quantidade para alterar' },
              tipo:       { type:'string', enum:['definir','adicionar','subtrair'], description:'Como alterar o estoque' }
            },
            required: ['acao']
          }
        }
      }
    ];

    const messages = [
      { role:'system', content: systemPrompt },
      ...historico.map(h => ({ role:h.role, content:h.content })),
      { role:'user', content: texto }
    ];

    salvarMsg(tenant.db, remetente, 'user', texto);

    // Primeira chamada ao GPT
    const gpt = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${openai_key}` },
      body: JSON.stringify({ model:'gpt-4o-mini', max_tokens:800, temperature:0.4, messages, tools, tool_choice:'auto' }),
      signal: AbortSignal.timeout(30000)
    });
    const gptData = await gpt.json();
    if (gptData.error) { console.error('[IA] GPT erro:', gptData.error.message); return; }

    const choice   = gptData.choices?.[0];
    const msgGpt   = choice?.message;

    let resposta = '';

    // Se GPT quer executar uma ação
    if (choice?.finish_reason === 'tool_calls' && msgGpt?.tool_calls?.length) {
      const toolCall = msgGpt.tool_calls[0];
      const params   = JSON.parse(toolCall.function.arguments || '{}');
      console.log(`[IA] Ação: ${params.acao}`, params);

      const resultado = await executarAcaoIA(tenant.db, params.acao, params);
      console.log(`[IA] Resultado: ${resultado.slice(0,100)}`);

      // Segunda chamada com resultado da ação
      const messages2 = [
        ...messages,
        { role:'assistant', content: null, tool_calls: msgGpt.tool_calls },
        { role:'tool', tool_call_id: toolCall.id, content: resultado }
      ];

      const gpt2 = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${openai_key}` },
        body: JSON.stringify({ model:'gpt-4o-mini', max_tokens:500, temperature:0.4, messages: messages2 }),
        signal: AbortSignal.timeout(30000)
      });
      const gptData2 = await gpt2.json();
      resposta = gptData2.choices?.[0]?.message?.content?.trim() || resultado;
    } else {
      resposta = msgGpt?.content?.trim();
    }

    if (!resposta) return;

    salvarMsg(tenant.db, remetente, 'assistant', resposta);
    await enviarMsg(remetente, resposta);

    console.log(`[IA] Respondido para ${remetente} (${tenant.slug})`);

    // Notifica painel via SSE
    emitIAEvent(tenant.slug, 'mensagem_ia', { mensagem: `🤖 "${resposta.slice(0,60)}"`, numero: remetente });

  } catch(e) {
    console.error('[IA] Erro:', e.message);
  }
});

// Teste: GET retorna ok (para verificar se URL está acessível)
app.get('/api/ia/webhook', (req, res) => {
  res.json({ ok: true, status: 'ModaFlow IA webhook ativo' });
});

// Enviar mensagem manual (painel do cliente → WhatsApp)
app.post('/api/ia/send-whatsapp', resolveDb, async (req, res) => {
  try {
    const { numero, mensagem } = req.body;
    await enviarMsg(numero, mensagem);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Histórico de conversa do tenant
app.get('/api/ia/historico', resolveDb, (req, res) => {
  try {
    const db  = req.db;
    const num = cleanNum(tenantIaGet(db,'numero') || '');
    if (!num) return res.json([]);
    const msgs = db.prepare(`SELECT role,content,created_at FROM ia_conversas WHERE numero=? ORDER BY created_at DESC LIMIT 30`).all(num).reverse();
    res.json(msgs);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/ia/historico', resolveDb, (req, res) => {
  try {
    const num = cleanNum(tenantIaGet(req.db,'numero') || '');
    if (num) req.db.prepare(`DELETE FROM ia_conversas WHERE numero=?`).run(num);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Log em memória para diagnóstico
const _iaLogs = [];
const _origLog = console.log.bind(console);
const _origErr = console.error.bind(console);
console.log = (...a) => { _origLog(...a); const l=a.join(' '); if(l.includes('[IA]')){ _iaLogs.push({ts:Date.now(),line:l}); if(_iaLogs.length>100)_iaLogs.shift(); }};
console.error = (...a) => { _origErr(...a); const l='[ERR] '+a.join(' '); if(l.includes('IA')){ _iaLogs.push({ts:Date.now(),line:l}); if(_iaLogs.length>100)_iaLogs.shift(); }};

app.get('/api/ia/webhook-log', adminAuth, (req, res) => {
  res.json(_iaLogs.slice(-50).reverse());
});

// =============================================
// IA — NOTIFICAÇÕES AUTOMÁTICAS
// =============================================

// Verifica se está no horário permitido
function dentroDoHorario(db) {
  try {
    const inicio = tenantIaGet(db,'horario_inicio') || '00:00';
    const fim    = tenantIaGet(db,'horario_fim')    || '23:59';
    const agora  = new Date();
    const hm     = agora.getHours()*60 + agora.getMinutes();
    const [hi,mi] = inicio.split(':').map(Number);
    const [hf,mf] = fim.split(':').map(Number);
    const start = hi*60+mi, end = hf*60+mf;
    return hm >= start && hm <= end;
  } catch(e) { return true; }
}

// Registra ação da IA no log de auditoria
function logAcaoIA(db, tipo, descricao, dados) {
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS ia_log_acoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT, descricao TEXT, dados TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    db.prepare(`INSERT INTO ia_log_acoes (tipo,descricao,dados) VALUES (?,?,?)`)
      .run(tipo, descricao, JSON.stringify(dados||{}));
  } catch(e) {}
}

// Dispara notificação WhatsApp para o tenant
async function dispararNotificacaoIA(slug, tipo, dados) {
  try {
    const db     = getTenantDb(slug);
    const iaOn   = tenantIaGet(db,'ia_enabled') === '1';
    const numero = cleanNum(tenantIaGet(db,'numero') || '');
    if (!iaOn || !numero) return;

    // Verifica horário
    if (!dentroDoHorario(db)) return;

    // Verifica preferências
    const prefs = {
      nova_venda:   tenantIaGet(db,'notify_nova_venda')   !== '0',
      novo_cliente: tenantIaGet(db,'notify_novo_cliente') !== '0',
      estoque:      tenantIaGet(db,'notify_estoque')      !== '0',
    };
    if (!prefs[tipo]) return;

    const R = v => 'R$ '+Number(v||0).toFixed(2);
    let msg = '';

    if (tipo === 'nova_venda') {
      let clienteNome = 'Cliente avulso';
      if (dados.cliente) {
        try { const c = db.prepare(`SELECT nome FROM clientes WHERE id=?`).get(dados.cliente); if(c) clienteNome=c.nome; } catch(e){}
      }
      msg = `🛍️ *Nova venda registrada!*\n\n💰 Valor: *${R(dados.total)}*\n👤 Cliente: ${clienteNome}\n💳 Pagamento: ${dados.forma||'—'}\n\n_${new Date().toLocaleString('pt-BR')}_`;
    } else if (tipo === 'novo_cliente') {
      msg = `👤 *Novo cliente cadastrado!*\n\n📛 Nome: *${dados.nome}*\n📱 Tel: ${dados.telefone||'—'}\n\n_${new Date().toLocaleString('pt-BR')}_`;
    } else if (tipo === 'estoque') {
      msg = `⚠️ *Alerta de estoque baixo!*\n\n${dados.itens}\n\n_${new Date().toLocaleString('pt-BR')}_`;
    }

    if (!msg) return;

    await enviarMsg(numero, msg);
    logAcaoIA(db, 'notificacao', tipo, dados);
    console.log(`[IA Notif] ${slug} → ${tipo}`);

    // SSE para o painel
    emitIAEvent(slug, tipo, { mensagem: msg.slice(0,100), numero });
  } catch(e) {
    console.error(`[IA Notif] ${slug} erro:`, e.message);
  }
}

// Mensagem de boas-vindas quando número é salvo pela primeira vez
async function enviarBoasVindas(slug, numero) {
  try {
    const db = getTenantDb(slug);
    const g  = adminDb.prepare(`SELECT nome FROM gestores WHERE slug=?`).get(slug);
    const msg = `👋 *Olá! Sou a IA do ModaFlow!*\n\nEstou conectada à loja *${g?.nome||slug}* e pronta para te ajudar.\n\n📊 *O que posso fazer:*\n• Responder sobre vendas e faturamento\n• Verificar e alterar estoque\n• Buscar produtos e clientes\n• Enviar relatórios\n• Alertar sobre estoque baixo e novas vendas\n\n💡 *Experimente perguntar:*\n_"Quanto vendi hoje?"_\n_"Qual o estoque da camisa M?"_\n_"Adiciona 5 no estoque da calça 38"_\n\n_ModaFlow IA_ 🤖`;
    await enviarMsg(numero, msg);
    logAcaoIA(db, 'boas_vindas', 'Mensagem de boas-vindas enviada', { numero });
    console.log(`[IA] Boas-vindas enviadas para ${slug}`);
  } catch(e) {
    console.error(`[IA] Boas-vindas erro:`, e.message);
  }
}

// Verifica estoque crítico periodicamente e notifica
setInterval(async () => {
  try {
    const ativos = adminDb.prepare(`SELECT slug FROM gestores WHERE ativo=1 AND ia_enabled=1`).all();
    for (const g of ativos) {
      try {
        const db    = getTenantDb(g.slug);
        const iaOn  = tenantIaGet(db,'ia_enabled') === '1';
        const notif = tenantIaGet(db,'notify_estoque') !== '0';
        if (!iaOn || !notif) continue;

        // Só verifica uma vez por hora (controle por timestamp)
        const ultimaVerif = tenantIaGet(db,'_ultima_verif_estoque');
        const agora = Date.now();
        if (ultimaVerif && agora - parseInt(ultimaVerif) < 3600000) continue;
        tenantIaSet(db,'_ultima_verif_estoque', String(agora));

        const criticos = db.prepare(`
          SELECT p.nome, pg.tamanho, pg.estoque
          FROM produto_grades pg JOIN produtos p ON p.id=pg.produto_id
          WHERE pg.estoque=0 AND p.ativo=1
          ORDER BY p.nome LIMIT 5
        `).all();
        if (!criticos.length) continue;

        const itens = criticos.map(r=>`• ${r.nome} (${r.tamanho||'—'}): *zerado*`).join('\n');
        await dispararNotificacaoIA(g.slug, 'estoque', { itens });
      } catch(e) {}
    }
  } catch(e) {}
}, 3600000); // a cada 1 hora

// Relatório diário agendado
setInterval(async () => {
  try {
    const agora  = new Date();
    const horaAtual = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`;

    const ativos = adminDb.prepare(`SELECT slug FROM gestores WHERE ativo=1 AND ia_enabled=1`).all();
    for (const g of ativos) {
      try {
        const db       = getTenantDb(g.slug);
        const iaOn     = tenantIaGet(db,'ia_enabled') === '1';
        const notif    = tenantIaGet(db,'notify_relatorio') === '1';
        const horario  = tenantIaGet(db,'relatorio_horario') || '08:00';
        const periodo  = tenantIaGet(db,'relatorio_periodo') || 'diario';
        const numero   = cleanNum(tenantIaGet(db,'numero') || '');

        if (!iaOn || !notif || !numero) continue;
        if (horaAtual !== horario) continue;

        // Evita disparar duas vezes no mesmo minuto
        const ultimoEnvio = tenantIaGet(db,'_ultimo_relatorio');
        const chave = `${agora.toISOString().slice(0,16)}`;
        if (ultimoEnvio === chave) continue;
        tenantIaSet(db,'_ultimo_relatorio', chave);

        // Verifica período
        const diaSemana = agora.getDay();
        if (periodo === 'semanal' && diaSemana !== 1) continue; // só segunda
        if (periodo === 'mensal' && agora.getDate() !== 1) continue; // só dia 1

        const hoje   = new Date().toISOString().slice(0,10);
        const mes    = new Date().toISOString().slice(0,7);
        const semana = new Date(Date.now()-7*86400000).toISOString().slice(0,10);
        const R = v => 'R$ '+Number(v||0).toFixed(2);

        const vH  = db.prepare(`SELECT COUNT(*) c,COALESCE(SUM(total),0) t FROM vendas WHERE DATE(created_at)=? AND status!='cancelada'`).get(hoje);
        const vM  = db.prepare(`SELECT COUNT(*) c,COALESCE(SUM(total),0) t FROM vendas WHERE strftime('%Y-%m',created_at)=? AND status!='cancelada'`).get(mes);
        const vS  = db.prepare(`SELECT COUNT(*) c,COALESCE(SUM(total),0) t FROM vendas WHERE DATE(created_at)>=? AND status!='cancelada'`).get(semana);
        const eb  = db.prepare(`SELECT COUNT(*) c FROM produto_grades pg JOIN produtos p ON p.id=pg.produto_id WHERE pg.estoque<=3 AND p.ativo=1`).get();
        const tkt = db.prepare(`SELECT COALESCE(AVG(total),0) t FROM vendas WHERE DATE(created_at)=? AND status!='cancelada'`).get(hoje);

        const nomeGestor = adminDb.prepare(`SELECT nome FROM gestores WHERE slug=?`).get(g.slug)?.nome || g.slug;

        const msg = `📊 *Relatório ${periodo === 'diario' ? 'Diário' : periodo === 'semanal' ? 'Semanal' : 'Mensal'}*\n*${nomeGestor}* — ${new Date().toLocaleDateString('pt-BR')}\n\n🟢 *Hoje*\n• Vendas: ${vH.c} | ${R(vH.t)}\n• Ticket médio: ${R(tkt.t)}\n\n📅 *Semana*\n• ${vS.c} vendas | ${R(vS.t)}\n\n🗓️ *Mês*\n• ${vM.c} vendas | ${R(vM.t)}\n\n${eb.c > 0 ? `⚠️ ${eb.c} itens com estoque crítico` : '✅ Estoque ok'}\n\n_ModaFlow IA_ 🤖`;

        await enviarMsg(numero, msg);
        logAcaoIA(db, 'relatorio', `Relatório ${periodo} enviado`, {});
        console.log(`[IA Relat] ${g.slug} → relatório ${periodo} enviado`);
      } catch(e) {}
    }
  } catch(e) {}
}, 60000); // verifica a cada 1 minuto

// =============================================
// IA — ROTAS DE LOG E AUDITORIA
// =============================================

// Log de ações da IA (para o cliente ver no painel)
app.get('/api/ia/log-acoes', resolveDb, (req, res) => {
  try {
    const db = req.db;
    db.exec(`CREATE TABLE IF NOT EXISTS ia_log_acoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT, descricao TEXT, dados TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    const logs = db.prepare(
      `SELECT id,tipo,descricao,dados,created_at FROM ia_log_acoes ORDER BY created_at DESC LIMIT 50`
    ).all();
    res.json(logs);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Detecta se número é novo (para enviar boas-vindas)
const _numerosConhecidos = new Set();

app.post('/api/ia/config', resolveDb, (req, res) => {
  try {
    const db   = req.db;
    const slug = req.gestor?.slug || '?';
    const fields = ['numero','evo_url','evo_key','evo_instance','notify_nova_venda','notify_estoque',
      'notify_novo_cliente','notify_relatorio','relatorio_horario','relatorio_periodo',
      'ia_enabled','horario_inicio','horario_fim'];

    const numeroAntigo = tenantIaGet(db,'numero');

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        tenantIaSet(db, f, String(req.body[f]));
        console.log(`[IA Config] ${slug} → ${f} = "${req.body[f]}"`);
      }
    }

    // Envia boas-vindas se número novo foi salvo com IA ativa
    const numeroNovo = req.body.numero;
    if (numeroNovo && numeroNovo !== numeroAntigo && req.body.ia_enabled === '1') {
      const num = cleanNum(numeroNovo);
      if (num && !_numerosConhecidos.has(slug+'_'+num)) {
        _numerosConhecidos.add(slug+'_'+num);
        setTimeout(() => enviarBoasVindas(slug, num), 2000);
      }
    }

    res.json({ ok: true });
  } catch(e) {
    console.error('[IA Config] Erro ao salvar:', e.message);
    res.status(500).json({ message: e.message });
  }
});
