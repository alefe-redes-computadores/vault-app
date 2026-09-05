-- supabase/migrations/20260905_add_medication_commercial_identities.sql

-- ============================================================
-- VAULT — IDENTIDADES COMERCIAIS HISTÓRICAS
--
-- Objetivo:
-- representar uma identidade comercial reconhecível ao longo
-- de diferentes registros regulatórios/históricos sem fundir
-- produtos oficiais distintos.
--
-- Exemplo:
--
-- VENVANSE
-- ├── registro atual
-- └── registro histórico
--
-- A identidade NÃO substitui medication_products.
-- Produtos continuam sendo os registros oficiais concretos.
-- ============================================================

create table if not exists public.medication_commercial_identities (
  id uuid primary key default gen_random_uuid(),

  canonical_name text not null,
  canonical_name_normalized text not null,

  current_product_id uuid null
    references public.medication_products(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint medication_commercial_identities_name_check
    check (
      length(trim(canonical_name)) > 0
    ),

  constraint medication_commercial_identities_name_normalized_check
    check (
      length(trim(canonical_name_normalized)) > 0
    ),

  constraint medication_commercial_identities_name_unique
    unique (canonical_name_normalized)
);

create index if not exists medication_commercial_identities_current_product_idx
  on public.medication_commercial_identities(current_product_id);

create index if not exists medication_commercial_identities_name_trgm_idx
  on public.medication_commercial_identities
  using gin (canonical_name_normalized gin_trgm_ops);

-- ============================================================
-- MEMBROS DA IDENTIDADE
--
-- relationship_type:
-- current    = produto atual
-- historical = registro histórico/inativo
--
-- confidence:
-- high   = agrupamento por nome + substância segura
-- medium = reservado para futuros agrupamentos revisados
-- ============================================================

create table if not exists public.medication_product_identity_memberships (
  identity_id uuid not null
    references public.medication_commercial_identities(id)
    on delete cascade,

  product_id uuid not null
    references public.medication_products(id)
    on delete cascade,

  relationship_type text not null,

  confidence text not null default 'high',

  evidence text null,

  created_at timestamptz not null default now(),

  primary key (
    identity_id,
    product_id
  ),

  constraint medication_product_identity_memberships_relationship_check
    check (
      relationship_type in (
        'current',
        'historical'
      )
    ),

  constraint medication_product_identity_memberships_confidence_check
    check (
      confidence in (
        'high',
        'medium'
      )
    )
);

create unique index if not exists medication_product_identity_memberships_product_unique_idx
  on public.medication_product_identity_memberships(product_id);

create index if not exists medication_product_identity_memberships_identity_idx
  on public.medication_product_identity_memberships(identity_id);

create index if not exists medication_product_identity_memberships_relationship_idx
  on public.medication_product_identity_memberships(relationship_type);

-- ============================================================
-- RLS
--
-- Catálogo global:
-- somente leitura para anon/authenticated.
-- Escrita continua administrativa.
-- ============================================================

alter table public.medication_commercial_identities
  enable row level security;

alter table public.medication_product_identity_memberships
  enable row level security;

drop policy if exists medication_commercial_identities_read
  on public.medication_commercial_identities;

create policy medication_commercial_identities_read
  on public.medication_commercial_identities
  for select
  to anon, authenticated
  using (true);

drop policy if exists medication_product_identity_memberships_read
  on public.medication_product_identity_memberships;

create policy medication_product_identity_memberships_read
  on public.medication_product_identity_memberships
  for select
  to anon, authenticated
  using (true);

comment on table public.medication_commercial_identities is
  'Identidades comerciais históricas que agrupam registros regulatórios distintos de uma mesma marca quando houver evidência segura.';

comment on table public.medication_product_identity_memberships is
  'Relações entre produtos regulatórios concretos e identidades comerciais históricas do catálogo do Vault.';

comment on column public.medication_commercial_identities.current_product_id is
  'Produto atualmente ativo escolhido somente quando houver exatamente um membro ativo seguro.';

comment on column public.medication_product_identity_memberships.evidence is
  'Descrição resumida da evidência usada para formar o agrupamento.';
