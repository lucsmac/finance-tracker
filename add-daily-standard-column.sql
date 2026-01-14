-- Adicionar coluna daily_standard na tabela user_configs
-- Execute este script no Supabase Dashboard > SQL Editor

ALTER TABLE user_configs
ADD COLUMN IF NOT EXISTS daily_standard DECIMAL(10,2) DEFAULT 0;
