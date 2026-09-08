-- supabase/migrations/20260908_expand_medication_regulatory_models.sql

-- ============================================================
-- VAULT — REGULATORY MODELS FOUNDATION
--
-- Apenas estrutura.
-- Nenhuma regra é inferida ou populada nesta migration.
-- ============================================================

alter table public.medication_regulatory_rules
  add column if not exists prescription_model_code text;

alter table public.medication_regulatory_rule_exceptions
  add column if not exists override_prescription_model_code text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'medication_regulatory_rules_prescription_model_code_check'
  ) then
    alter table public.medication_regulatory_rules
      add constraint medication_regulatory_rules_prescription_model_code_check
      check (
        prescription_model_code is null
        or prescription_model_code in (
          'notificacao_a',
          'notificacao_b',
          'notificacao_b2',
          'notificacao_retinoides',
          'notificacao_talidomida',
          'receita_controle_especial',
          'receita_comum',
          'other'
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'medication_regulatory_rule_exceptions_model_code_check'
  ) then
    alter table public.medication_regulatory_rule_exceptions
      add constraint medication_regulatory_rule_exceptions_model_code_check
      check (
        override_prescription_model_code is null
        or override_prescription_model_code in (
          'notificacao_a',
          'notificacao_b',
          'notificacao_b2',
          'notificacao_retinoides',
          'notificacao_talidomida',
          'receita_controle_especial',
          'receita_comum',
          'other'
        )
      );
  end if;
end
$$;

comment on column
  public.medication_regulatory_rules.prescription_model_code
is
  'Código estruturado do modelo regulatório oficial, separado do vault_prescription_type.';

comment on column
  public.medication_regulatory_rule_exceptions.override_prescription_model_code
is
  'Override estruturado do modelo regulatório oficial.';
