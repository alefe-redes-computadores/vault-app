-- Candidate: installed only within the complete Migration 03 transaction.
CREATE TABLE vault_macro02_private.compound_commits_r6 (
 user_id uuid NOT NULL, epoch uuid NOT NULL, operation_id uuid NOT NULL,
 request jsonb NOT NULL, ack jsonb NOT NULL, committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(user_id,operation_id)
);
ALTER TABLE vault_macro02_private.compound_commits_r6 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vault_macro02_private.compound_commits_r6 FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT SELECT,INSERT ON vault_macro02_private.compound_commits_r6 TO vault_macro02_worker;
CREATE POLICY m02_compound_select_r6 ON vault_macro02_private.compound_commits_r6 FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
CREATE POLICY m02_compound_insert_r6 ON vault_macro02_private.compound_commits_r6 FOR INSERT TO vault_macro02_worker WITH CHECK(user_id=vault_macro02_private.actor_uid());
CREATE TRIGGER m02_ledger_guard_r5 BEFORE INSERT OR UPDATE OR DELETE ON vault_macro02_private.compound_commits_r6 FOR EACH ROW EXECUTE FUNCTION vault_macro02_private.ledger_guard_r5();
CREATE TRIGGER m02_ledger_truncate_r5 BEFORE TRUNCATE ON vault_macro02_private.compound_commits_r6 FOR EACH STATEMENT EXECUTE FUNCTION vault_macro02_private.ledger_guard_r5();
ALTER TABLE vault_macro02_private.compound_commits_r6 ENABLE ALWAYS TRIGGER m02_ledger_guard_r5;
ALTER TABLE vault_macro02_private.compound_commits_r6 ENABLE ALWAYS TRIGGER m02_ledger_truncate_r5;
-- All ledger inserts already serialize on the same account fence. Reserve an
-- operation identity across all three ledgers, including direct child RPCs.
CREATE FUNCTION vault_macro02_private.compound_collision_r6() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM vault_macro02_private.lock_active_epoch_r5(NEW.user_id,NEW.epoch);
 IF (TG_TABLE_NAME<>'compound_commits_r6' AND EXISTS(SELECT 1 FROM vault_macro02_private.compound_commits_r6 WHERE user_id=NEW.user_id AND operation_id=NEW.operation_id)) OR
    (TG_TABLE_NAME<>'metadata_commits_r5' AND EXISTS(SELECT 1 FROM vault_macro02_private.metadata_commits_r5 WHERE user_id=NEW.user_id AND operation_id=NEW.operation_id)) OR
    (TG_TABLE_NAME<>'dose_commits' AND EXISTS(SELECT 1 FROM vault_macro02_private.dose_commits WHERE user_id=NEW.user_id AND operation_id=NEW.operation_id)) THEN RAISE EXCEPTION 'M02_R6_OPERATION_COLLISION';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.compound_collision_r6() FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
DO $$ DECLARE t text;BEGIN FOREACH t IN ARRAY ARRAY['dose_commits','metadata_commits_r5','compound_commits_r6'] LOOP
 -- z prefix: original guard first sets epoch for older internal writer.
 EXECUTE format('CREATE TRIGGER z_m02_collision_r6 BEFORE INSERT ON vault_macro02_private.%I FOR EACH ROW EXECUTE FUNCTION vault_macro02_private.compound_collision_r6()',t);
 EXECUTE format('ALTER TABLE vault_macro02_private.%I ENABLE ALWAYS TRIGGER z_m02_collision_r6',t);
