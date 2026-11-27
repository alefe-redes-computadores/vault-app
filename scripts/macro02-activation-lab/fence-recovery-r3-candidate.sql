-- R3 PREPARATION CANDIDATE — NOT a production migration.
-- Preserves R2 activation freeze. Run only in an isolated PG17 laboratory.
-- The final migration must integrate the certified active writers and RLS.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
 IF current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 OR current_user<>'postgres' THEN RAISE EXCEPTION 'M02_R3_PG17'; END IF;
 IF EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts) OR EXISTS(SELECT 1 FROM vault_macro02_private.dose_commits) OR
 (SELECT count(*) FROM pg_trigger WHERE tgrelid IN ('vault_macro02_private.active_accounts'::regclass,'vault_macro02_private.dose_commits'::regclass) AND tgname='m02_dormant_freeze_r1' AND tgenabled='A' AND tgfoid='vault_macro02_private.dormant_freeze_r1()'::regprocedure)<>2 THEN RAISE EXCEPTION 'M02_R3_NOT_DORMANT'; END IF;
END $$;
CREATE TABLE vault_macro02_private.cutover_fence_r3 (
 user_id uuid PRIMARY KEY, state text NOT NULL CHECK(state IN ('legacy','frozen')),
 epoch uuid, guardian_receipt text, CHECK((state='legacy' AND epoch IS NULL AND guardian_receipt IS NULL) OR (state='frozen' AND epoch IS NOT NULL AND guardian_receipt IS NOT NULL AND length(btrim(guardian_receipt)) BETWEEN 1 AND 256))
);
ALTER TABLE vault_macro02_private.cutover_fence_r3 ENABLE ROW LEVEL SECURITY;
-- An epoch is never reused after cancellation, including for the same account.
CREATE TABLE vault_macro02_private.cutover_epochs_r3(epoch uuid PRIMARY KEY,user_id uuid NOT NULL);
ALTER TABLE vault_macro02_private.cutover_epochs_r3 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vault_macro02_private.cutover_epochs_r3 FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
REVOKE ALL ON vault_macro02_private.cutover_fence_r3 FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
-- Every protected write locks the same account row, even if it previously did
-- not exist. ON CONFLICT UPDATE sees concurrent changes or raises serialization
-- failure at stronger isolation; a stale snapshot must not admit a write.
CREATE FUNCTION vault_macro02_private.cutover_legacy_lock_r3(p_uid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s text;
BEGIN
 IF p_uid IS NULL THEN RAISE EXCEPTION 'M02_R3_UNSCOPED'; END IF;
 INSERT INTO vault_macro02_private.cutover_fence_r3 AS f(user_id,state) VALUES(p_uid,'legacy')
 ON CONFLICT(user_id) DO UPDATE SET state=f.state RETURNING state INTO s;
 IF s IS DISTINCT FROM 'legacy' THEN RAISE EXCEPTION 'M02_R3_FROZEN'; END IF;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_legacy_lock_r3(uuid) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
-- FK join endpoints: never infer account from request claims. If either
-- endpoint is still visible during a cascade, use that existing owner.
CREATE FUNCTION vault_macro02_private.cutover_join_owner_r3(p_row jsonb,p_allow_missing boolean) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m uuid; t uuid; mp uuid; tp uuid;
BEGIN
 SELECT user_id,person_id INTO m,mp FROM public.medicamentos WHERE id=(p_row->>'medicamento_id')::uuid;
 SELECT user_id,person_id INTO t,tp FROM public.tratamentos WHERE id=(p_row->>'tratamento_id')::uuid;
 IF m IS NOT NULL AND t IS NOT NULL AND (m<>t OR mp IS DISTINCT FROM tp) THEN RAISE EXCEPTION 'M02_R3_JOIN_SCOPE'; END IF;
 IF coalesce(m,t) IS NULL OR (NOT p_allow_missing AND (m IS NULL OR t IS NULL)) THEN RAISE EXCEPTION 'M02_R3_JOIN_UNSCOPED'; END IF;
 RETURN coalesce(m,t);
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_join_owner_r3(jsonb,boolean) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
CREATE FUNCTION vault_macro02_private.cutover_guard_r3() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a uuid; b uuid;
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'M02_R3_TRUNCATE'; END IF;
 IF TG_OP<>'INSERT' THEN a:=CASE WHEN TG_TABLE_NAME='medicamento_tratamentos' THEN vault_macro02_private.cutover_join_owner_r3(to_jsonb(OLD),TG_OP='DELETE') ELSE (to_jsonb(OLD)->>'user_id')::uuid END; END IF;
 IF TG_OP<>'DELETE' THEN b:=CASE WHEN TG_TABLE_NAME='medicamento_tratamentos' THEN vault_macro02_private.cutover_join_owner_r3(to_jsonb(NEW),false) ELSE (to_jsonb(NEW)->>'user_id')::uuid END; END IF;
 IF TG_OP='UPDATE' AND (a IS NULL OR b IS NULL OR a IS DISTINCT FROM b) THEN RAISE EXCEPTION 'M02_R3_OWNER_CHANGE'; END IF;
 IF TG_OP='DELETE' THEN PERFORM vault_macro02_private.cutover_legacy_lock_r3(a); RETURN OLD; END IF;
 PERFORM vault_macro02_private.cutover_legacy_lock_r3(b); RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_guard_r3() FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['dose_logs','medicamentos','renovacoes','retiradas','persons','documents','medicos','farmacias','hospitais','locais','tratamentos','cids','fornecimentos','fornecimento_ciclos','fornecimento_itens','fornecimento_documentos','a1_treatment_phases','a1_prescription_links','a1_supply_locations','medicamento_tratamentos'] LOOP
  EXECUTE format('CREATE TRIGGER m02_cutover_guard_r3 BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION vault_macro02_private.cutover_guard_r3()',t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ALWAYS TRIGGER m02_cutover_guard_r3',t);
  EXECUTE format('CREATE TRIGGER m02_cutover_truncate_r3 BEFORE TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION vault_macro02_private.cutover_guard_r3()',t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ALWAYS TRIGGER m02_cutover_truncate_r3',t);
 END LOOP;
END $$;
-- Operator-only test primitive, NOT an authenticated user RPC. No enrollment.
CREATE FUNCTION vault_macro02_private.cutover_freeze_r3(p_uid uuid,p_epoch uuid,p_receipt text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE s text;
BEGIN
 IF current_user<>'postgres' OR p_uid IS NULL OR p_epoch IS NULL OR p_receipt IS NULL OR length(btrim(p_receipt)) NOT BETWEEN 1 AND 256 OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_uid) THEN RAISE EXCEPTION 'M02_R3_FREEZE_SCOPE'; END IF;
 INSERT INTO vault_macro02_private.cutover_epochs_r3(epoch,user_id) VALUES(p_epoch,p_uid);
 INSERT INTO vault_macro02_private.cutover_fence_r3 AS f(user_id,state,epoch,guardian_receipt) VALUES(p_uid,'frozen',p_epoch,p_receipt)
 ON CONFLICT(user_id) DO UPDATE SET state='frozen',epoch=p_epoch,guardian_receipt=p_receipt WHERE f.state='legacy' RETURNING state INTO s;
 IF s IS DISTINCT FROM 'frozen' THEN RAISE EXCEPTION 'M02_R3_ALREADY_FROZEN'; END IF;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_freeze_r3(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
-- Deliberately separate raw remote evidence from canonical local Dexie rows.
-- The account is taken only from auth.uid(); epoch is checked against the row.
-- This is a single immutable snapshot while writes for the account are frozen.
CREATE FUNCTION vault_macro02_private.cutover_snapshot_r3(p_epoch uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); f vault_macro02_private.cutover_fence_r3%ROWTYPE; t text; k text; a jsonb; result jsonb:='{}';
BEGIN
 IF uid IS NULL OR p_epoch IS NULL THEN RAISE EXCEPTION 'M02_R3_AUTH'; END IF;
 SELECT * INTO f FROM vault_macro02_private.cutover_fence_r3 WHERE user_id=uid FOR SHARE;
 IF NOT FOUND OR f.state<>'frozen' OR f.epoch IS DISTINCT FROM p_epoch THEN RAISE EXCEPTION 'M02_R3_FENCE_SCOPE'; END IF;
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
-- No direct client grant: read only through a held claim.
-- Only reverse a preparation fence, not an activated account. No rollback of
-- clinical rows, receipts, or existing R2 migrations.
CREATE TABLE vault_macro02_private.cutover_recovery_claims_r3 (
 user_id uuid NOT NULL, epoch uuid NOT NULL, operation_id uuid NOT NULL,
 server_snapshot_sha256 text NOT NULL CHECK(server_snapshot_sha256 ~ '^[a-f0-9]{64}$'),
 receipt jsonb, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(user_id,epoch), UNIQUE(operation_id),
 FOREIGN KEY(epoch) REFERENCES vault_macro02_private.cutover_epochs_r3(epoch)
);
ALTER TABLE vault_macro02_private.cutover_recovery_claims_r3 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vault_macro02_private.cutover_recovery_claims_r3 FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
-- A claim is account/epoch scoped; the frozen account cannot be released or
-- activated until an independently reviewed operator action. A client has no
-- authority to release the claim, enrol the account or mutate the ledger.
CREATE FUNCTION vault_macro02_private.cutover_claim_r3(p_epoch uuid,p_operation_id uuid,p_acquire boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); f vault_macro02_private.cutover_fence_r3%ROWTYPE; c vault_macro02_private.cutover_recovery_claims_r3%ROWTYPE; snap jsonb; digest text;
BEGIN
 IF uid IS NULL OR p_epoch IS NULL OR p_operation_id IS NULL OR p_acquire IS NULL THEN RAISE EXCEPTION 'M02_R3_CLAIM_AUTH'; END IF;
 SELECT * INTO f FROM vault_macro02_private.cutover_fence_r3 WHERE user_id=uid FOR UPDATE;
 IF NOT FOUND OR f.state<>'frozen' OR f.epoch IS DISTINCT FROM p_epoch THEN RAISE EXCEPTION 'M02_R3_CLAIM_SCOPE'; END IF;
 snap:=vault_macro02_private.cutover_snapshot_r3(p_epoch);
 digest:=encode(sha256(convert_to(snap::text,'UTF8')),'hex');
 IF p_acquire THEN
  INSERT INTO vault_macro02_private.cutover_recovery_claims_r3(user_id,epoch,operation_id,server_snapshot_sha256)
  VALUES(uid,p_epoch,p_operation_id,digest) ON CONFLICT(user_id,epoch) DO NOTHING;
 END IF;
 SELECT * INTO c FROM vault_macro02_private.cutover_recovery_claims_r3 WHERE user_id=uid AND epoch=p_epoch;
 IF NOT FOUND OR c.operation_id IS DISTINCT FROM p_operation_id OR c.server_snapshot_sha256 IS DISTINCT FROM digest THEN RAISE EXCEPTION 'M02_R3_CLAIM_CHANGED'; END IF;
 RETURN jsonb_build_object('format','macro02-recovery-claim-r3','account_id',uid,'epoch',p_epoch,'operation_id',p_operation_id,'state','held','fence_id',snap->>'fence_id','server_snapshot_sha256',digest,'snapshot',snap,'allows_activation',false,'allows_replay',false);
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_claim_r3(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.cutover_claim_r3(uuid,uuid,boolean) TO authenticated;
CREATE FUNCTION public.vault_macro02_recovery_claim_r3(p_epoch uuid,p_operation_id uuid,p_acquire boolean) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_macro02_private.cutover_claim_r3(p_epoch,p_operation_id,p_acquire) $$;
REVOKE ALL ON FUNCTION public.vault_macro02_recovery_claim_r3(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION public.vault_macro02_recovery_claim_r3(uuid,uuid,boolean) TO authenticated;
CREATE FUNCTION vault_macro02_private.cutover_complete_r3(p_receipt jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); ep uuid; op uuid; claimed jsonb; old_receipt jsonb; stable_receipt jsonb;
BEGIN
 IF uid IS NULL OR jsonb_typeof(p_receipt) IS DISTINCT FROM 'object' OR p_receipt->>'format' IS DISTINCT FROM 'macro02-recovery-receipt-r3' OR (p_receipt->>'account_id')::uuid IS DISTINCT FROM uid OR p_receipt->>'state' IS DISTINCT FROM 'local_verified' OR p_receipt->'allows_activation' IS DISTINCT FROM 'false'::jsonb OR p_receipt->'allows_replay' IS DISTINCT FROM 'false'::jsonb OR NOT (p_receipt ?& ARRAY['source_sha256','local_sha256','remote_sha256','server_snapshot_sha256','added','epoch','operation_id','fence_id']) OR (SELECT count(*) FROM jsonb_object_keys(p_receipt))<>13 THEN RAISE EXCEPTION 'M02_R3_RECEIPT_SCOPE'; END IF;
 IF coalesce(p_receipt->>'source_sha256','') !~ '^[a-f0-9]{64}$' OR coalesce(p_receipt->>'local_sha256','') !~ '^[a-f0-9]{64}$' OR coalesce(p_receipt->>'remote_sha256','') !~ '^[a-f0-9]{64}$' OR coalesce(p_receipt->>'server_snapshot_sha256','') !~ '^[a-f0-9]{64}$' OR jsonb_typeof(p_receipt->'added') IS DISTINCT FROM 'number' OR coalesce(p_receipt->>'added','') !~ '^[0-9]{1,9}$' THEN RAISE EXCEPTION 'M02_R3_RECEIPT_SHAPE'; END IF;
 ep:=(p_receipt->>'epoch')::uuid; op:=(p_receipt->>'operation_id')::uuid;
 claimed:=vault_macro02_private.cutover_claim_r3(ep,op,false);
 IF p_receipt->>'fence_id' IS DISTINCT FROM claimed->>'fence_id' OR p_receipt->>'server_snapshot_sha256' IS DISTINCT FROM claimed->>'server_snapshot_sha256' THEN RAISE EXCEPTION 'M02_R3_RECEIPT_FENCE'; END IF;
 -- added is diagnostic for this attempt. A lost response can be retried
 -- add-only, yielding zero additions; the three evidence digests stay exact.
 stable_receipt:=p_receipt-'added';
 SELECT receipt INTO old_receipt FROM vault_macro02_private.cutover_recovery_claims_r3 WHERE user_id=uid AND epoch=ep AND operation_id=op FOR UPDATE;
 IF NOT FOUND OR (old_receipt IS NOT NULL AND old_receipt IS DISTINCT FROM stable_receipt) THEN RAISE EXCEPTION 'M02_R3_RECEIPT_CHANGED'; END IF;
 UPDATE vault_macro02_private.cutover_recovery_claims_r3 SET receipt=stable_receipt WHERE user_id=uid AND epoch=ep AND operation_id=op;
 RETURN stable_receipt||jsonb_build_object('format','macro02-recovery-completion-r3');
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_complete_r3(jsonb) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.cutover_complete_r3(jsonb) TO authenticated;
CREATE FUNCTION public.vault_macro02_recovery_complete_r3(p_receipt jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_macro02_private.cutover_complete_r3(p_receipt) $$;
REVOKE ALL ON FUNCTION public.vault_macro02_recovery_complete_r3(jsonb) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION public.vault_macro02_recovery_complete_r3(jsonb) TO authenticated;
CREATE FUNCTION vault_macro02_private.cutover_cancel_r3(p_uid uuid,p_epoch uuid) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF current_user<>'postgres' OR p_uid IS NULL OR p_epoch IS NULL OR EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts WHERE user_id=p_uid) OR EXISTS(SELECT 1 FROM vault_macro02_private.dose_commits WHERE user_id=p_uid) THEN RAISE EXCEPTION 'M02_R3_CANCEL_UNSAFE'; END IF;
 PERFORM 1 FROM vault_macro02_private.cutover_fence_r3 WHERE user_id=p_uid AND state='frozen' AND epoch=p_epoch FOR UPDATE;
 IF NOT FOUND OR EXISTS(SELECT 1 FROM vault_macro02_private.cutover_recovery_claims_r3 WHERE user_id=p_uid AND epoch=p_epoch) THEN RAISE EXCEPTION 'M02_R3_CANCEL_CLAIM_HELD'; END IF;
 UPDATE vault_macro02_private.cutover_fence_r3 SET state='legacy',epoch=NULL,guardian_receipt=NULL WHERE user_id=p_uid AND state='frozen' AND epoch=p_epoch;
 IF NOT FOUND THEN RAISE EXCEPTION 'M02_R3_CANCEL_SCOPE'; END IF;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_cancel_r3(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
COMMIT;
