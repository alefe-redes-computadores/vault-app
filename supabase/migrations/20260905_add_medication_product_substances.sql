-- supabase/migrations/20260905_add_medication_product_substances.sql

-- ============================================================
-- VAULT — RELAÇÃO N:N PRODUTO ↔ SUBSTÂNCIAS
--
-- Um produto pode conter uma ou várias substâncias/princípios
-- ativos. O modelo anterior medication_products.substance_id
-- representava apenas 1:N e não era suficiente para combinações.
-- ============================================================

create table if not exists public.medication_product_substances (
  product_id uuid not null
    references public.medication_products(id)
    on delete cascade,

  substance_id uuid not null
    references public.medication_substances(id)
    on delete cascade,

  source_version_id uuid null
    references public.medication_catalog_versions(id)
    on delete set null,

  external_substance_id text null,

  position integer null,

  is_primary boolean not null default false,

  created_at timestamptz not null default now(),

  primary key (
    product_id,
    substance_id
  ),

  constraint medication_product_substances_position_check
    check (
      position is null
      or position > 0
    )
);

create index if not exists medication_product_substances_product_idx
  on public.medication_product_substances(product_id);

create index if not exists medication_product_substances_substance_idx
  on public.medication_product_substances(substance_id);

create index if not exists medication_product_substances_source_version_idx
  on public.medication_product_substances(source_version_id);

-- ============================================================
-- BACKFILL DE SEGURANÇA
--
-- Hoje o catálogo ainda deveria estar vazio, mas este backfill
-- preserva qualquer relação que eventualmente tenha sido criada.
-- ============================================================

insert into public.medication_product_substances (
  product_id,
  substance_id,
  source_version_id,
  is_primary
)
select
  p.id,
  p.substance_id,
  p.source_version_id,
  true
from public.medication_products p
where p.substance_id is not null
on conflict (
  product_id,
  substance_id
)
do nothing;

-- ============================================================
-- REMOÇÃO DA RELAÇÃO ANTIGA
-- ============================================================

alter table public.medication_products
  drop column if exists substance_id;

-- ============================================================
-- RLS
-- ============================================================

alter table public.medication_product_substances
  enable row level security;

drop policy if exists medication_product_substances_read
  on public.medication_product_substances;

create policy medication_product_substances_read
  on public.medication_product_substances
  for select
  to anon, authenticated
  using (true);

comment on table public.medication_product_substances is
  'Relação N:N entre produtos e substâncias/princípios ativos do catálogo global de medicamentos do Vault.';

comment on column public.medication_product_substances.external_substance_id is
  'ID original da substância na fonte importada quando disponível.';

comment on column public.medication_product_substances.position is
  'Posição original da substância quando a fonte fornecer ordem confiável.';

comment on column public.medication_product_substances.is_primary is
  'Marca uma substância principal apenas quando essa informação estiver explicitamente disponível na fonte.';
