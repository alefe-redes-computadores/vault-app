-- Activation authority candidate. Execute only in one transaction with R3
-- preparation + R4 policy + R5 metadata writer. No account is auto-enrolled.
-- The old R2 barriers are replaced only after all new guards are installed.
ALTER TABLE vault_macro02_private.cutover_fence_r3 ADD COLUMN generation bigint NOT NULL DEFAULT 0 CHECK(generation BETWEEN 0 AND 9007199254740991);
ALTER TABLE vault_macro02_private.active_accounts ADD COLUMN epoch uuid NOT NULL, ADD COLUMN recovery_operation_id uuid NOT NULL, ADD COLUMN recovery_receipt_sha256 text NOT NULL CHECK(recovery_receipt_sha256 ~ '^[0-9a-f]{64}$');
ALTER TABLE vault_macro02_private.active_accounts ADD CONSTRAINT m02_active_epoch_unique_r5 UNIQUE(epoch);
CREATE FUNCTION vault_macro02_private.cutover_generation_r5() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' THEN NEW.generation:=CASE WHEN NEW.state='frozen' THEN 1 ELSE 0 END;RETURN NEW;END IF;
 IF (NEW.state,NEW.epoch) IS DISTINCT FROM (OLD.state,OLD.epoch) THEN NEW.generation:=OLD.generation+1;
 ELSIF NEW.generation IS DISTINCT FROM OLD.generation AND NEW.generation<>OLD.generation+1 THEN RAISE EXCEPTION 'M02_R5_GENERATION';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_generation_r5() FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
CREATE TRIGGER m02_generation_r5 BEFORE INSERT OR UPDATE ON vault_macro02_private.cutover_fence_r3 FOR EACH ROW EXECUTE FUNCTION vault_macro02_private.cutover_generation_r5();
ALTER TABLE vault_macro02_private.cutover_fence_r3 ENABLE ALWAYS TRIGGER m02_generation_r5;

