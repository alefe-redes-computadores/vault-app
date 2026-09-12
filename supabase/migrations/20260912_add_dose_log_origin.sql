-- Vault V7 — origem explícita de registros de dose
alter table public.dose_logs
  add column if not exists dose_kind text,
  add column if not exists motivo text;

alter table public.dose_logs
  drop constraint if exists dose_logs_dose_kind_check;

alter table public.dose_logs
  add constraint dose_logs_dose_kind_check
  check (dose_kind is null or dose_kind in ('scheduled', 'sos', 'extra'));

comment on column public.dose_logs.dose_kind is
  'Origem declarada do evento: scheduled, sos ou extra. NULL preserva registros legados.';

comment on column public.dose_logs.motivo is
  'Contexto opcional informado pelo usuário; não é inferido pelo Vault.';
