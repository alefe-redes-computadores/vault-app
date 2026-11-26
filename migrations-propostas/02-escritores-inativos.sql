-- MACRO02 B: escritores R4 adaptados para implantação gradual e privilégio mínimo.
-- R5 revisão de segurança NÃO CERTIFICADA. Requer PG17, schema real e aceite Guardian.
-- Executar em transação única depois de A. Nenhuma conta é ativada neste arquivo.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DO $$ BEGIN
 IF current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 THEN RAISE EXCEPTION 'MACRO02_REQUIRES_PG17'; END IF;
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'MACRO02_EXPECTED_MIGRATION_ROLE'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='vault_macro02_worker') OR to_regnamespace('vault_macro02_private') IS NOT NULL THEN RAISE EXCEPTION 'MACRO02_OBJECTS_ALREADY_EXIST'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='macro02_expand_guard_dose' AND tgrelid='public.dose_logs'::regclass) OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='macro02_expand_guard_stock' AND tgrelid='public.medicamentos'::regclass) THEN RAISE EXCEPTION 'MACRO02_EXPAND_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM public.dose_logs WHERE unidade_dose IS NOT NULL OR unidade_dose_rotulo IS NOT NULL OR fonte_unidade IS NOT NULL OR estoque_movimento IS NOT NULL OR farmaco_snapshot IS NOT NULL) OR EXISTS(SELECT 1 FROM public.medicamentos WHERE estoque_ciclo_id IS NOT NULL OR macro02_stock_managed) THEN RAISE EXCEPTION 'MACRO02_UNEXPECTED_PREACTIVATION_FACTS'; END IF;
END $$;
CREATE SCHEMA vault_macro02_private;
REVOKE ALL ON SCHEMA vault_macro02_private FROM PUBLIC, anon, authenticated, service_role;

