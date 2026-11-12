-- M135: alinha o contrato já publicado pelo cliente com o schema remoto.
-- Migração aditiva, idempotente, sem reescrever histórico nem relaxar RLS.

alter table public.farmacias
  add column if not exists tipo text,
  add column if not exists is_sus boolean not null default false;

comment on column public.farmacias.tipo is
  'Natureza informada da unidade: particular, sus ou posto.';

comment on column public.farmacias.is_sus is
  'Marcador explícito de unidade pública/SUS; não altera registros históricos.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.farmacias'::regclass
      and conname = 'farmacias_tipo_check'
  ) then
    alter table public.farmacias
      add constraint farmacias_tipo_check
      check (tipo is null or tipo in ('particular', 'sus', 'posto'))
      not valid;
  end if;
end $$;

alter table public.farmacias validate constraint farmacias_tipo_check;
