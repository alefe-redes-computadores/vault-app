-- supabase/migrations/20260909_add_retiradas_reagendamentos.sql

alter table public.retiradas
  add column if not exists reagendamentos jsonb not null default '[]'::jsonb;

alter table public.retiradas
  drop constraint if exists retiradas_reagendamentos_array_check;

alter table public.retiradas
  add constraint retiradas_reagendamentos_array_check
  check (
    jsonb_typeof(
      reagendamentos
    ) = 'array'
  );

comment on column public.retiradas.reagendamentos is
  'Histórico append-only de alterações de data/horário do compromisso de retirada, com motivo opcional e timestamp do reagendamento.';