CREATE ROLE vault_macro02_worker NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT vault_macro02_worker TO postgres WITH ADMIN OPTION;
GRANT USAGE,CREATE ON SCHEMA vault_macro02_private TO vault_macro02_worker;
CREATE FUNCTION vault_macro02_private.actor_uid() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT auth.uid() $$;
REVOKE ALL ON FUNCTION vault_macro02_private.actor_uid() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION vault_macro02_private.actor_uid() TO vault_macro02_worker;
CREATE TABLE vault_macro02_private.active_accounts (
 user_id uuid PRIMARY KEY,
 approved_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 guardian_receipt text NOT NULL CHECK(length(btrim(guardian_receipt)) BETWEEN 1 AND 256)
);
ALTER TABLE vault_macro02_private.active_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vault_macro02_private.active_accounts FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON vault_macro02_private.active_accounts TO vault_macro02_worker;
CREATE POLICY macro02_active_read ON vault_macro02_private.active_accounts FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
-- Only returns the caller's own enrolment, including when called by an invoker trigger.
CREATE FUNCTION vault_macro02_private.active_for(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(p_user=vault_macro02_private.actor_uid() AND EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts a WHERE a.user_id=p_user),false)
$$;
ALTER FUNCTION vault_macro02_private.active_for(uuid) OWNER TO vault_macro02_worker;
REVOKE ALL ON FUNCTION vault_macro02_private.active_for(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION vault_macro02_private.active_for(uuid) TO authenticated,service_role;
GRANT USAGE ON SCHEMA vault_macro02_private TO service_role;

-- The RPC gate remains JWT-bound. Trigger checks also cover privileged maintenance
-- without JWT; they must never mistake absence of JWT for an inactive account.
CREATE FUNCTION vault_macro02_private.guard_active_for(p_user uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_user IS NULL THEN RETURN false; END IF;
 IF auth.uid() IS DISTINCT FROM p_user AND NOT coalesce((
   current_setting('role',true) IN ('postgres','service_role')
   OR (current_setting('role',true)='none' AND session_user IN ('postgres','service_role'))
 ),false) THEN RAISE EXCEPTION 'MACRO02_GUARD_SCOPE'; END IF;
 RETURN EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts a WHERE a.user_id=p_user);
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.guard_active_for(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION vault_macro02_private.guard_active_for(uuid) TO authenticated,service_role;

CREATE TABLE vault_macro02_private.dose_commits (
  user_id uuid NOT NULL, person_id uuid NOT NULL, medication_id uuid NOT NULL,
  operation_id uuid NOT NULL, sequence bigint NOT NULL CHECK(sequence>0),
  predecessor uuid, request jsonb NOT NULL, ack jsonb NOT NULL,
  committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(user_id,operation_id)
);
-- This is an idempotency/receipt ledger, NOT a second clinical table or writer.
ALTER TABLE vault_macro02_private.dose_commits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vault_macro02_private.dose_commits FROM PUBLIC, anon, authenticated, service_role;
CREATE INDEX macro02_dose_commit_scope_idx ON vault_macro02_private.dose_commits(user_id,person_id,medication_id,committed_at);

CREATE FUNCTION vault_macro02_private.stock_unit(v text) RETURNS text
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT CASE translate(lower(btrim(v)),'áàâãéêíóôõúüç','aaaaeeiooouuc')
  WHEN 'comprimido' THEN 'tablet' WHEN 'comprimidos' THEN 'tablet' WHEN 'comprimido(s)' THEN 'tablet'
  WHEN 'capsula' THEN 'capsule' WHEN 'capsulas' THEN 'capsule' WHEN 'capsula(s)' THEN 'capsule'
  WHEN 'gota' THEN 'drop' WHEN 'gotas' THEN 'drop' WHEN 'gota(s)' THEN 'drop' WHEN 'ml' THEN 'ml'
  WHEN 'unidade' THEN 'unit' WHEN 'unidades' THEN 'unit' WHEN 'unidade(s)' THEN 'unit'
  WHEN 'aplicacao' THEN 'application' WHEN 'aplicacoes' THEN 'application' WHEN 'aplicacao(oes)' THEN 'application'
  WHEN 'inalacao' THEN 'inhalation' WHEN 'inalacoes' THEN 'inhalation'
  WHEN 'mg' THEN 'mg' WHEN 'mcg' THEN 'mcg' WHEN 'g' THEN 'g' WHEN 'ui' THEN 'iu'
  WHEN 'jato' THEN 'spray' WHEN 'jatos' THEN 'spray' WHEN 'adesivo' THEN 'patch' WHEN 'adesivos' THEN 'patch'
  WHEN 'sache' THEN 'sachet' WHEN 'saches' THEN 'sachet' ELSE NULL END
$$;
REVOKE ALL ON FUNCTION vault_macro02_private.stock_unit(text) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION vault_macro02_private.dose_projection(d public.dose_logs) RETURNS jsonb
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('id',d.id,'user_id',d.user_id,'person_id',d.person_id,'medicamento_id',d.medicamento_id,
 'data',d.data,'horario',d.horario,'quantidade',d.quantidade,'tomado_em',d.tomado_em,'ignorado_em',d.ignorado_em,
 'dose_kind',d.dose_kind,'motivo',d.motivo,'unidade_dose',d.unidade_dose,'unidade_dose_rotulo',d.unidade_dose_rotulo,
 'fonte_unidade',d.fonte_unidade,'estoque_movimento',d.estoque_movimento,'farmaco_snapshot',d.farmaco_snapshot,'created_at',d.created_at,'updated_at',d.updated_at)
$$;
REVOKE ALL ON FUNCTION vault_macro02_private.dose_projection(public.dose_logs) FROM PUBLIC, anon, authenticated, service_role;

-- Typed comparison normalizes timestamptz offsets, rather than comparing wire strings.
CREATE FUNCTION vault_macro02_private.same_dose(a public.dose_logs,b public.dose_logs) RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT vault_macro02_private.dose_projection(a)=vault_macro02_private.dose_projection(b)
$$;
REVOKE ALL ON FUNCTION vault_macro02_private.same_dose(public.dose_logs,public.dose_logs) FROM PUBLIC, anon, authenticated, service_role;

-- Private privileged routine; the invoker wrapper is the only proposed API entry.
-- Explicit ownership checks are mandatory, even when the function owner bypasses RLS.
CREATE FUNCTION vault_macro02_private.commit_dose(p_intent jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 uid uuid := vault_macro02_private.actor_uid(); pid uuid; mid uuid; did uuid; oid uuid; pred uuid; seq bigint;
 m public.medicamentos%ROWTYPE; old public.dose_logs%ROWTYPE; expected public.dose_logs%ROWTYPE;
 next public.dose_logs%ROWTYPE; persisted public.dose_logs%ROWTYPE;
 prior_commit vault_macro02_private.dose_commits%ROWTYPE;
 before_stock jsonb; after_stock jsonb; prior_evidence jsonb; next_evidence jsonb; receipt jsonb;
 previous_exists boolean; after_exists boolean; actual_exists boolean;
 stock_unit text; basis text; old_amount double precision:=0; new_amount double precision:=0;
 delta double precision; server_after double precision; balance double precision; received_balance numeric;
 same_fact boolean; prior_state text; next_state text; result jsonb; ref_after date; rev_after timestamptz;
BEGIN
 IF uid IS NULL OR jsonb_typeof(p_intent) IS DISTINCT FROM 'object' OR (p_intent->>'version') IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'MACRO02_AUTH_OR_VERSION'; END IF;
 IF NOT vault_macro02_private.active_for(uid) THEN RAISE EXCEPTION 'MACRO02_ACCOUNT_NOT_ACTIVATED'; END IF;
 IF NOT (p_intent ?& ARRAY['operationId','sequence','predecessor','previous','after','stockBefore','stockAfter','stockRevisionBefore','stockRevisionAfter','stockReferenceAfter','delta']) THEN RAISE EXCEPTION 'MACRO02_INCOMPLETE'; END IF;
 before_stock:=p_intent->'stockBefore'; after_stock:=p_intent->'stockAfter';
 IF jsonb_typeof(before_stock) IS DISTINCT FROM 'object' OR jsonb_typeof(after_stock) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'MACRO02_STOCK_SHAPE'; END IF;
 IF NOT(before_stock ?& ARRAY['user_id','person_id','medicationId','basis','unit','balance']) OR NOT(after_stock ?& ARRAY['user_id','person_id','medicationId','basis','unit','balance']) THEN RAISE EXCEPTION 'MACRO02_STOCK_SHAPE'; END IF;
 pid:=(before_stock->>'person_id')::uuid; mid:=(before_stock->>'medicationId')::uuid; oid:=(p_intent->>'operationId')::uuid; pred:=(p_intent->>'predecessor')::uuid; seq:=(p_intent->>'sequence')::bigint;
 IF pid IS NULL OR mid IS NULL OR oid IS NULL OR seq IS NULL OR seq<1 OR seq>9007199254740991 OR (before_stock->>'user_id')::uuid IS DISTINCT FROM uid OR pred=oid THEN RAISE EXCEPTION 'MACRO02_SCOPE'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.persons p WHERE p.id=pid AND p.user_id=uid) THEN RAISE EXCEPTION 'MACRO02_PERSON'; END IF;
 SELECT * INTO m FROM public.medicamentos WHERE id=mid AND user_id=uid AND person_id=pid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'MACRO02_MEDICATION'; END IF;
 SELECT * INTO prior_commit FROM vault_macro02_private.dose_commits c WHERE c.user_id=uid AND c.operation_id=oid;
 IF FOUND THEN
   IF prior_commit.person_id<>pid OR prior_commit.medication_id<>mid OR prior_commit.request IS DISTINCT FROM p_intent THEN RAISE EXCEPTION 'MACRO02_REPLAY_CHANGED'; END IF;
   RETURN prior_commit.ack;
 END IF;
 IF pred IS NOT NULL THEN
   SELECT * INTO prior_commit FROM vault_macro02_private.dose_commits c WHERE c.user_id=uid AND c.operation_id=pred AND c.person_id=pid AND c.medication_id=mid;
   IF NOT FOUND OR prior_commit.sequence+1<>seq OR prior_commit.ack->'stock' IS DISTINCT FROM before_stock OR (prior_commit.ack->>'stockRevision')::timestamptz IS DISTINCT FROM (p_intent->>'stockRevisionBefore')::timestamptz THEN RAISE EXCEPTION 'MACRO02_PREDECESSOR'; END IF;
 ELSIF seq<>1 THEN RAISE EXCEPTION 'MACRO02_SEQUENCE'; END IF;
 stock_unit:=vault_macro02_private.stock_unit(m.estoque_unidade_medida); basis:=coalesce(m.estoque_ciclo_id::text,''); balance:=m.estoque_quantidade::double precision;
 IF (before_stock->>'basis') IS DISTINCT FROM basis OR (before_stock->>'unit') IS DISTINCT FROM stock_unit OR (before_stock->>'balance')::double precision IS DISTINCT FROM balance OR (p_intent->>'stockRevisionBefore')::timestamptz IS DISTINCT FROM m.updated_at OR (before_stock-'balance') IS DISTINCT FROM (after_stock-'balance') THEN RAISE EXCEPTION 'MACRO02_STOCK_CAS'; END IF;
 IF balance IS NOT NULL AND (balance='NaN'::double precision OR abs(balance)='Infinity'::double precision) THEN RAISE EXCEPTION 'MACRO02_NONFINITE'; END IF;
 previous_exists:=p_intent->'previous' <> 'null'::jsonb; after_exists:=p_intent->'after' <> 'null'::jsonb;
 IF NOT(previous_exists OR after_exists) THEN RAISE EXCEPTION 'MACRO02_EMPTY'; END IF;
 IF previous_exists THEN SELECT * INTO expected FROM jsonb_populate_record(NULL::public.dose_logs,p_intent->'previous'); END IF;
 IF after_exists THEN SELECT * INTO next FROM jsonb_populate_record(NULL::public.dose_logs,p_intent->'after'); END IF;
 did:=CASE WHEN previous_exists THEN expected.id ELSE next.id END;
 IF did IS NULL OR (previous_exists AND (expected.user_id IS DISTINCT FROM uid OR expected.person_id IS DISTINCT FROM pid OR expected.medicamento_id IS DISTINCT FROM mid)) OR (after_exists AND (next.id IS DISTINCT FROM did OR next.user_id IS DISTINCT FROM uid OR next.person_id IS DISTINCT FROM pid OR next.medicamento_id IS DISTINCT FROM mid)) THEN RAISE EXCEPTION 'MACRO02_DOSE_SCOPE'; END IF;
 SELECT * INTO old FROM public.dose_logs d WHERE d.id=did FOR UPDATE; actual_exists:=FOUND;
 IF actual_exists<>previous_exists OR (actual_exists AND (old.user_id IS DISTINCT FROM uid OR old.person_id IS DISTINCT FROM pid OR old.medicamento_id IS DISTINCT FROM mid OR NOT vault_macro02_private.same_dose(old,expected))) THEN RAISE EXCEPTION 'MACRO02_DOSE_CAS'; END IF;
 IF after_exists THEN
   IF next.data IS NULL OR next.horario IS NULL OR next.horario !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR next.updated_at IS NULL OR next.created_at IS NULL OR next.created_at>next.updated_at OR next.updated_at>clock_timestamp()+interval '5 minutes' OR (next.tomado_em IS NOT NULL AND next.ignorado_em IS NOT NULL) OR (next.tomado_em IS NOT NULL AND next.tomado_em>next.updated_at) OR (next.ignorado_em IS NOT NULL AND next.ignorado_em>next.updated_at) OR (next.quantidade IS NOT NULL AND (next.quantidade<=0 OR next.quantidade::text IN ('NaN','Infinity','-Infinity'))) OR next.dose_kind IS NULL OR next.dose_kind NOT IN ('scheduled','planned','sos','extra') THEN RAISE EXCEPTION 'MACRO02_FACT_SHAPE'; END IF;
   IF actual_exists AND (next.data IS DISTINCT FROM old.data OR next.horario IS DISTINCT FROM old.horario OR (old.dose_kind IS NOT NULL AND old.dose_kind IS DISTINCT FROM next.dose_kind) OR next.created_at IS DISTINCT FROM old.created_at OR (old.updated_at IS NOT NULL AND next.updated_at<old.updated_at)) THEN RAISE EXCEPTION 'MACRO02_IMMUTABLE_IDENTITY'; END IF;
   IF actual_exists AND old.unidade_dose IS NOT NULL AND (next.unidade_dose,next.unidade_dose_rotulo,next.fonte_unidade) IS DISTINCT FROM (old.unidade_dose,old.unidade_dose_rotulo,old.fonte_unidade) THEN RAISE EXCEPTION 'MACRO02_UNIT_REVIEW_REQUIRED'; END IF;
   -- Historical cadastro is immutable; never backfill a previously factual legacy row.
   IF actual_exists AND (old.farmaco_snapshot IS NOT NULL OR old.tomado_em IS NOT NULL OR old.ignorado_em IS NOT NULL) THEN
     IF next.farmaco_snapshot IS DISTINCT FROM old.farmaco_snapshot THEN RAISE EXCEPTION 'MACRO02_PHARMA_IMMUTABLE'; END IF;
   ELSIF next.farmaco_snapshot IS NOT NULL THEN
     IF jsonb_typeof(next.farmaco_snapshot) IS DISTINCT FROM 'object'
       OR NOT(next.farmaco_snapshot ?& ARRAY['schema','source','captured_at','user_id','person_id','medicamento_id','nome','dosagem','formato','forma_farmaceutica','cores','catalog_snapshot'])
       OR (SELECT count(*) FROM jsonb_object_keys(next.farmaco_snapshot))<>12
       OR next.farmaco_snapshot->'schema' IS DISTINCT FROM '1'::jsonb
       OR next.farmaco_snapshot->>'source' IS DISTINCT FROM 'cadastro_no_registro'
       OR (next.farmaco_snapshot->>'captured_at')::timestamptz IS DISTINCT FROM next.updated_at
       OR next.farmaco_snapshot->>'user_id' IS DISTINCT FROM uid::text
       OR next.farmaco_snapshot->>'person_id' IS DISTINCT FROM pid::text
       OR next.farmaco_snapshot->>'medicamento_id' IS DISTINCT FROM mid::text
       OR next.farmaco_snapshot->>'nome' IS DISTINCT FROM m.nome
       OR next.farmaco_snapshot->>'dosagem' IS DISTINCT FROM (CASE WHEN length(m.dosagem)<=500 AND btrim(m.dosagem)<>'' THEN m.dosagem END)
       OR next.farmaco_snapshot->>'formato' IS DISTINCT FROM (CASE WHEN length(m.formato)<=100 AND btrim(m.formato)<>'' THEN m.formato END)
       OR next.farmaco_snapshot->>'forma_farmaceutica' IS DISTINCT FROM (CASE WHEN length(m.forma_farmaceutica)<=100 AND btrim(m.forma_farmaceutica)<>'' THEN m.forma_farmaceutica END)
       OR next.farmaco_snapshot->'cores' IS DISTINCT FROM to_jsonb(ARRAY(SELECT c FROM unnest(m.cores) WITH ORDINALITY AS t(c,n) WHERE length(c)<=50 AND btrim(c)<>'' ORDER BY n LIMIT 8))
       OR (next.farmaco_snapshot->'catalog_snapshot' IS DISTINCT FROM 'null'::jsonb AND next.farmaco_snapshot->'catalog_snapshot' IS DISTINCT FROM m.catalog_snapshot)
       OR (next.tomado_em IS NULL AND next.ignorado_em IS NULL)
     THEN RAISE EXCEPTION 'MACRO02_PHARMA_SCOPE_OR_SOURCE'; END IF;
   END IF;
   IF next.dose_kind IN ('scheduled','planned') AND EXISTS(SELECT 1 FROM public.dose_logs d WHERE d.user_id=uid AND d.person_id=pid AND d.medicamento_id=mid AND d.data=next.data AND left(d.horario,5)=next.horario AND (d.dose_kind IS NULL OR d.dose_kind IN ('scheduled','planned')) AND d.id<>did) THEN RAISE EXCEPTION 'MACRO02_SLOT_CONFLICT'; END IF;
 END IF;
 prior_evidence:=CASE WHEN actual_exists THEN old.estoque_movimento ELSE NULL END;
 next_evidence:=CASE WHEN after_exists THEN next.estoque_movimento ELSE NULL END;
 prior_state:=coalesce(prior_evidence->>'state','unknown'); next_state:=coalesce(next_evidence->>'state','unknown');
 IF prior_state NOT IN ('unknown','applied','not_applied') OR next_state NOT IN ('unknown','applied','not_applied') THEN RAISE EXCEPTION 'MACRO02_EVIDENCE'; END IF;
 IF prior_state='applied' THEN
   receipt:=prior_evidence->'receipt'; old_amount:=(receipt->>'amount')::double precision;
   IF old.tomado_em IS NULL OR old_amount IS NULL OR old_amount<=0 OR old_amount='NaN'::double precision OR abs(old_amount)='Infinity'::double precision OR (receipt->>'user_id')::uuid IS DISTINCT FROM uid OR (receipt->>'person_id')::uuid IS DISTINCT FROM pid OR (receipt->>'medicationId')::uuid IS DISTINCT FROM mid OR (receipt->>'doseId')::uuid IS DISTINCT FROM did THEN RAISE EXCEPTION 'MACRO02_PRIOR_RECEIPT'; END IF;
 END IF;
 same_fact:=actual_exists AND after_exists AND old.tomado_em IS NOT NULL AND next.tomado_em IS NOT NULL AND (old.quantidade,old.unidade_dose,old.unidade_dose_rotulo,old.fonte_unidade) IS NOT DISTINCT FROM (next.quantidade,next.unidade_dose,next.unidade_dose_rotulo,next.fonte_unidade);
 IF same_fact THEN
   IF coalesce(prior_evidence,'{"state":"unknown"}'::jsonb) IS DISTINCT FROM coalesce(next_evidence,'{"state":"unknown"}'::jsonb) THEN RAISE EXCEPTION 'MACRO02_UNCHANGED_RECEIPT'; END IF;
   new_amount:=old_amount;
 ELSIF prior_state='applied' OR next_state='applied' THEN
   IF basis='' OR stock_unit IS NULL OR balance IS NULL THEN RAISE EXCEPTION 'MACRO02_NO_CYCLE'; END IF;
   IF prior_state='applied' AND ((prior_evidence->'receipt'->>'basis') IS DISTINCT FROM basis OR (prior_evidence->'receipt'->>'unit') IS DISTINCT FROM stock_unit) THEN RAISE EXCEPTION 'MACRO02_CYCLE_CHANGED'; END IF;
   IF actual_exists AND old.tomado_em IS NOT NULL AND prior_state<>'applied' THEN RAISE EXCEPTION 'MACRO02_LEGACY_NO_RECALC'; END IF;
   IF after_exists AND next.tomado_em IS NOT NULL AND next_state<>'applied' THEN RAISE EXCEPTION 'MACRO02_DEBIT_REMOVED'; END IF;
   IF next_state='applied' THEN
     receipt:=next_evidence->'receipt';
     IF next.tomado_em IS NULL OR next.quantidade IS NULL OR next.quantidade<=0 OR next.fonte_unidade NOT IN ('declared','documented') OR next.fonte_unidade IS NULL OR (receipt->>'user_id')::uuid IS DISTINCT FROM uid OR (receipt->>'person_id')::uuid IS DISTINCT FROM pid OR (receipt->>'medicationId')::uuid IS DISTINCT FROM mid OR (receipt->>'doseId')::uuid IS DISTINCT FROM did OR receipt->>'basis' IS DISTINCT FROM basis OR receipt->>'unit' IS DISTINCT FROM stock_unit OR (receipt->>'appliedAt')::timestamptz IS DISTINCT FROM next.updated_at THEN RAISE EXCEPTION 'MACRO02_NEW_RECEIPT'; END IF;
     IF next.unidade_dose=stock_unit THEN new_amount:=next.quantidade::double precision;
     ELSIF next.unidade_dose='drop' AND stock_unit='ml' AND m.estoque_gotas_por_ml>0 THEN new_amount:=next.quantidade::double precision/m.estoque_gotas_por_ml::double precision;
     ELSE RAISE EXCEPTION 'MACRO02_UNIT_NOT_COMPARABLE'; END IF;
     IF new_amount<=0 OR new_amount='NaN'::double precision OR abs(new_amount)='Infinity'::double precision OR (receipt->>'amount')::double precision IS DISTINCT FROM new_amount THEN RAISE EXCEPTION 'MACRO02_AMOUNT'; END IF;
   END IF;
 ELSE
   IF actual_exists AND old.tomado_em IS NOT NULL AND prior_state='not_applied' AND after_exists AND next.tomado_em IS NOT NULL AND next_evidence IS DISTINCT FROM prior_evidence THEN RAISE EXCEPTION 'MACRO02_HISTORICAL_NO_MOVEMENT'; END IF;
   IF (NOT actual_exists OR old.tomado_em IS NULL) AND after_exists AND next.tomado_em IS NOT NULL AND next_state<>'not_applied' THEN RAISE EXCEPTION 'MACRO02_EVIDENCE_REQUIRED'; END IF;
 END IF;
 IF after_exists AND next_state='not_applied' AND (next_evidence->>'reason' IS NULL OR next_evidence->>'reason' NOT IN ('historical_review','unknown_quantity','unknown_unit','unknown_balance','incompatible_unit','unavailable_basis','explicit_no_adjustment')) THEN RAISE EXCEPTION 'MACRO02_REASON'; END IF;
 delta:=new_amount-old_amount;
 IF (p_intent->>'delta')::double precision IS DISTINCT FROM delta THEN RAISE EXCEPTION 'MACRO02_DELTA'; END IF;
 server_after:=balance-delta; received_balance:=(after_stock->>'balance')::numeric;
 IF received_balance::double precision IS DISTINCT FROM server_after THEN RAISE EXCEPTION 'MACRO02_BALANCE'; END IF;
 ref_after:=(p_intent->>'stockReferenceAfter')::date; rev_after:=(p_intent->>'stockRevisionAfter')::timestamptz;
 IF delta=0 THEN
   IF ref_after IS DISTINCT FROM m.estoque_data_referencia OR rev_after IS DISTINCT FROM m.updated_at THEN RAISE EXCEPTION 'MACRO02_NO_MOVEMENT_STOCK_CHANGE'; END IF;
 ELSE
   IF ref_after IS NULL OR rev_after IS NULL OR (m.updated_at IS NOT NULL AND rev_after<m.updated_at) OR rev_after>clock_timestamp()+interval '5 minutes' THEN RAISE EXCEPTION 'MACRO02_REVISION'; END IF;
   UPDATE public.medicamentos SET estoque_quantidade=received_balance,estoque_data_referencia=ref_after,updated_at=rev_after,macro02_stock_managed=true WHERE id=mid AND user_id=uid AND person_id=pid RETURNING * INTO m;
   IF NOT FOUND OR m.estoque_quantidade::double precision IS DISTINCT FROM server_after OR m.estoque_ciclo_id::text IS DISTINCT FROM basis OR m.updated_at IS DISTINCT FROM rev_after OR m.estoque_data_referencia IS DISTINCT FROM ref_after THEN RAISE EXCEPTION 'MACRO02_STOCK_READBACK'; END IF;
 END IF;
 IF (after_exists AND (next.tomado_em IS NOT NULL OR next.ignorado_em IS NOT NULL)) OR (actual_exists AND (old.tomado_em IS NOT NULL OR old.ignorado_em IS NOT NULL)) THEN
   IF NOT m.macro02_stock_managed THEN
     UPDATE public.medicamentos SET macro02_stock_managed=true WHERE id=mid AND user_id=uid AND person_id=pid RETURNING * INTO m;
     IF NOT FOUND OR NOT m.macro02_stock_managed THEN RAISE EXCEPTION 'MACRO02_MANAGED_READBACK'; END IF;
   END IF;
 END IF;
 IF after_exists THEN
   IF actual_exists THEN
     UPDATE public.dose_logs SET quantidade=next.quantidade,tomado_em=next.tomado_em,ignorado_em=next.ignorado_em,dose_kind=next.dose_kind,motivo=next.motivo,unidade_dose=next.unidade_dose,unidade_dose_rotulo=next.unidade_dose_rotulo,fonte_unidade=next.fonte_unidade,estoque_movimento=next.estoque_movimento,farmaco_snapshot=next.farmaco_snapshot,updated_at=next.updated_at WHERE id=did AND user_id=uid AND person_id=pid AND medicamento_id=mid RETURNING * INTO persisted;
   ELSE
     INSERT INTO public.dose_logs(id,user_id,person_id,medicamento_id,data,horario,quantidade,tomado_em,ignorado_em,dose_kind,motivo,unidade_dose,unidade_dose_rotulo,fonte_unidade,estoque_movimento,farmaco_snapshot,created_at,updated_at) VALUES(did,uid,pid,mid,next.data,next.horario,next.quantidade,next.tomado_em,next.ignorado_em,next.dose_kind,next.motivo,next.unidade_dose,next.unidade_dose_rotulo,next.fonte_unidade,next.estoque_movimento,next.farmaco_snapshot,next.created_at,next.updated_at) RETURNING * INTO persisted;
   END IF;
   IF NOT FOUND OR NOT vault_macro02_private.same_dose(persisted,next) THEN RAISE EXCEPTION 'MACRO02_DOSE_READBACK'; END IF;
 ELSE
   DELETE FROM public.dose_logs WHERE id=did AND user_id=uid AND person_id=pid AND medicamento_id=mid;
   IF NOT FOUND THEN RAISE EXCEPTION 'MACRO02_DELETE_READBACK'; END IF;
 END IF;
 result:=jsonb_build_object('version',1,'operationId',oid,'dose',CASE WHEN after_exists THEN vault_macro02_private.dose_projection(persisted) ELSE NULL END,'stock',jsonb_build_object('user_id',uid,'person_id',pid,'medicationId',mid,'basis',coalesce(m.estoque_ciclo_id::text,''),'unit',vault_macro02_private.stock_unit(m.estoque_unidade_medida),'balance',m.estoque_quantidade),'stockRevision',m.updated_at,'stockReference',m.estoque_data_referencia,'deleted',NOT after_exists);
 INSERT INTO vault_macro02_private.dose_commits(user_id,person_id,medication_id,operation_id,sequence,predecessor,request,ack) VALUES(uid,pid,mid,oid,seq,pred,p_intent,result);
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION vault_macro02_private.commit_dose(jsonb) FROM PUBLIC, anon, authenticated, service_role;
-- Candidate wrapper only: private function is not a Data API schema endpoint.
GRANT USAGE ON SCHEMA vault_macro02_private TO authenticated;
GRANT EXECUTE ON FUNCTION vault_macro02_private.commit_dose(jsonb) TO authenticated;
CREATE FUNCTION public.vault_macro02_commit_dose(p_intent jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_macro02_private.commit_dose(p_intent) $$;
REVOKE ALL ON FUNCTION public.vault_macro02_commit_dose(jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vault_macro02_commit_dose(jsonb) TO authenticated;
-- Same per-medication lock and ledger as dose v1. No production activation.
CREATE FUNCTION vault_macro02_private.stock_projection(m public.medicamentos) RETURNS jsonb
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('user_id',m.user_id,'person_id',m.person_id,'medicationId',m.id,'basis',coalesce(m.estoque_ciclo_id::text,''),'unit',vault_macro02_private.stock_unit(m.estoque_unidade_medida),'balance',m.estoque_quantidade)
$$;
CREATE FUNCTION vault_macro02_private.count_projection(m public.medicamentos) RETURNS jsonb
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$ SELECT jsonb_build_object('estoque_quantidade',m.estoque_quantidade,
'estoque_unidade_medida',m.estoque_unidade_medida,
'estoque_gotas_por_ml',m.estoque_gotas_por_ml,
'estoque_ml_total',m.estoque_ml_total,
'estoque_data_referencia',m.estoque_data_referencia,
'estoque_unidade_por_dose',m.estoque_unidade_por_dose,
'estoque_ciclo_id',m.estoque_ciclo_id,
'updated_at',m.updated_at) $$;
CREATE FUNCTION vault_macro02_private.acquisition_projection(r public.renovacoes) RETURNS jsonb
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$ SELECT jsonb_build_object('id',r.id,
'user_id',r.user_id,
'person_id',r.person_id,
'medicamento_id',r.medicamento_id,
'medicamento_nome',r.medicamento_nome,
'medicamento_dosagem',r.medicamento_dosagem,
'medico_id',r.medico_id,
'farmacia_id',r.farmacia_id,
'hospital_id',r.hospital_id,
'local_id',r.local_id,
'document_id',r.document_id,
'a3_location_snapshot',r.a3_location_snapshot,
'a3_location_changes',r.a3_location_changes,
'tipo_aquisicao',r.tipo_aquisicao,
'data_proxima_retirada',r.data_proxima_retirada,
'data_retorno_sus',r.data_retorno_sus,
'exige_nova_receita',r.exige_nova_receita,
'quantidade',r.quantidade,
'preco',r.preco,
'lote',r.lote,
'validade_produto',r.validade_produto,
'data',r.data,
'data_aquisicao',r.data_aquisicao,
'anexo_url',r.anexo_url,
'observacoes',r.observacoes,
'created_at',r.created_at,
'updated_at',r.updated_at) $$;
CREATE FUNCTION vault_macro02_private.withdrawal_projection(w public.retiradas) RETURNS jsonb
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$ SELECT jsonb_build_object('id',w.id,
'user_id',w.user_id,
'person_id',w.person_id,
'medicamento_id',w.medicamento_id,
'status',w.status,
'renovacao_realizada_id',w.renovacao_realizada_id,
'quantidade_retirada',w.quantidade_retirada,
'realizada_em',w.realizada_em,
'updated_at',w.updated_at) $$;
REVOKE ALL ON FUNCTION vault_macro02_private.stock_projection(public.medicamentos),vault_macro02_private.count_projection(public.medicamentos),vault_macro02_private.acquisition_projection(public.renovacoes),vault_macro02_private.withdrawal_projection(public.retiradas) FROM PUBLIC, anon, authenticated, service_role;
CREATE FUNCTION vault_macro02_private.commit_stock(p_intent jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 uid uuid:=vault_macro02_private.actor_uid(); pid uuid; mid uuid; oid uuid; pred uuid; seq bigint; wid uuid;
 m public.medicamentos%ROWTYPE; expected public.medicamentos%ROWTYPE; n public.medicamentos%ROWTYPE;
 r public.renovacoes%ROWTYPE; saved_r public.renovacoes%ROWTYPE;
 w public.retiradas%ROWTYPE; old_w public.retiradas%ROWTYPE; next_w public.retiradas%ROWTYPE;
 c vault_macro02_private.dose_commits%ROWTYPE;
 b jsonb; a jsonb; patch jsonb; patch_ack jsonb; w_ack jsonb; result jsonb;
 mode text; qty double precision; initial double precision; counted double precision; balance double precision; target double precision;
 new_cycle boolean:=false; k text;
BEGIN
 IF uid IS NULL OR jsonb_typeof(p_intent) IS DISTINCT FROM 'object' OR p_intent->>'version' IS DISTINCT FROM '2' THEN RAISE EXCEPTION 'MACRO02_AUTH_OR_VERSION'; END IF;
 IF NOT vault_macro02_private.active_for(uid) THEN RAISE EXCEPTION 'MACRO02_ACCOUNT_NOT_ACTIVATED'; END IF;
 IF NOT (p_intent ?& ARRAY['operationId','sequence','predecessor','previous','after','stockBefore','stockAfter','stockRevisionBefore','stockRevisionAfter','stockReferenceAfter','beforeCount','afterCount','mode','acquisition','countedCurrentStock','initialStockQuantity']) OR p_intent->'previous' IS DISTINCT FROM 'null'::jsonb OR p_intent->'after' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'MACRO02_INCOMPLETE'; END IF;
 b:=p_intent->'stockBefore'; a:=p_intent->'stockAfter'; mode:=p_intent->>'mode';
 IF jsonb_typeof(b) IS DISTINCT FROM 'object' OR jsonb_typeof(a) IS DISTINCT FROM 'object' OR NOT(b ?& ARRAY['user_id','person_id','medicationId','basis','unit','balance']) OR NOT(a ?& ARRAY['user_id','person_id','medicationId','basis','unit','balance']) THEN RAISE EXCEPTION 'MACRO02_STOCK_SHAPE'; END IF;
 pid:=(b->>'person_id')::uuid; mid:=(b->>'medicationId')::uuid; oid:=(p_intent->>'operationId')::uuid; pred:=(p_intent->>'predecessor')::uuid; seq:=(p_intent->>'sequence')::bigint;
 IF pid IS NULL OR mid IS NULL OR oid IS NULL OR seq IS NULL OR seq<1 OR seq>9007199254740991 OR (b->>'user_id')::uuid IS DISTINCT FROM uid OR pred=oid OR (b-'balance'-'basis'-'unit') IS DISTINCT FROM (a-'balance'-'basis'-'unit') OR (mode IS DISTINCT FROM 'adjustment' AND b->'unit' IS DISTINCT FROM a->'unit') THEN RAISE EXCEPTION 'MACRO02_SCOPE'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.persons WHERE id=pid AND user_id=uid) THEN RAISE EXCEPTION 'MACRO02_PERSON'; END IF;
 SELECT * INTO m FROM public.medicamentos WHERE id=mid AND user_id=uid AND person_id=pid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'MACRO02_MEDICATION'; END IF;
 SELECT * INTO c FROM vault_macro02_private.dose_commits WHERE user_id=uid AND operation_id=oid;
 IF FOUND THEN IF c.person_id<>pid OR c.medication_id<>mid OR c.request IS DISTINCT FROM p_intent THEN RAISE EXCEPTION 'MACRO02_REPLAY_CHANGED'; END IF; RETURN c.ack; END IF;
 IF pred IS NOT NULL THEN
  SELECT * INTO c FROM vault_macro02_private.dose_commits WHERE user_id=uid AND operation_id=pred AND person_id=pid AND medication_id=mid;
  IF NOT FOUND OR c.sequence+1<>seq OR c.ack->'stock' IS DISTINCT FROM b OR (c.ack->>'stockRevision')::timestamptz IS DISTINCT FROM (p_intent->>'stockRevisionBefore')::timestamptz THEN RAISE EXCEPTION 'MACRO02_PREDECESSOR'; END IF;
 ELSIF seq<>1 THEN RAISE EXCEPTION 'MACRO02_SEQUENCE'; END IF;
 IF jsonb_typeof(p_intent->'beforeCount') IS DISTINCT FROM 'object' OR jsonb_typeof(p_intent->'afterCount') IS DISTINCT FROM 'object' OR NOT(p_intent->'beforeCount' ?& ARRAY['estoque_quantidade','estoque_unidade_medida','estoque_gotas_por_ml','estoque_ml_total','estoque_data_referencia','estoque_unidade_por_dose','estoque_ciclo_id','updated_at']) OR NOT(p_intent->'afterCount' ?& ARRAY['estoque_quantidade','estoque_unidade_medida','estoque_gotas_por_ml','estoque_ml_total','estoque_data_referencia','estoque_unidade_por_dose','estoque_ciclo_id','updated_at']) THEN RAISE EXCEPTION 'MACRO02_COUNT_SHAPE'; END IF;
 SELECT * INTO expected FROM jsonb_populate_record(NULL::public.medicamentos,p_intent->'beforeCount');
 SELECT * INTO n FROM jsonb_populate_record(m,p_intent->'afterCount');
 IF vault_macro02_private.stock_projection(m) IS DISTINCT FROM b OR vault_macro02_private.count_projection(expected) IS DISTINCT FROM vault_macro02_private.count_projection(m) OR m.updated_at IS DISTINCT FROM (p_intent->>'stockRevisionBefore')::timestamptz THEN RAISE EXCEPTION 'MACRO02_STOCK_CAS'; END IF;
 IF mode IS DISTINCT FROM 'adjustment' AND (m.estoque_unidade_medida,m.estoque_gotas_por_ml,m.estoque_ml_total,m.estoque_unidade_por_dose) IS DISTINCT FROM (n.estoque_unidade_medida,n.estoque_gotas_por_ml,n.estoque_ml_total,n.estoque_unidade_por_dose) THEN RAISE EXCEPTION 'MACRO02_CONVERSION_CHANGE'; END IF;
 IF n.updated_at IS NULL OR n.updated_at IS DISTINCT FROM (p_intent->>'stockRevisionAfter')::timestamptz OR (m.updated_at IS NOT NULL AND n.updated_at<m.updated_at) OR n.updated_at>clock_timestamp()+interval '5 minutes' OR (mode IS DISTINCT FROM 'adjustment' AND n.estoque_data_referencia IS NULL) OR n.estoque_data_referencia IS DISTINCT FROM (p_intent->>'stockReferenceAfter')::date THEN RAISE EXCEPTION 'MACRO02_REVISION'; END IF;
 balance:=m.estoque_quantidade::double precision; counted:=(p_intent->>'countedCurrentStock')::double precision; initial:=(p_intent->>'initialStockQuantity')::double precision;
 IF balance='NaN'::double precision OR abs(balance)='Infinity'::double precision OR counted='NaN'::double precision OR abs(counted)='Infinity'::double precision OR initial='NaN'::double precision OR abs(initial)='Infinity'::double precision THEN RAISE EXCEPTION 'MACRO02_NONFINITE'; END IF;
 patch:=coalesce(p_intent->'medicationPatch','{}'::jsonb); wid:=(p_intent->>'withdrawalId')::uuid;
 IF jsonb_typeof(patch) IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(patch) AS x(key) WHERE NOT(key=ANY(ARRAY['data_receita','document_id','medico_id','medico','tipo_aquisicao','farmacia_id','farmacia','data_retorno_sus','proxima_renovacao','lembrete_receita_modo','lembrete_receita_data']))) THEN RAISE EXCEPTION 'MACRO02_PATCH'; END IF;
 IF mode='count' THEN
  IF counted IS NULL OR counted<0 OR initial IS NOT NULL OR p_intent->'acquisition' IS DISTINCT FROM 'null'::jsonb OR patch<>'{}'::jsonb OR wid IS NOT NULL THEN RAISE EXCEPTION 'MACRO02_COUNT'; END IF;
  target:=counted;new_cycle:=true;
 ELSIF mode='adjustment' THEN
  IF counted IS NOT NULL OR initial IS NOT NULL OR p_intent->'acquisition' IS DISTINCT FROM 'null'::jsonb OR patch<>'{}'::jsonb OR wid IS NOT NULL OR coalesce(p_intent->'withdrawalBefore','null'::jsonb)<>'null'::jsonb OR coalesce(p_intent->'withdrawalAfter','null'::jsonb)<>'null'::jsonb OR n.estoque_ciclo_id IS NOT NULL OR (m.estoque_quantidade,m.estoque_unidade_medida,m.estoque_gotas_por_ml,m.estoque_ml_total,m.estoque_unidade_por_dose,m.estoque_data_referencia) IS NOT DISTINCT FROM (n.estoque_quantidade,n.estoque_unidade_medida,n.estoque_gotas_por_ml,n.estoque_ml_total,n.estoque_unidade_por_dose,n.estoque_data_referencia) THEN RAISE EXCEPTION 'MACRO02_ADJUSTMENT'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(ARRAY[n.estoque_gotas_por_ml,n.estoque_ml_total,n.estoque_unidade_por_dose]) v WHERE v IS NOT NULL AND (v<=0 OR v::text IN ('NaN','Infinity','-Infinity'))) THEN RAISE EXCEPTION 'MACRO02_CONVERSION'; END IF;
  target:=n.estoque_quantidade::double precision;
 ELSIF mode='acquisition' THEN
  IF jsonb_typeof(p_intent->'acquisition') IS DISTINCT FROM 'object' OR NOT(p_intent->'acquisition' ?& ARRAY['id','user_id','person_id','medicamento_id','medicamento_nome','medicamento_dosagem','medico_id','farmacia_id','hospital_id','local_id','document_id','a3_location_snapshot','a3_location_changes','tipo_aquisicao','data_proxima_retirada','data_retorno_sus','exige_nova_receita','quantidade','preco','lote','validade_produto','data','data_aquisicao','anexo_url','observacoes','created_at','updated_at']) THEN RAISE EXCEPTION 'MACRO02_ACQUISITION_SHAPE'; END IF;
  SELECT * INTO r FROM jsonb_populate_record(NULL::public.renovacoes,p_intent->'acquisition');
  qty:=r.quantidade::double precision;
  IF r.id IS NULL OR r.user_id IS DISTINCT FROM uid OR r.person_id IS DISTINCT FROM pid OR r.medicamento_id IS DISTINCT FROM mid OR r.data_aquisicao IS NULL OR qty IS NULL OR qty<=0 OR qty='NaN'::double precision OR abs(qty)='Infinity'::double precision OR r.created_at IS NULL OR r.updated_at IS DISTINCT FROM n.updated_at THEN RAISE EXCEPTION 'MACRO02_ACQUISITION_FACT'; END IF;
  IF counted IS NOT NULL THEN IF counted<0 OR initial IS NOT NULL THEN RAISE EXCEPTION 'MACRO02_COUNT'; END IF;target:=counted;new_cycle:=true;
  ELSIF balance IS NULL THEN IF initial IS NULL THEN target:=NULL; ELSE IF initial<0 THEN RAISE EXCEPTION 'MACRO02_INITIAL'; END IF;target:=initial+qty;new_cycle:=true;END IF;
  ELSE IF initial IS NOT NULL THEN RAISE EXCEPTION 'MACRO02_INITIAL'; END IF;target:=balance+qty; END IF;
  IF r.document_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.documents WHERE id=r.document_id AND user_id=uid AND person_id=pid) THEN RAISE EXCEPTION 'MACRO02_DOCUMENT_SCOPE'; END IF;
  IF r.medico_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.medicos WHERE id=r.medico_id AND user_id=uid) THEN RAISE EXCEPTION 'MACRO02_DOCTOR_SCOPE'; END IF;
  IF r.farmacia_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.farmacias WHERE id=r.farmacia_id AND user_id=uid) THEN RAISE EXCEPTION 'MACRO02_PHARMACY_SCOPE'; END IF;
  IF r.hospital_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.hospitais WHERE id=r.hospital_id AND user_id=uid) THEN RAISE EXCEPTION 'MACRO02_HOSPITAL_SCOPE'; END IF;
  IF r.local_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.locais WHERE id=r.local_id AND user_id=uid) THEN RAISE EXCEPTION 'MACRO02_LOCATION_SCOPE'; END IF;
  IF wid IS NOT NULL THEN
   IF jsonb_typeof(p_intent->'withdrawalBefore') IS DISTINCT FROM 'object' OR jsonb_typeof(p_intent->'withdrawalAfter') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'MACRO02_WITHDRAWAL_SHAPE'; END IF;
   SELECT * INTO w FROM public.retiradas WHERE id=wid AND user_id=uid AND person_id=pid AND medicamento_id=mid FOR UPDATE;
   IF NOT FOUND OR w.renovacao_realizada_id IS NOT NULL OR w.status NOT IN ('agendada','realizada') THEN RAISE EXCEPTION 'MACRO02_WITHDRAWAL_SCOPE'; END IF;
   SELECT * INTO old_w FROM jsonb_populate_record(NULL::public.retiradas,p_intent->'withdrawalBefore');
   SELECT * INTO next_w FROM jsonb_populate_record(NULL::public.retiradas,p_intent->'withdrawalAfter');
   IF vault_macro02_private.withdrawal_projection(w) IS DISTINCT FROM vault_macro02_private.withdrawal_projection(old_w) OR (next_w.id,next_w.user_id,next_w.person_id,next_w.medicamento_id) IS DISTINCT FROM (wid,uid,pid,mid) OR next_w.status IS DISTINCT FROM 'realizada' OR next_w.renovacao_realizada_id IS DISTINCT FROM r.id OR next_w.quantidade_retirada IS DISTINCT FROM r.quantidade OR next_w.updated_at IS DISTINCT FROM n.updated_at OR next_w.realizada_em IS NULL OR (w.tipo='sus' AND r.tipo_aquisicao IS DISTINCT FROM 'sus') THEN RAISE EXCEPTION 'MACRO02_WITHDRAWAL_CAS'; END IF;
  ELSIF coalesce(p_intent->'withdrawalBefore','null'::jsonb)<>'null'::jsonb OR coalesce(p_intent->'withdrawalAfter','null'::jsonb)<>'null'::jsonb THEN RAISE EXCEPTION 'MACRO02_WITHDRAWAL_SHAPE'; END IF;
 ELSE RAISE EXCEPTION 'MACRO02_MODE'; END IF;
 IF target='NaN'::double precision OR abs(target)='Infinity'::double precision OR target<0 OR n.estoque_quantidade::double precision IS DISTINCT FROM target THEN RAISE EXCEPTION 'MACRO02_BALANCE'; END IF;
 IF new_cycle THEN
  IF vault_macro02_private.stock_unit(n.estoque_unidade_medida) IS NULL THEN IF n.estoque_ciclo_id IS NOT NULL THEN RAISE EXCEPTION 'MACRO02_UNKNOWN_UNIT'; END IF;
  ELSIF n.estoque_ciclo_id IS NULL OR n.estoque_ciclo_id IS NOT DISTINCT FROM m.estoque_ciclo_id THEN RAISE EXCEPTION 'MACRO02_CYCLE'; END IF;
 ELSIF mode IS DISTINCT FROM 'adjustment' AND n.estoque_ciclo_id IS DISTINCT FROM m.estoque_ciclo_id THEN RAISE EXCEPTION 'MACRO02_ADDITIVE_CYCLE'; END IF;
 IF vault_macro02_private.stock_projection(n) IS DISTINCT FROM a THEN RAISE EXCEPTION 'MACRO02_AFTER_STOCK'; END IF;
 -- Metadata is explicitly allowlisted, never mass-assigned from the wire.
 SELECT * INTO n FROM jsonb_populate_record(n,patch);
 IF n.document_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.documents WHERE id=n.document_id AND user_id=uid AND person_id=pid) THEN RAISE EXCEPTION 'MACRO02_DOCUMENT_SCOPE'; END IF;
 IF n.medico_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.medicos WHERE id=n.medico_id AND user_id=uid) THEN RAISE EXCEPTION 'MACRO02_DOCTOR_SCOPE'; END IF;
 IF n.farmacia_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.farmacias WHERE id=n.farmacia_id AND user_id=uid) THEN RAISE EXCEPTION 'MACRO02_PHARMACY_SCOPE'; END IF;
 IF mode='acquisition' THEN
  INSERT INTO public.renovacoes(id,user_id,person_id,medicamento_id,medicamento_nome,medicamento_dosagem,medico_id,farmacia_id,hospital_id,local_id,document_id,a3_location_snapshot,a3_location_changes,tipo_aquisicao,data_proxima_retirada,data_retorno_sus,exige_nova_receita,quantidade,preco,lote,validade_produto,data,data_aquisicao,anexo_url,observacoes,created_at,updated_at) VALUES(r.id,r.user_id,r.person_id,r.medicamento_id,r.medicamento_nome,r.medicamento_dosagem,r.medico_id,r.farmacia_id,r.hospital_id,r.local_id,r.document_id,r.a3_location_snapshot,r.a3_location_changes,r.tipo_aquisicao,r.data_proxima_retirada,r.data_retorno_sus,r.exige_nova_receita,r.quantidade,r.preco,r.lote,r.validade_produto,r.data,r.data_aquisicao,r.anexo_url,r.observacoes,r.created_at,r.updated_at) RETURNING * INTO saved_r;
  IF NOT FOUND OR vault_macro02_private.acquisition_projection(saved_r) IS DISTINCT FROM vault_macro02_private.acquisition_projection(r) THEN RAISE EXCEPTION 'MACRO02_ACQUISITION_READBACK'; END IF;
  IF wid IS NOT NULL THEN
   UPDATE public.retiradas SET status=next_w.status,renovacao_realizada_id=next_w.renovacao_realizada_id,quantidade_retirada=next_w.quantidade_retirada,realizada_em=next_w.realizada_em,updated_at=next_w.updated_at WHERE id=wid AND user_id=uid AND person_id=pid AND medicamento_id=mid RETURNING * INTO w;
   IF NOT FOUND OR vault_macro02_private.withdrawal_projection(w) IS DISTINCT FROM vault_macro02_private.withdrawal_projection(next_w) THEN RAISE EXCEPTION 'MACRO02_WITHDRAWAL_READBACK'; END IF;
   w_ack:=vault_macro02_private.withdrawal_projection(w);
  END IF;
 END IF;
 UPDATE public.medicamentos SET estoque_quantidade=n.estoque_quantidade,estoque_ciclo_id=n.estoque_ciclo_id,estoque_data_referencia=n.estoque_data_referencia,estoque_unidade_medida=n.estoque_unidade_medida,estoque_gotas_por_ml=n.estoque_gotas_por_ml,estoque_ml_total=n.estoque_ml_total,estoque_unidade_por_dose=n.estoque_unidade_por_dose,macro02_stock_managed=true,updated_at=n.updated_at,data_receita=n.data_receita,document_id=n.document_id,medico_id=n.medico_id,medico=n.medico,tipo_aquisicao=n.tipo_aquisicao,farmacia_id=n.farmacia_id,farmacia=n.farmacia,data_retorno_sus=n.data_retorno_sus,proxima_renovacao=n.proxima_renovacao,lembrete_receita_modo=n.lembrete_receita_modo,lembrete_receita_data=n.lembrete_receita_data WHERE id=mid AND user_id=uid AND person_id=pid RETURNING * INTO m;
 IF NOT FOUND OR vault_macro02_private.stock_projection(m) IS DISTINCT FROM a OR vault_macro02_private.count_projection(m) IS DISTINCT FROM vault_macro02_private.count_projection(n) THEN RAISE EXCEPTION 'MACRO02_STOCK_READBACK'; END IF;
 SELECT coalesce(jsonb_object_agg(key,to_jsonb(m)->key),'{}'::jsonb) INTO patch_ack FROM jsonb_object_keys(patch) AS x(key);
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(patch) AS x(key) WHERE (to_jsonb(m)->key) IS DISTINCT FROM (to_jsonb(n)->key)) THEN RAISE EXCEPTION 'MACRO02_PATCH_READBACK'; END IF;
 result:=jsonb_build_object('version',2,'operationId',oid,'stock',vault_macro02_private.stock_projection(m),'stockRevision',m.updated_at,'stockReference',m.estoque_data_referencia,'stockSnapshot',vault_macro02_private.count_projection(m),'acquisition',CASE WHEN mode='acquisition' THEN vault_macro02_private.acquisition_projection(saved_r) ELSE NULL END,'medicationPatch',patch_ack,'withdrawal',w_ack);
 INSERT INTO vault_macro02_private.dose_commits(user_id,person_id,medication_id,operation_id,sequence,predecessor,request,ack) VALUES(uid,pid,mid,oid,seq,pred,p_intent,result);
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION vault_macro02_private.commit_stock(jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION vault_macro02_private.commit_stock(jsonb) TO authenticated;
CREATE FUNCTION public.vault_macro02_commit_stock(p_intent jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_macro02_private.commit_stock(p_intent) $$;
REVOKE ALL ON FUNCTION public.vault_macro02_commit_stock(jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vault_macro02_commit_stock(jsonb) TO authenticated;
-- Direct DML protection is deliberately included in this isolated trial. It does not silently upgrade an old writer.
CREATE FUNCTION public.vault_macro02_guard_dose() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE privileged boolean; protected_old boolean:=false; protected_new boolean:=false; cycle_present boolean:=false; old_cycle boolean:=false;
BEGIN
 privileged := current_user = 'vault_macro02_worker';
 IF privileged THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP<>'INSERT' THEN protected_old:=OLD.unidade_dose IS NOT NULL OR OLD.unidade_dose_rotulo IS NOT NULL OR OLD.fonte_unidade IS NOT NULL OR OLD.estoque_movimento IS NOT NULL OR OLD.farmaco_snapshot IS NOT NULL; END IF;
 IF TG_OP<>'DELETE' THEN protected_new:=NEW.unidade_dose IS NOT NULL OR NEW.unidade_dose_rotulo IS NOT NULL OR NEW.fonte_unidade IS NOT NULL OR NEW.estoque_movimento IS NOT NULL OR NEW.farmaco_snapshot IS NOT NULL; END IF;
 -- Serialize direct planning with the canonical medication lock. A legacy client may still
 -- manage an unresolved planned occurrence; it must not register/erase a clinical fact.
 IF TG_OP='DELETE' THEN SELECT (estoque_ciclo_id IS NOT NULL OR macro02_stock_managed) INTO cycle_present FROM public.medicamentos WHERE id=OLD.medicamento_id AND user_id=OLD.user_id AND person_id=OLD.person_id FOR UPDATE;
 ELSE SELECT (estoque_ciclo_id IS NOT NULL OR macro02_stock_managed) INTO cycle_present FROM public.medicamentos WHERE id=NEW.medicamento_id AND user_id=NEW.user_id AND person_id=NEW.person_id FOR UPDATE; END IF;
 IF TG_OP='UPDATE' AND (OLD.user_id,OLD.person_id,OLD.medicamento_id) IS DISTINCT FROM (NEW.user_id,NEW.person_id,NEW.medicamento_id) THEN
   SELECT (estoque_ciclo_id IS NOT NULL OR macro02_stock_managed) INTO old_cycle FROM public.medicamentos WHERE id=OLD.medicamento_id AND user_id=OLD.user_id AND person_id=OLD.person_id FOR UPDATE NOWAIT;
   IF coalesce(old_cycle,false) OR vault_macro02_private.guard_active_for(OLD.user_id) THEN RAISE EXCEPTION 'MACRO02_IMMUTABLE_IDENTITY'; END IF;
 END IF;
 IF protected_old OR protected_new THEN RAISE EXCEPTION 'MACRO02_COMPATIBLE_WRITER_REQUIRED'; END IF;
 IF TG_OP='DELETE' THEN cycle_present:=coalesce(cycle_present,false) OR vault_macro02_private.guard_active_for(OLD.user_id);
 ELSE cycle_present:=coalesce(cycle_present,false) OR vault_macro02_private.guard_active_for(NEW.user_id); END IF;
 IF cycle_present THEN
 IF TG_OP='UPDATE' AND (OLD.id,OLD.user_id,OLD.person_id,OLD.medicamento_id,OLD.data,OLD.horario) IS DISTINCT FROM (NEW.id,NEW.user_id,NEW.person_id,NEW.medicamento_id,NEW.data,NEW.horario) THEN RAISE EXCEPTION 'MACRO02_IMMUTABLE_IDENTITY'; END IF;
   IF TG_OP<>'INSERT' THEN IF OLD.tomado_em IS NOT NULL OR OLD.ignorado_em IS NOT NULL OR OLD.dose_kind IS DISTINCT FROM 'planned' THEN RAISE EXCEPTION 'MACRO02_COMPATIBLE_WRITER_REQUIRED'; END IF; END IF;
   IF TG_OP<>'DELETE' THEN
     IF NEW.tomado_em IS NOT NULL OR NEW.ignorado_em IS NOT NULL OR NEW.dose_kind IS DISTINCT FROM 'planned' THEN RAISE EXCEPTION 'MACRO02_COMPATIBLE_WRITER_REQUIRED'; END IF;
     IF EXISTS(SELECT 1 FROM public.dose_logs d WHERE d.user_id=NEW.user_id AND d.person_id=NEW.person_id AND d.medicamento_id=NEW.medicamento_id AND d.data=NEW.data AND left(d.horario,5)=left(NEW.horario,5) AND (d.dose_kind IS NULL OR d.dose_kind IN ('scheduled','planned')) AND d.id<>NEW.id) THEN RAISE EXCEPTION 'MACRO02_SLOT_CONFLICT'; END IF;
   END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE FUNCTION public.vault_macro02_guard_stock() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE privileged boolean;
BEGIN
 privileged := current_user = 'vault_macro02_worker';
 IF privileged THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='INSERT' THEN IF NEW.estoque_ciclo_id IS NOT NULL OR NEW.macro02_stock_managed THEN RAISE EXCEPTION 'MACRO02_COMPATIBLE_WRITER_REQUIRED'; END IF;RETURN NEW; END IF;
 IF TG_OP='DELETE' THEN IF OLD.estoque_ciclo_id IS NOT NULL OR OLD.macro02_stock_managed OR (vault_macro02_private.guard_active_for(OLD.user_id) AND (EXISTS(SELECT 1 FROM public.dose_logs WHERE medicamento_id=OLD.id AND user_id=OLD.user_id AND person_id=OLD.person_id) OR EXISTS(SELECT 1 FROM public.renovacoes WHERE medicamento_id=OLD.id AND user_id=OLD.user_id AND person_id=OLD.person_id) OR EXISTS(SELECT 1 FROM public.retiradas WHERE medicamento_id=OLD.id AND user_id=OLD.user_id AND person_id=OLD.person_id))) OR EXISTS(SELECT 1 FROM public.dose_logs WHERE medicamento_id=OLD.id AND user_id=OLD.user_id AND person_id=OLD.person_id AND (unidade_dose IS NOT NULL OR estoque_movimento IS NOT NULL OR farmaco_snapshot IS NOT NULL)) THEN RAISE EXCEPTION 'MACRO02_PROTECTED_HISTORY'; END IF;RETURN OLD; END IF;
 IF NEW.macro02_stock_managed IS DISTINCT FROM OLD.macro02_stock_managed OR NEW.estoque_ciclo_id IS DISTINCT FROM OLD.estoque_ciclo_id OR ((OLD.estoque_ciclo_id IS NOT NULL OR OLD.macro02_stock_managed OR vault_macro02_private.guard_active_for(OLD.user_id) OR vault_macro02_private.guard_active_for(NEW.user_id)) AND (NEW.estoque_quantidade,NEW.estoque_unidade_medida,NEW.estoque_gotas_por_ml,NEW.estoque_ml_total,NEW.estoque_unidade_por_dose,NEW.estoque_data_referencia,NEW.person_id,NEW.user_id) IS DISTINCT FROM (OLD.estoque_quantidade,OLD.estoque_unidade_medida,OLD.estoque_gotas_por_ml,OLD.estoque_ml_total,OLD.estoque_unidade_por_dose,OLD.estoque_data_referencia,OLD.person_id,OLD.user_id)) THEN RAISE EXCEPTION 'MACRO02_COMPATIBLE_WRITER_REQUIRED'; END IF;
 IF OLD.macro02_stock_managed AND (NEW.updated_at IS NULL OR NEW.updated_at<OLD.updated_at) THEN RAISE EXCEPTION 'MACRO02_STALE_MEDICATION'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.vault_macro02_guard_stock(),public.vault_macro02_guard_dose() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER macro02_guard_dose BEFORE INSERT OR UPDATE OR DELETE ON public.dose_logs FOR EACH ROW EXECUTE FUNCTION public.vault_macro02_guard_dose();
CREATE TRIGGER macro02_guard_stock BEFORE INSERT OR UPDATE OR DELETE ON public.medicamentos FOR EACH ROW EXECUTE FUNCTION public.vault_macro02_guard_stock();
CREATE FUNCTION public.vault_macro02_guard_acquisition() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE privileged boolean; managed boolean:=false; old_managed boolean:=false;
BEGIN
 privileged := current_user = 'vault_macro02_worker';
 IF privileged THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='DELETE' THEN SELECT macro02_stock_managed OR estoque_ciclo_id IS NOT NULL INTO managed FROM public.medicamentos WHERE id=OLD.medicamento_id AND user_id=OLD.user_id AND person_id=OLD.person_id FOR UPDATE;
 ELSE SELECT macro02_stock_managed OR estoque_ciclo_id IS NOT NULL INTO managed FROM public.medicamentos WHERE id=NEW.medicamento_id AND user_id=NEW.user_id AND person_id=NEW.person_id FOR UPDATE; END IF;
 IF TG_OP='DELETE' THEN managed:=coalesce(managed,false) OR (OLD.medicamento_id IS NOT NULL AND vault_macro02_private.guard_active_for(OLD.user_id));
 ELSE managed:=coalesce(managed,false) OR (NEW.medicamento_id IS NOT NULL AND vault_macro02_private.guard_active_for(NEW.user_id)); END IF;
 IF TG_OP='UPDATE' AND OLD.medicamento_id IS NOT NULL THEN
  IF (OLD.user_id,OLD.person_id,OLD.medicamento_id) IS DISTINCT FROM (NEW.user_id,NEW.person_id,NEW.medicamento_id) THEN
   SELECT macro02_stock_managed OR estoque_ciclo_id IS NOT NULL INTO old_managed FROM public.medicamentos WHERE id=OLD.medicamento_id AND user_id=OLD.user_id AND person_id=OLD.person_id FOR UPDATE NOWAIT;
  END IF;
  managed:=managed OR coalesce(old_managed,false) OR vault_macro02_private.guard_active_for(OLD.user_id);
 END IF;
 IF managed THEN
 IF TG_OP='UPDATE' THEN
   IF (OLD.id,OLD.user_id,OLD.person_id,OLD.medicamento_id) IS DISTINCT FROM (NEW.id,NEW.user_id,NEW.person_id,NEW.medicamento_id) THEN RAISE EXCEPTION 'MACRO02_ACQUISITION_SCOPE'; END IF;
 END IF;
   IF TG_OP='DELETE' THEN RAISE EXCEPTION 'MACRO02_COMPATIBLE_ACQUISITION_REQUIRED'; END IF;
   IF TG_OP='INSERT' THEN
     IF NOT EXISTS(SELECT 1 FROM public.renovacoes r WHERE r.id=NEW.id AND r.user_id=NEW.user_id AND r.person_id=NEW.person_id AND r.medicamento_id=NEW.medicamento_id AND (r.quantidade,r.data,r.data_aquisicao) IS NOT DISTINCT FROM (NEW.quantidade,NEW.data,NEW.data_aquisicao)) THEN RAISE EXCEPTION 'MACRO02_COMPATIBLE_ACQUISITION_REQUIRED'; END IF;
     RETURN NEW;
   END IF;
   IF (OLD.quantidade,OLD.data,OLD.data_aquisicao) IS DISTINCT FROM (NEW.quantidade,NEW.data,NEW.data_aquisicao) THEN RAISE EXCEPTION 'MACRO02_COMPATIBLE_ACQUISITION_REQUIRED'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
REVOKE ALL ON FUNCTION public.vault_macro02_guard_acquisition() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER macro02_guard_acquisition BEFORE INSERT OR UPDATE OR DELETE ON public.renovacoes FOR EACH ROW EXECUTE FUNCTION public.vault_macro02_guard_acquisition();

-- Only return a scoped ledger proof when it still matches the current persisted row.
CREATE INDEX macro02_receipt_dose_idx ON vault_macro02_private.dose_commits
 (user_id,(coalesce(request->'after'->>'id',request->'previous'->>'id')),committed_at DESC)
 WHERE request->>'version'='1';
CREATE FUNCTION vault_macro02_private.read_dose_receipts(p_ids uuid[]) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=vault_macro02_private.actor_uid(); result jsonb;
BEGIN
 IF uid IS NULL OR p_ids IS NULL OR cardinality(p_ids)>100 THEN RAISE EXCEPTION 'MACRO02_RECEIPT_SCOPE'; END IF;
 WITH latest AS (
 SELECT DISTINCT ON (coalesce(c.request->'after'->>'id',c.request->'previous'->>'id'))
 c.*, coalesce(c.request->'after'->>'id',c.request->'previous'->>'id')::uuid AS dose_id
 FROM vault_macro02_private.dose_commits c
 JOIN public.persons p ON p.id=c.person_id AND p.user_id=c.user_id
 JOIN public.medicamentos m ON m.id=c.medication_id AND m.user_id=c.user_id AND m.person_id=c.person_id
 WHERE c.user_id=uid AND c.request->>'version'='1'
 AND coalesce(c.request->'after'->>'id',c.request->'previous'->>'id')::uuid=ANY(p_ids)
 ORDER BY coalesce(c.request->'after'->>'id',c.request->'previous'->>'id'),c.committed_at DESC,c.operation_id DESC
 ) SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.dose_id,'user_id',c.user_id,'person_id',c.person_id,
 'medication_id',c.medication_id,'committed_at',c.committed_at,'ack',c.ack,'previous',c.request->'previous')),'[]'::jsonb)
 INTO result FROM latest c LEFT JOIN public.dose_logs d ON d.id=c.dose_id
 WHERE ((c.ack->>'deleted')::boolean AND d.id IS NULL)
 OR (d.id IS NOT NULL AND d.user_id=c.user_id AND d.person_id=c.person_id AND d.medicamento_id=c.medication_id
 AND NOT (c.ack->>'deleted')::boolean AND vault_macro02_private.same_dose(d,jsonb_populate_record(NULL::public.dose_logs,c.ack->'dose')));
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.read_dose_receipts(uuid[]) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION vault_macro02_private.read_dose_receipts(uuid[]) TO authenticated;
CREATE FUNCTION public.vault_macro02_read_dose_receipts(p_ids uuid[]) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_macro02_private.read_dose_receipts(p_ids) $$;
REVOKE ALL ON FUNCTION public.vault_macro02_read_dose_receipts(uuid[]) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.vault_macro02_read_dose_receipts(uuid[]) TO authenticated;

