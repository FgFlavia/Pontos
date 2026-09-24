-- =========================================================
-- ESQUEMA DO BANCO DE DADOS - SUPABASE
-- Sistema de Controle de Ponto e Antifraude
-- =========================================================

-- 1. Tabela de Funcionários
CREATE TABLE IF NOT EXISTS public.funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula VARCHAR(20) UNIQUE NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    cargo VARCHAR(50),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Registros de Ponto
CREATE TABLE IF NOT EXISTS public.registros_ponto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula VARCHAR(20) NOT NULL REFERENCES public.funcionarios(matricula) ON DELETE CASCADE,
    tipo VARCHAR(10) CHECK (tipo IN ('ENTRADA', 'SAIDA')) NOT NULL,
    data_hora TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    hash_verificacao VARCHAR(12) NOT NULL,
    origem VARCHAR(20) DEFAULT 'TABLET_KIOSK',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para Otimização de Performance
CREATE INDEX IF NOT EXISTS idx_registros_ponto_matricula ON public.registros_ponto(matricula);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_data_hora ON public.registros_ponto(data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_matricula_data ON public.registros_ponto(matricula, data_hora DESC);

-- 4. Inserção de Dados Iniciais de Teste/Exemplo
INSERT INTO public.funcionarios (matricula, cpf, nome, cargo) VALUES
('1001', '12345678901', 'Carlos Eduardo Silva', 'Desenvolvedor Senior'),
('1002', '98765432100', 'Ana Maria Souza', 'Analista de RH'),
('1003', '45678912300', 'Roberto Santos', 'Gerente de Operações')
ON CONFLICT (matricula) DO NOTHING;

-- 5. Configuração de Row Level Security (RLS)
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;

-- Politicas RLS para Leitura/Escrita Anonima/Autenticada no Terminal Kiosk
CREATE POLICY "Permitir leitura anonima de funcionarios"
    ON public.funcionarios FOR SELECT USING (true);

CREATE POLICY "Permitir leitura anonima de registros"
    ON public.registros_ponto FOR SELECT USING (true);

CREATE POLICY "Permitir insercao anonima de registros"
    ON public.registros_ponto FOR INSERT WITH CHECK (true);

-- 6. View Analítica para Relatório e Cálculo de Tolerância de Horário
CREATE OR REPLACE VIEW public.vw_espelho_ponto AS
SELECT
    f.matricula,
    f.nome,
    f.cargo,
    r.tipo,
    r.data_hora,
    r.hash_verificacao,
    DATE(r.data_hora AT TIME ZONE 'UTC') AS data_registro,
    TO_CHAR(r.data_hora AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI:SS') AS hora_registro
FROM public.registros_ponto r
JOIN public.funcionarios f ON f.matricula = r.matricula
ORDER BY r.data_hora DESC;
