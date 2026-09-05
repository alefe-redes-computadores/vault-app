-- supabase/migrations/20260905_expand_medication_presentations.sql

-- ============================================================
-- VAULT — EXPANSÃO DAS APRESENTAÇÕES DO CATÁLOGO
--
-- Preserva identificadores comerciais oficiais da Anvisa/CMED
-- sem substituir o texto original da apresentação.
-- ============================================================

alter table public.medication_presentations
  add column if not exists external_registration text null;

alter table public.medication_presentations
  add column if not exists ggrem_code text null;

alter table public.medication_presentations
  add column if not exists ean text null;

create index if not exists medication_presentations_external_registration_idx
  on public.medication_presentations(external_registration);

create index if not exists medication_presentations_ggrem_code_idx
  on public.medication_presentations(ggrem_code);

create index if not exists medication_presentations_ean_idx
  on public.medication_presentations(ean);

comment on column public.medication_presentations.external_registration is
  'Registro oficial da apresentação quando fornecido pela fonte.';

comment on column public.medication_presentations.ggrem_code is
  'Código GGREM da apresentação comercial quando fornecido pela CMED/Anvisa.';

comment on column public.medication_presentations.ean is
  'Código EAN informado pela fonte oficial; não deve ser assumido como globalmente único sem validação.';
