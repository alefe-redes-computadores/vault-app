\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts) OR EXISTS(SELECT 1 FROM vault_macro02_private.dose_commits) THEN RAISE EXCEPTION 'TEST_DORMANT'; END IF;
 IF has_function_privilege('anon','public.vault_macro02_read_capability_r1()','EXECUTE') OR has_function_privilege('service_role','public.vault_macro02_read_capability_r1()','EXECUTE') OR has_function_privilege('anon','public.vault_macro02_read_operation_receipts_r1(uuid[],text)','EXECUTE') OR has_function_privilege('service_role','public.vault_macro02_read_operation_receipts_r1(uuid[],text)','EXECUTE') OR has_function_privilege('authenticated','vault_macro02_private.dormant_fence_r1()','EXECUTE') OR has_table_privilege('authenticated','vault_macro02_private.dose_commits','SELECT') OR has_schema_privilege('vault_macro02_worker','vault_macro02_private','CREATE') THEN RAISE EXCEPTION 'TEST_ACL'; END IF;
 BEGIN INSERT INTO vault_macro02_private.active_accounts(user_id,guardian_receipt) VALUES('20000000-0000-4000-8000-000000000001','test'); RAISE EXCEPTION 'TEST_ACTIVATION_OPEN'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_DORMANT_FENCE_LOCKED' THEN RAISE; END IF; END;
 BEGIN TRUNCATE vault_macro02_private.active_accounts; RAISE EXCEPTION 'TEST_TRUNCATE_OPEN'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_DORMANT_FENCE_LOCKED' THEN RAISE; END IF; END;
 BEGIN DELETE FROM vault_macro02_private.dose_commits; RAISE EXCEPTION 'TEST_LEDGER_DELETE_OPEN'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_DORMANT_FENCE_LOCKED' THEN RAISE; END IF; END;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','',true);
DO $$ BEGIN
 BEGIN PERFORM public.vault_macro02_read_capability_r1(); RAISE EXCEPTION 'TEST_NO_AUTH_OPEN'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_CAPABILITY_AUTH_REQUIRED' THEN RAISE; END IF; END;
END $$;
SELECT set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
DO $$ DECLARE c jsonb; r jsonb; f text; oid uuid:='90000000-0000-4000-8000-000000000001'; BEGIN
 c:=public.vault_macro02_read_capability_r1(); f:=c->>'fence_id';
 IF c->>'version' IS DISTINCT FROM '1' OR c->>'writer' IS DISTINCT FROM 'legacy' OR c->>'account_id' IS DISTINCT FROM '20000000-0000-4000-8000-000000000001' OR c->>'epoch' IS DISTINCT FROM 'm02-dormant-r1' OR c->>'minimum_protocol' IS DISTINCT FROM '2' OR (c->>'expires_at_ms')::bigint-(c->>'issued_at_ms')::bigint IS DISTINCT FROM 300000 OR f IS DISTINCT FROM 'm02-dormant-r1:20000000-0000-4000-8000-000000000001' THEN RAISE EXCEPTION 'TEST_CAPABILITY'; END IF;
 r:=public.vault_macro02_read_operation_receipts_r1(ARRAY[oid],f);
 IF r->'complete' IS DISTINCT FROM 'true'::jsonb OR r->'rows' IS DISTINCT FROM jsonb_build_array(jsonb_build_object('operation_id',oid,'status','absent_at_fence')) THEN RAISE EXCEPTION 'TEST_ABSENCE'; END IF;
 IF public.vault_macro02_read_operation_receipts_r1(ARRAY[]::uuid[],f)->'rows' IS DISTINCT FROM '[]'::jsonb THEN RAISE EXCEPTION 'TEST_EMPTY_BATCH'; END IF;
 BEGIN PERFORM public.vault_macro02_read_operation_receipts_r1(array_fill(oid,ARRAY[101]),f); RAISE EXCEPTION 'TEST_OVERSIZE_OPEN'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_RECEIPT_SCOPE' THEN RAISE; END IF; END;
 BEGIN PERFORM public.vault_macro02_read_operation_receipts_r1(ARRAY[oid,oid],f); RAISE EXCEPTION 'TEST_DUP_OPEN'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_RECEIPT_SCOPE' THEN RAISE; END IF; END;
 BEGIN PERFORM public.vault_macro02_read_operation_receipts_r1(ARRAY[NULL::uuid],f); RAISE EXCEPTION 'TEST_NULL_OPEN'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_RECEIPT_SCOPE' THEN RAISE; END IF; END;
 BEGIN PERFORM public.vault_macro02_read_operation_receipts_r1(ARRAY[oid],'wrong-fence'); RAISE EXCEPTION 'TEST_FENCE_OPEN'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_RECEIPT_SCOPE' THEN RAISE; END IF; END;
 UPDATE public.medicamentos SET estoque_quantidade=9 WHERE id='30000000-0000-4000-8000-000000000001'; IF NOT FOUND THEN RAISE EXCEPTION 'TEST_LEGACY_STOCK'; END IF;
 INSERT INTO public.dose_logs(id,user_id,person_id,medicamento_id,data,horario,tomado_em,quantidade) VALUES('60000000-0000-4000-8000-000000000091','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','2026-01-01','08:00','2026-01-01T08:00:00Z',1);
 BEGIN PERFORM public.vault_macro02_commit_dose('{"version":1}'::jsonb); RAISE EXCEPTION 'TEST_PREMIUM_DOSE_OPEN'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'MACRO02_ACCOUNT_NOT_ACTIVATED' THEN RAISE; END IF; END;
 BEGIN PERFORM public.vault_macro02_commit_stock('{"version":2}'::jsonb); RAISE EXCEPTION 'TEST_PREMIUM_STOCK_OPEN'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'MACRO02_ACCOUNT_NOT_ACTIVATED' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
