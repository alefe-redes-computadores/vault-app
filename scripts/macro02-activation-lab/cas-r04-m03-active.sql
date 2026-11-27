\set ON_ERROR_STOP on
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$ DECLARE t uuid:='00000000-0000-4000-8000-000000009701';p uuid:='00000000-0000-4000-8000-000000000002';o uuid:='00000000-0000-4000-8000-000000009714';r jsonb; BEGIN
 IF public.vault_macro02_read_enrollment_r5()->>'state' IS DISTINCT FROM 'premium' THEN RAISE EXCEPTION 'CAS_TEST_NOT_PREMIUM'; END IF;
 r:=public.vault_set_treatment_visual_r04(t,p,1,'folder-heart',o);
 IF r->>'status' IS DISTINCT FROM 'ack' OR r->'row'->>'visual_icon_expanded' IS DISTINCT FROM 'folder-heart' OR (r->'row'->>'visual_icon_revision')::int IS DISTINCT FROM 2 THEN RAISE EXCEPTION 'CAS_TEST_ACTIVE_ACK'; END IF;
 IF public.vault_set_treatment_visual_r04(t,p,1,'folder-heart',o) IS DISTINCT FROM r THEN RAISE EXCEPTION 'CAS_TEST_ACTIVE_REPLAY'; END IF;
 r:=public.vault_set_treatment_visual_r03(t,p,2,'heart','00000000-0000-4000-8000-000000009715');
 IF r->>'status' IS DISTINCT FROM 'ack' OR r->'row'->>'visual_icon' IS DISTINCT FROM 'heart' OR (r->'row') ? 'visual_icon_expanded' THEN RAISE EXCEPTION 'CAS_TEST_R03_COMPAT'; END IF;
 UPDATE public.tratamentos SET observacoes='Synthetic clinical metadata' WHERE id=t;
 IF NOT EXISTS(SELECT 1 FROM public.tratamentos WHERE id=t AND visual_icon='heart' AND visual_icon_expanded IS NULL AND visual_icon_revision=3 AND nome='Synthetic CAS A' AND data_inicio='2026-01-01' AND condicao='Synthetic condition') THEN RAISE EXCEPTION 'CAS_TEST_POSTIMAGE'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF has_function_privilege('anon','public.vault_set_treatment_visual_r04(uuid,uuid,integer,text,uuid)','EXECUTE') OR has_function_privilege('service_role','public.vault_set_treatment_visual_r04(uuid,uuid,integer,text,uuid)','EXECUTE') THEN RAISE EXCEPTION 'CAS_TEST_PUBLIC_ACL'; END IF;
END $$;
\echo CAS_R04_M03_ACTIVE_ACK_REPLAY_R03_AND_CLINICAL_PASS
