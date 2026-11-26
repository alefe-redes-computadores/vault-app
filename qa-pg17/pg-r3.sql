-- Additional directed evidence. Only after successful synthetic and multi-session R3 runs.
BEGIN;
SET LOCAL TIME ZONE 'UTC';
DO $$
DECLARE m public.medicamentos%ROWTYPE; s jsonb; c jsonb; i jsonb;
BEGIN
 SELECT * INTO STRICT m FROM public.medicamentos WHERE id='30000000-0000-4000-8000-000000000001';
 s:=vault_macro02_private.stock_projection(m);c:=vault_macro02_private.count_projection(m);
 IF s->>'balance'<>'15' THEN RAISE EXCEPTION 'TEST initial balance';END IF;
 i:=jsonb_build_object('version',2,'operationId','50000000-0000-4000-8000-000000000007','sequence',1,'predecessor',NULL,'previous',NULL,'after',NULL,'stockBefore',s,'stockAfter',s||jsonb_build_object('basis','','unit','ml','balance',15),'stockRevisionBefore',m.updated_at,'stockRevisionAfter','2026-01-01T10:02:00Z','stockReferenceAfter',m.estoque_data_referencia,'beforeCount',c,'afterCount',c||jsonb_build_object('estoque_unidade_medida','ml','estoque_gotas_por_ml',20,'estoque_ciclo_id',NULL,'updated_at','2026-01-01T10:02:00Z'),'mode','adjustment','acquisition',NULL,'countedCurrentStock',NULL,'initialStockQuantity',NULL,'medicationPatch','{}'::jsonb);
 PERFORM set_config('macro02qa.adjustment',i::text,true);
 IF has_function_privilege('anon','public.vault_macro02_commit_dose(jsonb)','EXECUTE') OR has_function_privilege('anon','public.vault_macro02_commit_stock(jsonb)','EXECUTE') OR has_table_privilege('authenticated','vault_macro02_private.dose_commits','SELECT') THEN RAISE EXCEPTION 'TEST least privilege'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
DO $$
DECLARE i jsonb:=current_setting('macro02qa.adjustment')::jsonb; a jsonb; denied boolean; u uuid:='20000000-0000-4000-8000-000000000001'; p uuid:='10000000-0000-4000-8000-000000000001'; m uuid:='30000000-0000-4000-8000-000000000001'; d uuid:='60000000-0000-4000-8000-000000000001'; plan uuid:='60000000-0000-4000-8000-000000000011';
BEGIN
 a:=public.vault_macro02_commit_stock(i);IF a->'stock' IS DISTINCT FROM i->'stockAfter' OR NOT EXISTS(SELECT 1 FROM public.medicamentos WHERE id=m AND macro02_stock_managed AND estoque_ciclo_id IS NULL AND estoque_gotas_por_ml=20) THEN RAISE EXCEPTION 'TEST adjustment persisted';END IF;
 IF public.vault_macro02_commit_stock(i) IS DISTINCT FROM a THEN RAISE EXCEPTION 'TEST adjustment retry';END IF;
 denied:=false;BEGIN UPDATE public.medicamentos SET estoque_quantidade=99 WHERE id=m;EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%MACRO02_COMPATIBLE_WRITER_REQUIRED%' THEN RAISE;END IF;denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'TEST marker persists';END IF;
 INSERT INTO public.dose_logs(id,user_id,person_id,medicamento_id,data,horario,dose_kind) VALUES(plan,u,p,m,'2026-01-02','08:00','planned');
 UPDATE public.dose_logs SET quantidade=1 WHERE id=plan;
 denied:=false;BEGIN UPDATE public.dose_logs SET tomado_em='2026-01-02T08:00:00Z' WHERE id=plan;EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%MACRO02_COMPATIBLE_WRITER_REQUIRED%' THEN RAISE;END IF;denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'TEST planned fact guard';END IF;
 DELETE FROM public.dose_logs WHERE id=plan;
 denied:=false;BEGIN DELETE FROM public.dose_logs WHERE id=d;EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%MACRO02_COMPATIBLE_WRITER_REQUIRED%' THEN RAISE;END IF;denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'TEST history delete guard';END IF;
 UPDATE public.medicamentos SET nome='Cadastro renomeado' WHERE id=m;
 IF NOT EXISTS(SELECT 1 FROM public.dose_logs WHERE id=d AND farmaco_snapshot->>'nome'='Cadastro sintético') THEN RAISE EXCEPTION 'TEST preserved pharma';END IF;
 denied:=false;BEGIN INSERT INTO public.renovacoes(id,user_id,person_id,medicamento_id,data,quantidade) VALUES('70000000-0000-4000-8000-000000000011',u,p,m,'2026-01-02',1);EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%MACRO02_COMPATIBLE_ACQUISITION_REQUIRED%' THEN RAISE;END IF;denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'TEST legacy acquisition';END IF;
 RAISE NOTICE 'MACRO02_PG_R3_ADJUSTMENT_SNAPSHOT_LEGACY_GUARDS_PASS';
END $$;
ROLLBACK;
