-- V100 — completa a autoridade regulatória já presente na fonte ANVISA.
--
-- O produto PRISTIQ já está ligado à substância canônica
-- "succinato de desvenlafaxina monoidratado". A fonte regulatória ativa lista
-- desvenlafaxina em C1; este patch apenas materializa a regra ausente no mesmo
-- modelo usado pelas demais substâncias, sem depender de IDs gerados.

insert into public.medication_regulatory_rules (
  substance_id,
  regulatory_class,
  prescription_model,
  vault_prescription_type,
  source_version_id,
  effective_from,
  verified_at,
  notes,
  prescription_model_code
)
select
  substance.id,
  'C1',
  'Receita de Controle Especial em duas vias',
  'branca',
  source.id,
  current_date,
  now(),
  'Desvenlafaxina consta na Lista C1 da fonte ANVISA ativa; regra aplicada à forma farmacêutica canônica vinculada aos produtos.',
  'receita_controle_especial'
from public.medication_substances as substance
cross join lateral (
  select version.id
  from public.medication_catalog_versions as version
  where version.source_key = 'anvisa_controlled_substances'
    and version.active = true
  order by version.imported_at desc
  limit 1
) as source
where substance.canonical_name_normalized =
  'succinato de desvenlafaxina monoidratado'
  and substance.active = true
  and not exists (
    select 1
    from public.medication_regulatory_rules as existing
    where existing.substance_id = substance.id
      and existing.regulatory_class = 'C1'
      and existing.effective_until is null
  );
