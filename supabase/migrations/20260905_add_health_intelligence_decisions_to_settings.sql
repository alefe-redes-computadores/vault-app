-- supabase/migrations/20260905_add_health_intelligence_decisions_to_settings.sql

-- ============================================================
-- VAULT — DECISÕES PERSISTENTES DA INTELIGÊNCIA
--
-- Não criamos nova tabela local nem nova versão do Dexie.
-- A estrutura é armazenada no registro settings do usuário.
-- ============================================================

alter table public.settings
  add column if not exists health_intelligence_decisions jsonb
  not null
  default '[]'::jsonb;

comment on column public.settings.health_intelligence_decisions is
  'Decisões do usuário sobre alertas de qualidade/inteligência. Cada decisão mantém person_id, entidade, issue_key, valor analisado, sugestão, ação e momento da revisão.';

alter table public.settings
  add constraint settings_health_intelligence_decisions_is_array
  check (
    jsonb_typeof(
      health_intelligence_decisions
    ) = 'array'
  )
  not valid;

alter table public.settings
  validate constraint settings_health_intelligence_decisions_is_array;
