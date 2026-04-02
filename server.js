const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(__dirname));

// --- Setup Database ---
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'database.sqlite');
const dbExists = fs.existsSync(dbPath);
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

if (!dbExists) {
  console.log('Creating new SQLite database from schema...');
  const schemaPath = path.join(__dirname, 'database_schema.sql');
  if (fs.existsSync(schemaPath)) {
    let sql = fs.readFileSync(schemaPath, 'utf8');
    sql = sql.replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT');
    sql = sql.replace(/JSONB/g, 'TEXT');
    sql = sql.replace(/BOOLEAN/g, 'INTEGER');
    sql = sql.replace(/VARCHAR\(\d+\)\s+UNIQUE/g, 'TEXT UNIQUE');
    sql = sql.replace(/VARCHAR\(\d+\)/g, 'TEXT');
    sql = sql.replace(/DECIMAL\(\d+,\d+\)/g, 'REAL');
    db.exec(sql);
    console.log('Database initialized successfully!');
  }
}

// --- Helpers de migração ---
function safeExec(sql) { try { db.exec(sql); } catch(e) {} }
function safeAddCol(table, col, type) {
  try { db.exec(`ALTER TABLE "${table}" ADD COLUMN "${col}" ${type}`); } catch(e) {}
}

// =============================================
// TABELAS QUE PODEM FALTAR
// =============================================
safeExec(`CREATE TABLE IF NOT EXISTS como_conheceu (id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, ativo INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS cliente_filhos (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, nome TEXT, nome_abreviado TEXT, sexo TEXT, data_nascimento DATE, grade_id INTEGER, grade_nome TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS contas_receber (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, descricao TEXT, valor REAL, vencimento DATE, data_pagamento DATE, data_recebimento DATE, origem TEXT, status TEXT DEFAULT 'aberta', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS agenda_tarefas (id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT, descricao TEXT, data_tarefa DATE, concluida INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS changelog (id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, data_lancamento DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS configuracoes (id INTEGER PRIMARY KEY AUTOINCREMENT, chave TEXT UNIQUE, valor TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS contas_bancarias (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, banco TEXT, agencia TEXT, conta TEXT, saldo REAL DEFAULT 0, ativo INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS metas_vendas (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT DEFAULT 'loja', vendedor_id INTEGER, mes INTEGER, ano INTEGER, valor_meta REAL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS agenda (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, titulo TEXT, descricao TEXT, data DATE, hora TEXT, concluido INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS conferencias_estoque (id INTEGER PRIMARY KEY AUTOINCREMENT, status TEXT DEFAULT 'aberta', total_lido INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS conferencia_itens (id INTEGER PRIMARY KEY AUTOINCREMENT, conferencia_id INTEGER, produto_grade_id INTEGER, ean TEXT, produto_nome TEXT, quantidade INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS cores_estoque (id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, cor_hex TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS generos_estoque (id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS grade_tamanhos (id INTEGER PRIMARY KEY AUTOINCREMENT, tamanho TEXT, faixa_etaria TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS fornecedor_marcas (id INTEGER PRIMARY KEY AUTOINCREMENT, fornecedor_id INTEGER, nome TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS transferencias_estoque (id INTEGER PRIMARY KEY AUTOINCREMENT, produto_grade_id INTEGER, quantidade INTEGER DEFAULT 0, loja_origem TEXT, loja_destino TEXT, observacao TEXT, status TEXT DEFAULT 'concluida', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS classificacoes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, tipo TEXT)`);
safeExec(`CREATE TABLE IF NOT EXISTS despesas (id INTEGER PRIMARY KEY AUTOINCREMENT, classificacao_id INTEGER, descricao TEXT NOT NULL, valor REAL NOT NULL, data_competencia DATE, vencimento DATE, data_pagamento DATE, status TEXT DEFAULT 'aberta', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS contas_pagar (id INTEGER PRIMARY KEY AUTOINCREMENT, fornecedor_id INTEGER, descricao TEXT, valor REAL NOT NULL, vencimento DATE, data_pagamento DATE, status TEXT DEFAULT 'aberta', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS bags (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, vendedor_id INTEGER, total REAL NOT NULL, data_retorno DATE, status TEXT DEFAULT 'aberta', observacoes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS bag_itens (id INTEGER PRIMARY KEY AUTOINCREMENT, bag_id INTEGER, produto_id INTEGER, produto_nome TEXT, tamanho TEXT, quantidade INTEGER NOT NULL, preco_unitario REAL NOT NULL, total REAL NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS trocas (id INTEGER PRIMARY KEY AUTOINCREMENT, venda_id INTEGER, cliente_id INTEGER, produto_id INTEGER, produto_nome TEXT, tamanho TEXT, valor REAL, motivo TEXT, status TEXT DEFAULT 'pendente', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS notas_fiscais (id INTEGER PRIMARY KEY AUTOINCREMENT, numero TEXT, chave TEXT, fornecedor_id INTEGER, valor REAL NOT NULL, data_emissao DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS duplicatas (id INTEGER PRIMARY KEY AUTOINCREMENT, nota_id INTEGER, valor REAL NOT NULL, vencimento DATE NOT NULL, status TEXT DEFAULT 'pendente', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS movimentos_caixa (id INTEGER PRIMARY KEY AUTOINCREMENT, caixa_id INTEGER, tipo TEXT, descricao TEXT, valor REAL NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS caixas (id INTEGER PRIMARY KEY AUTOINCREMENT, saldo_inicial REAL DEFAULT 0, status TEXT DEFAULT 'aberto', data_fechamento TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

// =============================================
// COLUNAS FALTANDO NAS TABELAS EXISTENTES
// =============================================

// clientes
safeAddCol('clientes','nome_abreviado','TEXT');
safeAddCol('clientes','cpf','TEXT');
safeAddCol('clientes','rg','TEXT');
safeAddCol('clientes','ie','TEXT');
safeAddCol('clientes','instagram','TEXT');
safeAddCol('clientes','sexo','TEXT');
safeAddCol('clientes','como_conheceu','TEXT');
safeAddCol('clientes','data_nascimento','DATE');
safeAddCol('clientes','observacoes','TEXT');
safeAddCol('clientes','tipo_pessoa','TEXT');
safeAddCol('clientes','logradouro','TEXT');
safeAddCol('clientes','numero','TEXT');
safeAddCol('clientes','complemento','TEXT');
safeAddCol('clientes','bairro','TEXT');
safeAddCol('clientes','cep','TEXT');
safeAddCol('clientes','estado','TEXT');
safeAddCol('clientes','cidade','TEXT');
safeAddCol('clientes','ultima_compra','DATE');

// vendas
safeAddCol('vendas','numero_venda','INTEGER');
safeAddCol('vendas','subtotal','REAL');
safeAddCol('vendas','parcelas','INTEGER');
safeAddCol('vendas','valor_pago','REAL');
safeAddCol('vendas','troco','REAL');

// crediario
safeAddCol('crediario','saldo_devedor','REAL');
safeAddCol('crediario','num_parcelas','INTEGER');
safeAddCol('crediario','parcelas_pagas','INTEGER');
safeAddCol('crediario','valor_parcela','REAL');

// crediario_parcelas
safeAddCol('crediario_parcelas','numero_parcela','INTEGER');
safeAddCol('crediario_parcelas','valor_pago','REAL');

// contas_receber
safeAddCol('contas_receber','data_recebimento','DATE');
safeAddCol('contas_receber','origem','TEXT');

// fornecedores — CRÍTICO: frontend usa razao_social, schema original tem nome
safeAddCol('fornecedores','razao_social','TEXT');
safeAddCol('fornecedores','nome_fantasia','TEXT');
safeAddCol('fornecedores','ie','TEXT');
safeAddCol('fornecedores','site','TEXT');
safeAddCol('fornecedores','celular','TEXT');
safeAddCol('fornecedores','cnpj','TEXT');
safeAddCol('fornecedores','contato','TEXT');
safeAddCol('fornecedores','endereco','TEXT');
safeAddCol('fornecedores','cidade','TEXT');
safeAddCol('fornecedores','estado','TEXT');
safeAddCol('fornecedores','cep','TEXT');
safeAddCol('fornecedores','observacoes','TEXT');
// Copiar nome -> razao_social para registros existentes
try { db.exec(`UPDATE fornecedores SET razao_social = nome WHERE (razao_social IS NULL OR razao_social = '') AND nome IS NOT NULL AND nome != ''`); } catch(e) {}

// produtos
safeAddCol('produtos','sku','TEXT');
safeAddCol('produtos','marca','TEXT');
safeAddCol('produtos','colecao_id','INTEGER');
safeAddCol('produtos','ncm_descricao','TEXT');
safeAddCol('produtos','ean','TEXT');
safeAddCol('produtos','ncm','TEXT');
safeAddCol('produtos','genero','TEXT');
safeAddCol('produtos','cor','TEXT');
safeAddCol('produtos','imagem_url','TEXT');
safeAddCol('produtos','unidade','TEXT');

// produto_grades — CRÍTICO: sem essas colunas as variações não salvam
safeAddCol('produto_grades','ean','TEXT');
safeAddCol('produto_grades','cor_hexa','TEXT');
safeAddCol('produto_grades','cor_descricao','TEXT');
safeAddCol('produto_grades','custo','REAL');
safeAddCol('produto_grades','preco_venda','REAL');
safeAddCol('produto_grades','margem_lucro','REAL');

// categorias — sem ativo o filtro .eq('ativo',true) retorna vazio
safeAddCol('categorias','descricao','TEXT');
safeAddCol('categorias','ativo','INTEGER');
try { db.exec(`UPDATE categorias SET ativo = 1 WHERE ativo IS NULL`); } catch(e) {}

// colecoes
safeAddCol('colecoes','temporada','TEXT');
safeAddCol('colecoes','ano','INTEGER');
safeAddCol('colecoes','ativo','INTEGER');
try { db.exec(`UPDATE colecoes SET ativo = 1 WHERE ativo IS NULL`); } catch(e) {}

// grades — sem ativo o filtro .eq('ativo',true) retorna vazio
safeAddCol('grades','tipo','TEXT');
safeAddCol('grades','ativo','INTEGER');
try { db.exec(`UPDATE grades SET ativo = 1 WHERE ativo IS NULL`); } catch(e) {}

// vendedores
safeAddCol('vendedores','cpf','TEXT');
safeAddCol('vendedores','telefone','TEXT');
safeAddCol('vendedores','email','TEXT');
safeAddCol('vendedores','meta_mensal','REAL');

// despesas / contas_pagar
safeAddCol('despesas','classificacao_id','INTEGER');
safeAddCol('despesas','conta_bancaria_id','INTEGER');
safeAddCol('contas_pagar','nota_fiscal_id','INTEGER');
safeAddCol('contas_pagar','conta_bancaria_id','INTEGER');

console.log('Database migration check complete.');

// =============================================
// FK MAP: tabela relacionada -> nome da FK
// =============================================
const FK_MAP = {
  clientes:             'cliente_id',
  produtos:             'produto_id',
  vendedores:           'vendedor_id',
  fornecedores:         'fornecedor_id',
  categorias:           'categoria_id',
  colecoes:             'colecao_id',
  grades:               'grade_id',
  vendas:               'venda_id',
  crediario:            'crediario_id',
  bags:                 'bag_id',
  caixas:               'caixa_id',
  notas_fiscais:        'nota_id',
  classificacoes:       'classificacao_id',
  conferencias_estoque: 'conferencia_id',
  contas_bancarias:     'conta_bancaria_id',
  produto_grades:       'produto_grade_id',
};

// =============================================
// parseSelect: aceita sintaxe PostgREST (!inner, :id, nested)
// =============================================
function parseSelect(selectStr) {
  if (!selectStr || selectStr === '*') return { fields: '*', relations: [] };

  const fields = [];
  const relations = [];
  let current = '';

  for (let i = 0; i < selectStr.length; i++) {
    const char = selectStr[i];
    if (char === '(') {
      // current contém o nome da relação (texto imediatamente antes do '(')
      // Não usar fields.pop() — a vírgula anterior já empilhou o campo correto
      const relName = current.trim().replace(/[!:].*$/, '').trim();
      current = '';
      let relFields = '';
      let depth = 1;
      i++;
      while (i < selectStr.length && depth > 0) {
        if (selectStr[i] === '(') depth++;
        else if (selectStr[i] === ')') { depth--; if (depth === 0) { i++; break; } }
        relFields += selectStr[i];
        i++;
      }
      i--; // compensar o for
      if (relName) relations.push({ table: relName, fields: relFields });
    } else if (char === ',') {
      const f = current.trim().replace(/"/g, '').replace(/[!:].*$/, '').trim();
      if (f) fields.push(f);
      current = '';
    } else {
      current += char;
    }
  }
  const last = current.trim().replace(/"/g, '').replace(/[!:].*$/, '').trim();
  if (last) fields.push(last);

  const clean = fields.filter(f => f);
  return {
    fields: clean.length ? clean.map(f => `"${f}"`).join(',') : '*',
    relations
  };
}

// =============================================
// buildWhere: suporta eq, neq, gt, gte, lt, lte, ilike, like, in, not, or
// =============================================
function buildWhere(query) {
  const clauses = [];
  const params = [];

  for (const [key, rawVal] of Object.entries(query)) {
    if (['select', 'order', 'limit', 'or'].includes(key)) continue;

    const vals = Array.isArray(rawVal) ? rawVal : [rawVal];
    for (const val of vals) {
      if (typeof val !== 'string') continue;

      // not.* — operadores negativos
      if (val.startsWith('not.')) {
        const rest = val.slice(4);
        if (rest === 'is.null')           { clauses.push(`"${key}" IS NOT NULL`); }
        else if (rest.startsWith('in.(')) {
          const list = rest.slice(4, -1).split(',').map(v => v.trim()).filter(Boolean);
          if (list.length) {
            clauses.push(`"${key}" NOT IN (${list.map(() => '?').join(',')})`);
            params.push(...list);
          }
        }
        else if (rest.startsWith('eq.'))  { clauses.push(`"${key}" != ?`); params.push(rest.slice(3)); }
        else if (rest.startsWith('ilike.') || rest.startsWith('like.')) {
          const p = rest.startsWith('ilike.') ? 6 : 5;
          clauses.push(`"${key}" NOT LIKE ?`);
          params.push(rest.slice(p).replace(/\*/g, '%'));
        }
        continue;
      }

      if (val.startsWith('eq.'))         { clauses.push(`"${key}" = ?`);    params.push(val.slice(3)); }
      else if (val.startsWith('neq.'))   { clauses.push(`"${key}" != ?`);   params.push(val.slice(4)); }
      else if (val.startsWith('gt.'))    { clauses.push(`"${key}" > ?`);    params.push(val.slice(3)); }
      else if (val.startsWith('gte.'))   { clauses.push(`"${key}" >= ?`);   params.push(val.slice(4)); }
      else if (val.startsWith('lt.'))    { clauses.push(`"${key}" < ?`);    params.push(val.slice(3)); }
      else if (val.startsWith('lte.'))   { clauses.push(`"${key}" <= ?`);   params.push(val.slice(4)); }
      else if (val.startsWith('ilike.') || val.startsWith('like.')) {
        const p = val.startsWith('ilike.') ? 6 : 5;
        clauses.push(`"${key}" LIKE ?`);
        params.push(val.slice(p).replace(/\*/g, '%'));
      }
      else if (val.startsWith('in.(')) {
        const list = val.slice(4, -1).split(',').map(v => v.trim()).filter(Boolean);
        if (list.length) {
          clauses.push(`"${key}" IN (${list.map(() => '?').join(',')})`);
          params.push(...list);
        }
      }
      else if (val === 'is.null')        { clauses.push(`"${key}" IS NULL`); }
      else if (val === 'not.is.null')    { clauses.push(`"${key}" IS NOT NULL`); }
      else                               { clauses.push(`"${key}" = ?`); params.push(val); }
    }
  }

  // OR filter ex: "nome.ilike.%q%,celular.ilike.%q%"
  if (query.or) {
    const orClauses = [];
    for (const part of query.or.split(',')) {
      const dot = part.indexOf('.');
      if (dot === -1) continue;
      const col = part.slice(0, dot);
      const rest = part.slice(dot + 1);
      if (rest.startsWith('ilike.') || rest.startsWith('like.')) {
        const p = rest.startsWith('ilike.') ? 6 : 5;
        orClauses.push(`"${col}" LIKE ?`);
        params.push(rest.slice(p).replace(/\*/g, '%'));
      } else if (rest.startsWith('eq.')) {
        orClauses.push(`"${col}" = ?`);
        params.push(rest.slice(3));
      }
    }
    if (orClauses.length) clauses.push(`(${orClauses.join(' OR ')})`);
  }

  return {
    where: clauses.length ? 'WHERE ' + clauses.join(' AND ') : '',
    params
  };
}

// =============================================
// fetchRelations: simula JOIN para relações aninhadas
// =============================================
function fetchRelations(db, table, results, relations) {
  if (!results.length || !relations.length) return;

  for (const rel of relations) {
    let fk = FK_MAP[rel.table];
    if (!fk) {
      let singular = rel.table;
      if (singular.endsWith('oes')) singular = singular.slice(0, -3) + 'ao';
      else if (singular.endsWith('s')) singular = singular.slice(0, -1);
      fk = singular + '_id';
    }

    let relFieldsSql = '*';
    if (rel.fields && rel.fields.trim()) {
      const cols = rel.fields
        .split(',')
        .map(f => f.trim().replace(/"/g, '').replace(/[!:].*$/, '').trim())
        .filter(f => f && !f.includes('('));
      if (cols.length) relFieldsSql = cols.map(c => `"${c}"`).join(',');
    }

    let stmt;
    try {
      stmt = db.prepare(`SELECT ${relFieldsSql} FROM "${rel.table}" WHERE id = ? LIMIT 1`);
    } catch (e) {
      console.error(`Relation stmt error [${rel.table}]:`, e.message);
      continue;
    }

    for (const row of results) {
      const fkVal = row[fk];
      if (fkVal != null && fkVal !== '') {
        try {
          const related = stmt.get(fkVal);
          if (related) parseJsonFields([related]);
          row[rel.table] = related || null;
        } catch(e) {
          row[rel.table] = null;
        }
      } else {
        row[rel.table] = null;
      }
    }
  }
}

// Converte strings JSON em objetos nos resultados
function parseJsonFields(rows) {
  for (const row of rows) {
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === 'string' && (v.startsWith('[') || v.startsWith('{'))) {
        try { row[k] = JSON.parse(v); } catch(e) {}
      }
    }
  }
}

// Converte valor para formato adequado ao SQLite
function toSQLiteValue(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (typeof val === 'object') return JSON.stringify(val);
  return val;
}

// =============================================
// API ROUTES
// =============================================

// GET /api/:table
app.get('/api/:table', (req, res) => {
  try {
    const table = req.params.table;
    let { fields, relations } = parseSelect(req.query.select);
    if (fields === '"*"') fields = '*';

    const { where, params } = buildWhere(req.query);

    let orderClause = '';
    if (req.query.order) {
      const parts = req.query.order.split('.');
      const col = parts[0];
      const dir = (parts[1] || '').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      orderClause = `ORDER BY "${col}" ${dir}`;
    }

    let limitClause = '';
    if (req.query.limit) limitClause = `LIMIT ${parseInt(req.query.limit)}`;

    const sql = `SELECT ${fields} FROM "${table}" ${where} ${orderClause} ${limitClause}`;
    const stmt = db.prepare(sql);
    const results = stmt.all(...params);

    parseJsonFields(results);
    fetchRelations(db, table, results, relations);

    res.json(results);
  } catch (err) {
    console.error('GET error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/:table
app.post('/api/:table', (req, res) => {
  try {
    const table = req.params.table;
    let items = Array.isArray(req.body) ? req.body : [req.body];
    if (!items.length) return res.json([]);

    // Auto-numerar vendas
    if (table === 'vendas') {
      try {
        const row = db.prepare(`SELECT COALESCE(MAX(numero_venda), 0) as mx FROM "vendas"`).get();
        let nextNum = (row ? row.mx : 0) + 1;
        for (const item of items) {
          if (!item.numero_venda) item.numero_venda = nextNum++;
        }
      } catch(e) {}
    }

    // Sincronizar razao_social -> nome em fornecedores
    if (table === 'fornecedores') {
      for (const item of items) {
        if (item.razao_social && !item.nome) item.nome = item.razao_social;
      }
    }

    const keys = Object.keys(items[0]);
    const placeholders = keys.map(() => '?').join(',');
    const insertSql = `INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(',')}) VALUES (${placeholders})`;
    const stmt = db.prepare(insertSql);

    const results = [];
    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        const values = keys.map(k => toSQLiteValue(row[k]));
        const info = stmt.run(values);
        try {
          const inserted = db.prepare(`SELECT * FROM "${table}" WHERE rowid = ?`).get(info.lastInsertRowid);
          if (inserted) parseJsonFields([inserted]);
          if (inserted) results.push(inserted);
        } catch(e) {}
      }
    });

    insertMany(items);
    res.json(Array.isArray(req.body) ? results : (results[0] || {}));
  } catch (err) {
    console.error('POST error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/:table
app.patch('/api/:table', (req, res) => {
  try {
    const table = req.params.table;

    // Sincronizar razao_social -> nome em fornecedores
    if (table === 'fornecedores' && req.body.razao_social && !req.body.nome) {
      req.body.nome = req.body.razao_social;
    }

    const setClauses = [];
    const setParams = [];
    for (const [k, v] of Object.entries(req.body)) {
      setClauses.push(`"${k}" = ?`);
      setParams.push(toSQLiteValue(v));
    }

    const { where, params: whereParams } = buildWhere(req.query);
    const sql = `UPDATE "${table}" SET ${setClauses.join(',')} ${where}`;
    const info = db.prepare(sql).run(...setParams, ...whereParams);

    if (info.changes > 0) {
      try {
        const selected = db.prepare(`SELECT * FROM "${table}" ${where} LIMIT 1`).get(...whereParams);
        if (selected) parseJsonFields([selected]);
        return res.json(selected || {});
      } catch(e) {}
    }
    res.json({});
  } catch(err) {
    console.error('PATCH error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/:table
app.delete('/api/:table', (req, res) => {
  try {
    const { where, params } = buildWhere(req.query);
    if (!where) return res.status(400).json({ message: 'DELETE sem filtro bloqueado por segurança' });
    db.prepare(`DELETE FROM "${req.params.table}" ${where}`).run(...params);
    res.status(204).send();
  } catch(err) {
    console.error('DELETE error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// RPC stub (compatibilidade)
app.post('/api/rpc/:fn', (req, res) => {
  console.log('RPC call (stub):', req.params.fn, req.body);
  res.json({});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`StoreOS Backend running on port ${PORT}`);
});
