-- supabase/migrations/20260902_add_medicamento_lembrete_receita.sql

alter table public.medicamentos
  add column if not exists lembrete_receita_modo text not null default 'automatico',
  add column if not exists lembrete_receita_data date null;

alter table public.medicamentos
  drop constraint if exists medicamentos_lembrete_receita_modo_check;

alter table public.medicamentos
  add constraint medicamentos_lembrete_receita_modo_check
  check (
    lembrete_receita_modo in (
      'automatico',
      '7_dias',
      '15_dias',
      'data_personalizada'
    )
  );

alter table public.medicamentos
  drop constraint if exists medicamentos_lembrete_receita_data_check;

alter table public.medicamentos
  add constraint medicamentos_lembrete_receita_data_check
  check (
    lembrete_receita_modo = 'data_personalizada'
    or lembrete_receita_data is null
  );
