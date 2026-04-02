// ===== CONFIG =====
// sb é inicializado em api.js via window.sb = new SupabaseAdapter('/api')
// NÃO instanciar Supabase aqui — o backend SQLite local é usado via api.js

// ===== STATE =====
let currentPage = 'dashboard';
let currentUser = null;
let cart = [];
let cartClient = null;
let cartSeller = null;
let cartPayment = 'dinheiro';
