-- MIGRATION 03 CANDIDATE — LAB ONLY, DO NOT APPLY TO PRODUCTION BEFORE CERTIFICATION.
BEGIN;

-- SOURCE: fence-recovery-r3-candidate.sql
-- R3 PREPARATION CANDIDATE — NOT a production migration.
-- Preserves R2 activation freeze. Run only in an isolated PG17 laboratory.
-- The final migration must integrate the certified active writers and RLS.
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

-- SOURCE: metadata-policy-r4.sql
-- Lab only: independent server-side envelope policy. No DML, no activation,
-- no grants to client roles. CAS/ownership/FK/receipt persistence must still
-- be enforced by the future worker; this function is not write permission.
CREATE FUNCTION vault_macro02_private.metadata_columns_r4(t text) RETURNS text[]
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT CASE t
 WHEN 'doseLogs' THEN ARRAY['id','user_id','person_id','medicamento_id','data','horario','tomado_em','ignorado_em','quantidade','created_at','updated_at','observacoes','dose_kind','motivo','unidade_dose','unidade_dose_rotulo','fonte_unidade','estoque_movimento','farmaco_snapshot']::text[]
 WHEN 'medicamentos' THEN ARRAY['id','user_id','person_id','document_id','medico_id','farmacia_id','hospital_id','local_id','nome','dosagem','medico','farmacia','data_receita','proxima_renovacao','tipo_receita','tipo_uso','forma_farmaceutica','cor_principal','cor_secundaria','status','estoque_quantidade','estoque_data_referencia','estoque_horarios','estoque_unidade_por_dose','estoque_unidade_medida','estoque_ml_total','estoque_gotas_por_ml','formato','cores','preco','motivo_descontinuacao','medico_descontinuacao_id','medico_descontinuacao_nome','substituido_por_id','data_descontinuacao','historico_dosagens','observacoes','created_at','updated_at','cid_ids','tratamento_ids','tipo_aquisicao','data_retorno_sus','lembrete_receita_modo','lembrete_receita_data','catalog_snapshot','contexto_clinico_m1','estoque_ciclo_id','macro02_stock_managed']::text[]
 WHEN 'renovacoes' THEN ARRAY['id','user_id','person_id','document_id','medicamento_id','medico_id','farmacia_id','hospital_id','local_id','quantidade','preco','lote','validade_produto','data','anexo_url','observacoes','created_at','updated_at','tipo_aquisicao','data_retorno_sus','data_proxima_retirada','exige_nova_receita','data_aquisicao','medicamento_nome','medicamento_dosagem','a3_location_snapshot','a3_location_changes']::text[]
 WHEN 'retiradas' THEN ARRAY['id','user_id','person_id','medicamento_id','renovacao_origem_id','renovacao_realizada_id','medico_id','farmacia_id','hospital_id','local_id','medicamento_nome','medicamento_dosagem','data','horario','tipo','status','quantidade_prevista','quantidade_retirada','exige_nova_receita','observacoes','realizada_em','created_at','updated_at','reagendamentos','fornecimento_id','fornecimento_ciclo_id','a3_location_snapshot','a3_location_changes']::text[]
 ELSE NULL END $$;
