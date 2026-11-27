-- Complete the replacement of the dormant guards. Run inside the single
-- candidate transaction, after all R3/R4/R5 functions have been defined.
-- All privileges remain internal to the NOLOGIN, NOBYPASSRLS writer.
DO $$ DECLARE t text; rel regclass; expected text[]; actual text[]; ins text; upd text; f record;
BEGIN
 IF current_user<>'postgres' OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='vault_macro02_worker' AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper) THEN RAISE EXCEPTION 'M02_R5_WORKER';END IF;
 FOREACH t IN ARRAY ARRAY['doseLogs','medicamentos','renovacoes','retiradas'] LOOP
  rel:=CASE WHEN t='doseLogs' THEN 'public.dose_logs'::regclass ELSE to_regclass('public.'||t) END;
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=rel AND relrowsecurity) THEN RAISE EXCEPTION 'M02_R5_RLS';END IF;
  expected:=vault_macro02_private.metadata_columns_r4(t);
  SELECT array_agg(attname::text ORDER BY attname) INTO actual FROM pg_attribute WHERE attrelid=rel AND attnum>0 AND NOT attisdropped AND (t<>'doseLogs' OR attname<>'synced');
  IF actual IS DISTINCT FROM (SELECT array_agg(k ORDER BY k) FROM unnest(expected) k) THEN RAISE EXCEPTION 'M02_R5_SCHEMA_DRIFT: %',t;END IF;
  SELECT string_agg(format('%I',k),','),string_agg(format('%I',k),',') FILTER(WHERE k NOT IN('id','user_id','person_id','created_at')) INTO ins,upd FROM unnest(expected) k;
  EXECUTE format('GRANT INSERT(%s),UPDATE(%s) ON %s TO vault_macro02_worker',ins,upd,rel);
  IF t<>'medicamentos' THEN EXECUTE format('GRANT DELETE ON %s TO vault_macro02_worker',rel);END IF;
 END LOOP;
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='vault_macro02_private' AND p.proname LIKE 'metadata%\_r4' ESCAPE '\' LOOP
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO vault_macro02_worker',f.signature);
 END LOOP;
END $$;
GRANT SELECT(id,user_id,person_id) ON public.tratamentos TO vault_macro02_worker;
CREATE POLICY m02_worker_treatment_select_r5 ON public.tratamentos FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
CREATE POLICY m02_worker_treatment_restrict_r5 ON public.tratamentos AS RESTRICTIVE FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
GRANT SELECT,INSERT,DELETE ON public.medicamento_tratamentos TO vault_macro02_worker;
CREATE POLICY m02_worker_join_r5 ON public.medicamento_tratamentos FOR ALL TO vault_macro02_worker
 USING(EXISTS(SELECT 1 FROM public.medicamentos m JOIN public.tratamentos t ON t.id=medicamento_tratamentos.tratamento_id AND t.user_id=m.user_id AND t.person_id=m.person_id WHERE m.id=medicamento_tratamentos.medicamento_id AND m.user_id=vault_macro02_private.actor_uid()))
 WITH CHECK(EXISTS(SELECT 1 FROM public.medicamentos m JOIN public.tratamentos t ON t.id=medicamento_tratamentos.tratamento_id AND t.user_id=m.user_id AND t.person_id=m.person_id WHERE m.id=medicamento_tratamentos.medicamento_id AND m.user_id=vault_macro02_private.actor_uid()));
CREATE POLICY m02_worker_join_restrict_r5 ON public.medicamento_tratamentos AS RESTRICTIVE FOR ALL TO vault_macro02_worker
 USING(EXISTS(SELECT 1 FROM public.medicamentos m JOIN public.tratamentos t ON t.id=medicamento_tratamentos.tratamento_id AND t.user_id=m.user_id AND t.person_id=m.person_id WHERE m.id=medicamento_tratamentos.medicamento_id AND m.user_id=vault_macro02_private.actor_uid()))
 WITH CHECK(EXISTS(SELECT 1 FROM public.medicamentos m JOIN public.tratamentos t ON t.id=medicamento_tratamentos.tratamento_id AND t.user_id=m.user_id AND t.person_id=m.person_id WHERE m.id=medicamento_tratamentos.medicamento_id AND m.user_id=vault_macro02_private.actor_uid()));