-- Called by authenticated worker functions. Row lock is retained until the
-- outer RPC transaction commits; every clinical mutation shares this fence.
CREATE FUNCTION vault_macro02_private.lock_active_epoch_r5(p_uid uuid,p_epoch uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE f vault_macro02_private.cutover_fence_r3%ROWTYPE;
BEGIN
 IF p_uid IS NULL OR p_epoch IS NULL OR auth.uid() IS DISTINCT FROM p_uid THEN RAISE EXCEPTION 'M02_R5_EPOCH_AUTH'; END IF;
 SELECT * INTO f FROM vault_macro02_private.cutover_fence_r3 WHERE user_id=p_uid FOR UPDATE;
 IF NOT FOUND OR f.state<>'frozen' OR f.epoch IS DISTINCT FROM p_epoch OR NOT EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts a WHERE a.user_id=p_uid AND a.epoch=p_epoch) THEN RAISE EXCEPTION 'M02_R5_EPOCH_INACTIVE';END IF;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.lock_active_epoch_r5(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.lock_active_epoch_r5(uuid,uuid) TO vault_macro02_worker;

-- This private helper cannot grant writes, issue a capability or change an
-- enrollment. The invoker trigger passes its actual current_user. The helper
-- only takes the account lock and checks the existing state. Even direct
-- execution cannot bypass the invoker trigger on a protected table.
CREATE FUNCTION vault_macro02_private.cutover_lock_r5(p_uid uuid,p_protected boolean,p_worker boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE f vault_macro02_private.cutover_fence_r3%ROWTYPE; active_epoch uuid; admin boolean;
BEGIN
 admin:=coalesce(current_setting('role',true) IN ('postgres','service_role') OR (current_setting('role',true)='none' AND session_user IN ('postgres','service_role')),false);
 IF p_uid IS NULL OR (auth.uid() IS DISTINCT FROM p_uid AND NOT admin) THEN RAISE EXCEPTION 'M02_R5_GUARD_SCOPE'; END IF;
 INSERT INTO vault_macro02_private.cutover_fence_r3 AS x(user_id,state) VALUES(p_uid,'legacy') ON CONFLICT(user_id) DO UPDATE SET state=x.state RETURNING * INTO f;
 SELECT epoch INTO active_epoch FROM vault_macro02_private.active_accounts WHERE user_id=p_uid;
 IF f.state='legacy' AND active_epoch IS NULL THEN
  IF p_worker THEN RAISE EXCEPTION 'M02_R5_WORKER_INACTIVE'; END IF;RETURN;
 END IF;
 IF f.state<>'frozen' OR active_epoch IS NULL OR active_epoch IS DISTINCT FROM f.epoch THEN RAISE EXCEPTION 'M02_R5_FROZEN'; END IF;
 IF p_protected AND NOT p_worker THEN RAISE EXCEPTION 'M02_R5_COMPATIBLE_WRITER_REQUIRED'; END IF;
 -- Non-protected dependencies may continue through their existing writers
 -- and RLS. Any cascade into a protected table encounters this guard again.
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_lock_r5(uuid,boolean,boolean) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.cutover_lock_r5(uuid,boolean,boolean) TO authenticated,service_role,vault_macro02_worker;

CREATE FUNCTION vault_macro02_private.cutover_join_scope_r5(p_row jsonb,p_allow_missing boolean) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid;admin boolean;
BEGIN
 uid:=vault_macro02_private.cutover_join_owner_r3(p_row,p_allow_missing);
 admin:=coalesce(current_setting('role',true) IN ('postgres','service_role') OR (current_setting('role',true)='none' AND session_user IN ('postgres','service_role')),false);
 IF auth.uid() IS DISTINCT FROM uid AND NOT admin THEN RAISE EXCEPTION 'M02_R5_JOIN_SCOPE'; END IF;RETURN uid;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_join_scope_r5(jsonb,boolean) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.cutover_join_scope_r5(jsonb,boolean) TO authenticated,service_role,vault_macro02_worker;

-- Preserve the same function OID and the 40 ENABLE ALWAYS triggers checked
-- by the certified preparation snapshot. Only the authority decision changes.
CREATE OR REPLACE FUNCTION vault_macro02_private.cutover_guard_r3() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE a uuid;b uuid;protected boolean;worker boolean:=current_user='vault_macro02_worker';
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'M02_R5_TRUNCATE';END IF;
 protected:=TG_TABLE_NAME IN ('dose_logs','medicamentos','renovacoes','retiradas','medicamento_tratamentos');
 IF TG_OP<>'INSERT' THEN a:=CASE WHEN TG_TABLE_NAME='medicamento_tratamentos' THEN vault_macro02_private.cutover_join_scope_r5(to_jsonb(OLD),TG_OP='DELETE') ELSE (to_jsonb(OLD)->>'user_id')::uuid END;END IF;
 IF TG_OP<>'DELETE' THEN b:=CASE WHEN TG_TABLE_NAME='medicamento_tratamentos' THEN vault_macro02_private.cutover_join_scope_r5(to_jsonb(NEW),false) ELSE (to_jsonb(NEW)->>'user_id')::uuid END;END IF;
 IF TG_OP='UPDATE' AND (a IS NULL OR b IS NULL OR a IS DISTINCT FROM b) THEN RAISE EXCEPTION 'M02_R5_OWNER_CHANGE';END IF;
 PERFORM vault_macro02_private.cutover_lock_r5(coalesce(b,a),protected,worker);
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_guard_r3() FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;

-- Additional protection on the original ledgers: after activation no receipt
-- is mutable, and no account can be silently downgraded/de-enrolled.
CREATE FUNCTION vault_macro02_private.active_account_guard_r5() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE c vault_macro02_private.cutover_recovery_claims_r3%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' OR current_user<>'postgres' THEN RAISE EXCEPTION 'M02_R5_ENROLLMENT_IMMUTABLE'; END IF;
 PERFORM 1 FROM vault_macro02_private.cutover_fence_r3 WHERE user_id=NEW.user_id AND state='frozen' AND epoch=NEW.epoch FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'M02_R5_ENROLLMENT_FENCE';END IF;
 SELECT * INTO c FROM vault_macro02_private.cutover_recovery_claims_r3 WHERE user_id=NEW.user_id AND epoch=NEW.epoch AND operation_id=NEW.recovery_operation_id;
 IF NOT FOUND OR c.receipt IS NULL OR NEW.recovery_receipt_sha256 IS DISTINCT FROM encode(sha256(convert_to(c.receipt::text,'UTF8')),'hex') THEN RAISE EXCEPTION 'M02_R5_ENROLLMENT_RECEIPT';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.active_account_guard_r5() FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
CREATE TRIGGER m02_active_guard_r5 BEFORE INSERT OR UPDATE OR DELETE ON vault_macro02_private.active_accounts FOR EACH ROW EXECUTE FUNCTION vault_macro02_private.active_account_guard_r5();
CREATE TRIGGER m02_active_truncate_r5 BEFORE TRUNCATE ON vault_macro02_private.active_accounts FOR EACH STATEMENT EXECUTE FUNCTION vault_macro02_private.active_account_guard_r5();
ALTER TABLE vault_macro02_private.active_accounts ENABLE ALWAYS TRIGGER m02_active_guard_r5;
ALTER TABLE vault_macro02_private.active_accounts ENABLE ALWAYS TRIGGER m02_active_truncate_r5;

CREATE FUNCTION vault_macro02_private.active_generation_r5() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 UPDATE vault_macro02_private.cutover_fence_r3 SET generation=generation+1 WHERE user_id=NEW.user_id AND epoch=NEW.epoch;
 IF NOT FOUND THEN RAISE EXCEPTION 'M02_R5_ENROLLMENT_GENERATION';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.active_generation_r5() FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
CREATE TRIGGER m02_active_generation_r5 AFTER INSERT ON vault_macro02_private.active_accounts FOR EACH ROW EXECUTE FUNCTION vault_macro02_private.active_generation_r5();
ALTER TABLE vault_macro02_private.active_accounts ENABLE ALWAYS TRIGGER m02_active_generation_r5;

-- Operator-only enrollment after a real local recovery receipt and separate
-- Guardian review. Client RPCs never execute this function.
CREATE FUNCTION vault_macro02_private.activate_account_r5(p_uid uuid,p_epoch uuid,p_operation_id uuid,p_receipt_sha256 text,p_guardian_review text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF current_user<>'postgres' OR p_uid IS NULL OR p_epoch IS NULL OR p_operation_id IS NULL OR p_receipt_sha256 IS NULL OR p_receipt_sha256 !~ '^[a-f0-9]{64}$' OR p_guardian_review IS NULL OR length(btrim(p_guardian_review)) NOT BETWEEN 1 AND 256 THEN RAISE EXCEPTION 'M02_R5_OPERATOR_SCOPE';END IF;
 PERFORM 1 FROM vault_macro02_private.cutover_fence_r3 WHERE user_id=p_uid AND state='frozen' AND epoch=p_epoch FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'M02_R5_ENROLLMENT_FENCE';END IF;
 INSERT INTO vault_macro02_private.active_accounts(user_id,epoch,recovery_operation_id,recovery_receipt_sha256,guardian_receipt) VALUES(p_uid,p_epoch,p_operation_id,p_receipt_sha256,p_guardian_review);
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.activate_account_r5(uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;

CREATE FUNCTION vault_macro02_private.read_enrollment_r5() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); f vault_macro02_private.cutover_fence_r3%ROWTYPE; ep uuid; state text:='legacy';g bigint:=0;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'M02_R5_AUTH';END IF;
 SELECT * INTO f FROM vault_macro02_private.cutover_fence_r3 WHERE user_id=uid FOR SHARE;
 IF FOUND THEN state:=f.state;g:=f.generation;END IF;
 SELECT epoch INTO ep FROM vault_macro02_private.active_accounts WHERE user_id=uid;
 IF ep IS NOT NULL THEN IF f.state IS DISTINCT FROM 'frozen' OR f.epoch IS DISTINCT FROM ep THEN RAISE EXCEPTION 'M02_R5_ENROLLMENT_CORRUPT';END IF;state:='premium';END IF;
 RETURN jsonb_build_object('format','macro02-enrollment-r3','account_id',uid,'state',state,'epoch',CASE WHEN state='legacy' THEN NULL ELSE f.epoch END,'minimum_protocol',3,'generation',g);
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.read_enrollment_r5() FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.read_enrollment_r5() TO authenticated;
CREATE FUNCTION public.vault_macro02_read_enrollment_r5() RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_macro02_private.read_enrollment_r5() $$;
REVOKE ALL ON FUNCTION public.vault_macro02_read_enrollment_r5() FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION public.vault_macro02_read_enrollment_r5() TO authenticated;

-- A preparation claim is never a valid snapshot after activation.
CREATE OR REPLACE FUNCTION vault_macro02_private.cutover_snapshot_r3(p_epoch uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); f vault_macro02_private.cutover_fence_r3%ROWTYPE; t text; k text; a jsonb; result jsonb:='{}';
BEGIN
 IF uid IS NULL OR p_epoch IS NULL THEN RAISE EXCEPTION 'M02_R3_AUTH'; END IF;
 SELECT * INTO f FROM vault_macro02_private.cutover_fence_r3 WHERE user_id=uid FOR SHARE;
 IF NOT FOUND OR f.state<>'frozen' OR f.epoch IS DISTINCT FROM p_epoch THEN RAISE EXCEPTION 'M02_R3_FENCE_SCOPE'; END IF;
 IF EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts WHERE user_id=uid) THEN RAISE EXCEPTION 'M02_R5_RECOVERY_ALREADY_ACTIVATED';END IF;
 IF (SELECT count(*) FROM pg_trigger WHERE tgname IN ('m02_cutover_guard_r3','m02_cutover_truncate_r3') AND tgenabled='A' AND tgfoid='vault_macro02_private.cutover_guard_r3()'::regprocedure)<>40 THEN RAISE EXCEPTION 'M02_R3_FENCE_INTEGRITY'; END IF;
 FOREACH t IN ARRAY ARRAY['dose_logs','medicamentos','renovacoes','retiradas','persons','documents','medicos','farmacias','hospitais','locais','tratamentos','cids','fornecimentos','fornecimento_ciclos','fornecimento_itens','fornecimento_documentos','a1_treatment_phases','a1_prescription_links','a1_supply_locations','medicamento_tratamentos'] LOOP
  IF (SELECT count(*) FROM pg_trigger WHERE tgrelid=to_regclass('public.'||t) AND tgenabled='A' AND tgfoid='vault_macro02_private.cutover_guard_r3()'::regprocedure AND ((tgname='m02_cutover_guard_r3' AND tgtype=31) OR (tgname='m02_cutover_truncate_r3' AND tgtype=34)))<>2 THEN RAISE EXCEPTION 'M02_R3_FENCE_TABLE_INTEGRITY'; END IF;
  k:=CASE WHEN t='dose_logs' THEN 'doseLogs' ELSE t END;
  IF t='medicamento_tratamentos' THEN
   IF EXISTS(SELECT 1 FROM public.medicamento_tratamentos j LEFT JOIN public.medicamentos m ON m.id=j.medicamento_id LEFT JOIN public.tratamentos tr ON tr.id=j.tratamento_id WHERE (m.user_id=uid OR tr.user_id=uid) AND (m.user_id IS DISTINCT FROM uid OR tr.user_id IS DISTINCT FROM uid OR m.person_id IS DISTINCT FROM tr.person_id)) THEN RAISE EXCEPTION 'M02_R3_JOIN_SCOPE'; END IF;
   SELECT coalesce(jsonb_agg(to_jsonb(j) ORDER BY j.id),'[]'::jsonb) INTO a FROM public.medicamento_tratamentos j JOIN public.medicamentos m ON m.id=j.medicamento_id JOIN public.tratamentos tr ON tr.id=j.tratamento_id WHERE m.user_id=uid AND tr.user_id=uid;
  ELSE EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.id),''[]''::jsonb) FROM public.%I r WHERE r.user_id=$1',t) INTO a USING uid;
  END IF;
  result:=result||jsonb_build_object(k,a);
 END LOOP;
 RETURN jsonb_build_object('format','macro02-raw-pg-r3','account_id',uid,'epoch',p_epoch,'fence_id','m02-cutover-r3:'||uid::text||':'||p_epoch::text,'complete',true,'rows',result,'allows_activation',false,'allows_replay',false);
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_snapshot_r3(uuid) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;

