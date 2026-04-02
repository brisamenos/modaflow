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
    // Only set GET if not already a POST/PATCH (chained after insert/update)
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

  // Execução Assíncrona via promise interna
  async execute() {
    let url = `${this.apiUrl}/${this.table}`;
    
    // Se for RPC
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
        try { json = await res.json(); } catch(e){}
      }

      if (!res.ok) {
        return { data: null, error: json || { message: res.statusText } };
      }

      let returnData = json;
      if (this._single) returnData = (json && json.length > 0) ? json[0] : null;
      if (this._maybeSingle) returnData = (json && json.length > 0) ? json[0] : null;

      return { data: returnData, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  // Compatibilidade Promise-like
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

// Inicializando o Adapter globalmente como 'sb'
window.sb = new SupabaseAdapter('/api');