ALTER TABLE vault_macro02_private.dose_commits ADD COLUMN epoch uuid NOT NULL;
CREATE FUNCTION vault_macro02_private.ledger_guard_r5() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE uid uuid; ep uuid;
BEGIN
 IF TG_OP<>'INSERT' OR current_user<>'vault_macro02_worker' THEN RAISE EXCEPTION 'M02_R5_LEDGER_IMMUTABLE';END IF;
 uid:=vault_macro02_private.actor_uid();
 IF uid IS NULL OR NEW.user_id IS DISTINCT FROM uid THEN RAISE EXCEPTION 'M02_R5_LEDGER_SCOPE';END IF;
 SELECT epoch INTO ep FROM vault_macro02_private.active_accounts WHERE user_id=uid;
 IF ep IS NULL OR NEW.epoch IS NOT NULL AND NEW.epoch IS DISTINCT FROM ep THEN RAISE EXCEPTION 'M02_R5_LEDGER_EPOCH';END IF;
 PERFORM vault_macro02_private.lock_active_epoch_r5(uid,ep);
 NEW.epoch:=ep;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.ledger_guard_r5() FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['dose_commits','metadata_commits_r5'] LOOP
 EXECUTE format('CREATE TRIGGER m02_ledger_guard_r5 BEFORE INSERT OR UPDATE OR DELETE ON vault_macro02_private.%I FOR EACH ROW EXECUTE FUNCTION vault_macro02_private.ledger_guard_r5()',t);
 EXECUTE format('CREATE TRIGGER m02_ledger_truncate_r5 BEFORE TRUNCATE ON vault_macro02_private.%I FOR EACH STATEMENT EXECUTE FUNCTION vault_macro02_private.ledger_guard_r5()',t);
 EXECUTE format('ALTER TABLE vault_macro02_private.%I ENABLE ALWAYS TRIGGER m02_ledger_guard_r5',t);
 EXECUTE format('ALTER TABLE vault_macro02_private.%I ENABLE ALWAYS TRIGGER m02_ledger_truncate_r5',t);
 END LOOP;END $$;

