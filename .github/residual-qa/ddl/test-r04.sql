\set ON_ERROR_STOP on
-- All mutations in this test are on disposable lab rows, never on Vault production.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $test$
DECLARE tid uuid:='00000000-0000-4000-8000-000000000101'; person uuid:='00000000-0000-4000-8000-000000000011'; op uuid; i integer:=1; choice text; v jsonb; x jsonb; expect_legacy text; expanded text; original_ts timestamptz;
 legacy_keys text[]:=ARRAY['activity','heart','clipboard','shield','calendar','brain','stethoscope','target','leaf','waypoints','heartpulse','pill','unassigned'];
 expanded_keys text[]:=ARRAY['brain-circuit','waves','moon','moon-star','bed-double','cloud-moon','bone','accessibility','hand','shield-plus','eye','ear','wind','droplet','person-standing','footprints','timer','book-heart','smile','focus','sparkles','folder-heart'];
BEGIN
 SELECT updated_at INTO original_ts FROM public.tratamentos WHERE tratamentos.id=tid;
 -- A V1 operation begun before the migration is still acknowledged exactly once.
 v:=public.vault_set_treatment_visual_r03(tid,person,0,'brain','00000000-0000-4000-8000-000000000301');
 IF v->>'status'<>'ack' OR (v->'row'->>'visual_icon_revision')::integer<>1 OR (v->'row')?'visual_icon_expanded' THEN RAISE EXCEPTION 'pre-migration V1 retry'; END IF;
 FOREACH choice IN ARRAY legacy_keys||expanded_keys LOOP
  op:=gen_random_uuid();expect_legacy:=CASE WHEN choice=ANY(legacy_keys) THEN choice ELSE 'unassigned' END;expanded:=CASE WHEN choice=ANY(expanded_keys) THEN choice ELSE NULL END;
  v:=public.vault_set_treatment_visual_r04(tid,person,i,choice,op);
  IF v->>'status'<>'ack' OR (v->'row'->>'visual_icon_revision')::integer<>i+1 OR v->'row'->>'visual_icon' IS DISTINCT FROM expect_legacy OR v->'row'->>'visual_icon_expanded' IS DISTINCT FROM expanded OR NOT ((v->'row')?'visual_icon_expanded') OR (v->'row'->>'visual_icon_operation_id')::uuid<>op THEN RAISE EXCEPTION 'bad V2 ACK %',choice; END IF;
  x:=public.vault_set_treatment_visual_r04(tid,person,i,choice,op);IF x IS DISTINCT FROM v THEN RAISE EXCEPTION 'duplicate retry %',choice;END IF;
  x:=public.vault_set_treatment_visual_r04(tid,person,i,CASE WHEN choice='heart' THEN 'brain' ELSE 'heart' END,op);IF x->>'status'<>'conflict' THEN RAISE EXCEPTION 'mutated same op %',choice;END IF;
  x:=public.vault_set_treatment_visual_r03(tid,person,i,'unassigned',gen_random_uuid());IF x->>'status'<>'conflict' OR (x->'row')?'visual_icon_expanded' OR x->'row'->>'visual_icon' IS DISTINCT FROM expect_legacy THEN RAISE EXCEPTION 'V1 stale projection %',choice;END IF;
  i:=i+1;
 END LOOP;
 RAISE NOTICE 'R04_SERVER_34_PLUS_RESET_RETRY_STALE_PASS=35';
 -- Last key folder-heart is expanded: ordinary old sync preserves it, including null/default legacy fields.
 UPDATE public.tratamentos SET nome='renamed',data_inicio=NULL,condicao=NULL,visual_icon=NULL,visual_icon_revision=0,visual_icon_operation_id=NULL,visual_icon_updated_at=NULL WHERE tratamentos.id=tid;
 IF NOT EXISTS(SELECT 1 FROM public.tratamentos t WHERE t.id=tid AND t.visual_icon='unassigned' AND t.visual_icon_expanded='folder-heart' AND t.visual_icon_revision=i AND t.nome='renamed' AND t.data_inicio='2026-01-01' AND t.condicao='synthetic' AND t.updated_at=original_ts) THEN RAISE EXCEPTION 'legacy clinical update erased visual or A0'; END IF;
 BEGIN UPDATE public.tratamentos SET visual_icon_expanded=NULL WHERE tratamentos.id=tid;RAISE EXCEPTION 'direct clear accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN UPDATE public.tratamentos SET visual_icon_expanded='moon' WHERE tratamentos.id=tid;RAISE EXCEPTION 'direct expanded write accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN UPDATE public.tratamentos SET person_id='00000000-0000-4000-8000-000000000012' WHERE tratamentos.id=tid;RAISE EXCEPTION 'scope transfer accepted';EXCEPTION WHEN check_violation THEN NULL;END;
 BEGIN PERFORM public.vault_set_treatment_visual_r04(tid,'00000000-0000-4000-8000-000000000012',i,'moon',gen_random_uuid());RAISE EXCEPTION 'wrong person accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.vault_set_treatment_visual_r03(tid,person,i,'moon',gen_random_uuid());RAISE EXCEPTION 'R03 accepted expanded';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM public.vault_set_treatment_visual_r04(tid,person,i,'constructor',gen_random_uuid());RAISE EXCEPTION 'bad key accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 op:=gen_random_uuid();v:=public.vault_set_treatment_visual_r03(tid,person,i,'heart',op);IF v->>'status'<>'ack' OR (v->'row')?'visual_icon_expanded' OR v->'row'->>'visual_icon'<>'heart' THEN RAISE EXCEPTION 'old writer compatibility';END IF;i:=i+1;
 IF NOT EXISTS(SELECT 1 FROM public.tratamentos t WHERE t.id=tid AND t.visual_icon_expanded IS NULL AND t.visual_icon_revision=i) THEN RAISE EXCEPTION 'explicit old selection did not clear expansion';END IF;
 op:=gen_random_uuid();v:=public.vault_set_treatment_visual_r04(tid,person,i,'moon',op);IF v->>'status'<>'ack' THEN RAISE EXCEPTION 'expanded again';END IF;
 x:=public.vault_set_treatment_visual_r03(tid,person,i,'unassigned',op);IF x->>'status'<>'conflict' THEN RAISE EXCEPTION 'false V1 reset ACK';END IF;i:=i+1;
 v:=public.vault_set_treatment_visual_r04(tid,person,i,'unassigned',gen_random_uuid());IF v->>'status'<>'ack' OR v->'row'->>'visual_icon_expanded' IS NOT NULL THEN RAISE EXCEPTION 'explicit modern reset';END IF;
 RAISE NOTICE 'R04_SERVER_LEGACY_CLINICAL_WRITE_RESET_ISOLATION_PASS';
END $test$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$BEGIN
 IF EXISTS(SELECT 1 FROM public.tratamentos WHERE id='00000000-0000-4000-8000-000000000101') THEN RAISE EXCEPTION 'cross account read'; END IF;
 BEGIN PERFORM public.vault_set_treatment_visual_r04('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000011',0,'moon',gen_random_uuid());RAISE EXCEPTION 'cross account write accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
RESET ROLE;
SET ROLE anon;
DO $$BEGIN
 BEGIN PERFORM public.vault_set_treatment_visual_r04('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000011',0,'moon',gen_random_uuid());RAISE EXCEPTION 'anon RPC accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
RESET ROLE;
SELECT 'R04_SERVER_ROLE_SCOPE_PASS' AS result;
