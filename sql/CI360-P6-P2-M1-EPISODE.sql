-- CI360 P6 P2 M1. Migração ADITIVA, preparada para o release. Nenhum dado legado é alterado.
-- A coluna JSONB permanece nula para registros legados. RLS existente das duas tabelas permanece ativa.
ALTER TABLE public.medicamentos ADD COLUMN IF NOT EXISTS contexto_clinico_m1 jsonb;
ALTER TABLE public.consultas ADD COLUMN IF NOT EXISTS desfecho_clinico_m1 jsonb;
ALTER TABLE public.medicamentos DROP CONSTRAINT IF EXISTS medicamentos_contexto_clinico_m1_obj_ck;
ALTER TABLE public.medicamentos ADD CONSTRAINT medicamentos_contexto_clinico_m1_obj_ck CHECK (contexto_clinico_m1 IS NULL OR (jsonb_typeof(contexto_clinico_m1)='object' AND contexto_clinico_m1 ->> 'versao'='1'));
ALTER TABLE public.consultas DROP CONSTRAINT IF EXISTS consultas_desfecho_clinico_m1_obj_ck;
ALTER TABLE public.consultas ADD CONSTRAINT consultas_desfecho_clinico_m1_obj_ck CHECK (desfecho_clinico_m1 IS NULL OR (jsonb_typeof(desfecho_clinico_m1)='object' AND desfecho_clinico_m1 ->> 'versao'='1'));
-- Dados sensíveis só trafegam nas linhas originais com user_id/person_id e RLS já existente.
-- Nenhuma movimentação de estoque, DoseLog, prescrição, consulta ou exame é criada por esta DDL.
