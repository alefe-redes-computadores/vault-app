-- supabase/migrations/20260905_create_medication_catalog.sql

-- ============================================================
-- VAULT — CATÁLOGO MESTRE DE MEDICAMENTOS
--
-- Catálogo global de referência.
-- Não pertence a user_id nem person_id.
--
-- Objetivos:
-- - nomes canônicos;
-- - princípio ativo;
-- - marcas / genéricos / similares;
-- - aliases;
-- - apresentações;
-- - regras regulatórias versionadas;
-- - busca aproximada;
-- - rastreabilidade da fonte.
--
-- Escrita deve acontecer por processo administrativo/importador.
-- Usuários do aplicativo recebem somente leitura.
-- ============================================================

create extension if not exists pg_trgm;

-- ============================================================
-- 1. VERSÕES / FONTES DO CATÁLOGO
-- ============================================================

create table if not exists public.medication_catalog_versions (
  id uuid primary key default gen_random_uuid(),

  source_key text not null,
  source_name text not null,

  source_url text null,

  version text not null,

  published_at timestamptz null,
  imported_at timestamptz not null default now(),

  active boolean not null default false,

  notes text null,

  created_at timestamptz not null default now(),

  constraint medication_catalog_versions_source_key_check
    check (length(trim(source_key)) > 0),

  constraint medication_catalog_versions_source_name_check
    check (length(trim(source_name)) > 0),

  constraint medication_catalog_versions_version_check
    check (length(trim(version)) > 0),

  constraint medication_catalog_versions_source_version_unique
    unique (source_key, version)
);

create unique index if not exists medication_catalog_versions_one_active_per_source_idx
  on public.medication_catalog_versions (source_key)
  where active = true;

create index if not exists medication_catalog_versions_active_idx
  on public.medication_catalog_versions (active);

-- ============================================================
-- 2. SUBSTÂNCIAS / PRINCÍPIOS ATIVOS
-- ============================================================

create table if not exists public.medication_substances (
  id uuid primary key default gen_random_uuid(),

  canonical_name text not null,
  canonical_name_normalized text not null,

  source_version_id uuid null
    references public.medication_catalog_versions(id)
    on delete set null,

  external_id text null,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint medication_substances_canonical_name_check
    check (length(trim(canonical_name)) > 0),

  constraint medication_substances_canonical_name_normalized_check
    check (length(trim(canonical_name_normalized)) > 0),

  constraint medication_substances_canonical_name_normalized_unique
    unique (canonical_name_normalized)
);

create index if not exists medication_substances_source_version_idx
  on public.medication_substances (source_version_id);

create index if not exists medication_substances_active_idx
  on public.medication_substances (active);

create index if not exists medication_substances_name_trgm_idx
  on public.medication_substances
  using gin (canonical_name_normalized gin_trgm_ops);

-- ============================================================
-- 3. PRODUTOS
--
-- product_kind:
-- brand   = medicamento de marca
-- generic = genérico
-- similar = similar
-- other   = classificação não mapeada / outra origem válida
-- ============================================================

create table if not exists public.medication_products (
  id uuid primary key default gen_random_uuid(),

  substance_id uuid not null
    references public.medication_substances(id)
    on delete cascade,

  product_name text not null,
  product_name_normalized text not null,

  product_kind text not null default 'other',

  manufacturer text null,
  registration_number text null,

  source_version_id uuid null
    references public.medication_catalog_versions(id)
    on delete set null,

  external_id text null,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint medication_products_name_check
    check (length(trim(product_name)) > 0),

  constraint medication_products_name_normalized_check
    check (length(trim(product_name_normalized)) > 0),

  constraint medication_products_kind_check
    check (
      product_kind in (
        'brand',
        'generic',
        'similar',
        'other'
      )
    )
);

create index if not exists medication_products_substance_idx
  on public.medication_products (substance_id);

create index if not exists medication_products_source_version_idx
  on public.medication_products (source_version_id);

create index if not exists medication_products_active_idx
  on public.medication_products (active);

