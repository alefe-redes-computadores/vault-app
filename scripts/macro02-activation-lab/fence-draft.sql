-- LAB ONLY. NOT MIGRATION 03. No activation, no changes to R2 freezes.
-- Exercise the cutover barrier on a disposable PG17 database. A production
-- version must additionally certify FK/cascade coverage, writers and clients.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
 IF current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 OR current_user<>'postgres' THEN RAISE EXCEPTION 'M02_LAB_PG17'; END IF;
 IF EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts) OR EXISTS(SELECT 1 FROM vault_macro02_private.dose_commits) OR
 (SELECT count(*) FROM pg_trigger WHERE tgrelid IN ('vault_macro02_private.active_accounts'::regclass,'vault_macro02_private.dose_commits'::regclass) AND tgname='m02_dormant_freeze_r1' AND tgenabled='A' AND tgfoid='vault_macro02_private.dormant_freeze_r1()'::regprocedure)<>2 THEN RAISE EXCEPTION 'M02_LAB_NOT_DORMANT'; END IF;
END $$;
CREATE TABLE vault_macro02_private.cutover_fence_lab (
 user_id uuid PRIMARY KEY, state text NOT NULL CHECK(state IN ('legacy','frozen')),
 epoch uuid, guardian_receipt text, CHECK((state='legacy' AND epoch IS NULL AND guardian_receipt IS NULL) OR (state='frozen' AND epoch IS NOT NULL AND guardian_receipt IS NOT NULL AND length(btrim(guardian_receipt)) BETWEEN 1 AND 256))
);
ALTER TABLE vault_macro02_private.cutover_fence_lab ENABLE ROW LEVEL SECURITY;
-- An epoch is never reused after cancellation, including for the same account.
CREATE TABLE vault_macro02_private.cutover_epochs_lab(epoch uuid PRIMARY KEY,user_id uuid NOT NULL);
ALTER TABLE vault_macro02_private.cutover_epochs_lab ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vault_macro02_private.cutover_epochs_lab FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
REVOKE ALL ON vault_macro02_private.cutover_fence_lab FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
-- Every protected write locks the same account row, even if it previously did
-- not exist. ON CONFLICT UPDATE sees concurrent changes or raises serialization
-- failure at stronger isolation; a stale snapshot must not admit a write.
CREATE FUNCTION vault_macro02_private.cutover_legacy_lock_lab(p_uid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s text;
BEGIN
 IF p_uid IS NULL THEN RAISE EXCEPTION 'M02_LAB_UNSCOPED'; END IF;
 INSERT INTO vault_macro02_private.cutover_fence_lab AS f(user_id,state) VALUES(p_uid,'legacy')
 ON CONFLICT(user_id) DO UPDATE SET state=f.state RETURNING state INTO s;
 IF s IS DISTINCT FROM 'legacy' THEN RAISE EXCEPTION 'M02_LAB_FROZEN'; END IF;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_legacy_lock_lab(uuid) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
-- FK join endpoints: never infer account from request claims. If either
-- endpoint is still visible during a cascade, use that existing owner.
CREATE FUNCTION vault_macro02_private.cutover_join_owner_lab(p_row jsonb,p_allow_missing boolean) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m uuid; t uuid; mp uuid; tp uuid;
BEGIN
 SELECT user_id,person_id INTO m,mp FROM public.medicamentos WHERE id=(p_row->>'medicamento_id')::uuid;
 SELECT user_id,person_id INTO t,tp FROM public.tratamentos WHERE id=(p_row->>'tratamento_id')::uuid;
 IF m IS NOT NULL AND t IS NOT NULL AND (m<>t OR mp IS DISTINCT FROM tp) THEN RAISE EXCEPTION 'M02_LAB_JOIN_SCOPE'; END IF;
 IF coalesce(m,t) IS NULL OR (NOT p_allow_missing AND (m IS NULL OR t IS NULL)) THEN RAISE EXCEPTION 'M02_LAB_JOIN_UNSCOPED'; END IF;
 RETURN coalesce(m,t);
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_join_owner_lab(jsonb,boolean) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
CREATE FUNCTION vault_macro02_private.cutover_guard_lab() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a uuid; b uuid;
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'M02_LAB_TRUNCATE'; END IF;
 IF TG_OP<>'INSERT' THEN a:=CASE WHEN TG_TABLE_NAME='medicamento_tratamentos' THEN vault_macro02_private.cutover_join_owner_lab(to_jsonb(OLD),TG_OP='DELETE') ELSE (to_jsonb(OLD)->>'user_id')::uuid END; END IF;
 IF TG_OP<>'DELETE' THEN b:=CASE WHEN TG_TABLE_NAME='medicamento_tratamentos' THEN vault_macro02_private.cutover_join_owner_lab(to_jsonb(NEW),false) ELSE (to_jsonb(NEW)->>'user_id')::uuid END; END IF;
 IF TG_OP='UPDATE' AND (a IS NULL OR b IS NULL OR a IS DISTINCT FROM b) THEN RAISE EXCEPTION 'M02_LAB_OWNER_CHANGE'; END IF;
 IF TG_OP='DELETE' THEN PERFORM vault_macro02_private.cutover_legacy_lock_lab(a); RETURN OLD; END IF;
 PERFORM vault_macro02_private.cutover_legacy_lock_lab(b); RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_guard_lab() FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['dose_logs','medicamentos','renovacoes','retiradas','persons','documents','medicos','farmacias','hospitais','locais','tratamentos','cids','fornecimentos','fornecimento_ciclos','fornecimento_itens','fornecimento_documentos','a1_treatment_phases','a1_prescription_links','a1_supply_locations','medicamento_tratamentos'] LOOP
  EXECUTE format('CREATE TRIGGER m02_cutover_guard_lab BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION vault_macro02_private.cutover_guard_lab()',t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ALWAYS TRIGGER m02_cutover_guard_lab',t);
  EXECUTE format('CREATE TRIGGER m02_cutover_truncate_lab BEFORE TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION vault_macro02_private.cutover_guard_lab()',t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ALWAYS TRIGGER m02_cutover_truncate_lab',t);
 END LOOP;
END $$;
-- Operator-only test primitive, NOT an authenticated user RPC. No enrollment.
CREATE FUNCTION vault_macro02_private.cutover_freeze_lab(p_uid uuid,p_epoch uuid,p_receipt text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE s text;
BEGIN
 IF current_user<>'postgres' OR p_uid IS NULL OR p_epoch IS NULL OR p_receipt IS NULL OR length(btrim(p_receipt)) NOT BETWEEN 1 AND 256 OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_uid) THEN RAISE EXCEPTION 'M02_LAB_FREEZE_SCOPE'; END IF;
 INSERT INTO vault_macro02_private.cutover_epochs_lab(epoch,user_id) VALUES(p_epoch,p_uid);
 INSERT INTO vault_macro02_private.cutover_fence_lab AS f(user_id,state,epoch,guardian_receipt) VALUES(p_uid,'frozen',p_epoch,p_receipt)
 ON CONFLICT(user_id) DO UPDATE SET state='frozen',epoch=p_epoch,guardian_receipt=p_receipt WHERE f.state='legacy' RETURNING state INTO s;
 IF s IS DISTINCT FROM 'frozen' THEN RAISE EXCEPTION 'M02_LAB_ALREADY_FROZEN'; END IF;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_freeze_lab(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
-- Deliberately separate raw remote evidence from canonical local Dexie rows.
-- The account is taken only from auth.uid(); epoch is checked against the row.
-- This is a single immutable snapshot while writes for the account are frozen.
CREATE FUNCTION vault_macro02_private.cutover_snapshot_lab(p_epoch uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); f vault_macro02_private.cutover_fence_lab%ROWTYPE; t text; k text; a jsonb; result jsonb:='{}';
BEGIN
 IF uid IS NULL OR p_epoch IS NULL THEN RAISE EXCEPTION 'M02_LAB_AUTH'; END IF;
 SELECT * INTO f FROM vault_macro02_private.cutover_fence_lab WHERE user_id=uid FOR SHARE;
 IF NOT FOUND OR f.state<>'frozen' OR f.epoch IS DISTINCT FROM p_epoch THEN RAISE EXCEPTION 'M02_LAB_FENCE_SCOPE'; END IF;
 IF (SELECT count(*) FROM pg_trigger WHERE tgname IN ('m02_cutover_guard_lab','m02_cutover_truncate_lab') AND tgenabled='A' AND tgfoid='vault_macro02_private.cutover_guard_lab()'::regprocedure)<>40 THEN RAISE EXCEPTION 'M02_LAB_FENCE_INTEGRITY'; END IF;
 FOREACH t IN ARRAY ARRAY['dose_logs','medicamentos','renovacoes','retiradas','persons','documents','medicos','farmacias','hospitais','locais','tratamentos','cids','fornecimentos','fornecimento_ciclos','fornecimento_itens','fornecimento_documentos','a1_treatment_phases','a1_prescription_links','a1_supply_locations','medicamento_tratamentos'] LOOP
  IF (SELECT count(*) FROM pg_trigger WHERE tgrelid=to_regclass('public.'||t) AND tgenabled='A' AND tgfoid='vault_macro02_private.cutover_guard_lab()'::regprocedure AND ((tgname='m02_cutover_guard_lab' AND tgtype=31) OR (tgname='m02_cutover_truncate_lab' AND tgtype=34)))<>2 THEN RAISE EXCEPTION 'M02_LAB_FENCE_TABLE_INTEGRITY'; END IF;
  k:=CASE WHEN t='dose_logs' THEN 'doseLogs' ELSE t END;
  IF t='medicamento_tratamentos' THEN
   IF EXISTS(SELECT 1 FROM public.medicamento_tratamentos j LEFT JOIN public.medicamentos m ON m.id=j.medicamento_id LEFT JOIN public.tratamentos tr ON tr.id=j.tratamento_id WHERE (m.user_id=uid OR tr.user_id=uid) AND (m.user_id IS DISTINCT FROM uid OR tr.user_id IS DISTINCT FROM uid OR m.person_id IS DISTINCT FROM tr.person_id)) THEN RAISE EXCEPTION 'M02_LAB_JOIN_SCOPE'; END IF;
   SELECT coalesce(jsonb_agg(to_jsonb(j) ORDER BY j.id),'[]'::jsonb) INTO a FROM public.medicamento_tratamentos j JOIN public.medicamentos m ON m.id=j.medicamento_id JOIN public.tratamentos tr ON tr.id=j.tratamento_id WHERE m.user_id=uid AND tr.user_id=uid;
  ELSE EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.id),''[]''::jsonb) FROM public.%I r WHERE r.user_id=$1',t) INTO a USING uid;
  END IF;
  result:=result||jsonb_build_object(k,a);
 END LOOP;
 RETURN jsonb_build_object('format','macro02-raw-pg-lab-v1','account_id',uid,'epoch',p_epoch,'fence_id','m02-cutover-lab:'||uid::text||':'||p_epoch::text,'complete',true,'rows',result,'allows_activation',false,'allows_replay',false);
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_snapshot_lab(uuid) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.cutover_snapshot_lab(uuid) TO authenticated;
CREATE FUNCTION public.vault_macro02_cutover_snapshot_lab(p_epoch uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_macro02_private.cutover_snapshot_lab(p_epoch) $$;
REVOKE ALL ON FUNCTION public.vault_macro02_cutover_snapshot_lab(uuid) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION public.vault_macro02_cutover_snapshot_lab(uuid) TO authenticated;
-- Only reverse a preparation fence, not an activated account. No rollback of
-- clinical rows, receipts, or existing R2 migrations.
CREATE FUNCTION vault_macro02_private.cutover_cancel_lab(p_uid uuid,p_epoch uuid) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF current_user<>'postgres' OR EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts WHERE user_id=p_uid) OR EXISTS(SELECT 1 FROM vault_macro02_private.dose_commits WHERE user_id=p_uid) THEN RAISE EXCEPTION 'M02_LAB_CANCEL_UNSAFE'; END IF;
 UPDATE vault_macro02_private.cutover_fence_lab SET state='legacy',epoch=NULL,guardian_receipt=NULL WHERE user_id=p_uid AND state='frozen' AND epoch=p_epoch;
 IF NOT FOUND THEN RAISE EXCEPTION 'M02_LAB_CANCEL_SCOPE'; END IF;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.cutover_cancel_lab(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
COMMIT;
