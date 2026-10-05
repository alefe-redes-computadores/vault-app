alter table public.settings add column if not exists brain_v5_alert_ledger jsonb not null default '[]'::jsonb;
comment on column public.settings.brain_v5_alert_ledger is 'Brain V5: ledger person-scoped de alertas, estado, feedback, recorrência e snapshot explicável.';
alter table public.settings add constraint settings_brain_v5_alert_ledger_is_array check (jsonb_typeof(brain_v5_alert_ledger)='array') not valid;
alter table public.settings validate constraint settings_brain_v5_alert_ledger_is_array;