-- RLS applies to the non-owner, NOLOGIN, NOBYPASSRLS writer.
GRANT SELECT ON public.medicamentos,public.dose_logs,public.renovacoes,public.retiradas TO vault_macro02_worker;
GRANT SELECT(id,user_id) ON public.persons,public.medicos,public.farmacias,public.hospitais,public.locais TO vault_macro02_worker;
GRANT SELECT(id,user_id,person_id) ON public.documents TO vault_macro02_worker;
GRANT UPDATE(data_receita,data_retorno_sus,document_id,estoque_ciclo_id,estoque_data_referencia,estoque_gotas_por_ml,estoque_ml_total,estoque_quantidade,estoque_unidade_medida,estoque_unidade_por_dose,farmacia,farmacia_id,lembrete_receita_data,lembrete_receita_modo,macro02_stock_managed,medico,medico_id,proxima_renovacao,tipo_aquisicao,updated_at) ON public.medicamentos TO vault_macro02_worker;
GRANT INSERT(id,user_id,person_id,medicamento_id,data,horario,quantidade,tomado_em,ignorado_em,dose_kind,motivo,unidade_dose,unidade_dose_rotulo,fonte_unidade,estoque_movimento,farmaco_snapshot,created_at,updated_at),UPDATE(quantidade,tomado_em,ignorado_em,dose_kind,motivo,unidade_dose,unidade_dose_rotulo,fonte_unidade,estoque_movimento,farmaco_snapshot,updated_at),DELETE ON public.dose_logs TO vault_macro02_worker;
GRANT INSERT(id,user_id,person_id,medicamento_id,medicamento_nome,medicamento_dosagem,medico_id,farmacia_id,hospital_id,local_id,document_id,a3_location_snapshot,a3_location_changes,tipo_aquisicao,data_proxima_retirada,data_retorno_sus,exige_nova_receita,quantidade,preco,lote,validade_produto,data,data_aquisicao,anexo_url,observacoes,created_at,updated_at) ON public.renovacoes TO vault_macro02_worker;
GRANT UPDATE(status,renovacao_realizada_id,quantidade_retirada,realizada_em,updated_at) ON public.retiradas TO vault_macro02_worker;
GRANT SELECT,INSERT ON vault_macro02_private.dose_commits TO vault_macro02_worker;
CREATE POLICY macro02_ledger_select ON vault_macro02_private.dose_commits FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
CREATE POLICY macro02_ledger_insert ON vault_macro02_private.dose_commits FOR INSERT TO vault_macro02_worker WITH CHECK(user_id=vault_macro02_private.actor_uid());
CREATE POLICY macro02_worker_select ON public.persons FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
CREATE POLICY macro02_worker_restrict ON public.persons AS RESTRICTIVE FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
CREATE POLICY macro02_worker_select ON public.medicos FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
CREATE POLICY macro02_worker_restrict ON public.medicos AS RESTRICTIVE FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
CREATE POLICY macro02_worker_select ON public.farmacias FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
CREATE POLICY macro02_worker_restrict ON public.farmacias AS RESTRICTIVE FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
CREATE POLICY macro02_worker_select ON public.hospitais FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
CREATE POLICY macro02_worker_restrict ON public.hospitais AS RESTRICTIVE FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
CREATE POLICY macro02_worker_select ON public.locais FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
CREATE POLICY macro02_worker_restrict ON public.locais AS RESTRICTIVE FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
CREATE POLICY macro02_worker_select ON public.documents FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
CREATE POLICY macro02_worker_restrict ON public.documents AS RESTRICTIVE FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
CREATE POLICY macro02_worker_scope ON public.medicamentos FOR ALL TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid() AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=medicamentos.person_id AND p.user_id=medicamentos.user_id)) WITH CHECK(user_id=vault_macro02_private.actor_uid() AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=medicamentos.person_id AND p.user_id=medicamentos.user_id));
CREATE POLICY macro02_worker_restrict ON public.medicamentos AS RESTRICTIVE FOR ALL TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid() AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=medicamentos.person_id AND p.user_id=medicamentos.user_id)) WITH CHECK(user_id=vault_macro02_private.actor_uid() AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=medicamentos.person_id AND p.user_id=medicamentos.user_id));
CREATE POLICY macro02_worker_scope ON public.dose_logs FOR ALL TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid() AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=dose_logs.person_id AND p.user_id=dose_logs.user_id) AND EXISTS(SELECT 1 FROM public.medicamentos m WHERE m.id=dose_logs.medicamento_id AND m.user_id=dose_logs.user_id AND m.person_id=dose_logs.person_id)) WITH CHECK(user_id=vault_macro02_private.actor_uid() AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=dose_logs.person_id AND p.user_id=dose_logs.user_id) AND EXISTS(SELECT 1 FROM public.medicamentos m WHERE m.id=dose_logs.medicamento_id AND m.user_id=dose_logs.user_id AND m.person_id=dose_logs.person_id));
CREATE POLICY macro02_worker_restrict ON public.dose_logs AS RESTRICTIVE FOR ALL TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid() AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=dose_logs.person_id AND p.user_id=dose_logs.user_id) AND EXISTS(SELECT 1 FROM public.medicamentos m WHERE m.id=dose_logs.medicamento_id AND m.user_id=dose_logs.user_id AND m.person_id=dose_logs.person_id)) WITH CHECK(user_id=vault_macro02_private.actor_uid() AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=dose_logs.person_id AND p.user_id=dose_logs.user_id) AND EXISTS(SELECT 1 FROM public.medicamentos m WHERE m.id=dose_logs.medicamento_id AND m.user_id=dose_logs.user_id AND m.person_id=dose_logs.person_id));
CREATE POLICY macro02_worker_scope ON public.renovacoes FOR ALL TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid() AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=renovacoes.person_id AND p.user_id=renovacoes.user_id) AND EXISTS(SELECT 1 FROM public.medicamentos m WHERE m.id=renovacoes.medicamento_id AND m.user_id=renovacoes.user_id AND m.person_id=renovacoes.person_id)) WITH CHECK(user_id=vault_macro02_private.actor_uid() AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=renovacoes.person_id AND p.user_id=renovacoes.user_id) AND EXISTS(SELECT 1 FROM public.medicamentos m WHERE m.id=renovacoes.medicamento_id AND m.user_id=renovacoes.user_id AND m.person_id=renovacoes.person_id));
CREATE POLICY macro02_worker_restrict ON public.renovacoes AS RESTRICTIVE FOR ALL TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid() AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=renovacoes.person_id AND p.user_id=renovacoes.user_id) AND EXISTS(SELECT 1 FROM public.medicamentos m WHERE m.id=renovacoes.medicamento_id AND m.user_id=renovacoes.user_id AND m.person_id=renovacoes.person_id)) WITH CHECK(user_id=vault_macro02_private.actor_uid() AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=renovacoes.person_id AND p.user_id=renovacoes.user_id) AND EXISTS(SELECT 1 FROM public.medicamentos m WHERE m.id=renovacoes.medicamento_id AND m.user_id=renovacoes.user_id AND m.person_id=renovacoes.person_id));
CREATE POLICY macro02_worker_scope ON public.retiradas FOR ALL TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid() AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=retiradas.person_id AND p.user_id=retiradas.user_id) AND EXISTS(SELECT 1 FROM public.medicamentos m WHERE m.id=retiradas.medicamento_id AND m.user_id=retiradas.user_id AND m.person_id=retiradas.person_id)) WITH CHECK(user_id=vault_macro02_private.actor_uid() AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=retiradas.person_id AND p.user_id=retiradas.user_id) AND EXISTS(SELECT 1 FROM public.medicamentos m WHERE m.id=retiradas.medicamento_id AND m.user_id=retiradas.user_id AND m.person_id=retiradas.person_id));
CREATE POLICY macro02_worker_restrict ON public.retiradas AS RESTRICTIVE FOR ALL TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid() AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=retiradas.person_id AND p.user_id=retiradas.user_id) AND EXISTS(SELECT 1 FROM public.medicamentos m WHERE m.id=retiradas.medicamento_id AND m.user_id=retiradas.user_id AND m.person_id=retiradas.person_id)) WITH CHECK(user_id=vault_macro02_private.actor_uid() AND EXISTS(SELECT 1 FROM public.persons p WHERE p.id=retiradas.person_id AND p.user_id=retiradas.user_id) AND EXISTS(SELECT 1 FROM public.medicamentos m WHERE m.id=retiradas.medicamento_id AND m.user_id=retiradas.user_id AND m.person_id=retiradas.person_id));
GRANT EXECUTE ON FUNCTION vault_macro02_private.stock_unit(text),vault_macro02_private.dose_projection(public.dose_logs),vault_macro02_private.same_dose(public.dose_logs,public.dose_logs),vault_macro02_private.stock_projection(public.medicamentos),vault_macro02_private.count_projection(public.medicamentos),vault_macro02_private.acquisition_projection(public.renovacoes),vault_macro02_private.withdrawal_projection(public.retiradas) TO vault_macro02_worker;
ALTER FUNCTION vault_macro02_private.commit_dose(jsonb) OWNER TO vault_macro02_worker;
ALTER FUNCTION vault_macro02_private.commit_stock(jsonb) OWNER TO vault_macro02_worker;
ALTER FUNCTION vault_macro02_private.read_dose_receipts(uuid[]) OWNER TO vault_macro02_worker;
REVOKE CREATE ON SCHEMA vault_macro02_private FROM vault_macro02_worker;
-- Inactive accounts retain pre-cutover policy behaviour; active accounts get strict scope.
CREATE POLICY macro02_dose_scope ON public.dose_logs AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT vault_macro02_private.active_for(user_id) OR (user_id = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.persons p WHERE p.id = dose_logs.person_id AND p.user_id = dose_logs.user_id
  ) AND EXISTS (
    SELECT 1 FROM public.medicamentos m WHERE m.id = dose_logs.medicamento_id AND m.person_id = dose_logs.person_id AND m.user_id = dose_logs.user_id
  )))
  WITH CHECK (NOT vault_macro02_private.active_for(user_id) OR (user_id = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.persons p WHERE p.id = dose_logs.person_id AND p.user_id = dose_logs.user_id
  ) AND EXISTS (
    SELECT 1 FROM public.medicamentos m WHERE m.id = dose_logs.medicamento_id AND m.person_id = dose_logs.person_id AND m.user_id = dose_logs.user_id
  )));