create index if not exists medication_products_name_normalized_idx
  on public.medication_products (product_name_normalized);

create index if not exists medication_products_name_trgm_idx
  on public.medication_products
  using gin (product_name_normalized gin_trgm_ops);

create unique index if not exists medication_products_registration_number_unique_idx
  on public.medication_products (registration_number)
  where registration_number is not null;

-- ============================================================
-- 4. ALIASES
--
-- Um alias pode apontar para substância OU produto.
-- Nunca para ambos e nunca para nenhum.
-- ============================================================

create table if not exists public.medication_aliases (
  id uuid primary key default gen_random_uuid(),

  substance_id uuid null
    references public.medication_substances(id)
    on delete cascade,

  product_id uuid null
    references public.medication_products(id)
    on delete cascade,

  alias text not null,
  alias_normalized text not null,

  alias_kind text not null default 'other',

  source_version_id uuid null
    references public.medication_catalog_versions(id)
    on delete set null,

  created_at timestamptz not null default now(),

  constraint medication_aliases_alias_check
    check (length(trim(alias)) > 0),

  constraint medication_aliases_alias_normalized_check
    check (length(trim(alias_normalized)) > 0),

  constraint medication_aliases_target_check
    check (
      (
        substance_id is not null
        and product_id is null
      )
      or
      (
        substance_id is null
        and product_id is not null
      )
    ),

  constraint medication_aliases_kind_check
    check (
      alias_kind in (
        'synonym',
        'abbreviation',
        'legacy_name',
        'commercial_name',
        'other'
      )
    )
);

create index if not exists medication_aliases_substance_idx
  on public.medication_aliases (substance_id);

create index if not exists medication_aliases_product_idx
  on public.medication_aliases (product_id);

create index if not exists medication_aliases_source_version_idx
  on public.medication_aliases (source_version_id);

create index if not exists medication_aliases_normalized_idx
  on public.medication_aliases (alias_normalized);

create index if not exists medication_aliases_trgm_idx
  on public.medication_aliases
  using gin (alias_normalized gin_trgm_ops);

-- ============================================================
-- 5. APRESENTAÇÕES
--
-- Mantemos:
-- - texto original;
-- - valor/unidade quando extraíveis com segurança;
-- - forma farmacêutica;
-- - detalhes da embalagem.
--
-- Não assumimos que "dose prescrita" seja igual a
-- "concentração comercial".
-- ============================================================

create table if not exists public.medication_presentations (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null
    references public.medication_products(id)
    on delete cascade,

  presentation_label text not null,

  concentration_value numeric null,
  concentration_unit text null,

  pharmaceutical_form text null,
  pharmaceutical_form_normalized text null,

  package_description text null,

  source_version_id uuid null
    references public.medication_catalog_versions(id)
    on delete set null,

  external_id text null,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint medication_presentations_label_check
    check (length(trim(presentation_label)) > 0),

  constraint medication_presentations_concentration_value_check
    check (
      concentration_value is null
      or concentration_value > 0
    )
);

create index if not exists medication_presentations_product_idx
  on public.medication_presentations (product_id);

create index if not exists medication_presentations_source_version_idx
  on public.medication_presentations (source_version_id);

create index if not exists medication_presentations_active_idx
  on public.medication_presentations (active);

create index if not exists medication_presentations_concentration_idx
  on public.medication_presentations (
    concentration_value,
    concentration_unit
  );

create index if not exists medication_presentations_form_idx
  on public.medication_presentations (
    pharmaceutical_form_normalized
  );

-- ============================================================
-- 6. REGRAS REGULATÓRIAS
--
-- A regra fica ligada à substância, não diretamente ao nome
-- comercial.
--
-- vault_prescription_type traduz a regra regulatória para
-- a abstração visual atual do Vault:
-- comum | amarela | azul | branca
--
-- regulatory_class guarda a classificação oficial/original.
--
-- effective_from / effective_until permitem preservar histórico.
-- ============================================================

