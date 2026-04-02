// ===== SUPABASE API ADAPTER =====
// Esta camada substitui as chamadas originais do Supabase, formatando e
// repassando as requisições em REST padrão para a sua VPS backend.

class SupabaseQueryBuilder {
  constructor(table, apiUrl) {
    this.table = table;
    this.apiUrl = apiUrl || '/api';
    this._method = 'GET';
    this._params = new URLSearchParams();
    this._body = null;
    this._rpcName = null;
    this._single = false;
    this._maybeSingle = false;
  }

  select(columns = '*') {
    if (!this._body) this._method = 'GET';
    this._params.set('select', columns);
    return this;
  }

  insert(data) {
    this._method = 'POST';
    this._body = data;
    return this;
  }

  update(data) {
    this._method = 'PATCH';
    this._body = data;
    return this;
  }

  delete() {
    this._method = 'DELETE';
    return this;
  }

  eq(column, value) {
    this._params.append(column, `eq.${value}`);
    return this;
  }

  neq(column, value) {
    this._params.append(column, `neq.${value}`);
    return this;
  }

  gt(column, value) {
    this._params.append(column, `gt.${value}`);
    return this;
  }

  gte(column, value) {
    this._params.append(column, `gte.${value}`);
    return this;
  }

  lt(column, value) {
    this._params.append(column, `lt.${value}`);
    return this;
  }

  lte(column, value) {
    this._params.append(column, `lte.${value}`);
    return this;
  }

  ilike(column, value) {
    this._params.append(column, `ilike.${value}`);
    return this;
  }

  like(column, value) {
    this._params.append(column, `like.${value}`);
    return this;
  }

  in(column, values) {
    const list = Array.isArray(values) ? values.join(',') : values;
    this._params.append(column, `in.(${list})`);
    return this;
  }

  // Suporte a .not('coluna', 'is', null) e .not('coluna', 'in', '(...)')
  not(column, operator, value) {
    this._params.append(column, `not.${operator}.${value}`);
    return this;
  }

  match(query) {
    Object.entries(query).forEach(([k, v]) => {
      this.eq(k, v);
    });
    return this;
  }

  or(filterStr) {
    this._params.append('or', filterStr);
    return this;
  }

  order(column, options = { ascending: true }) {
    const dir = options.ascending === false ? 'desc' : 'asc';
    this._params.append('order', `${column}.${dir}`);
    return this;
  }

  limit(count) {
    this._params.set('limit', count);
    return this;
  }

  single() {
    this._single = true;
    this.limit(1);
    return this;
  }

  maybeSingle() {
    this._maybeSingle = true;
    this.limit(1);
    return this;
  }

  async execute() {
    let url = `${this.apiUrl}/${this.table}`;

    if (this._rpcName) {
      url = `${this.apiUrl}/rpc/${this._rpcName}`;
    }

    if (this._params.toString().length > 0) {
      url += '?' + this._params.toString();
    }

    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('loja_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const fetchOptions = {
      method: this._method,
      headers
    };

    if (this._method !== 'GET' && this._method !== 'HEAD') {
      if (this._body !== undefined && this._body !== null) {
        fetchOptions.body = typeof this._body === 'string' ? this._body : JSON.stringify(this._body);
      }
    }

    try {
      const res = await fetch(url, fetchOptions);

      let json = null;
      if (res.status !== 204) {
        try { json = await res.json(); } catch(e) {}
      }

      if (!res.ok) {
        return { data: null, error: json || { message: res.statusText } };
      }

      let returnData = json;

      if (this._single || this._maybeSingle) {
        if (Array.isArray(json)) {
          returnData = json.length > 0 ? json[0] : null;
        } else if (json && typeof json === 'object' && json.id !== undefined) {
          returnData = json;
        } else {
          returnData = null;
        }
      }

      return { data: returnData, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  then(resolve, reject) {
    return this.execute().then(resolve).catch(reject);
  }
}

class SupabaseAdapter {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }

  from(table) {
    return new SupabaseQueryBuilder(table, this.apiUrl);
  }

  rpc(fnName, params) {
    const builder = new SupabaseQueryBuilder(null, this.apiUrl);
    builder._rpcName = fnName;
    builder._method = 'POST';
    builder._body = params;
    return builder;
  }
}

window.sb = new SupabaseAdapter('/api');

// ===== GLOBAL HELPER: mapa de fornecedores (resolve joins aninhados) =====
// O backend suporta apenas 1 nível de join. Para produto_grades→produtos→fornecedores
// usamos este cache que é compartilhado entre todos os módulos.
let _fornCache = null;
async function getFornMap() {
  if(_fornCache) return _fornCache;
  const {data} = await sb.from('fornecedores').select('id,razao_social,cnpj').eq('ativo',1);
  const m = {};
  (data||[]).forEach(f => { m[f.id] = f; });
  _fornCache = m;
  setTimeout(()=>{ _fornCache = null; }, 60000);
  return m;
}
