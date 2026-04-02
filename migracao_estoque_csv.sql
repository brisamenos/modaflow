-- =====================================================
-- MIGRAÇÃO: Compatibilidade com backup CSV de estoque
-- Execute no Supabase: Dashboard > SQL Editor
-- Gerado em: 2026-03-30
-- =====================================================

-- 1. Novos campos na tabela PRODUTOS
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS sku         TEXT,
  ADD COLUMN IF NOT EXISTS marca       TEXT,
  ADD COLUMN IF NOT EXISTS genero      TEXT,      -- 'F', 'M', 'U', 'J'
  ADD COLUMN IF NOT EXISTS unidade     TEXT DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS ncm         TEXT;

-- 2. Novos campos na tabela PRODUTO_GRADES (variantes/estoque por tamanho)
ALTER TABLE produto_grades
  ADD COLUMN IF NOT EXISTS ean             TEXT,   -- Cód. de Barras EAN
  ADD COLUMN IF NOT EXISTS cor_hexa        TEXT,   -- Ex: #030A24
  ADD COLUMN IF NOT EXISTS cor_descricao   TEXT;   -- Ex: Azul Marinho

-- 3. Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_produtos_sku     ON produtos(sku)     WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_produtos_marca   ON produtos(marca)   WHERE marca IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_produtos_genero  ON produtos(genero)  WHERE genero IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_produto_grades_ean ON produto_grades(ean) WHERE ean IS NOT NULL;

-- 4. Verificar resultado
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name IN ('produtos', 'produto_grades')
  AND column_name IN ('sku','marca','genero','unidade','ncm','ean','cor_hexa','cor_descricao')
ORDER BY table_name, column_name;
