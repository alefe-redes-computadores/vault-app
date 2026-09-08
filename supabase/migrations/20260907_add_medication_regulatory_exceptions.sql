-- supabase/migrations/20260907_add_medication_regulatory_exceptions.sql

-- ============================================================
-- VAULT — EXCEÇÕES REGULATÓRIAS DE MEDICAMENTOS
--
-- Complementa medication_regulatory_rules sem alterar sua
-- responsabilidade principal:
--
-- medication_regulatory_rules
--   = regra-base ligada à substância.
--
-- medication_regulatory_rule_exceptions
--   = exceções condicionais ligadas à regra-base.
--
-- IMPORTANTE:
--
-- - condições são determinísticas e versionadas;
-- - condições não contêm JavaScript ou expressão executável;
-- - ausência de contexto deve resultar em "unknown" no motor;
-- - nenhuma prioridade implícita é armazenada;
-- - exceções conflitantes devem permanecer conflito;
-- - usuários comuns recebem somente leitura.
-- ============================================================


create table if not exists public.medication_regulatory_rule_exceptions (
  id uuid primary key default gen_random_uuid(),

  regulatory_rule_id uuid not null
    references public.medication_regulatory_rules(id)
    on delete cascade,

  label text not null,

  -- ==========================================================
  -- CONDIÇÕES
  --
  -- Array JSON versionado conforme o contrato do
  -- Medication Intelligence.
  --
  -- Exemplos de kind atualmente suportados:
  --
  -- ingredient_concentration
  -- pharmaceutical_form
  -- product_id
  -- registration_number
  --
  -- Todas as condições de uma exceção usam semântica AND.
  -- ==========================================================

  condition_schema_version integer not null default 1,

  conditions jsonb not null,

  -- ==========================================================
  -- RESULTADO / OVERRIDE
  --
  -- A exceção pode alterar o modelo regulatório original,
  -- a abstração visual do Vault, ou ambos.
  --
  -- Pelo menos um dos dois precisa estar presente.
  -- ==========================================================

  override_prescription_model text null,

  override_vault_prescription_type text null,

  -- ==========================================================
  -- PROVENIÊNCIA
  --
  -- A fonte da exceção pode ser diferente da fonte original
  -- da regra-base.
  -- ==========================================================

  source_version_id uuid not null
    references public.medication_catalog_versions(id)
    on delete restrict,

  effective_from date null,

  effective_until date null,

  verified_at timestamptz not null default now(),

  notes text null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint medication_regulatory_rule_exceptions_label_check
    check (
      length(
        trim(
          label
        )
      ) > 0
    ),

  constraint medication_regulatory_rule_exceptions_schema_version_check
    check (
      condition_schema_version >= 1
    ),

  constraint medication_regulatory_rule_exceptions_conditions_array_check
    check (
      jsonb_typeof(
        conditions
      ) = 'array'
    ),

  constraint medication_regulatory_rule_exceptions_conditions_not_empty_check
    check (
      jsonb_array_length(
        conditions
      ) > 0
    ),

  constraint medication_regulatory_rule_exceptions_result_check
    check (
      (
        override_prescription_model is not null
        and length(
          trim(
            override_prescription_model
          )
        ) > 0
      )
      or
      override_vault_prescription_type is not null
    ),

  constraint medication_regulatory_rule_exceptions_vault_type_check
    check (
      override_vault_prescription_type is null
      or override_vault_prescription_type in (
        'comum',
        'amarela',
        'azul',
        'branca'
      )
    ),

  constraint medication_regulatory_rule_exceptions_effective_range_check
    check (
      effective_from is null
      or effective_until is null
      or effective_until >= effective_from
    )
);


-- ============================================================
-- ÍNDICES
-- ============================================================

create index if not exists medication_regulatory_rule_exceptions_rule_idx
  on public.medication_regulatory_rule_exceptions (
    regulatory_rule_id
  );

create index if not exists medication_regulatory_rule_exceptions_source_idx
  on public.medication_regulatory_rule_exceptions (
    source_version_id
  );

create index if not exists medication_regulatory_rule_exceptions_effective_idx
  on public.medication_regulatory_rule_exceptions (
    effective_from,
    effective_until
  );

create index if not exists medication_regulatory_rule_exceptions_conditions_gin_idx
  on public.medication_regulatory_rule_exceptions
  using gin (
    conditions
  );


-- ============================================================
-- RLS
--
-- Catálogo global.
--
-- anon/authenticated:
--   SELECT permitido.
--
-- INSERT/UPDATE/DELETE:
--   nenhuma policy comum.
--
-- Escrita administrativa continua destinada ao service_role.
-- ============================================================

alter table public.medication_regulatory_rule_exceptions
  enable row level security;

drop policy if exists medication_regulatory_rule_exceptions_read
  on public.medication_regulatory_rule_exceptions;

create policy medication_regulatory_rule_exceptions_read
  on public.medication_regulatory_rule_exceptions
  for select
  to anon, authenticated
  using (true);


-- ============================================================
-- DOCUMENTAÇÃO
-- ============================================================

comment on table public.medication_regulatory_rule_exceptions is
  'Exceções condicionais e versionadas das regras regulatórias de medicamentos. São avaliadas de forma determinística pelo Medication Intelligence.';

comment on column public.medication_regulatory_rule_exceptions.regulatory_rule_id is
  'Regra regulatória base à qual esta exceção pertence.';

comment on column public.medication_regulatory_rule_exceptions.condition_schema_version is
  'Versão do contrato JSON utilizado em conditions.';

comment on column public.medication_regulatory_rule_exceptions.conditions is
  'Array de condições estruturadas avaliadas com semântica AND. Ausência de dados necessários deve resultar em estado unknown no consumidor.';

comment on column public.medication_regulatory_rule_exceptions.override_prescription_model is
  'Modelo regulatório que substitui a regra-base quando a exceção é aplicável.';

comment on column public.medication_regulatory_rule_exceptions.override_vault_prescription_type is
  'Tradução opcional do override para a abstração visual atual do Vault: comum, amarela, azul ou branca.';

comment on column public.medication_regulatory_rule_exceptions.source_version_id is
  'Fonte/versionamento específico que sustenta esta exceção regulatória.';

comment on column public.medication_regulatory_rule_exceptions.effective_from is
  'Início conhecido da vigência da exceção.';

comment on column public.medication_regulatory_rule_exceptions.effective_until is
  'Fim conhecido da vigência da exceção.';

comment on column public.medication_regulatory_rule_exceptions.verified_at is
  'Momento em que a regra foi verificada contra a fonte informada.';

