// ===== CONFIG =====
const SUPABASE_URL = 'https://zllvtkgtzxmmjphazzjr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsbHZ0a2d0enhtbWpwaGF6empyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzA4NDIsImV4cCI6MjA5MDI0Njg0Mn0.Y8I35NuA5MÃªspluYhoHFWPK-B2SvwW1Su3lFoEjr7b2c';
const sb = supabase.creatÃ©eClient(SUPABASE_URL, SUPABASE_KEY);

// ===== STATE =====
let currentPage = 'dashboard';
let currentUser = null;
let cart = [];
let cartClient = null;
let cartSeller = null;
let cartPayment = 'dinheiro';

