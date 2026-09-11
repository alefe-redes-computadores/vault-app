-- supabase/migrations/20260911_registros_saude_longitudinal_v2.sql
-- Evolução aditiva: preserva integralmente os registros legados.

alter table public.registros_saude
  add column if not exists valor_numerico double precision,
  add column if not exists unidade_medida text,
  add column if not exists registro_chave text,
  add column if not exists duracao_minutos integer,
  add column if not exists contexto text;

alter table public.registros_saude
  drop constraint if exists registros_saude_duracao_minutos_check;

alter table public.registros_saude
  add constraint registros_saude_duracao_minutos_check
  check (duracao_minutos is null or duracao_minutos >= 0);

update public.registros_saude
set registro_chave = categoria || ':' || regexp_replace(
  translate(lower(coalesce(nullif(tipo, ''), nullif(nome, ''), 'geral')),
    'áàâãäéèêëíìîïóòôõöúùûüç',
    'aaaaaeeeeiiiiooooouuuuc'),
  '[^a-z0-9]+', '_', 'g')
where registro_chave is null or btrim(registro_chave) = '';

create index if not exists registros_saude_person_data_idx
  on public.registros_saude (person_id, data desc);

create index if not exists registros_saude_person_chave_idx
  on public.registros_saude (person_id, registro_chave);
