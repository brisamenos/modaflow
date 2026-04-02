-- =====================================================
-- MIGRAÇÃO: Compatibilidade com backup CSV de estoque e clientes
-- Execute no Supabase: Dashboard > SQL Editor
-- Gerado em: 2026-03-30
-- =====================================================

-- ============================================================
-- 1. PRODUTOS — novos campos do CSV de estoque
-- ============================================================
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS sku              TEXT,
  ADD COLUMN IF NOT EXISTS marca            TEXT,
  ADD COLUMN IF NOT EXISTS genero           TEXT,          -- 'F', 'M', 'U', 'J'
  ADD COLUMN IF NOT EXISTS unidade          TEXT DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS ncm              TEXT,
  ADD COLUMN IF NOT EXISTS fornecedor_cnpj  TEXT;          -- CNPJ Fornecedor raw do CSV

-- ============================================================
-- 2. PRODUTO_GRADES — variantes/estoque por tamanho
-- ============================================================
ALTER TABLE produto_grades
  ADD COLUMN IF NOT EXISTS ean              TEXT,          -- Cód. de Barras EAN
  ADD COLUMN IF NOT EXISTS cor_hexa         TEXT,          -- Ex: #030A24
  ADD COLUMN IF NOT EXISTS cor_descricao    TEXT;          -- Ex: Azul Marinho

-- Ajuste da constraint UNIQUE para suportar múltiplas cores/EANs no mesmo tamanho
-- (mesmo tamanho "U" pode ter EAN diferente por cor)
ALTER TABLE produto_grades
  DROP CONSTRAINT IF EXISTS produto_grades_produto_id_tamanho_key;

ALTER TABLE produto_grades
  ADD CONSTRAINT produto_grades_produto_id_tamanho_ean_key
  UNIQUE (produto_id, tamanho, ean);

-- ============================================================
-- 3. CLIENTES — campos do CSV de clientes
-- ============================================================
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS codigo_externo   VARCHAR(50),   -- col 1: ID sistema de origem
  ADD COLUMN IF NOT EXISTS dia_nascimento   INT,           -- col 7
  ADD COLUMN IF NOT EXISTS mes_nascimento   INT;           -- col 8
  -- col 11 (S/N) já mapeado em ativo BOOLEAN
  -- col 12 (flag "1") ignorado — campo interno do sistema de origem

-- ============================================================
-- 4. Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_produtos_sku
  ON produtos(sku) WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_marca
  ON produtos(marca) WHERE marca IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_genero
  ON produtos(genero) WHERE genero IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_fornecedor_cnpj
  ON produtos(fornecedor_cnpj) WHERE fornecedor_cnpj IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_produto_grades_ean
  ON produto_grades(ean) WHERE ean IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_codigo_externo
  ON clientes(codigo_externo) WHERE codigo_externo IS NOT NULL;

-- ============================================================
-- 5. Verificar resultado
-- ============================================================
SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name IN ('produtos', 'produto_grades', 'clientes')
  AND column_name IN (
    'sku','marca','genero','unidade','ncm','fornecedor_cnpj',
    'ean','cor_hexa','cor_descricao',
    'codigo_externo','dia_nascimento','mes_nascimento'
  )
ORDER BY table_name, column_name;
