-- supabase/migrations/20260908_improve_medication_catalog_search_v2.sql

-- ============================================================
-- VAULT — MEDICATION CATALOG SEARCH V2
--
-- Prioridade:
-- 1. igualdade
-- 2. prefixo
-- 3. termo contido
-- 4. fuzzy legado
--
-- Exemplo:
-- "metadona" encontra "cloridrato de metadona".
-- ============================================================

create or replace function public.search_medication_catalog_fuzzy_legacy(
  p_query text,
  p_limit integer default 10,
  p_min_score real default 0.30
)
returns table (
  reference_id uuid,
  reference_type text,
  matched_text text,
  score real
)
language sql
stable
security invoker
set search_path = public
as $$
  with query_value as (
    select
      lower(trim(coalesce(p_query, ''))) as value
  ),

  candidates as (
    -- ========================================================
    -- SUBSTÂNCIAS
    -- ========================================================

    select
      s.id as reference_id,
      'substance'::text as reference_type,
      s.canonical_name as matched_text,

      case
        when s.canonical_name_normalized = q.value
          then 1::real
        else
          similarity(
            s.canonical_name_normalized,
            q.value
          )::real
      end as score

    from public.medication_substances s
    cross join query_value q

    where
      s.active = true
      and q.value <> ''
      and (
        s.canonical_name_normalized = q.value
        or similarity(
          s.canonical_name_normalized,
          q.value
        ) >= p_min_score
      )

    union all

    -- ========================================================
    -- PRODUTOS / MARCAS / GENÉRICOS / SIMILARES
    -- ========================================================

    select
      p.id as reference_id,
      'product'::text as reference_type,
      p.product_name as matched_text,

      case
        when p.product_name_normalized = q.value
          then 1::real
        else
          similarity(
            p.product_name_normalized,
            q.value
          )::real
      end as score

    from public.medication_products p
    cross join query_value q

    where
      p.active = true
      and q.value <> ''
      and (
        p.product_name_normalized = q.value
        or similarity(
          p.product_name_normalized,
          q.value
        ) >= p_min_score
      )

    union all

    -- ========================================================
    -- ALIASES
    -- ========================================================

    select
      coalesce(
        a.product_id,
        a.substance_id
      ) as reference_id,

      case
        when a.product_id is not null
          then 'product'
        else
          'substance'
      end::text as reference_type,

      a.alias as matched_text,

      case
        when a.alias_normalized = q.value
          then 1::real
        else
          similarity(
            a.alias_normalized,
            q.value
          )::real
      end as score

    from public.medication_aliases a
    cross join query_value q

    where
      q.value <> ''
      and (
        a.alias_normalized = q.value
        or similarity(
          a.alias_normalized,
          q.value
        ) >= p_min_score
      )
  ),

  ranked as (
    select
      c.*,

      row_number() over (
        partition by
          c.reference_type,
          c.reference_id

        order by
          c.score desc,
          c.matched_text asc
      ) as rn

    from candidates c
  )

  select
    r.reference_id,
    r.reference_type,
    r.matched_text,
    r.score

  from ranked r

  where
    r.rn = 1

  order by
    r.score desc,
    r.matched_text asc

  limit greatest(
    1,
    least(
      coalesce(
        p_limit,
        10
      ),
      50
    )
  );
$$;

create or replace function public.search_medication_catalog(
  p_query text,
  p_limit integer default 10,
  p_min_score real default 0.30
)
returns table (
  reference_id uuid,
  reference_type text,
  matched_text text,
  score real
)
language sql
stable
security invoker
set search_path = public
as $$
  with query_value as (
    select
      lower(
        trim(
          coalesce(
            p_query,
            ''
          )
        )
      ) as value
  ),

  direct_candidates as (
    -- ========================================================
    -- SUBSTÂNCIAS
    -- ========================================================

    select
      s.id as reference_id,
      'substance'::text as reference_type,
      s.canonical_name as matched_text,

      case
        when s.canonical_name_normalized = q.value
          then 1.00::real

        when s.canonical_name_normalized like q.value || '%'
          then 0.98::real

        else 0.94::real
      end as score

    from public.medication_substances s
    cross join query_value q

    where
      s.active = true
      and q.value <> ''
      and (
        s.canonical_name_normalized = q.value
        or s.canonical_name_normalized like q.value || '%'
        or s.canonical_name_normalized like '%' || q.value || '%'
      )

    union all

    -- ========================================================
    -- PRODUTOS
    -- ========================================================

    select
      p.id as reference_id,
      'product'::text as reference_type,
      p.product_name as matched_text,

      case
        when p.product_name_normalized = q.value
          then 1.00::real

        when p.product_name_normalized like q.value || '%'
          then 0.98::real

        else 0.94::real
      end as score

    from public.medication_products p
    cross join query_value q

    where
      p.active = true
      and q.value <> ''
      and (
        p.product_name_normalized = q.value
        or p.product_name_normalized like q.value || '%'
        or p.product_name_normalized like '%' || q.value || '%'
      )
  ),

  fuzzy_candidates as (
    select
      f.reference_id,
      f.reference_type,
      f.matched_text,
      f.score

    from public.search_medication_catalog_fuzzy_legacy(
      p_query,
      greatest(
        p_limit * 3,
        20
      ),
      p_min_score
    ) f
  ),

  combined as (
    select *
    from direct_candidates

    union all

    select *
    from fuzzy_candidates
  ),

  ranked as (
    select
      reference_id,
      reference_type,
      matched_text,
      score,

      row_number() over (
        partition by
          reference_id,
          reference_type
        order by
          score desc,
          matched_text asc
      ) as rn

    from combined
  )

  select
    reference_id,
    reference_type,
    matched_text,
    score

  from ranked

  where rn = 1

  order by
    score desc,
    matched_text asc

  limit greatest(
    1,
    least(
      coalesce(
        p_limit,
        10
      ),
      50
    )
  );
$$;