create table if not exists public.medication_regulatory_rules (
  id uuid primary key default gen_random_uuid(),

  substance_id uuid not null
    references public.medication_substances(id)
    on delete cascade,

  regulatory_class text null,

  prescription_model text null,

  vault_prescription_type text null,

  source_version_id uuid not null
    references public.medication_catalog_versions(id)
    on delete restrict,

  effective_from date null,
  effective_until date null,

  verified_at timestamptz not null default now(),

  notes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint medication_regulatory_rules_vault_prescription_type_check
    check (
      vault_prescription_type is null
      or vault_prescription_type in (
        'comum',
        'amarela',
        'azul',
        'branca'
      )
    ),

  constraint medication_regulatory_rules_effective_range_check
    check (
      effective_from is null
      or effective_until is null
      or effective_until >= effective_from
    )
);

create index if not exists medication_regulatory_rules_substance_idx
  on public.medication_regulatory_rules (substance_id);

create index if not exists medication_regulatory_rules_source_version_idx
  on public.medication_regulatory_rules (source_version_id);

create index if not exists medication_regulatory_rules_effective_idx
  on public.medication_regulatory_rules (
    effective_from,
    effective_until
  );

-- ============================================================
-- 7. RLS
--
-- Catálogo global:
-- leitura permitida para anon/authenticated.
--
-- Nenhuma policy de INSERT/UPDATE/DELETE é criada.
-- Assim, usuários comuns do aplicativo não alteram a fonte.
-- Processos administrativos podem usar service_role.
-- ============================================================

alter table public.medication_catalog_versions
  enable row level security;

alter table public.medication_substances
  enable row level security;

alter table public.medication_products
  enable row level security;

alter table public.medication_aliases
  enable row level security;

alter table public.medication_presentations
  enable row level security;

alter table public.medication_regulatory_rules
  enable row level security;

drop policy if exists medication_catalog_versions_read
  on public.medication_catalog_versions;

create policy medication_catalog_versions_read
  on public.medication_catalog_versions
  for select
  to anon, authenticated
  using (true);

drop policy if exists medication_substances_read
  on public.medication_substances;

create policy medication_substances_read
  on public.medication_substances
  for select
  to anon, authenticated
  using (true);

drop policy if exists medication_products_read
  on public.medication_products;

create policy medication_products_read
  on public.medication_products
  for select
  to anon, authenticated
  using (true);

drop policy if exists medication_aliases_read
  on public.medication_aliases;

create policy medication_aliases_read
  on public.medication_aliases
  for select
  to anon, authenticated
  using (true);

drop policy if exists medication_presentations_read
  on public.medication_presentations;

create policy medication_presentations_read
  on public.medication_presentations
  for select
  to anon, authenticated
  using (true);

drop policy if exists medication_regulatory_rules_read
  on public.medication_regulatory_rules;

create policy medication_regulatory_rules_read
  on public.medication_regulatory_rules
  for select
  to anon, authenticated
  using (true);

-- ============================================================
-- 8. DOCUMENTAÇÃO DO SCHEMA
-- ============================================================

comment on table public.medication_catalog_versions is
  'Versões e fontes importadas do catálogo global de medicamentos do Vault.';

comment on table public.medication_substances is
  'Substâncias/princípios ativos canônicos usados pelo Medication Intelligence.';

comment on table public.medication_products is
  'Produtos comerciais, genéricos, similares e outras apresentações nomeadas ligados a uma substância.';

comment on table public.medication_aliases is
  'Aliases e nomes alternativos para localizar substâncias ou produtos sem tratar nomes válidos como erro.';

comment on table public.medication_presentations is
  'Apresentações comerciais e formas farmacêuticas dos produtos do catálogo.';

comment on table public.medication_regulatory_rules is
  'Histórico versionado das regras regulatórias ligadas às substâncias.';

comment on column public.medication_regulatory_rules.vault_prescription_type is
  'Tradução da regra regulatória para a abstração visual atual do Vault; não é a fonte regulatória original.';
