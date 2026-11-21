-- VAULT A4: additive extension of the canonical A1 treatment event authority.
-- MUST be applied and verified in vault-app before publishing A4 client code.
-- No new ledger/table, no backfill, no writes to medicine/stock/DoseLog.
begin;

alter table public.a1_treatment_phases add column if not exists regime_a4 jsonb;

-- Existing rows retain NULL (unknown). Never infer a regime from text or current drug profile.
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.a1_treatment_phases'::regclass and conname='vault_a4_regime_object') then
    alter table public.a1_treatment_phases add constraint vault_a4_regime_object
      check (regime_a4 is null or (jsonb_typeof(regime_a4)='object' and octet_length(regime_a4::text)<=8192));
  end if;
end $$;

create or replace function public.vault_a4_validate_regime()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_key text;
  v_target text;
begin
  -- A1 event is append-only. Retries may send an identical payload; edits must record a NEW event.
  if TG_OP='UPDATE' and (
    new.regime_a4 is distinct from old.regime_a4
    or (old.regime_a4 is not null and (
      new.user_id is distinct from old.user_id
      or new.person_id is distinct from old.person_id
      or new.tratamento_id is distinct from old.tratamento_id
      or new.data_efetiva is distinct from old.data_efetiva
      or new.tipo is distinct from old.tipo
      or new.origem is distinct from old.origem
      or new.titulo is distinct from old.titulo
      or new.profissional_id is distinct from old.profissional_id
      or new.observacoes is distinct from old.observacoes
    ))
  ) then
    raise exception 'A4: uma fase já registrada não pode ser reescrita; registre um novo evento';
  end if;
  if new.regime_a4 is null then return new; end if;
  if jsonb_typeof(new.regime_a4) <> 'object' or new.regime_a4->>'versao' is distinct from '1' then
    raise exception 'A4: formato da versão de regime inválido';
  end if;
  if coalesce(new.regime_a4->>'natureza','') not in ('temporario','continuo','nao_informado') then
    raise exception 'A4: natureza declarada inválida';
  end if;
  if nullif(new.regime_a4->>'fim_previsto','') is not null then
    if new.regime_a4->>'fim_previsto' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      raise exception 'A4: data de revisão inválida';
    end if;
    begin
      if (new.regime_a4->>'fim_previsto')::date < new.data_efetiva then
        raise exception 'A4: revisão anterior ao evento registrado';
      end if;
    exception when invalid_datetime_format or datetime_field_overflow then
      raise exception 'A4: data de revisão inválida';
    end;
  end if;
  if jsonb_typeof(new.regime_a4->'horarios') is distinct from 'array' then
    raise exception 'A4: horários obrigatoriamente são uma lista';
  end if;
  if jsonb_array_length(new.regime_a4->'horarios') > 12 then
    raise exception 'A4: horários acima do limite';
  end if;
  if exists (select 1 from jsonb_array_elements(new.regime_a4->'horarios') as h(v)
             where jsonb_typeof(h.v) <> 'string' or h.v #>> '{}' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') then
    raise exception 'A4: horário fora do padrão HH:mm';
  end if;
  if (select count(*) <> count(distinct v) from jsonb_array_elements_text(new.regime_a4->'horarios') h(v)) then
    raise exception 'A4: horários duplicados';
  end if;
  if (nullif(new.regime_a4->>'dose_texto','') is not null
      or nullif(new.regime_a4->>'frequencia_texto','') is not null
      or nullif(new.regime_a4->>'via','') is not null
      or jsonb_array_length(new.regime_a4->'horarios')>0)
    and nullif(new.regime_a4->>'medicamento_id','') is null then
    raise exception 'A4: doses/horários exigem vínculo ao medicamento real';
  end if;
  if new.regime_a4 ? 'lateralidade' and new.regime_a4->>'lateralidade' is not null
     and new.regime_a4->>'lateralidade' not in ('esquerda','direita','bilateral','nao_aplicavel') then
    raise exception 'A4: lateralidade inválida';
  end if;

  -- Relationship IDs must refer to the SAME account and person. Never trust client JSON alone.
  foreach v_key in array array['medicamento_id','consulta_id','documento_id'] loop
    v_target := nullif(new.regime_a4->>v_key, '');
    if v_target is null then continue; end if;
    begin
      v_id:=v_target::uuid;
    exception when invalid_text_representation then
      raise exception 'A4: referência inválida para %', v_key;
    end;
    if v_key='medicamento_id' then
      if not exists(select 1 from public.medicamentos x where x.id=v_id and x.user_id=new.user_id and x.person_id=new.person_id) then
        raise exception 'A4: medicamento de outra pessoa ou ausente';
      end if;
    elsif v_key='consulta_id' then
      if not exists(select 1 from public.consultas x where x.id=v_id and x.user_id=new.user_id and x.person_id=new.person_id) then
        raise exception 'A4: consulta de outra pessoa ou ausente';
      end if;
    else
      if not exists(select 1 from public.documents x where x.id=v_id and x.user_id=new.user_id and x.person_id=new.person_id) then
        raise exception 'A4: documento de outra pessoa ou ausente';
      end if;
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.vault_a4_validate_regime() from public, anon;
-- Trigger functions aren't callable directly by clients. New ownership stays with existing A1 RLS policies.
drop trigger if exists vault_a4_phase_regime_guard on public.a1_treatment_phases;
create trigger vault_a4_phase_regime_guard
before insert or update on public.a1_treatment_phases
for each row execute function public.vault_a4_validate_regime();

commit;

-- Read-only verification, not a substitute for RLS-negative E2E with 2 accounts / 2 persons:
-- select column_name,data_type from information_schema.columns where table_schema='public' and table_name='a1_treatment_phases' and column_name='regime_a4';
-- select tgname from pg_trigger where tgrelid='public.a1_treatment_phases'::regclass and not tgisinternal;
