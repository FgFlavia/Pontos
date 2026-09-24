/* =========================================================
   CONFIGURAÇÃO - SUPABASE E SEGREDOS DO SISTEMA
   ========================================================= */

const CONFIG = {
    // Insira as credenciais reais do Supabase do projeto se disponíveis
    SUPABASE_URL: "https://xyzcompany.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY3MDA0ODAwMCwiZXhwIjoyOTg1NjI0MDAwfQ.testkey",

    // Secret / Salt do Sistema para Geração Hash Determinística Antifraude
    SYSTEM_SALT: "PONTO_ANTIFRAUDE_SECRET_SALT_2025_KEY",

    // Bloqueio Antifraude: Tempo mínimo entre registros consecutivos (em segundos)
    MIN_INTERVAL_SECONDS: 120,

    // Modo Mock Fallback (Ativado automaticamente se Supabase offline)
    USE_LOCAL_FALLBACK: true
};

// Inicialização do cliente Supabase via CDN se disponível
let supabaseClient = null;

if (window.supabase && CONFIG.SUPABASE_URL && !CONFIG.SUPABASE_URL.includes("xyzcompany")) {
    try {
        supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        console.log("Supabase Client conectado com sucesso.");
    } catch (e) {
        console.warn("Falha ao inicializar Supabase Client. Utilizando LocalStorage Fallback.", e);
    }
}