CREATE FUNCTION public.vault_macro02_guard_withdrawal() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE managed boolean:=false;
BEGIN
 IF current_user='vault_macro02_worker' THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='DELETE' OR TG_OP='UPDATE' THEN
  SELECT coalesce(m.macro02_stock_managed OR m.estoque_ciclo_id IS NOT NULL,false) INTO managed FROM public.medicamentos m WHERE m.id=OLD.medicamento_id AND m.user_id=OLD.user_id AND m.person_id=OLD.person_id FOR UPDATE;
  managed:=coalesce(managed,false) OR vault_macro02_private.guard_active_for(OLD.user_id);
  IF managed AND OLD.status='realizada' THEN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'MACRO02_WITHDRAWAL_PROTECTED'; END IF;
    IF (NEW.id,NEW.user_id,NEW.person_id,NEW.medicamento_id,NEW.status,NEW.renovacao_realizada_id,NEW.quantidade_retirada,NEW.realizada_em) IS DISTINCT FROM (OLD.id,OLD.user_id,OLD.person_id,OLD.medicamento_id,OLD.status,OLD.renovacao_realizada_id,OLD.quantidade_retirada,OLD.realizada_em) THEN RAISE EXCEPTION 'MACRO02_WITHDRAWAL_PROTECTED'; END IF;
  END IF;
 END IF;
 IF TG_OP<>'DELETE' THEN
  SELECT coalesce(m.macro02_stock_managed OR m.estoque_ciclo_id IS NOT NULL,false) INTO managed FROM public.medicamentos m WHERE m.id=NEW.medicamento_id AND m.user_id=NEW.user_id AND m.person_id=NEW.person_id FOR UPDATE;
  managed:=coalesce(managed,false) OR vault_macro02_private.guard_active_for(NEW.user_id);
  IF managed AND NEW.status='realizada' THEN
   IF TG_OP='INSERT' THEN RAISE EXCEPTION 'MACRO02_WITHDRAWAL_PROTECTED'; END IF;
   IF OLD.status IS DISTINCT FROM NEW.status THEN RAISE EXCEPTION 'MACRO02_WITHDRAWAL_PROTECTED'; END IF;
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
REVOKE ALL ON FUNCTION public.vault_macro02_guard_withdrawal() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER macro02_guard_withdrawal BEFORE INSERT OR UPDATE OR DELETE ON public.retiradas FOR EACH ROW EXECUTE FUNCTION public.vault_macro02_guard_withdrawal();
-- Guard the parent BEFORE cascade, while child rows still exist. No callable public
-- RPC or bypass path: this trigger is invoked by a permitted parent mutation only.
CREATE FUNCTION vault_macro02_private.guard_person_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' THEN IF (NEW.id,NEW.user_id) IS NOT DISTINCT FROM (OLD.id,OLD.user_id) THEN RETURN NEW; END IF; END IF;
 IF (EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts a WHERE a.user_id=OLD.user_id) AND (
    EXISTS(SELECT 1 FROM public.dose_logs d WHERE d.person_id=OLD.id AND d.user_id=OLD.user_id)
 OR EXISTS(SELECT 1 FROM public.renovacoes r WHERE r.person_id=OLD.id AND r.user_id=OLD.user_id)
 OR EXISTS(SELECT 1 FROM public.retiradas w WHERE w.person_id=OLD.id AND w.user_id=OLD.user_id)
 OR EXISTS(SELECT 1 FROM public.medicamentos m WHERE m.person_id=OLD.id AND m.user_id=OLD.user_id)))
 OR EXISTS(SELECT 1 FROM public.medicamentos m WHERE m.person_id=OLD.id AND m.user_id=OLD.user_id AND (m.macro02_stock_managed OR m.estoque_ciclo_id IS NOT NULL))
 OR EXISTS(SELECT 1 FROM public.dose_logs d WHERE d.person_id=OLD.id AND d.user_id=OLD.user_id AND (d.unidade_dose IS NOT NULL OR d.estoque_movimento IS NOT NULL OR d.farmaco_snapshot IS NOT NULL))
 OR EXISTS(SELECT 1 FROM vault_macro02_private.dose_commits c WHERE c.person_id=OLD.id AND c.user_id=OLD.user_id) THEN
   RAISE EXCEPTION 'MACRO02_PROTECTED_PERSON_HISTORY';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.guard_person_history() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER macro02_guard_person_history BEFORE DELETE OR UPDATE OF id,user_id ON public.persons FOR EACH ROW EXECUTE FUNCTION vault_macro02_private.guard_person_history();

-- No automatic account activation. Drop only the temporary expansion triggers/functions now that final guards exist.
DROP TRIGGER macro02_expand_guard_dose ON public.dose_logs;
DROP TRIGGER macro02_expand_guard_stock ON public.medicamentos;
DROP FUNCTION public.vault_macro02_expand_guard_dose();
DROP FUNCTION public.vault_macro02_expand_guard_stock();
