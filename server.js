const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// --- Serve Static Frontend ---
app.use(express.static(__dirname));


// --- Setup Database ---
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const dbExists = fs.existsSync(dbPath);
const db = new Database(dbPath);

if (!dbExists) {
  console.log("Creating new SQLite database from schema...");
  const schemaPath = path.join(__dirname, 'database_schema.sql');
  if (fs.existsSync(schemaPath)) {
    let schemaObj = fs.readFileSync(schemaPath, 'utf8');
    // Adapt Postgres schema to SQLite
    schemaObj = schemaObj.replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT');
    schemaObj = schemaObj.replace(/JSONB/g, 'TEXT');
    schemaObj = schemaObj.replace(/BOOLEAN/g, 'INTEGER');
    schemaObj = schemaObj.replace(/VARCHAR\(\d+\)\s+UNIQUE/g, 'TEXT UNIQUE');
    db.exec(schemaObj);
    console.log("Database initialized successfully!");
  }
}

// --- Auto-Migration: ensure all tables and columns exist ---
function safeExec(sql) { try { db.exec(sql); } catch(e) {} }
function safeAddCol(table, col, type) { safeExec(`ALTER TABLE "${table}" ADD COLUMN "${col}" ${type}`); }

// Missing tables
safeExec(`CREATE TABLE IF NOT EXISTS como_conheceu (id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, ativo INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS cliente_filhos (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INT, nome TEXT, nome_abreviado TEXT, sexo TEXT, data_nascimento DATE, grade_id INT, grade_nome TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS contas_receber (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INT, descricao TEXT, valor DECIMAL(10,2), vencimento DATE, data_pagamento DATE, data_recebimento DATE, origem TEXT, status TEXT DEFAULT 'aberta', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS agenda_tarefas (id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT, descricao TEXT, data_tarefa DATE, concluida INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS changelog (id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, data_lancamento DATE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS configuracoes (id INTEGER PRIMARY KEY AUTOINCREMENT, chave TEXT UNIQUE, valor TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS contas_bancarias (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, banco TEXT, agencia TEXT, conta TEXT, saldo DECIMAL(10,2) DEFAULT 0, ativo INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS metas_vendas (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT DEFAULT 'loja', vendedor_id INT, mes INT, ano INT, valor_meta DECIMAL(10,2), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
safeExec(`CREATE TABLE IF NOT EXISTS agenda (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INT, titulo TEXT, descricao TEXT, data DATE, hora TEXT, concluido INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

// Missing columns on clientes
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

// Missing columns on vendas
safeAddCol('vendas','numero_venda','INT');

// Missing columns on crediario
safeAddCol('crediario','saldo_devedor','DECIMAL(10,2)');
safeAddCol('crediario','num_parcelas','INT');
safeAddCol('crediario','parcelas_pagas','INT');
safeAddCol('crediario','valor_parcela','DECIMAL(10,2)');

// Missing columns on crediario_parcelas
safeAddCol('crediario_parcelas','numero_parcela','INT');
safeAddCol('crediario_parcelas','valor_pago','DECIMAL(10,2)');

// Missing columns on contas_receber
safeAddCol('contas_receber','data_recebimento','DATE');
safeAddCol('contas_receber','origem','TEXT');

console.log("Database migration check complete.");

// --- Query Builder Helpers ---
function parseSelect(selectStr) {
  if (!selectStr || selectStr === '*') return { fields: '*', relations: [] };
  let fields = [];
  let relations = [];
  let current = '';
  let depth = 0;
  
  for (let i = 0; i < selectStr.length; i++) {
    let char = selectStr[i];
    if (char === '(') {
      depth++;
      let relName = fields.pop() || current;
      current = '';
      let relFields = '';
      i++;
      while(i < selectStr.length && selectStr[i] !== ')') {
        relFields += selectStr[i];
        i++;
      }
      relations.push({ table: relName.trim(), fields: relFields });
      depth--;
    } else if (char === ',' && depth === 0) {
      if (current.trim()) fields.push(current.trim().replace(/"/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) fields.push(current.trim().replace(/"/g, ''));
  return { fields: fields.map(f => `"${f}"`).join(',') || '*', relations };
}

function buildWhere(query) {
  let clauses = [];
  let params = [];
  for (let [key, val] of Object.entries(query)) {
    if (['select', 'order', 'limit', 'or'].includes(key)) continue;
    if (typeof val === 'string') {
      if (val.startsWith('eq.')) { clauses.push(`"${key}" = ?`); params.push(val.slice(3)); }
      else if (val.startsWith('neq.')) { clauses.push(`"${key}" != ?`); params.push(val.slice(4)); }
      else if (val.startsWith('gt.')) { clauses.push(`"${key}" > ?`); params.push(val.slice(3)); }
      else if (val.startsWith('gte.')) { clauses.push(`"${key}" >= ?`); params.push(val.slice(4)); }
      else if (val.startsWith('lt.')) { clauses.push(`"${key}" < ?`); params.push(val.slice(3)); }
      else if (val.startsWith('lte.')) { clauses.push(`"${key}" <= ?`); params.push(val.slice(4)); }
      else if (val.startsWith('ilike.') || val.startsWith('like.')) { 
        let prefix = val.startsWith('ilike.') ? 6 : 5;
        clauses.push(`"${key}" LIKE ?`); 
        params.push(val.slice(prefix).replace(/\*/g, '%')); 
      }
      else if (val.startsWith('in.(')) {
        let list = val.slice(4, -1).split(',').map(v => v.trim());
        clauses.push(`"${key}" IN (${list.map(() => '?').join(',')})`);
        params.push(...list);
      }
      else { clauses.push(`"${key}" = ?`); params.push(val); }
    }
  }
  
  // Handle OR filter: "nome.ilike.%q%,celular.ilike.%q%"
  if (query.or) {
    let orParts = query.or.split(',');
    let orClauses = [];
    for (let part of orParts) {
      let dotIdx = part.indexOf('.');
      if (dotIdx === -1) continue;
      let col = part.slice(0, dotIdx);
      let rest = part.slice(dotIdx + 1);
      if (rest.startsWith('ilike.') || rest.startsWith('like.')) {
        let prefix = rest.startsWith('ilike.') ? 6 : 5;
        orClauses.push(`"${col}" LIKE ?`);
        params.push(rest.slice(prefix).replace(/\*/g, '%'));
      } else if (rest.startsWith('eq.')) {
        orClauses.push(`"${col}" = ?`);
        params.push(rest.slice(3));
      }
    }
    if (orClauses.length > 0) {
      clauses.push(`(${orClauses.join(' OR ')})`);
    }
  }

  return { 
    where: clauses.length ? 'WHERE ' + clauses.join(' AND ') : '', 
    params 
  };
}

function fetchRelations(db, table, results, relations) {
  if (results.length === 0 || relations.length === 0) return;
  
  for (let rel of relations) {
    let singularRel = rel.table;
    if (singularRel.endsWith('s')) singularRel = singularRel.slice(0, -1);
    if (singularRel.endsWith('e') && rel.table.endsWith('oes')) singularRel = rel.table.replace('oes', 'ao');
    
    let fk = singularRel + '_id'; 
    if (rel.table === 'clientes') fk = 'cliente_id';
    if (rel.table === 'produtos') fk = 'produto_id';
    if (rel.table === 'vendedores') fk = 'vendedor_id';
    
    // Parse nested fields securely
    const relFields = rel.fields.split(',').map(f => `"${f.trim()}"`).join(',');
    
    let stmt;
    try {
        stmt = db.prepare(`SELECT ${relFields || '*'} FROM "${rel.table}" WHERE id = ? LIMIT 1`);
    } catch (e) { console.error("Relation error:", e); continue; }
    
    for (let row of results) {
      if (row[fk]) {
        try { row[rel.table] = stmt.get(row[fk]) || null; } catch(e) { row[rel.table] = null; }
      } else {
        row[rel.table] = null;
      }
    }
  }
}

// --- API Routes ---

app.get('/api/:table', (req, res) => {
  try {
    let table = req.params.table;
    let { fields, relations } = parseSelect(req.query.select);
    if(fields === '"*"') fields = '*';
    
    let { where, params } = buildWhere(req.query);
    
    let orderClause = '';
    if (req.query.order) {
      let [col, dir] = req.query.order.split('.');
      orderClause = `ORDER BY "${col}" ${dir && dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
    }
    
    let limitClause = '';
    if (req.query.limit) limitClause = `LIMIT ${parseInt(req.query.limit)}`;
    
    let sql = `SELECT ${fields} FROM "${table}" ${where} ${orderClause} ${limitClause}`;
    let stmt = db.prepare(sql);
    let results = stmt.all(...params);
    
    fetchRelations(db, table, results, relations);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/:table', (req, res) => {
  try {
    let table = req.params.table;
    let items = Array.isArray(req.body) ? req.body : [req.body];
    if (items.length === 0) return res.json([]);
    
    let results = [];
    let keys = Object.keys(items[0]);
    let placeholders = keys.map(() => '?').join(',');
    let stmt = db.prepare(`INSERT INTO "${table}" (${keys.map(k=>`"${k}"`).join(',')}) VALUES (${placeholders})`);
    
    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        let info = stmt.run(keys.map(k => {
           let val = row[k];
           if (typeof val === 'boolean') return val ? 1 : 0;
           if (typeof val === 'object' && val !== null) return JSON.stringify(val);
           return val;
        }));
        try {
          let inserted = db.prepare(`SELECT * FROM "${table}" WHERE rowid = ?`).get(info.lastInsertRowid);
          results.push(inserted);
        } catch(e) { }
      }
    });
    
    insertMany(items);
    res.json(Array.isArray(req.body) ? results : results[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.patch('/api/:table', (req, res) => {
  try {
    let table = req.params.table;
    let updates = [];
    let params = [];
    for (let [k,v] of Object.entries(req.body)) {
      updates.push(`"${k}" = ?`);
      if (typeof v === 'boolean') params.push(v ? 1 : 0);
      else if (typeof v === 'object' && v !== null) params.push(JSON.stringify(v));
      else params.push(v);
    }
    
    let { where, params: whereParams } = buildWhere(req.query);
    let sql = `UPDATE "${table}" SET ${updates.join(',')} ${where}`;
    
    let info = db.prepare(sql).run(...params, ...whereParams);
    
    // Attempt returning updated items (if simple update)
    if(info.changes > 0 && Array.isArray(req.body) === false) {
       try {
         let selected = db.prepare(`SELECT * FROM "${table}" ${where} LIMIT 1`).get(...whereParams);
         return res.json(selected || []);
       } catch(e) {}
    }
    res.json([]);
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/:table', (req, res) => {
  try {
    let { where, params } = buildWhere(req.query);
    let sql = `DELETE FROM "${req.params.table}" ${where}`;
    db.prepare(sql).run(...params);
    res.status(204).send();
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Run
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`StoreOS Backend running on port ${PORT}`);
});
