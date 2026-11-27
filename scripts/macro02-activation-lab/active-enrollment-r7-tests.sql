\set ON_ERROR_STOP on
DO $$ BEGIN
 IF current_user<>'postgres' OR (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) THEN RAISE EXCEPTION 'LAB_MIGRATOR_MUST_NOT_BE_SUPERUSER';END IF;
 IF EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts) THEN RAISE EXCEPTION 'MIGRATION_ACTIVATED_UNEXPECTED_ACCOUNT';END IF;
 IF (SELECT count(*) FROM pg_trigger WHERE tgname IN ('m02_cutover_guard_r3','m02_cutover_truncate_r3') AND tgenabled='A')<>40 THEN RAISE EXCEPTION 'M02_ACTIVE_FENCE';END IF;
END $$;
SELECT vault_macro02_private.cutover_freeze_r3('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','synthetic-review');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$ DECLARE c jsonb;r jsonb; BEGIN
 IF public.vault_macro02_read_enrollment_r5()->>'state'<>'frozen' THEN RAISE EXCEPTION 'M02_NOT_FROZEN';END IF;
 c:=public.vault_macro02_recovery_claim_r3('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000088',true);
 r:=jsonb_build_object('format','macro02-recovery-receipt-r3','account_id',c->>'account_id','epoch',c->>'epoch','operation_id',c->>'operation_id','fence_id',c->>'fence_id','state','local_verified','source_sha256',repeat('a',64),'local_sha256',repeat('b',64),'remote_sha256',repeat('c',64),'server_snapshot_sha256',c->>'server_snapshot_sha256','added',0,'allows_activation',false,'allows_replay',false);
 PERFORM public.vault_macro02_recovery_complete_r3(r);
END $$;
RESET ROLE;
SELECT vault_macro02_private.activate_account_r5('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000088',encode(sha256(convert_to(receipt::text,'UTF8')),'hex'),'synthetic-guardian') FROM vault_macro02_private.cutover_recovery_claims_r3 WHERE user_id='00000000-0000-4000-8000-000000000001';
SET ROLE authenticated;
DO $$ BEGIN
 IF public.vault_macro02_read_enrollment_r5()->>'state'<>'premium' THEN RAISE EXCEPTION 'M02_NOT_PREMIUM';END IF;
 IF has_table_privilege(current_user,'vault_macro02_private.compound_commits_r6','SELECT,INSERT,UPDATE,DELETE') OR has_function_privilege(current_user,'vault_macro02_private.activate_account_r5(uuid,uuid,uuid,text,text)','EXECUTE') OR has_function_privilege(current_user,'public.vault_macro02_commit_stock(jsonb)','EXECUTE') THEN RAISE EXCEPTION 'M02_ACTIVE_ACL';END IF;
 BEGIN UPDATE public.medicamentos SET estoque_quantidade=99 WHERE id='00000000-0000-4000-8000-000000000104';RAISE EXCEPTION 'UNEXPECTED';EXCEPTION WHEN raise_exception THEN IF SQLERRM='UNEXPECTED' THEN RAISE;END IF;END;
 BEGIN PERFORM public.vault_macro02_recovery_claim_r3('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000088',false);RAISE EXCEPTION 'UNEXPECTED';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_R5_RECOVERY_ALREADY_ACTIVATED' THEN RAISE;END IF;END;
 IF public.vault_macro02_read_active_receipts_r7('00000000-0000-4000-8000-000000000003',ARRAY['00000000-0000-4000-8000-000000009999'::uuid])->'rows'->0->>'status'<>'absent_at_fence' THEN RAISE EXCEPTION 'M02_ABSENT_RECEIPT';END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000009',false);
DO $$ BEGIN
 IF public.vault_macro02_read_enrollment_r5()->>'state'<>'legacy' OR EXISTS(SELECT 1 FROM public.medicamentos) THEN RAISE EXCEPTION 'M02_ACCOUNT_ISOLATION';END IF;
 BEGIN PERFORM public.vault_macro02_read_active_receipts_r7('00000000-0000-4000-8000-000000000003',ARRAY['00000000-0000-4000-8000-000000000122'::uuid]);RAISE EXCEPTION 'UNEXPECTED';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_R5_EPOCH_INACTIVE' THEN RAISE;END IF;END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF has_function_privilege('anon','public.vault_macro02_commit_compound_r6(jsonb)','EXECUTE') OR has_function_privilege('service_role','public.vault_macro02_commit_compound_r6(jsonb)','EXECUTE') OR has_function_privilege('anon','public.vault_macro02_read_active_receipts_r7(uuid,uuid[])','EXECUTE') THEN RAISE EXCEPTION 'M02_ACTIVE_PUBLIC_ACL';END IF;
END $$;
\echo MACRO02_PREMIUM_AUTHORITY_ACTUALLY_ACTIVE_PG17_PASS
