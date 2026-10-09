alter table public.medicamentos
  add column if not exists catalog_snapshot jsonb;

comment on column public.medicamentos.catalog_snapshot is
  'Snapshot canônico V99 da identidade farmacêutica e regra regulatória; cache sincronizado, monotônico e versionado.';
