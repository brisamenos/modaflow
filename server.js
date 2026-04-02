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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

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
  sc(`CREATE TABLE IF NOT EXISTS transferencias_estoque (id INTEGER PRIMARY KEY AUTOINCREMENT, produto_grade_id INTEGER, quantidade INTEGER DEFAULT 0, loja_origem TEXT, loja_destino TEXT, observacao TEXT, status TEXT DEFAULT 'concluida', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS agenda_tarefas (id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT, descricao TEXT, data_tarefa DATE, concluida INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS changelog (id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, data_lancamento DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS configuracoes (id INTEGER PRIMARY KEY AUTOINCREMENT, chave TEXT UNIQUE, valor TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS contas_bancarias (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, banco TEXT, agencia TEXT, conta TEXT, saldo REAL DEFAULT 0, ativo INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS metas_vendas (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT DEFAULT 'loja', vendedor_id INTEGER, mes INTEGER, ano INTEGER, valor_meta REAL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS bags (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, vendedor_id INTEGER, total REAL NOT NULL, data_retorno DATE, status TEXT DEFAULT 'aberta', observacoes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS bag_itens (id INTEGER PRIMARY KEY AUTOINCREMENT, bag_id INTEGER, produto_id INTEGER, produto_nome TEXT, tamanho TEXT, quantidade INTEGER NOT NULL, preco_unitario REAL NOT NULL, total REAL NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS trocas (id INTEGER PRIMARY KEY AUTOINCREMENT, venda_id INTEGER, cliente_id INTEGER, produto_id INTEGER, produto_nome TEXT, tamanho TEXT, valor REAL, motivo TEXT, status TEXT DEFAULT 'pendente', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS notas_fiscais (id INTEGER PRIMARY KEY AUTOINCREMENT, numero TEXT, chave TEXT, fornecedor_id INTEGER, valor REAL NOT NULL, data_emissao DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS duplicatas (id INTEGER PRIMARY KEY AUTOINCREMENT, nota_id INTEGER, valor REAL NOT NULL, vencimento DATE NOT NULL, status TEXT DEFAULT 'pendente', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS movimentos_caixa (id INTEGER PRIMARY KEY AUTOINCREMENT, caixa_id INTEGER, tipo TEXT, descricao TEXT, valor REAL NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS caixas (id INTEGER PRIMARY KEY AUTOINCREMENT, saldo_inicial REAL DEFAULT 0, status TEXT DEFAULT 'aberto', data_fechamento TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS despesas (id INTEGER PRIMARY KEY AUTOINCREMENT, classificacao_id INTEGER, descricao TEXT NOT NULL, valor REAL NOT NULL, data_competencia DATE, vencimento DATE, data_pagamento DATE, status TEXT DEFAULT 'aberta', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS contas_pagar (id INTEGER PRIMARY KEY AUTOINCREMENT, fornecedor_id INTEGER, descricao TEXT, valor REAL NOT NULL, vencimento DATE, data_pagamento DATE, status TEXT DEFAULT 'aberta', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS classificacoes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, tipo TEXT)`);
  sc(`CREATE TABLE IF NOT EXISTS contas_receber (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, descricao TEXT, valor REAL, vencimento DATE, data_pagamento DATE, data_recebimento DATE, status TEXT DEFAULT 'aberta', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS crediario (id INTEGER PRIMARY KEY AUTOINCREMENT, venda_id INTEGER, cliente_id INTEGER, total REAL NOT NULL, saldo_devedor REAL DEFAULT 0, num_parcelas INTEGER DEFAULT 1, parcelas_pagas INTEGER DEFAULT 0, valor_parcela REAL DEFAULT 0, status TEXT DEFAULT 'aberto', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  sc(`CREATE TABLE IF NOT EXISTS crediario_parcelas (id INTEGER PRIMARY KEY AUTOINCREMENT, crediario_id INTEGER, numero_parcela INTEGER DEFAULT 1, valor REAL NOT NULL, valor_pago REAL, vencimento DATE NOT NULL, data_pagamento DATE, status TEXT DEFAULT 'pendente', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  ac('clientes','nome_abreviado','TEXT'); ac('clientes','cpf','TEXT'); ac('clientes','instagram','TEXT');
  ac('clientes','sexo','TEXT'); ac('clientes','data_nascimento','DATE'); ac('clientes','observacoes','TEXT');
  ac('clientes','logradouro','TEXT'); ac('clientes','numero','TEXT'); ac('clientes','bairro','TEXT');
  ac('clientes','cep','TEXT'); ac('clientes','estado','TEXT'); ac('clientes','cidade','TEXT');
  ac('clientes','ultima_compra','DATE');
  ac('vendas','numero_venda','INTEGER'); ac('vendas','subtotal','REAL'); ac('vendas','parcelas','INTEGER');
  ac('vendas','valor_pago','REAL'); ac('vendas','troco','REAL');
  ac('fornecedores','razao_social','TEXT'); ac('fornecedores','nome_fantasia','TEXT');
  ac('fornecedores','cnpj','TEXT'); ac('fornecedores','celular','TEXT');
  ac('fornecedores','cidade','TEXT'); ac('fornecedores','estado','TEXT');
  ac('produtos','sku','TEXT'); ac('produtos','marca','TEXT'); ac('produtos','colecao_id','INTEGER');
  ac('produtos','ncm_descricao','TEXT'); ac('produtos','ncm','TEXT'); ac('produtos','genero','TEXT');
  ac('produtos','unidade','TEXT'); ac('produtos','custo','REAL'); ac('produtos','margem_lucro','REAL');
  ac('produto_grades','ean','TEXT'); ac('produto_grades','cor_hexa','TEXT');
  ac('produto_grades','cor_descricao','TEXT'); ac('produto_grades','custo','REAL');
  ac('produto_grades','preco_venda','REAL'); ac('produto_grades','margem_lucro','REAL');
  ac('categorias','ativo','INTEGER'); ac('colecoes','ativo','INTEGER'); ac('grades','ativo','INTEGER');
  try { tdb.exec(`UPDATE categorias SET ativo=1 WHERE ativo IS NULL`); } catch(e){}
  try { tdb.exec(`UPDATE colecoes SET ativo=1 WHERE ativo IS NULL`); } catch(e){}
  try { tdb.exec(`UPDATE grades SET ativo=1 WHERE ativo IS NULL`); } catch(e){}
  try { tdb.exec(`UPDATE fornecedores SET razao_social=nome WHERE (razao_social IS NULL OR razao_social='') AND nome IS NOT NULL`); } catch(e){}
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
  res.json(adminDb.prepare('SELECT id,nome,slug,email,plano,ativo,expires_at,created_at FROM gestores ORDER BY created_at DESC').all());
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
  if (v === 'true') return 1; if (v === 'false') return 0; return v;
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
      if (val.startsWith('eq.'))        { pushC('=', val.slice(3)); }
      else if (val.startsWith('neq.'))  { pushC('!=', val.slice(4)); }
      else if (val.startsWith('gt.'))   { pushC('>', val.slice(3)); }
      else if (val.startsWith('gte.'))  { pushC('>=', val.slice(4)); }
      else if (val.startsWith('lt.'))   { pushC('<', val.slice(3)); }
      else if (val.startsWith('lte.'))  { pushC('<=', val.slice(4)); }
      else if (val.startsWith('ilike.')||val.startsWith('like.')) {
        const p = val.startsWith('ilike.') ? 6 : 5;
        pushC('LIKE', val.slice(p).replace(/\*/g,'%'));
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
    res.json(Array.isArray(req.body)?results:(results[0]||{}));
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
  console.log('RPC:', req.params.fn, req.body);
  res.json({});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`StoreOS Multi-Tenant rodando na porta ${PORT}`));