-- Synthetic fixture only, rolled back; no clinical replay. Simulate a prior ledger entry.
ALTER TABLE vault_macro02_private.dose_commits DISABLE TRIGGER m02_dormant_freeze_r1;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.vault_macro02_read_capability_r1(); RAISE EXCEPTION 'TEST_DISABLED_FENCE_OPEN'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_CAPABILITY_FENCE_UNAVAILABLE' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
INSERT INTO vault_macro02_private.dose_commits(user_id,person_id,medication_id,operation_id,sequence,request,ack) VALUES('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001',1,'{"original":true}','{"ack_original":true}');
ALTER TABLE vault_macro02_private.dose_commits ENABLE ALWAYS TRIGGER m02_dormant_freeze_r1;
SET LOCAL ROLE authenticated;
DO $$ DECLARE r jsonb; BEGIN
 r:=public.vault_macro02_read_operation_receipts_r1(ARRAY['90000000-0000-4000-8000-000000000001'::uuid],public.vault_macro02_read_capability_r1()->>'fence_id');
 IF r->'rows'->0->>'status' IS DISTINCT FROM 'committed' OR r->'rows'->0->'request' IS DISTINCT FROM '{"original":true}'::jsonb OR r->'rows'->0->'ack' IS DISTINCT FROM '{"ack_original":true}'::jsonb THEN RAISE EXCEPTION 'TEST_ORIGINAL_RECEIPT'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
DO $$ DECLARE r jsonb; BEGIN
 r:=public.vault_macro02_read_operation_receipts_r1(ARRAY['90000000-0000-4000-8000-000000000001'::uuid],public.vault_macro02_read_capability_r1()->>'fence_id');
 IF r->'rows'->0 IS DISTINCT FROM jsonb_build_object('operation_id','90000000-0000-4000-8000-000000000001','status','absent_at_fence') THEN RAISE EXCEPTION 'TEST_ACCOUNT_LEAK'; END IF;
 BEGIN PERFORM public.vault_macro02_read_operation_receipts_r1(ARRAY['90000000-0000-4000-8000-000000000001'::uuid],'m02-dormant-r1:20000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'TEST_CROSS_FENCE_OPEN'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_RECEIPT_SCOPE' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS dormant capability, freeze, ACL, JWT, ledger, account isolation and legacy compatibility' AS result;