END LOOP;END $$;
GRANT SELECT,INSERT ON public.a1_prescription_links TO vault_macro02_worker;
CREATE POLICY m02_worker_link_select_r6 ON public.a1_prescription_links FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
CREATE POLICY m02_worker_link_insert_r6 ON public.a1_prescription_links FOR INSERT TO vault_macro02_worker WITH CHECK(user_id=vault_macro02_private.actor_uid());
CREATE POLICY m02_worker_link_restrict_r6 ON public.a1_prescription_links AS RESTRICTIVE FOR ALL TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid()) WITH CHECK(user_id=vault_macro02_private.actor_uid());
CREATE FUNCTION vault_macro02_private.commit_compound_r6(p_intent jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=vault_macro02_private.actor_uid();ep uuid;op uuid;mid uuid;pid uuid; child_id uuid; ids uuid[];
 a jsonb;b jsonb;s jsonb;m jsonb; l jsonb; c jsonb; r jsonb; x jsonb; actual jsonb; expected jsonb;
 kind text; n integer; idx integer:=0; prior vault_macro02_private.compound_commits_r6%ROWTYPE;
 stock_ack jsonb:='null';meta_ack jsonb:='[]';ack jsonb;
 linkrow public.a1_prescription_links%ROWTYPE;prev public.renovacoes%ROWTYPE;next_rx public.renovacoes%ROWTYPE;
 permitted text[];k text;
BEGIN
 IF uid IS NULL OR jsonb_typeof(p_intent) IS DISTINCT FROM 'object' OR p_intent->>'format' IS DISTINCT FROM 'macro02-compound-r6' OR p_intent->>'account_id' IS DISTINCT FROM uid::text OR NOT(p_intent ?& ARRAY['account_id','epoch','format','kind','link','medication_after','medication_before','metadata','operation_id','stock']) OR (SELECT count(*) FROM jsonb_object_keys(p_intent))<>10 THEN RAISE EXCEPTION 'M02_R6_SHAPE';END IF;
 ep:=(p_intent->>'epoch')::uuid;op:=(p_intent->>'operation_id')::uuid;IF op IS NULL THEN RAISE EXCEPTION 'M02_R6_OP';END IF;
 PERFORM vault_macro02_private.lock_active_epoch_r5(uid,ep);
 SELECT * INTO prior FROM vault_macro02_private.compound_commits_r6 WHERE user_id=uid AND operation_id=op;
 IF FOUND THEN IF prior.epoch IS DISTINCT FROM ep OR prior.request IS DISTINCT FROM p_intent THEN RAISE EXCEPTION 'M02_R6_REPLAY_CHANGED';END IF;RETURN prior.ack;END IF;
 a:=p_intent->'medication_before';b:=p_intent->'medication_after';s:=nullif(p_intent->'stock','null');l:=nullif(p_intent->'link','null');m:=p_intent->'metadata';kind:=p_intent->>'kind';
 IF vault_macro02_private.metadata_row_r4('medicamentos',a,uid) IS DISTINCT FROM true OR vault_macro02_private.metadata_row_r4('medicamentos',b,uid) IS DISTINCT FROM true OR (a->'id',a->'person_id',a->'created_at') IS DISTINCT FROM (b->'id',b->'person_id',b->'created_at') OR jsonb_typeof(m) IS DISTINCT FROM 'array' OR kind IS NULL OR kind NOT IN('adjustment','acquisition','acquisition-unquantified','prescription') THEN RAISE EXCEPTION 'M02_R6_SCOPE';END IF;
 mid:=(a->>'id')::uuid;pid:=(a->>'person_id')::uuid;n:=jsonb_array_length(m);ids:=ARRAY[op];
 IF kind='prescription' THEN
  IF s IS NOT NULL OR n NOT BETWEEN 1 AND 2 OR m->0->'changes'->0->>'kind' IS DISTINCT FROM 'prescription-create' OR m->0->'changes'->0->>'table' IS DISTINCT FROM 'renovacoes' THEN RAISE EXCEPTION 'M02_R6_RX';END IF;
 ELSIF kind='acquisition-unquantified' THEN
  IF s IS NOT NULL OR l IS NOT NULL OR n NOT BETWEEN 1 AND 3 OR m->0->'changes'->0->>'kind' IS DISTINCT FROM 'acquisition-unquantified' OR m->0->'changes'->0->>'table' IS DISTINCT FROM 'renovacoes' THEN RAISE EXCEPTION 'M02_R7_UNQUANTIFIED';END IF;
  permitted:=ARRAY['data_receita','document_id','medico_id','medico','tipo_aquisicao','farmacia_id','farmacia','data_retorno_sus','proxima_renovacao','lembrete_receita_modo','lembrete_receita_data','updated_at'];
  IF a-permitted IS DISTINCT FROM b-permitted THEN RAISE EXCEPTION 'M02_R7_UNQUANTIFIED_STOCK';END IF;
 ELSE
  IF jsonb_typeof(s) IS DISTINCT FROM 'object' OR s->>'version' IS DISTINCT FROM '2' OR s->>'mode' IS DISTINCT FROM kind OR l IS NOT NULL OR n>1 OR (s->'stockBefore'->>'user_id',s->'stockBefore'->>'person_id',s->'stockBefore'->>'medicationId') IS DISTINCT FROM (uid::text,pid::text,mid::text) THEN RAISE EXCEPTION 'M02_R6_STOCK';END IF;
  child_id:=(s->>'operationId')::uuid;IF child_id IS NULL OR child_id=ANY(ids) THEN RAISE EXCEPTION 'M02_R6_ID';END IF;ids:=array_append(ids,child_id);
  FOR x IN SELECT s->'beforeCount' UNION ALL SELECT s->'afterCount' LOOP
   IF jsonb_typeof(x) IS DISTINCT FROM 'object' OR NOT(x ?& ARRAY['estoque_quantidade','estoque_unidade_medida','estoque_gotas_por_ml','estoque_ml_total','estoque_data_referencia','estoque_unidade_por_dose','estoque_ciclo_id','updated_at']) OR (SELECT count(*) FROM jsonb_object_keys(x))<>8 THEN RAISE EXCEPTION 'M02_R6_COUNT_SHAPE';END IF;
  END LOOP;
 END IF;
 FOR x IN SELECT value FROM jsonb_array_elements(m) LOOP
  idx:=idx+1;child_id:=(x->>'operation_id')::uuid;
  IF child_id IS NULL OR child_id=ANY(ids) OR vault_macro02_private.metadata_intent_policy_r4(x,uid,ep) IS DISTINCT FROM true OR jsonb_array_length(x->'changes')<>1 THEN RAISE EXCEPTION 'M02_R6_CHILD_POLICY';END IF;ids:=array_append(ids,child_id);
  c:=x->'changes'->0;r:=coalesce(nullif(c->'after','null'),nullif(c->'before','null'));
  IF r->>'person_id' IS DISTINCT FROM pid::text OR (CASE WHEN c->>'table'='medicamentos' THEN r->>'id' ELSE r->>'medicamento_id' END) IS DISTINCT FROM mid::text THEN RAISE EXCEPTION 'M02_R6_CHILD_SCOPE';END IF;
  IF kind='adjustment' OR (kind='prescription' AND idx=2) THEN
   IF c->>'kind' IS DISTINCT FROM 'medication-metadata' OR c->>'table' IS DISTINCT FROM 'medicamentos' OR c->'after' IS DISTINCT FROM b THEN RAISE EXCEPTION 'M02_R6_CHILD_MED';END IF;
   IF kind='prescription' THEN
    IF c->'before' IS DISTINCT FROM a THEN RAISE EXCEPTION 'M02_R6_RX_PREIMAGE';END IF;
    permitted:=ARRAY['data_receita','document_id','medico_id','medico','proxima_renovacao','lembrete_receita_modo','lembrete_receita_data','updated_at'];
    IF a-permitted IS DISTINCT FROM b-permitted THEN RAISE EXCEPTION 'M02_R6_RX_FIELDS';END IF;
   END IF;
  ELSIF kind='acquisition-unquantified' AND idx>1 THEN
   IF c->>'table'='medicamentos' AND idx=2 THEN
    IF c->>'kind' IS DISTINCT FROM 'medication-metadata' OR c->'before' IS DISTINCT FROM a OR c->'after' IS DISTINCT FROM b THEN RAISE EXCEPTION 'M02_R7_UNQUANTIFIED_MED';END IF;
   ELSE
    IF c->>'kind' IS DISTINCT FROM 'withdrawal-plan' OR c->>'table' IS DISTINCT FROM 'retiradas' OR idx=3 AND m->1->'changes'->0->>'table' IS DISTINCT FROM 'medicamentos' THEN RAISE EXCEPTION 'M02_R7_UNQUANTIFIED_PLAN';END IF;
    FOR r IN SELECT nullif(c->'before','null') UNION ALL SELECT nullif(c->'after','null') LOOP IF r IS NOT NULL AND r->'renovacao_origem_id' IS DISTINCT FROM m->0->'changes'->0->'after'->'id' THEN RAISE EXCEPTION 'M02_R7_UNQUANTIFIED_PLAN_SCOPE';END IF;END LOOP;
    r:=nullif(c->'after','null');IF r IS NOT NULL AND (m->0->'changes'->0->'after'->>'tipo_aquisicao' IS DISTINCT FROM 'sus' OR r->>'data' IS DISTINCT FROM coalesce(m->0->'changes'->0->'after'->>'data_proxima_retirada',m->0->'changes'->0->'after'->>'data_retorno_sus') OR r->>'tipo' IS DISTINCT FROM 'sus' OR r->>'status' IS DISTINCT FROM 'agendada') THEN RAISE EXCEPTION 'M02_R7_UNQUANTIFIED_PLAN_DATE';END IF;
   END IF;
  ELSIF kind='acquisition' THEN
   IF c->>'kind' IS DISTINCT FROM 'withdrawal-plan' OR c->>'table' IS DISTINCT FROM 'retiradas' THEN RAISE EXCEPTION 'M02_R6_PLAN';END IF;
   FOR r IN SELECT nullif(c->'before','null') UNION ALL SELECT nullif(c->'after','null') LOOP
    IF r IS NOT NULL AND (r->'renovacao_origem_id' IS DISTINCT FROM s->'acquisition'->'id' OR r->>'id'=s->>'withdrawalId') THEN RAISE EXCEPTION 'M02_R6_PLAN_SCOPE';END IF;
   END LOOP;
   r:=nullif(c->'after','null');IF r IS NOT NULL AND (s->'acquisition'->>'tipo_aquisicao' IS DISTINCT FROM 'sus' OR r->>'data' IS DISTINCT FROM coalesce(s->'acquisition'->>'data_proxima_retirada',s->'acquisition'->>'data_retorno_sus') OR r->>'tipo' IS DISTINCT FROM 'sus' OR r->>'status' IS DISTINCT FROM 'agendada') THEN RAISE EXCEPTION 'M02_R6_PLAN_DATE';END IF;
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM vault_macro02_private.dose_commits WHERE user_id=uid AND operation_id=ANY(ids)) OR EXISTS(SELECT 1 FROM vault_macro02_private.metadata_commits_r5 WHERE user_id=uid AND operation_id=ANY(ids)) OR EXISTS(SELECT 1 FROM vault_macro02_private.compound_commits_r6 WHERE user_id=uid AND operation_id=ANY(ids)) THEN RAISE EXCEPTION 'M02_R6_CHILD_ALREADY_COMMITTED';END IF;
 SELECT to_jsonb(t) INTO actual FROM public.medicamentos t WHERE id=mid AND user_id=uid AND person_id=pid FOR UPDATE;
 SELECT to_jsonb(jsonb_populate_record(NULL::public.medicamentos,a)) INTO expected;
 IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'M02_R6_MED_PREIMAGE';END IF;
 IF kind='prescription' THEN
  r:=m->0->'changes'->0->'after';
  IF b->'data_receita' IS DISTINCT FROM r->'data' OR b->'medico_id' IS DISTINCT FROM r->'medico_id' OR (n=1 AND a IS DISTINCT FROM b) THEN RAISE EXCEPTION 'M02_R6_RX_REFERENCE';END IF;
 ELSIF kind='acquisition-unquantified' THEN
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(m) x WHERE x->'changes'->0->>'table'='medicamentos') AND a IS DISTINCT FROM b THEN RAISE EXCEPTION 'M02_R7_UNQUANTIFIED_POSTIMAGE';END IF;
 ELSE stock_ack:=vault_macro02_private.commit_atomic_r5(ep,s);END IF;
 FOR x IN SELECT value FROM jsonb_array_elements(m) LOOP
  meta_ack:=meta_ack||jsonb_build_array(vault_macro02_private.commit_metadata_r5(x));
 END LOOP;
 IF l IS NOT NULL THEN
  IF kind<>'prescription' OR jsonb_typeof(l) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'M02_R6_LINK';END IF;
  SELECT * INTO linkrow FROM jsonb_populate_record(NULL::public.a1_prescription_links,l);
  IF (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(l) key) IS DISTINCT FROM (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(to_jsonb(linkrow)) key) OR linkrow.id IS NULL OR (linkrow.user_id,linkrow.person_id,linkrow.medicamento_id) IS DISTINCT FROM (uid,pid,mid) OR linkrow.renovacao_atual_id IS DISTINCT FROM (m->0->'changes'->0->'after'->>'id')::uuid OR linkrow.renovacao_anterior_id IS NULL OR linkrow.renovacao_anterior_id=linkrow.renovacao_atual_id OR linkrow.tipo NOT IN('renovacao','substituicao') OR linkrow.origem IS DISTINCT FROM 'relato_pessoal' OR linkrow.deleted_at IS NOT NULL OR linkrow.created_at IS NULL OR linkrow.updated_at IS DISTINCT FROM linkrow.created_at OR linkrow.created_at>clock_timestamp()+interval '5 minutes' OR length(linkrow.observacoes)>1000 THEN RAISE EXCEPTION 'M02_R6_LINK_SCOPE';END IF;
  SELECT * INTO prev FROM public.renovacoes WHERE id=linkrow.renovacao_anterior_id AND user_id=uid AND person_id=pid AND medicamento_id=mid FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'M02_R6_PREVIOUS_RX';END IF;
  SELECT * INTO next_rx FROM public.renovacoes WHERE id=linkrow.renovacao_atual_id AND user_id=uid AND person_id=pid AND medicamento_id=mid FOR UPDATE;
  IF NOT FOUND OR vault_macro02_private.metadata_pure_rx_r4(to_jsonb(prev)) IS DISTINCT FROM true OR vault_macro02_private.metadata_pure_rx_r4(to_jsonb(next_rx)) IS DISTINCT FROM true OR prev.data>next_rx.data OR EXISTS(SELECT 1 FROM public.a1_prescription_links WHERE user_id=uid AND person_id=pid AND deleted_at IS NULL AND (renovacao_anterior_id IN(linkrow.renovacao_anterior_id,linkrow.renovacao_atual_id) OR renovacao_atual_id=linkrow.renovacao_atual_id)) THEN RAISE EXCEPTION 'M02_R6_LINEAGE';END IF;
  INSERT INTO public.a1_prescription_links SELECT linkrow.*;
  SELECT to_jsonb(t) INTO actual FROM public.a1_prescription_links t WHERE id=linkrow.id AND user_id=uid;
  IF actual IS DISTINCT FROM to_jsonb(linkrow) THEN RAISE EXCEPTION 'M02_R6_LINK_POSTIMAGE';END IF;
 END IF;
 SELECT to_jsonb(t) INTO actual FROM public.medicamentos t WHERE id=mid AND user_id=uid AND person_id=pid;
 SELECT to_jsonb(jsonb_populate_record(NULL::public.medicamentos,b)) INTO expected;
 IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'M02_R6_MED_POSTIMAGE';END IF;
 ack:=jsonb_build_object('format','macro02-compound-ack-r6','account_id',uid,'epoch',ep,'operation_id',op,'request',p_intent,'committed',true,'stock',stock_ack,'metadata',meta_ack);
 INSERT INTO vault_macro02_private.compound_commits_r6(user_id,epoch,operation_id,request,ack) VALUES(uid,ep,op,p_intent,ack);
 RETURN ack;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.commit_compound_r6(jsonb) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT CREATE ON SCHEMA vault_macro02_private TO vault_macro02_worker;
ALTER FUNCTION vault_macro02_private.commit_compound_r6(jsonb) OWNER TO vault_macro02_worker;
REVOKE CREATE ON SCHEMA vault_macro02_private FROM vault_macro02_worker;
SET LOCAL ROLE vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.commit_compound_r6(jsonb) TO authenticated;
RESET ROLE;
CREATE FUNCTION public.vault_macro02_commit_compound_r6(p_intent jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_macro02_private.commit_compound_r6(p_intent) $$;
REVOKE ALL ON FUNCTION public.vault_macro02_commit_compound_r6(jsonb) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION public.vault_macro02_commit_compound_r6(jsonb) TO authenticated;
