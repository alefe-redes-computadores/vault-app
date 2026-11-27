\set ON_ERROR_STOP on
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$ DECLARE t uuid:='00000000-0000-4000-8000-000000009701';p uuid:='00000000-0000-4000-8000-000000000002';o uuid:='00000000-0000-4000-8000-000000009711';r jsonb; BEGIN
 IF public.vault_macro02_read_enrollment_r5()->>'state'<>'legacy' THEN RAISE EXCEPTION 'CAS_TEST_NOT_LEGACY'; END IF;
 r:=public.vault_set_treatment_visual_r04(t,p,0,'brain-circuit',o);
 IF r->>'status' IS DISTINCT FROM 'ack' OR r->'row'->>'visual_icon_expanded' IS DISTINCT FROM 'brain-circuit' OR (r->'row'->>'visual_icon_revision')::int IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'CAS_TEST_LEGACY_ACK'; END IF;
 IF public.vault_set_treatment_visual_r04(t,p,0,'brain-circuit',o) IS DISTINCT FROM r THEN RAISE EXCEPTION 'CAS_TEST_LEGACY_REPLAY'; END IF;
 IF public.vault_set_treatment_visual_r04(t,p,0,'heart','00000000-0000-4000-8000-000000009712')->>'status' IS DISTINCT FROM 'conflict' THEN RAISE EXCEPTION 'CAS_TEST_STALE'; END IF;
 BEGIN
  PERFORM public.vault_set_treatment_visual_r04('00000000-0000-4000-8000-000000009709','00000000-0000-4000-8000-000000000019',0,'heart',o);
  RAISE EXCEPTION 'CAS_TEST_CROSS_ACCOUNT_ALLOWED';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  UPDATE public.tratamentos SET visual_icon='heart' WHERE id=t;
  RAISE EXCEPTION 'CAS_TEST_DIRECT_WRITE_ALLOWED';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
\echo CAS_R04_M03_LEGACY_ACK_REPLAY_CONFLICT_SCOPE_PASS
-- Test the real fence on the same account before the original activation test.
SELECT vault_macro02_private.cutover_freeze_r3('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000009799','synthetic-cas-fence');
SET ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.vault_set_treatment_visual_r04('00000000-0000-4000-8000-000000009701','00000000-0000-4000-8000-000000000002',1,'heart','00000000-0000-4000-8000-000000009713');
  RAISE EXCEPTION 'CAS_TEST_FENCE_BYPASS';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM IS DISTINCT FROM 'M02_R5_FROZEN' THEN RAISE;END IF; END;
END $$;
RESET ROLE;
SELECT vault_macro02_private.cutover_cancel_r3('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000009799');
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.tratamentos WHERE id='00000000-0000-4000-8000-000000009701' AND visual_icon_revision=1 AND visual_icon_expanded='brain-circuit' AND nome='Synthetic CAS A' AND data_inicio='2026-01-01' AND condicao='Synthetic condition') THEN RAISE EXCEPTION 'CAS_TEST_FROZEN_POSTIMAGE'; END IF;
END $$;
\echo CAS_R04_M03_FROZEN_NO_MUTATION_CANCEL_PASS