CREATE FUNCTION vault_macro02_private.metadata_uuid_r4(v jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(jsonb_typeof(v)='string' AND (v#>>'{}') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',false)
$$;
CREATE FUNCTION vault_macro02_private.metadata_day_r4(v jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE s text:=v#>>'{}';
BEGIN
 IF jsonb_typeof(v) IS DISTINCT FROM 'string' OR s !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR left(s,4)='0000' THEN RETURN false; END IF;
 RETURN to_char(s::date,'YYYY-MM-DD')=s;
EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN RETURN false;
END $$;
CREATE FUNCTION vault_macro02_private.metadata_instant_r4(v jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE s text:=v#>>'{}';
BEGIN
 IF jsonb_typeof(v) IS DISTINCT FROM 'string' OR s !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,6})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$' OR NOT vault_macro02_private.metadata_day_r4(to_jsonb(left(s,10))) THEN RETURN false; END IF;
 RETURN isfinite(s::timestamptz);
EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format OR invalid_parameter_value THEN RETURN false;
END $$;
CREATE FUNCTION vault_macro02_private.metadata_hour_r4(v jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT coalesce(jsonb_typeof(v)='string' AND (v#>>'{}') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$',false) $$;
CREATE FUNCTION vault_macro02_private.metadata_missing_r4(r jsonb,keys text[]) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT NOT EXISTS(SELECT 1 FROM unnest(keys) k WHERE r->k IS DISTINCT FROM 'null'::jsonb) $$;
CREATE FUNCTION vault_macro02_private.metadata_quantity_r4(v jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT CASE WHEN v='null'::jsonb THEN true WHEN jsonb_typeof(v)='number' THEN (v#>>'{}')::numeric>0 ELSE false END $$;
CREATE FUNCTION vault_macro02_private.metadata_prefix_r4(a jsonb,b jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE i integer;
BEGIN
 IF a='null'::jsonb THEN a:='[]'; END IF; IF b='null'::jsonb THEN b:='[]'; END IF;
 IF jsonb_typeof(a) IS DISTINCT FROM 'array' OR jsonb_typeof(b) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF jsonb_array_length(a)>jsonb_array_length(b) THEN RETURN false; END IF;
 FOR i IN 0..jsonb_array_length(a)-1 LOOP IF a->i IS DISTINCT FROM b->i THEN RETURN false; END IF; END LOOP;
 RETURN true;
END $$;
CREATE FUNCTION vault_macro02_private.metadata_row_r4(t text,r jsonb,uid uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE keys text[]:=vault_macro02_private.metadata_columns_r4(t);
BEGIN
 IF uid IS NULL OR keys IS NULL OR jsonb_typeof(r) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 IF NOT (r ?& keys) OR (SELECT count(*) FROM jsonb_object_keys(r))<>cardinality(keys) THEN RETURN false; END IF;
 RETURN coalesce(vault_macro02_private.metadata_uuid_r4(r->'id') AND r->>'user_id'=uid::text AND vault_macro02_private.metadata_uuid_r4(r->'person_id') AND (t='medicamentos' OR vault_macro02_private.metadata_uuid_r4(r->'medicamento_id')) AND vault_macro02_private.metadata_instant_r4(r->'updated_at') AND (r->'created_at'='null'::jsonb OR vault_macro02_private.metadata_instant_r4(r->'created_at')),false);
END $$;
CREATE FUNCTION vault_macro02_private.metadata_planned_r4(r jsonb) RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$ SELECT coalesce(r->>'dose_kind'='planned' AND vault_macro02_private.metadata_missing_r4(r,ARRAY['tomado_em','ignorado_em','unidade_dose','unidade_dose_rotulo','fonte_unidade','estoque_movimento','farmaco_snapshot']) AND vault_macro02_private.metadata_day_r4(r->'data') AND vault_macro02_private.metadata_hour_r4(r->'horario') AND vault_macro02_private.metadata_quantity_r4(r->'quantidade'),false) $$;
CREATE FUNCTION vault_macro02_private.metadata_pure_rx_r4(r jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT vault_macro02_private.metadata_missing_r4(r,ARRAY['data_aquisicao','tipo_aquisicao','quantidade','preco','lote','validade_produto']) $$;
CREATE FUNCTION vault_macro02_private.metadata_unresolved_r4(r jsonb) RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$ SELECT coalesce(r->>'status' IN('agendada','cancelada','nao_realizada') AND vault_macro02_private.metadata_missing_r4(r,ARRAY['renovacao_realizada_id','quantidade_retirada','realizada_em']) AND vault_macro02_private.metadata_day_r4(r->'data') AND (r->'horario'='null'::jsonb OR vault_macro02_private.metadata_hour_r4(r->'horario')) AND vault_macro02_private.metadata_quantity_r4(r->'quantidade_prevista'),false) $$;
CREATE FUNCTION vault_macro02_private.metadata_change_r4(c jsonb,uid uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE t text:=c->>'table'; k text:=c->>'kind'; a jsonb:=nullif(c->'before','null'::jsonb); b jsonb:=nullif(c->'after','null'::jsonb); r jsonb:=c->'receipt'; reassign boolean; permitted text[];
BEGIN
 IF jsonb_typeof(c) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 IF NOT(c ?& ARRAY['table','kind','before','after']) OR EXISTS(SELECT 1 FROM jsonb_object_keys(c) x WHERE x NOT IN('table','kind','before','after','receipt')) OR (a IS NULL AND b IS NULL) OR vault_macro02_private.metadata_columns_r4(t) IS NULL THEN RETURN false; END IF;
 IF (a IS NOT NULL AND NOT vault_macro02_private.metadata_row_r4(t,a,uid)) OR (b IS NOT NULL AND NOT vault_macro02_private.metadata_row_r4(t,b,uid)) THEN RETURN false; END IF;
 IF a IS NOT NULL AND b IS NOT NULL THEN
  IF (a->'id',a->'user_id',a->'person_id',a->'created_at') IS DISTINCT FROM (b->'id',b->'user_id',b->'person_id',b->'created_at') OR (t<>'medicamentos' AND k<>'withdrawal-plan' AND a->'medicamento_id' IS DISTINCT FROM b->'medicamento_id') OR (b->>'updated_at')::timestamptz<(a->>'updated_at')::timestamptz THEN RETURN false; END IF;
 END IF;
 IF k IS DISTINCT FROM 'withdrawal-link-receipt' AND c ? 'receipt' THEN RETURN false; END IF;
 CASE k
 WHEN 'planned-dose' THEN
  RETURN t='doseLogs' AND (a IS NULL OR vault_macro02_private.metadata_planned_r4(a)) AND (b IS NULL OR vault_macro02_private.metadata_planned_r4(b)) AND (a IS NULL OR b IS NULL OR a-ARRAY['quantidade','motivo','observacoes','updated_at']=b-ARRAY['quantidade','motivo','observacoes','updated_at']);
 WHEN 'medication-create' THEN
  IF t<>'medicamentos' OR a IS NOT NULL OR b IS NULL OR b->'estoque_ciclo_id' IS DISTINCT FROM 'null'::jsonb OR b->'macro02_stock_managed' IS DISTINCT FROM 'false'::jsonb OR jsonb_typeof(b->'nome') IS DISTINCT FROM 'string' OR length(btrim(b->>'nome'))=0 OR jsonb_typeof(b->'dosagem') IS DISTINCT FROM 'string' OR length(btrim(b->>'dosagem'))=0 THEN RETURN false; END IF;
  -- Conservative stock-unit subset with explicit accent normalization; any
  -- unknown unit is rejected, not inferred from drug name or dosage.
  IF b->'estoque_quantidade'='null'::jsonb THEN RETURN true; END IF;
  IF jsonb_typeof(b->'estoque_quantidade') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
  RETURN (b->>'estoque_quantidade')::numeric>=0 AND ((b->>'estoque_quantidade')::numeric=0 OR coalesce(translate(lower(btrim(b->>'estoque_unidade_medida')),'áàâãéêíóôõúüç','aaaaeeiooouuc') IN('comprimido','comprimidos','comprimido(s)','capsula','capsulas','capsula(s)','gota','gotas','gota(s)','ml','unidade','unidades','unidade(s)','aplicacao','aplicacoes','aplicacao(oes)','inalacao','inalacoes','mg','mcg','g','ui','jato','jatos','adesivo','adesivos','sache','saches'),false));
 WHEN 'medication-discontinue' THEN
  IF t<>'medicamentos' OR a IS NULL OR b IS NULL OR b->>'status' IS DISTINCT FROM 'descontinuado' OR NOT vault_macro02_private.metadata_day_r4(b->'data_descontinuacao') OR jsonb_typeof(b->'motivo_descontinuacao') IS DISTINCT FROM 'string' OR length(btrim(b->>'motivo_descontinuacao'))=0 THEN RETURN false; END IF;
  permitted:=ARRAY['status','data_descontinuacao','motivo_descontinuacao','medico_descontinuacao_id','medico_descontinuacao_nome','substituido_por_id','updated_at'];
 WHEN 'medication-metadata' THEN
  IF t<>'medicamentos' OR a IS NULL OR b IS NULL THEN RETURN false; END IF; permitted:=ARRAY['nome','dosagem','medico','farmacia','medico_id','farmacia_id','hospital_id','local_id','document_id','data_receita','proxima_renovacao','observacoes','tipo_receita','lembrete_receita_modo','lembrete_receita_data','tipo_uso','tipo_aquisicao','data_retorno_sus','forma_farmaceutica','cor_principal','cor_secundaria','status','estoque_horarios','formato','cores','motivo_descontinuacao','medico_descontinuacao_id','medico_descontinuacao_nome','substituido_por_id','data_descontinuacao','preco','historico_dosagens','catalog_snapshot','contexto_clinico_m1','cid_ids','tratamento_ids','updated_at'];
 WHEN 'acquisition-unquantified' THEN RETURN t='renovacoes' AND a IS NULL AND b IS NOT NULL AND b->'quantidade'='null'::jsonb AND vault_macro02_private.metadata_day_r4(b->'data') AND vault_macro02_private.metadata_day_r4(b->'data_aquisicao') AND b->>'tipo_aquisicao' IN('comprado','sus','gratuito') AND (b->'preco'='null'::jsonb OR CASE WHEN jsonb_typeof(b->'preco')='number' THEN (b->>'preco')::numeric>=0 ELSE false END);
 WHEN 'prescription-create' THEN RETURN t='renovacoes' AND a IS NULL AND b IS NOT NULL AND vault_macro02_private.metadata_pure_rx_r4(b) AND vault_macro02_private.metadata_day_r4(b->'data');
 WHEN 'prescription-delete' THEN RETURN t='renovacoes' AND a IS NOT NULL AND b IS NULL AND vault_macro02_private.metadata_pure_rx_r4(a);
 WHEN 'prescription-edit' THEN
  IF t<>'renovacoes' OR a IS NULL OR b IS NULL THEN RETURN false; END IF;
  IF NOT vault_macro02_private.metadata_pure_rx_r4(a) OR NOT vault_macro02_private.metadata_pure_rx_r4(b) THEN permitted:=ARRAY['observacoes','anexo_url','document_id','updated_at'];
  ELSE
   IF NOT vault_macro02_private.metadata_day_r4(b->'data') OR NOT vault_macro02_private.metadata_prefix_r4(a->'a3_location_changes',b->'a3_location_changes') THEN RETURN false; END IF;
   permitted:=ARRAY['data','document_id','medico_id','farmacia_id','hospital_id','local_id','observacoes','data_proxima_retirada','data_retorno_sus','exige_nova_receita','anexo_url','a3_location_snapshot','a3_location_changes','updated_at'];
  END IF;
 WHEN 'withdrawal-plan' THEN
  IF t<>'retiradas' OR (a IS NOT NULL AND NOT vault_macro02_private.metadata_unresolved_r4(a)) OR (b IS NOT NULL AND NOT vault_macro02_private.metadata_unresolved_r4(b)) THEN RETURN false; END IF;
  IF a IS NULL OR b IS NULL THEN RETURN true; END IF;
  reassign:=a->'medicamento_id' IS DISTINCT FROM b->'medicamento_id';
  IF reassign AND (a->>'status' IS DISTINCT FROM 'agendada' OR b->>'status' IS DISTINCT FROM 'agendada' OR NOT vault_macro02_private.metadata_missing_r4(a,ARRAY['renovacao_origem_id','fornecimento_id','fornecimento_ciclo_id']) OR NOT vault_macro02_private.metadata_missing_r4(b,ARRAY['renovacao_origem_id','fornecimento_id','fornecimento_ciclo_id'])) THEN RETURN false; END IF;
  IF NOT vault_macro02_private.metadata_prefix_r4(a->'reagendamentos',b->'reagendamentos') OR NOT vault_macro02_private.metadata_prefix_r4(a->'a3_location_changes',b->'a3_location_changes') THEN RETURN false; END IF;
  permitted:=ARRAY['data','horario','tipo','status','medico_id','farmacia_id','hospital_id','local_id','medicamento_nome','medicamento_dosagem','quantidade_prevista','exige_nova_receita','observacoes','reagendamentos','fornecimento_id','fornecimento_ciclo_id','a3_location_snapshot','a3_location_changes','updated_at']; IF reassign THEN permitted:=array_append(permitted,'medicamento_id'); END IF;
 WHEN 'withdrawal-annotate' THEN
  IF t<>'retiradas' OR a IS NULL OR b IS NULL OR a->>'status' IS DISTINCT FROM 'realizada' OR b->>'status' IS DISTINCT FROM 'realizada' THEN RETURN false; END IF; permitted:=ARRAY['observacoes','updated_at'];
 WHEN 'withdrawal-link-receipt' THEN
  IF t<>'retiradas' OR a IS NULL OR b IS NULL OR NOT vault_macro02_private.metadata_row_r4('renovacoes',r,uid) OR coalesce(a->>'status','') NOT IN('agendada','realizada') OR a->'renovacao_realizada_id' IS DISTINCT FROM 'null'::jsonb OR b->>'status' IS DISTINCT FROM 'realizada' OR r->'person_id' IS DISTINCT FROM a->'person_id' OR r->'medicamento_id' IS DISTINCT FROM a->'medicamento_id' OR NOT vault_macro02_private.metadata_day_r4(r->'data_aquisicao') OR jsonb_typeof(r->'quantidade') IS DISTINCT FROM 'number' OR NOT vault_macro02_private.metadata_quantity_r4(r->'quantidade') OR r->'id' IS DISTINCT FROM b->'renovacao_realizada_id' OR r->'quantidade' IS DISTINCT FROM b->'quantidade_retirada' OR NOT vault_macro02_private.metadata_instant_r4(b->'realizada_em') OR (a->'realizada_em'<>'null'::jsonb AND a->'realizada_em' IS DISTINCT FROM b->'realizada_em') OR (a->>'tipo'='sus' AND r->>'tipo_aquisicao' IS DISTINCT FROM 'sus') THEN RETURN false; END IF;
  permitted:=ARRAY['status','renovacao_realizada_id','quantidade_retirada','realizada_em','updated_at'];
 ELSE RETURN false;
 END CASE;
 RETURN coalesce(a-permitted=b-permitted,false);
END $$;
-- Infer the only valid mixed routes from the immutable envelope. A mixed
-- operation cannot carry unrelated medication edits, another prescription or
-- two uses of the same acquisition receipt. Per-row validation alone is not
-- enough to establish these cross-row invariants.
CREATE FUNCTION vault_macro02_private.metadata_route_r4(changes jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE c jsonb; rx jsonb; w jsonb; row_image jsonb; a jsonb; b jsonb; k text; primary_kind text; rx_count integer:=0; receipt_ids text[]:='{}'; matched boolean;
BEGIN
 FOR c IN SELECT value FROM jsonb_array_elements(changes) LOOP
  k:=c->>'kind';
  IF k LIKE 'prescription-%' THEN rx_count:=rx_count+1;rx:=c; END IF;
  IF k='withdrawal-link-receipt' THEN
   IF (c->'receipt'->>'id')=ANY(receipt_ids) THEN RETURN false; END IF;
   receipt_ids:=array_append(receipt_ids,c->'receipt'->>'id');
  END IF;
 END LOOP;
 IF rx_count>1 THEN RETURN false; END IF;
 IF rx_count=1 THEN primary_kind:=rx->>'kind';
 ELSIF EXISTS(SELECT 1 FROM jsonb_array_elements(changes) x WHERE x->>'kind' IN('withdrawal-plan','withdrawal-annotate')) THEN primary_kind:='withdrawal-plan';
 ELSE primary_kind:=changes->0->>'kind'; END IF;
 FOR c IN SELECT value FROM jsonb_array_elements(changes) LOOP
  k:=c->>'kind';a:=nullif(c->'before','null'::jsonb);b:=nullif(c->'after','null'::jsonb);
  IF k=primary_kind OR (primary_kind='withdrawal-plan' AND k='withdrawal-annotate') THEN CONTINUE; END IF;
  IF rx_count=1 AND k='withdrawal-plan' THEN
   row_image:=coalesce(nullif(rx->'after','null'::jsonb),rx->'before');
   IF (a IS NOT NULL AND (a->'medicamento_id' IS DISTINCT FROM row_image->'medicamento_id' OR a->'renovacao_origem_id' IS DISTINCT FROM row_image->'id')) OR (b IS NOT NULL AND (b->'medicamento_id' IS DISTINCT FROM row_image->'medicamento_id' OR b->'renovacao_origem_id' IS DISTINCT FROM row_image->'id')) THEN RETURN false; END IF;
   CONTINUE;
  END IF;
  IF k='medication-metadata' AND primary_kind IN('prescription-create','prescription-edit','withdrawal-plan') THEN
   IF a IS NULL OR b IS NULL OR a-ARRAY['data_retorno_sus','updated_at'] IS DISTINCT FROM b-ARRAY['data_retorno_sus','updated_at'] THEN RETURN false; END IF;
   matched:=false;
   FOR w IN SELECT value FROM jsonb_array_elements(changes) LOOP
    IF (rx_count=1 AND w=rx OR rx_count=0 AND w->>'kind' IN('withdrawal-plan','withdrawal-annotate')) AND (w->'before'->'medicamento_id'=b->'id' OR w->'after'->'medicamento_id'=b->'id') THEN matched:=true; END IF;
   END LOOP;
   IF NOT matched THEN RETURN false; END IF;
   CONTINUE;
  END IF;
  RETURN false;
 END LOOP;
 RETURN true;
END $$;
CREATE FUNCTION vault_macro02_private.metadata_intent_policy_r4(p jsonb,uid uuid,ep uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE c jsonb; r jsonb; seen text[]:='{}'; key text; person text;
BEGIN
 IF uid IS NULL OR ep IS NULL OR jsonb_typeof(p) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 IF NOT(p ?& ARRAY['format','account_id','epoch','operation_id','changes']) OR (SELECT count(*) FROM jsonb_object_keys(p))<>5 OR p->>'format' IS DISTINCT FROM 'macro02-metadata-r3' OR p->>'account_id' IS DISTINCT FROM uid::text OR p->>'epoch' IS DISTINCT FROM ep::text OR NOT vault_macro02_private.metadata_uuid_r4(p->'operation_id') OR jsonb_typeof(p->'changes') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF jsonb_array_length(p->'changes') NOT BETWEEN 1 AND 512 THEN RETURN false; END IF;
 FOR c IN SELECT value FROM jsonb_array_elements(p->'changes') LOOP
  IF vault_macro02_private.metadata_change_r4(c,uid) IS DISTINCT FROM true THEN RETURN false; END IF;
  r:=coalesce(nullif(c->'after','null'::jsonb),c->'before');key:=(c->>'table')||':'||(r->>'id');
  IF key=ANY(seen) OR (person IS NOT NULL AND person IS DISTINCT FROM r->>'person_id') THEN RETURN false; END IF;
  seen:=array_append(seen,key);person:=r->>'person_id';
 END LOOP;
 RETURN vault_macro02_private.metadata_route_r4(p->'changes');
END $$;
-- Internal only. Explicit revocations are needed even for pure predicates.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='vault_macro02_private' AND p.proname LIKE 'metadata%\_r4' ESCAPE '\' LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker',f.signature);
 END LOOP;
END $$;

-- SOURCE: activation-authority-r5.sql
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

-- SOURCE: metadata-writer-r5.sql
-- Candidate server writer. Requires the certified R4 predicates and the R3
-- preparation tables. Do not apply this file independently to production.
-- The activation migration must provide the account/epoch lock below and
-- install the complete fence in the same transaction.
CREATE TABLE vault_macro02_private.metadata_commits_r5 (
 user_id uuid NOT NULL, epoch uuid NOT NULL, operation_id uuid NOT NULL,
 request jsonb NOT NULL, ack jsonb NOT NULL,
 committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(user_id,operation_id)
);
ALTER TABLE vault_macro02_private.metadata_commits_r5 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vault_macro02_private.metadata_commits_r5 FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT SELECT,INSERT ON vault_macro02_private.metadata_commits_r5 TO vault_macro02_worker;
CREATE POLICY m02_metadata_select_r5 ON vault_macro02_private.metadata_commits_r5 FOR SELECT TO vault_macro02_worker USING(user_id=vault_macro02_private.actor_uid());
CREATE POLICY m02_metadata_insert_r5 ON vault_macro02_private.metadata_commits_r5 FOR INSERT TO vault_macro02_worker WITH CHECK(user_id=vault_macro02_private.actor_uid());

-- Keep reference checks in a private routine. Its only result is success or
-- failure, and it cannot resolve a different account's clinical records.
CREATE FUNCTION vault_macro02_private.metadata_reference_r5(t text,r jsonb,p_uid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE k text; rel text; val text; pid uuid; mid uuid; owns boolean;
BEGIN
 IF p_uid IS NULL OR auth.uid() IS DISTINCT FROM p_uid OR r->>'user_id' IS DISTINCT FROM p_uid::text THEN RAISE EXCEPTION 'M02_R5_REFERENCE_SCOPE'; END IF;
 pid:=(r->>'person_id')::uuid;
 IF pid IS NULL OR NOT EXISTS(SELECT 1 FROM public.persons WHERE id=pid AND user_id=p_uid) THEN RAISE EXCEPTION 'M02_R5_PERSON'; END IF;
 mid:=CASE WHEN t='medicamentos' THEN (r->>'id')::uuid ELSE (r->>'medicamento_id')::uuid END;
 IF t<>'medicamentos' AND NOT EXISTS(SELECT 1 FROM public.medicamentos WHERE id=mid AND user_id=p_uid AND person_id=pid) THEN RAISE EXCEPTION 'M02_R5_MEDICATION'; END IF;
 FOR k,rel IN SELECT * FROM (VALUES('medico_id','medicos'),('medico_descontinuacao_id','medicos'),('farmacia_id','farmacias'),('hospital_id','hospitais'),('local_id','locais')) AS m(key,relname) LOOP
  IF r->>k IS NOT NULL THEN
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE id=$1 AND user_id=$2)',rel) INTO owns USING (r->>k)::uuid,p_uid;
   IF NOT owns THEN RAISE EXCEPTION 'M02_R5_REFERENCE'; END IF;
  END IF;
 END LOOP;
 IF r->>'document_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.documents WHERE id=(r->>'document_id')::uuid AND user_id=p_uid AND person_id=pid) THEN RAISE EXCEPTION 'M02_R5_DOCUMENT'; END IF;
 IF r->>'substituido_por_id' IS NOT NULL AND ((r->>'substituido_por_id')::uuid=mid OR NOT EXISTS(SELECT 1 FROM public.medicamentos WHERE id=(r->>'substituido_por_id')::uuid AND user_id=p_uid AND person_id=pid)) THEN RAISE EXCEPTION 'M02_R5_SUBSTITUTE'; END IF;
 FOR k,rel IN SELECT * FROM (VALUES('cid_ids','cids'),('tratamento_ids','tratamentos')) AS m(key,relname) LOOP
  IF r ? k AND r->k<>'null'::jsonb THEN
   IF jsonb_typeof(r->k)<>'array' OR jsonb_array_length(r->k)>512 OR (SELECT count(DISTINCT x) FROM jsonb_array_elements(r->k) x)<>jsonb_array_length(r->k) THEN RAISE EXCEPTION 'M02_R5_REFERENCE_LIST'; END IF;
   FOR val IN SELECT jsonb_array_elements_text(r->k) LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE id=$1 AND user_id=$2 AND person_id=$3)',rel) INTO owns USING val::uuid,p_uid,pid;
    IF NOT owns THEN RAISE EXCEPTION 'M02_R5_REFERENCE_LIST_SCOPE'; END IF;
   END LOOP;
  END IF;
 END LOOP;
 IF t='retiradas' THEN
  FOREACH k IN ARRAY ARRAY['renovacao_origem_id','renovacao_realizada_id'] LOOP
   IF r->>k IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.renovacoes WHERE id=(r->>k)::uuid AND user_id=p_uid AND person_id=pid AND medicamento_id=mid) THEN RAISE EXCEPTION 'M02_R5_RX_REFERENCE'; END IF;
  END LOOP;
  IF (r->>'fornecimento_id' IS NULL)<>(r->>'fornecimento_ciclo_id' IS NULL) THEN RAISE EXCEPTION 'M02_R5_SUPPLY_PAIR'; END IF;
  IF r->>'fornecimento_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.fornecimento_ciclos c JOIN public.fornecimento_itens i ON i.ciclo_id=c.id AND i.user_id=c.user_id AND i.person_id=c.person_id WHERE c.id=(r->>'fornecimento_ciclo_id')::uuid AND c.processo_id=(r->>'fornecimento_id')::uuid AND c.user_id=p_uid AND c.person_id=pid AND i.medicamento_id=mid) THEN RAISE EXCEPTION 'M02_R5_SUPPLY_SCOPE'; END IF;
 END IF;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.metadata_reference_r5(text,jsonb,uuid) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.metadata_reference_r5(text,jsonb,uuid) TO vault_macro02_worker;

-- A metadata deletion may not cascade into another clinical fact. The target
-- row is already locked FOR UPDATE by the worker, excluding new FK references.
-- Every declared inbound FK is inspected; unknown schemas fail closed.
CREATE FUNCTION vault_macro02_private.metadata_assert_no_dependents_r5(t regclass,p_id uuid,p_uid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE f record; predicate text; blocked boolean;
BEGIN
 IF auth.uid() IS DISTINCT FROM p_uid OR p_uid IS NULL OR t NOT IN ('public.dose_logs'::regclass,'public.renovacoes'::regclass,'public.retiradas'::regclass) THEN RAISE EXCEPTION 'M02_R5_DELETE_SCOPE'; END IF;
 FOR f IN SELECT c.conrelid,c.confrelid,c.conkey,c.confkey,n.nspname,cl.relname FROM pg_constraint c JOIN pg_class cl ON cl.oid=c.conrelid JOIN pg_namespace n ON n.oid=cl.relnamespace WHERE c.contype='f' AND c.confrelid=t LOOP
  SELECT string_agg(format('child.%I=parent.%I',a.attname,b.attname),' AND ' ORDER BY x.ord) INTO predicate
  FROM unnest(f.conkey,f.confkey) WITH ORDINALITY x(childkey,parentkey,ord)
  JOIN pg_attribute a ON a.attrelid=f.conrelid AND a.attnum=x.childkey
  JOIN pg_attribute b ON b.attrelid=f.confrelid AND b.attnum=x.parentkey;
  IF predicate IS NULL THEN RAISE EXCEPTION 'M02_R5_FK_CATALOG'; END IF;
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I child JOIN %s parent ON %s WHERE parent.id=$1 AND parent.user_id=$2)',f.nspname,f.relname,t,predicate) INTO blocked USING p_id,p_uid;
  IF blocked THEN RAISE EXCEPTION 'M02_R5_DEPENDENT_HISTORY'; END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.metadata_assert_no_dependents_r5(regclass,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.metadata_assert_no_dependents_r5(regclass,uuid,uuid) TO vault_macro02_worker;

-- All metadata writes are serialized by the same per-account lock as dose
-- and stock writes. Exact typed preimages, not timestamps alone, are CAS inputs.
-- No generic upsert. A conflict aborts the complete batch and receipt.
CREATE FUNCTION vault_macro02_private.commit_metadata_r5(p_intent jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=vault_macro02_private.actor_uid(); ep uuid; op uuid; old vault_macro02_private.metadata_commits_r5%ROWTYPE;
 c jsonb; a jsonb; b jsonb; r jsonb; actual jsonb; expected jsonb; saved jsonb; tbl text; rel regclass; rid uuid; pid uuid; mid uuid; fields text[]; columns text; values_sql text; update_sql text; ack jsonb; n integer; tid uuid; receipt jsonb;
BEGIN
 IF uid IS NULL OR jsonb_typeof(p_intent) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'M02_R5_AUTH'; END IF;
 ep:=(p_intent->>'epoch')::uuid;op:=(p_intent->>'operation_id')::uuid;
 PERFORM vault_macro02_private.lock_active_epoch_r5(uid,ep);
 IF vault_macro02_private.metadata_intent_policy_r4(p_intent,uid,ep) IS DISTINCT FROM true THEN RAISE EXCEPTION 'M02_R5_POLICY'; END IF;
 SELECT * INTO old FROM vault_macro02_private.metadata_commits_r5 WHERE user_id=uid AND operation_id=op;
 IF FOUND THEN IF old.epoch IS DISTINCT FROM ep OR old.request IS DISTINCT FROM p_intent THEN RAISE EXCEPTION 'M02_R5_REPLAY_CHANGED'; END IF;RETURN old.ack;END IF;
 IF EXISTS(SELECT 1 FROM vault_macro02_private.dose_commits WHERE user_id=uid AND operation_id=op) THEN RAISE EXCEPTION 'M02_R5_OPERATION_COLLISION'; END IF;
 -- Dependency order: delete children first; create parents first. Ordinary
 -- updates follow the same parent order; metadata policy forbids ambiguous routes.
 FOR c IN SELECT value FROM jsonb_array_elements(p_intent->'changes') WITH ORDINALITY x(value,ord)
  ORDER BY CASE WHEN value->'after'='null'::jsonb THEN 0 ELSE 1 END,
   CASE WHEN value->'after'='null'::jsonb THEN CASE value->>'table' WHEN 'retiradas' THEN 0 WHEN 'doseLogs' THEN 1 WHEN 'renovacoes' THEN 2 ELSE 3 END
   ELSE CASE value->>'table' WHEN 'medicamentos' THEN 0 WHEN 'renovacoes' THEN 1 WHEN 'retiradas' THEN 2 ELSE 3 END END,ord
 LOOP
  tbl:=c->>'table';rel:=CASE tbl WHEN 'doseLogs' THEN 'public.dose_logs'::regclass WHEN 'medicamentos' THEN 'public.medicamentos'::regclass WHEN 'renovacoes' THEN 'public.renovacoes'::regclass WHEN 'retiradas' THEN 'public.retiradas'::regclass ELSE NULL END;
  a:=nullif(c->'before','null'::jsonb);b:=nullif(c->'after','null'::jsonb);r:=coalesce(b,a);rid:=(r->>'id')::uuid;pid:=(r->>'person_id')::uuid;mid:=CASE WHEN tbl='medicamentos' THEN rid ELSE (r->>'medicamento_id')::uuid END;
  fields:=vault_macro02_private.metadata_columns_r4(tbl);
  -- A typed cast normalizes timestamptz and time representations but not data.
  EXECUTE format('SELECT to_jsonb(x)-%L FROM %s x WHERE id=$1 AND user_id=$2 AND person_id=$3 FOR UPDATE','synced',rel) INTO actual USING rid,uid,pid;
  IF a IS NULL THEN IF actual IS NOT NULL THEN RAISE EXCEPTION 'M02_R5_CREATE_CAS';END IF;
  ELSE
   EXECUTE format('SELECT to_jsonb(jsonb_populate_record(NULL::%s,$1))-%L',rel,'synced') INTO expected USING a;
   IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'M02_R5_PREIMAGE_CAS'; END IF;
  END IF;
  IF b IS NOT NULL THEN
   IF (b->>'updated_at')::timestamptz>clock_timestamp()+interval '5 minutes' THEN RAISE EXCEPTION 'M02_R5_FUTURE_REVISION'; END IF;
   PERFORM vault_macro02_private.metadata_reference_r5(tbl,b,uid);
  END IF;
  IF c->>'kind'='withdrawal-link-receipt' THEN
   SELECT to_jsonb(x) INTO receipt FROM public.renovacoes x WHERE id=(c->'receipt'->>'id')::uuid AND user_id=uid AND person_id=pid AND medicamento_id=mid FOR UPDATE;
   SELECT to_jsonb(jsonb_populate_record(NULL::public.renovacoes,c->'receipt')) INTO expected;
   IF receipt IS DISTINCT FROM expected OR EXISTS(SELECT 1 FROM public.retiradas WHERE renovacao_realizada_id=(c->'receipt'->>'id')::uuid AND id<>rid) THEN RAISE EXCEPTION 'M02_R5_RECEIPT_CAS'; END IF;
  END IF;
  IF tbl='doseLogs' AND b IS NOT NULL THEN
   IF EXISTS(SELECT 1 FROM public.dose_logs WHERE user_id=uid AND person_id=pid AND medicamento_id=mid AND data=(b->>'data')::date AND left(horario,5)=b->>'horario' AND id<>rid AND (dose_kind IS NULL OR dose_kind IN ('planned','scheduled'))) THEN RAISE EXCEPTION 'M02_R5_DUPLICATE_SLOT'; END IF;
  END IF;
  IF b IS NULL THEN
   PERFORM vault_macro02_private.metadata_assert_no_dependents_r5(rel,rid,uid);
   EXECUTE format('DELETE FROM %s WHERE id=$1 AND user_id=$2 AND person_id=$3',rel) USING rid,uid,pid;
   GET DIAGNOSTICS n=ROW_COUNT;IF n<>1 THEN RAISE EXCEPTION 'M02_R5_DELETE_COUNT'; END IF;
  ELSE
   SELECT string_agg(format('%I',k),',' ORDER BY ord),string_agg(format('x.%I',k),',' ORDER BY ord),string_agg(format('%I=x.%I',k,k),',' ORDER BY ord) FILTER(WHERE k NOT IN('id','user_id','person_id','created_at')) INTO columns,values_sql,update_sql FROM unnest(fields) WITH ORDINALITY f(k,ord);
   IF a IS NULL THEN EXECUTE format('INSERT INTO %s(%s) SELECT %s FROM jsonb_populate_record(NULL::%s,$1) x',rel,columns,values_sql,rel) USING b;
   ELSE EXECUTE format('UPDATE %s target SET %s FROM jsonb_populate_record(NULL::%s,$1) x WHERE target.id=$2 AND target.user_id=$3 AND target.person_id=$4',rel,update_sql,rel) USING b,rid,uid,pid;
   END IF;
   GET DIAGNOSTICS n=ROW_COUNT;IF n<>1 THEN RAISE EXCEPTION 'M02_R5_WRITE_COUNT';END IF;
   EXECUTE format('SELECT to_jsonb(x)-%L FROM %s x WHERE id=$1 AND user_id=$2 AND person_id=$3','synced',rel) INTO saved USING rid,uid,pid;
   EXECUTE format('SELECT to_jsonb(jsonb_populate_record(NULL::%s,$1))-%L',rel,'synced') INTO expected USING b;
   IF saved IS DISTINCT FROM expected THEN RAISE EXCEPTION 'M02_R5_POSTIMAGE'; END IF;
   IF tbl='medicamentos' AND (a IS NULL OR a->'tratamento_ids' IS DISTINCT FROM b->'tratamento_ids') THEN
    -- Preserve IDs of existing relations; only explicit differences are written.
    DELETE FROM public.medicamento_tratamentos j WHERE j.medicamento_id=rid AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(nullif(b->'tratamento_ids','null'::jsonb),'[]'::jsonb)) x(id) WHERE x.id::uuid=j.tratamento_id);
    FOR tid IN SELECT x.id::uuid FROM jsonb_array_elements_text(coalesce(nullif(b->'tratamento_ids','null'::jsonb),'[]'::jsonb)) x(id) LOOP
     IF NOT EXISTS(SELECT 1 FROM public.medicamento_tratamentos WHERE medicamento_id=rid AND tratamento_id=tid) THEN INSERT INTO public.medicamento_tratamentos(id,medicamento_id,tratamento_id) VALUES(gen_random_uuid(),rid,tid);END IF;
    END LOOP;
   END IF;
  END IF;
 END LOOP;
 ack:=jsonb_build_object('format','macro02-metadata-ack-r5','account_id',uid,'epoch',ep,'operation_id',op,'request',p_intent,'committed',true);
 INSERT INTO vault_macro02_private.metadata_commits_r5(user_id,epoch,operation_id,request,ack) VALUES(uid,ep,op,p_intent,ack);
 RETURN ack;
END $$;
-- Ownership and grants are installed by the activation candidate after all
-- RLS checks, column contracts and fence roles have been established.
REVOKE ALL ON FUNCTION vault_macro02_private.commit_metadata_r5(jsonb) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;

-- SOURCE: activation-install-r5.sql
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
REVOKE ALL ON FUNCTION vault_macro02_private.commit_dose(jsonb),vault_macro02_private.commit_stock(jsonb),public.vault_macro02_commit_dose(jsonb),public.vault_macro02_commit_stock(jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT CREATE ON SCHEMA vault_macro02_private TO vault_macro02_worker;
ALTER FUNCTION vault_macro02_private.commit_atomic_r5(uuid,jsonb) OWNER TO vault_macro02_worker;
ALTER FUNCTION vault_macro02_private.commit_metadata_r5(jsonb) OWNER TO vault_macro02_worker;
REVOKE CREATE ON SCHEMA vault_macro02_private FROM vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.commit_atomic_r5(uuid,jsonb),vault_macro02_private.commit_metadata_r5(jsonb) TO authenticated;
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
GRANT EXECUTE ON FUNCTION vault_macro02_private.read_atomic_receipts_r5(uuid,uuid[]) TO authenticated;
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

-- SOURCE: compound-writer-r6.sql
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
GRANT EXECUTE ON FUNCTION vault_macro02_private.commit_compound_r6(jsonb) TO authenticated;
CREATE FUNCTION public.vault_macro02_commit_compound_r6(p_intent jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_macro02_private.commit_compound_r6(p_intent) $$;
REVOKE ALL ON FUNCTION public.vault_macro02_commit_compound_r6(jsonb) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION public.vault_macro02_commit_compound_r6(jsonb) TO authenticated;

-- SOURCE: compound-receipts-r7.sql
-- Full parent receipts only. A single transaction locks the active account;
-- absence is point-in-time evidence, never permission to replay or restore.
CREATE FUNCTION vault_macro02_private.read_active_receipts_r7(p_epoch uuid,p_ids uuid[]) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=vault_macro02_private.actor_uid(); result jsonb;
BEGIN
 PERFORM vault_macro02_private.lock_active_epoch_r5(uid,p_epoch);
 IF p_ids IS NULL OR cardinality(p_ids)>512 OR EXISTS(SELECT 1 FROM unnest(p_ids) x(id) WHERE id IS NULL) OR cardinality(p_ids)<>(SELECT count(DISTINCT id) FROM unnest(p_ids) x(id)) THEN RAISE EXCEPTION 'M02_R7_RECEIPT_SCOPE';END IF;
 WITH ledger AS (
  SELECT operation_id,request,ack FROM vault_macro02_private.compound_commits_r6 WHERE user_id=uid AND epoch=p_epoch AND operation_id=ANY(p_ids)
  UNION ALL SELECT operation_id,request,ack FROM vault_macro02_private.metadata_commits_r5 WHERE user_id=uid AND epoch=p_epoch AND operation_id=ANY(p_ids)
  UNION ALL SELECT operation_id,request,ack FROM vault_macro02_private.dose_commits WHERE user_id=uid AND epoch=p_epoch AND operation_id=ANY(p_ids)
 ) SELECT coalesce(jsonb_agg(CASE WHEN c.operation_id IS NULL THEN jsonb_build_object('operation_id',x.id,'status','absent_at_fence') ELSE jsonb_build_object('operation_id',x.id,'status','committed','request',c.request,'ack',c.ack) END ORDER BY x.ord),'[]'::jsonb) INTO result FROM unnest(p_ids) WITH ORDINALITY x(id,ord) LEFT JOIN ledger c ON c.operation_id=x.id;
 IF jsonb_array_length(result)<>cardinality(p_ids) THEN RAISE EXCEPTION 'M02_R7_RECEIPT_COLLISION';END IF;
 RETURN jsonb_build_object('account_id',uid,'fence_id','m02-active-receipts-r7:'||uid::text||':'||p_epoch::text,'complete',true,'rows',result);
END $$;
REVOKE ALL ON FUNCTION vault_macro02_private.read_active_receipts_r7(uuid,uuid[]) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT CREATE ON SCHEMA vault_macro02_private TO vault_macro02_worker;
ALTER FUNCTION vault_macro02_private.read_active_receipts_r7(uuid,uuid[]) OWNER TO vault_macro02_worker;
REVOKE CREATE ON SCHEMA vault_macro02_private FROM vault_macro02_worker;
GRANT EXECUTE ON FUNCTION vault_macro02_private.read_active_receipts_r7(uuid,uuid[]) TO authenticated;
CREATE FUNCTION public.vault_macro02_read_active_receipts_r7(p_epoch uuid,p_ids uuid[]) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT vault_macro02_private.read_active_receipts_r7(p_epoch,p_ids) $$;
REVOKE ALL ON FUNCTION public.vault_macro02_read_active_receipts_r7(uuid,uuid[]) FROM PUBLIC,anon,authenticated,service_role,vault_macro02_worker;
GRANT EXECUTE ON FUNCTION public.vault_macro02_read_active_receipts_r7(uuid,uuid[]) TO authenticated;
COMMIT;