-- Reuse certified dose/stock writers; the old RPCs no longer have execution
-- privileges. All new calls must supply the original enrollment epoch.
CREATE FUNCTION vault_macro02_private.commit_atomic_r5(p_epoch uuid,p_intent jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=vault_macro02_private.actor_uid(); op uuid;
BEGIN
 PERFORM vault_macro02_private.lock_active_epoch_r5(uid,p_epoch);
 IF jsonb_typeof(p_intent) IS DISTINCT FROM 'object' OR p_intent->'stockBefore'->>'user_id' IS DISTINCT FROM uid::text THEN RAISE EXCEPTION 'M02_R5_ATOMIC_SCOPE';END IF;
 op:=(p_intent->>'operationId')::uuid;
 IF op IS NULL OR EXISTS(SELECT 1 FROM vault_macro02_private.metadata_commits_r5 WHERE user_id=uid AND operation_id=op) THEN RAISE EXCEPTION 'M02_R5_OPERATION_COLLISION';END IF;
 IF p_intent->>'version'='1' THEN RETURN vault_macro02_private.commit_dose(p_intent);ELSIF p_intent->>'version'='2' THEN RETURN vault_macro02_private.commit_stock(p_intent);END IF;
 RAISE EXCEPTION 'M02_R5_VERSION';
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.commit_atomic_r5(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
-- postgres has SET membership, not inherited worker ownership privileges.
SET LOCAL ROLE vault_macro02_worker;
REVOKE ALL ON FUNCTION vault_macro02_private.commit_dose(jsonb),vault_macro02_private.commit_stock(jsonb) FROM PUBLIC,anon,authenticated,service_role;
RESET ROLE;
REVOKE ALL ON FUNCTION public.vault_macro02_commit_dose(jsonb),public.vault_macro02_commit_stock(jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT CREATE ON SCHEMA vault_macro02_private TO vault_macro02_worker;
ALTER FUNCTION vault_macro02_private.commit_atomic_r5(uuid,jsonb) OWNER TO vault_macro02_worker;
ALTER FUNCTION vault_macro02_private.commit_metadata_r5(jsonb) OWNER TO vault_macro02_worker;
REVOKE CREATE ON SCHEMA vault_macro02_private FROM vault_macro02_worker;
SET LOCAL ROLE vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.commit_atomic_r5(uuid,jsonb),vault_macro02_private.commit_metadata_r5(jsonb) TO authenticated;
RESET ROLE;
CREATE FUNCTION public.vault_macro02_commit_atomic_r5(p_epoch uuid,p_intent jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_macro02_private.commit_atomic_r5(p_epoch,p_intent) $$;
CREATE FUNCTION public.vault_macro02_commit_metadata_r5(p_intent jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_intent->'changes') x WHERE x->>'kind'='acquisition-unquantified') THEN RAISE EXCEPTION 'M02_R7_COMPOUND_REQUIRED';END IF;
 RETURN vault_macro02_private.commit_metadata_r5(p_intent);
END $$;
REVOKE ALL ON FUNCTION public.vault_macro02_commit_atomic_r5(uuid,jsonb),public.vault_macro02_commit_metadata_r5(jsonb) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION public.vault_macro02_commit_atomic_r5(uuid,jsonb),public.vault_macro02_commit_metadata_r5(jsonb) TO authenticated;

-- R2 receipt readers remain read-only; a new epoch-bound reader explicitly
-- separates absence from confirmation, and cannot authorize replay.
CREATE FUNCTION vault_macro02_private.read_atomic_receipts_r5(p_epoch uuid,p_ids uuid[]) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=vault_macro02_private.actor_uid();result jsonb;
BEGIN
 PERFORM vault_macro02_private.lock_active_epoch_r5(uid,p_epoch);
 IF p_ids IS NULL OR cardinality(p_ids)>100 OR EXISTS(SELECT 1 FROM unnest(p_ids) x(id) WHERE id IS NULL) OR cardinality(p_ids)<>(SELECT count(DISTINCT id) FROM unnest(p_ids) x(id)) THEN RAISE EXCEPTION 'M02_R5_RECEIPT_SCOPE';END IF;
 SELECT coalesce(jsonb_agg(CASE WHEN c.operation_id IS NULL THEN jsonb_build_object('operation_id',x.id,'status','absent_at_fence') ELSE jsonb_build_object('operation_id',x.id,'status','committed','request',c.request,'ack',c.ack) END ORDER BY x.ord),'[]'::jsonb) INTO result FROM unnest(p_ids) WITH ORDINALITY x(id,ord) LEFT JOIN vault_macro02_private.dose_commits c ON c.user_id=uid AND c.epoch=p_epoch AND c.operation_id=x.id;
 RETURN jsonb_build_object('account_id',uid,'fence_id','m02-cutover-r5:'||uid::text||':'||p_epoch::text,'complete',true,'rows',result);
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.read_atomic_receipts_r5(uuid,uuid[]) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT CREATE ON SCHEMA vault_macro02_private TO vault_macro02_worker;
ALTER FUNCTION vault_macro02_private.read_atomic_receipts_r5(uuid,uuid[]) OWNER TO vault_macro02_worker;
REVOKE CREATE ON SCHEMA vault_macro02_private FROM vault_macro02_worker;
SET LOCAL ROLE vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.read_atomic_receipts_r5(uuid,uuid[]) TO authenticated;
RESET ROLE;
CREATE FUNCTION public.vault_macro02_read_atomic_receipts_r5(p_epoch uuid,p_ids uuid[]) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_macro02_private.read_atomic_receipts_r5(p_epoch,p_ids) $$;
REVOKE ALL ON FUNCTION public.vault_macro02_read_atomic_receipts_r5(uuid,uuid[]) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION public.vault_macro02_read_atomic_receipts_r5(uuid,uuid[]) TO authenticated;

-- Only now replace the two dormant statement triggers. All new row/statement
-- guards were installed earlier in the same transaction; no unguarded state.
DROP TRIGGER m02_dormant_freeze_r1 ON vault_macro02_private.active_accounts;
DROP TRIGGER m02_dormant_freeze_r1 ON vault_macro02_private.dose_commits;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts) OR EXISTS(SELECT 1 FROM vault_macro02_private.dose_commits) OR EXISTS(SELECT 1 FROM vault_macro02_private.metadata_commits_r5) THEN RAISE EXCEPTION 'M02_R5_UNEXPECTED_ACTIVATION';END IF;
 IF (SELECT count(*) FROM pg_trigger WHERE tgname IN('m02_active_guard_r5','m02_active_truncate_r5','m02_ledger_guard_r5','m02_ledger_truncate_r5') AND tgenabled='A' AND tgrelid IN('vault_macro02_private.active_accounts'::regclass,'vault_macro02_private.dose_commits'::regclass,'vault_macro02_private.metadata_commits_r5'::regclass))<>6 THEN RAISE EXCEPTION 'M02_R5_LEDGER_GUARDS';END IF;
END $$;
