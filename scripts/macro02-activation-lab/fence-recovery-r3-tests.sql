\set ON_ERROR_STOP on
-- Fixture-only exercise of the new claim lifecycle. No production URL, no
-- activation, no claim of real-schema certification. Run after fixture.sql
-- and fence-recovery-r3-candidate.sql, in an isolated PG17 container.
SELECT vault_macro02_private.cutover_freeze_r3('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000099','synthetic-receipt');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$ DECLARE c jsonb; r jsonb; ack jsonb; BEGIN
 IF has_table_privilege(current_user,'vault_macro02_private.cutover_recovery_claims_r3','SELECT,INSERT,UPDATE,DELETE') OR has_function_privilege(current_user,'vault_macro02_private.cutover_freeze_r3(uuid,uuid,text)','EXECUTE') OR has_function_privilege(current_user,'vault_macro02_private.cutover_snapshot_r3(uuid)','EXECUTE') THEN RAISE EXCEPTION 'R3_ACL'; END IF;
 BEGIN PERFORM public.vault_macro02_recovery_claim_r3('00000000-0000-4000-8000-000000000099','00000000-0000-4000-8000-000000000088',false); RAISE EXCEPTION 'UNEXPECTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_R3_CLAIM_CHANGED' THEN RAISE; END IF; END;
 c:=public.vault_macro02_recovery_claim_r3('00000000-0000-4000-8000-000000000099','00000000-0000-4000-8000-000000000088',true);
 IF c->>'state'<>'held' OR c->>'allows_activation'<>'false' OR c->>'allows_replay'<>'false' OR jsonb_array_length(c->'snapshot'->'rows'->'medicamentos')<>1 OR c->>'server_snapshot_sha256'<>encode(sha256(convert_to((c->'snapshot')::text,'UTF8')),'hex') THEN RAISE EXCEPTION 'R3_CLAIM'; END IF;
 IF c IS DISTINCT FROM public.vault_macro02_recovery_claim_r3('00000000-0000-4000-8000-000000000099','00000000-0000-4000-8000-000000000088',false) THEN RAISE EXCEPTION 'R3_CLAIM_CHANGED'; END IF;
 BEGIN PERFORM public.vault_macro02_recovery_claim_r3('00000000-0000-4000-8000-000000000099','00000000-0000-4000-8000-000000000087',true); RAISE EXCEPTION 'UNEXPECTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_R3_CLAIM_CHANGED' THEN RAISE; END IF; END;
 BEGIN UPDATE public.medicamentos SET evidence='{"stock":1}' WHERE id='00000000-0000-4000-8000-000000000031'; RAISE EXCEPTION 'UNEXPECTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_R3_FROZEN' THEN RAISE; END IF; END;
 r:=jsonb_build_object('format','macro02-recovery-receipt-r3','account_id',c->>'account_id','epoch',c->>'epoch','operation_id',c->>'operation_id','fence_id',c->>'fence_id','state','local_verified','source_sha256',repeat('a',64),'local_sha256',repeat('b',64),'remote_sha256',repeat('c',64),'server_snapshot_sha256',c->>'server_snapshot_sha256','added',1,'allows_activation',false,'allows_replay',false);
 BEGIN PERFORM public.vault_macro02_recovery_complete_r3(r||jsonb_build_object('allows_activation',true)); RAISE EXCEPTION 'UNEXPECTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_R3_RECEIPT_SCOPE' THEN RAISE; END IF; END;
 BEGIN PERFORM public.vault_macro02_recovery_complete_r3(r||jsonb_build_object('server_snapshot_sha256',repeat('f',64))); RAISE EXCEPTION 'UNEXPECTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_R3_RECEIPT_FENCE' THEN RAISE; END IF; END;
 ack:=public.vault_macro02_recovery_complete_r3(r);
 IF ack->>'format'<>'macro02-recovery-completion-r3' OR ack->>'allows_activation'<>'false' OR ack IS DISTINCT FROM public.vault_macro02_recovery_complete_r3(r||jsonb_build_object('added',0)) THEN RAISE EXCEPTION 'R3_IDEMPOTENCE'; END IF;
 BEGIN PERFORM public.vault_macro02_recovery_complete_r3(r||jsonb_build_object('local_sha256',repeat('f',64))); RAISE EXCEPTION 'UNEXPECTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_R3_RECEIPT_CHANGED' THEN RAISE; END IF; END;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$ BEGIN
 BEGIN PERFORM public.vault_macro02_recovery_claim_r3('00000000-0000-4000-8000-000000000099','00000000-0000-4000-8000-000000000088',false); RAISE EXCEPTION 'UNEXPECTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_R3_CLAIM_SCOPE' THEN RAISE; END IF; END;
 UPDATE public.medicamentos SET evidence='{"stock":6}' WHERE id='00000000-0000-4000-8000-000000000032'; IF NOT FOUND THEN RAISE EXCEPTION 'R3_FOREIGN_LEGACY'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 BEGIN PERFORM vault_macro02_private.cutover_cancel_r3('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000099'); RAISE EXCEPTION 'UNEXPECTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_R3_CANCEL_CLAIM_HELD' THEN RAISE; END IF; END;
 BEGIN INSERT INTO vault_macro02_private.active_accounts VALUES('00000000-0000-4000-8000-000000000001'); RAISE EXCEPTION 'UNEXPECTED'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'M02_DORMANT_FENCE_LOCKED' THEN RAISE; END IF; END;
 IF EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts) OR EXISTS(SELECT 1 FROM vault_macro02_private.dose_commits) OR (SELECT count(*) FROM vault_macro02_private.cutover_recovery_claims_r3 WHERE receipt IS NOT NULL)<>1 THEN RAISE EXCEPTION 'R3_INTEGRITY'; END IF;
 IF has_function_privilege('anon','public.vault_macro02_recovery_claim_r3(uuid,uuid,boolean)','EXECUTE') OR has_function_privilege('service_role','public.vault_macro02_recovery_complete_r3(jsonb)','EXECUTE') THEN RAISE EXCEPTION 'R3_PUBLIC_ACL'; END IF;
END $$;
\echo MACRO02_R3_RECOVERY_CLAIM_FIXTURE_PASS