-- Read-only active-device evidence, not a recovery claim or mutation grant.
CREATE FUNCTION vault_macro02_private.cutover_active_snapshot_r5(p_epoch uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); f vault_macro02_private.cutover_fence_r3%ROWTYPE; t text; k text; a jsonb; result jsonb:='{}';
BEGIN
 IF uid IS NULL OR p_epoch IS NULL THEN RAISE EXCEPTION 'M02_R3_AUTH'; END IF;
 SELECT * INTO f FROM vault_macro02_private.cutover_fence_r3 WHERE user_id=uid FOR SHARE;
 IF NOT FOUND OR f.state<>'frozen' OR f.epoch IS DISTINCT FROM p_epoch THEN RAISE EXCEPTION 'M02_R3_FENCE_SCOPE'; END IF;
 IF NOT EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts WHERE user_id=uid AND epoch=p_epoch) THEN RAISE EXCEPTION 'M02_R5_DEVICE_NOT_ACTIVE';END IF;
 IF (SELECT count(*) FROM pg_trigger WHERE tgname IN ('m02_cutover_guard_r3','m02_cutover_truncate_r3') AND tgenabled='A' AND tgfoid='vault_macro02_private.cutover_guard_r3()'::regprocedure)<>40 THEN RAISE EXCEPTION 'M02_R3_FENCE_INTEGRITY'; END IF;
 FOREACH t IN ARRAY ARRAY['dose_logs','medicamentos','renovacoes','retiradas','persons','documents','medicos','farmacias','hospitais','locais','tratamentos','cids','fornecimentos','fornecimento_ciclos','fornecimento_itens','fornecimento_documentos','a1_treatment_phases','a1_prescription_links','a1_supply_locations','medicamento_tratamentos'] LOOP
  IF (SELECT count(*) FROM pg_trigger WHERE tgrelid=to_regclass('public.'||t) AND tgenabled='A' AND tgfoid='vault_macro02_private.cutover_guard_r3()'::regprocedure AND ((tgname='m02_cutover_guard_r3' AND tgtype=31) OR (tgname='m02_cutover_truncate_r3' AND tgtype=34)))<>2 THEN RAISE EXCEPTION 'M02_R3_FENCE_TABLE_INTEGRITY'; END IF;
  k:=CASE WHEN t='dose_logs' THEN 'doseLogs' ELSE t END;
  IF t='medicamento_tratamentos' THEN
   IF EXISTS(SELECT 1 FROM public.medicamento_tratamentos j LEFT JOIN public.medicamentos m ON m.id=j.medicamento_id LEFT JOIN public.tratamentos tr ON tr.id=j.tratamento_id WHERE (m.user_id=uid OR tr.user_id=uid) AND (m.user_id IS DISTINCT FROM uid OR tr.user_id IS DISTINCT FROM uid OR m.person_id IS DISTINCT FROM tr.person_id)) THEN RAISE EXCEPTION 'M02_R3_JOIN_SCOPE'; END IF;
   SELECT coalesce(jsonb_agg(to_jsonb(j) ORDER BY j.id),'[]'::jsonb) INTO a FROM public.medicamento_tratamentos j JOIN public.medicamentos m ON m.id=j.medicamento_id JOIN public.tratamentos tr ON tr.id=j.tratamento_id WHERE m.user_id=uid AND tr.user_id=uid;
  ELSE EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.id),''[]''::jsonb) FROM public.%I r WHERE r.user_id=$1',t) INTO a USING uid;
  END IF;
  result:=result||jsonb_build_object(k,a);
 END LOOP;
 RETURN jsonb_build_object('format','macro02-active-snapshot-r5','account_id',uid,'epoch',p_epoch,'fence_id','m02-active-r5:'||uid::text||':'||p_epoch::text,'complete',true,'rows',result,'allows_activation',false,'allows_replay',false);
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_active_snapshot_r5(uuid) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.cutover_active_snapshot_r5(uuid) TO authenticated;
CREATE FUNCTION public.vault_macro02_active_snapshot_r5(p_epoch uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_macro02_private.cutover_active_snapshot_r5(p_epoch) $$;
REVOKE ALL ON FUNCTION public.vault_macro02_active_snapshot_r5(uuid) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION public.vault_macro02_active_snapshot_r5(uuid) TO authenticated;
