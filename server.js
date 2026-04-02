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
    db.exec(schemaObj);
    console.log("Database initialized successfully!");
  }
}

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
    if (['select', 'order', 'limit'].includes(key)) continue;
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
      else { clauses.push(`"${key}" = ?`); params.push(val); }
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
