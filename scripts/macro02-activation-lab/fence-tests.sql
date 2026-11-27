\set ON_ERROR_STOP on
-- Tests never disclose row contents, and no production connection is accepted.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$ BEGIN
 IF has_function_privilege(current_user,'vault_macro02_private.cutover_freeze_lab(uuid,uuid,text)','EXECUTE') OR has_function_privilege(current_user,'vault_macro02_private.cutover_cancel_lab(uuid,uuid)','EXECUTE') OR has_table_privilege(current_user,'vault_macro02_private.cutover_fence_lab','SELECT,INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'LAB_ACL'; END IF;
 BEGIN PERFORM public.vault_macro02_cutover_snapshot_lab('00000000-0000-4000-8000-000000000099'); RAISE EXCEPTION 'UNEXPECTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_LAB_FENCE_SCOPE' THEN RAISE; END IF; END;
 UPDATE public.medicamentos SET evidence='{"stock":8}' WHERE id='00000000-0000-4000-8000-000000000031'; IF NOT FOUND THEN RAISE EXCEPTION 'LEGACY_NOT_AVAILABLE'; END IF;
END $$;
RESET ROLE;
SELECT vault_macro02_private.cutover_freeze_lab('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000099','synthetic-receipt');
SET ROLE authenticated;
DO $$ DECLARE result jsonb; BEGIN
 result:=public.vault_macro02_cutover_snapshot_lab('00000000-0000-4000-8000-000000000099');
 IF result->>'format'<>'macro02-raw-pg-lab-v1' OR result->>'account_id'<>'00000000-0000-4000-8000-000000000001' OR result->>'complete'<>'true' OR result->>'allows_activation'<>'false' OR result->>'allows_replay'<>'false' OR (SELECT count(*) FROM jsonb_object_keys(result->'rows'))<>20 OR jsonb_array_length(result->'rows'->'medicamentos')<>1 OR jsonb_array_length(result->'rows'->'doseLogs')<>1 OR jsonb_array_length(result->'rows'->'medicamento_tratamentos')<>1 THEN RAISE EXCEPTION 'SNAPSHOT_SCOPE'; END IF;
 IF result->'rows'->'medicamentos'->0->'evidence'->>'stock'<>'8' THEN RAISE EXCEPTION 'SNAPSHOT_CHANGED'; END IF;
 BEGIN UPDATE public.medicamentos SET evidence='{"stock":1}' WHERE id='00000000-0000-4000-8000-000000000031'; RAISE EXCEPTION 'UNEXPECTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_LAB_FROZEN' THEN RAISE; END IF; END;
 BEGIN DELETE FROM public.dose_logs WHERE id='00000000-0000-4000-8000-000000000061'; RAISE EXCEPTION 'UNEXPECTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_LAB_FROZEN' THEN RAISE; END IF; END;
 BEGIN DELETE FROM public.medicamento_tratamentos WHERE id='00000000-0000-4000-8000-000000000051'; RAISE EXCEPTION 'UNEXPECTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_LAB_FROZEN' THEN RAISE; END IF; END;
 IF result IS DISTINCT FROM public.vault_macro02_cutover_snapshot_lab('00000000-0000-4000-8000-000000000099') THEN RAISE EXCEPTION 'SNAPSHOT_NOT_STABLE'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$ BEGIN
 BEGIN PERFORM public.vault_macro02_cutover_snapshot_lab('00000000-0000-4000-8000-000000000099'); RAISE EXCEPTION 'UNEXPECTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_LAB_FENCE_SCOPE' THEN RAISE; END IF; END;
 UPDATE public.medicamentos SET evidence='{"stock":6}' WHERE id='00000000-0000-4000-8000-000000000032'; IF NOT FOUND THEN RAISE EXCEPTION 'FOREIGN_LEGACY_BLOCKED'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 BEGIN TRUNCATE public.dose_logs; RAISE EXCEPTION 'UNEXPECTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_LAB_TRUNCATE' THEN RAISE; END IF; END;
 BEGIN INSERT INTO vault_macro02_private.active_accounts VALUES('00000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'UNEXPECTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_DORMANT_FENCE_LOCKED' THEN RAISE; END IF; END;
 IF EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts) OR EXISTS(SELECT 1 FROM vault_macro02_private.dose_commits) THEN RAISE EXCEPTION 'NOT_DORMANT'; END IF;
END $$;
SELECT vault_macro02_private.cutover_cancel_lab('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000099');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$ BEGIN
 BEGIN PERFORM public.vault_macro02_cutover_snapshot_lab('00000000-0000-4000-8000-000000000099'); RAISE EXCEPTION 'UNEXPECTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_LAB_FENCE_SCOPE' THEN RAISE; END IF; END;
 UPDATE public.medicamentos SET evidence='{"stock":8}' WHERE id='00000000-0000-4000-8000-000000000031'; IF NOT FOUND THEN RAISE EXCEPTION 'CANCEL_NOT_LEGACY'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 BEGIN PERFORM vault_macro02_private.cutover_freeze_lab('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000099','reused-epoch'); RAISE EXCEPTION 'UNEXPECTED'; EXCEPTION WHEN unique_violation THEN NULL; END;
 IF has_function_privilege('anon','public.vault_macro02_cutover_snapshot_lab(uuid)','EXECUTE') OR has_function_privilege('service_role','public.vault_macro02_cutover_snapshot_lab(uuid)','EXECUTE') THEN RAISE EXCEPTION 'LAB_PUBLIC_ACL'; END IF;
END $$;
\echo MACRO02_FENCE_SQL_LAB_PASS
