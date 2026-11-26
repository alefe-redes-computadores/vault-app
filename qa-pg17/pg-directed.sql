-- Appended INSIDE the review SQL's transaction, before its mandatory ROLLBACK.
-- Synthetic single-session smoke and negative cases; not concurrency certification.
SET LOCAL TIME ZONE 'UTC';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
DO $$
DECLARE u uuid:='20000000-0000-4000-8000-000000000001'; p uuid:='10000000-0000-4000-8000-000000000001'; m uuid:='30000000-0000-4000-8000-000000000001'; cycle uuid:='40000000-0000-4000-8000-000000000001'; op uuid:='50000000-0000-4000-8000-000000000001'; did uuid:='60000000-0000-4000-8000-000000000001'; op2 uuid:='50000000-0000-4000-8000-000000000002'; before_stock jsonb; after_stock jsonb; oldcount jsonb; newcount jsonb; intent jsonb; ack jsonb; dose jsonb; d_intent jsonb; r jsonb; denied boolean;
BEGIN
 before_stock:=jsonb_build_object('user_id',u,'person_id',p,'medicationId',m,'basis','','unit','tablet','balance',10);
 after_stock:=before_stock||jsonb_build_object('basis',cycle,'balance',12);
 oldcount:=jsonb_build_object('estoque_quantidade',10,'estoque_unidade_medida','comprimidos','estoque_gotas_por_ml',NULL,'estoque_ml_total',NULL,'estoque_data_referencia','2026-01-01','estoque_unidade_por_dose',NULL,'estoque_ciclo_id',NULL,'updated_at','2026-01-01T00:00:00Z');
 newcount:=oldcount||jsonb_build_object('estoque_quantidade',12,'estoque_ciclo_id',cycle,'updated_at','2026-01-01T00:01:00Z');
 intent:=jsonb_build_object('version',2,'operationId',op,'sequence',1,'predecessor',NULL,'previous',NULL,'after',NULL,'stockBefore',before_stock,'stockAfter',after_stock,'stockRevisionBefore','2026-01-01T00:00:00Z','stockRevisionAfter','2026-01-01T00:01:00Z','stockReferenceAfter','2026-01-01','beforeCount',oldcount,'afterCount',newcount,'mode','count','acquisition',NULL,'countedCurrentStock',12,'initialStockQuantity',NULL,'medicationPatch','{}'::jsonb);
 ack:=public.vault_macro02_commit_stock(intent);
 IF ack->'stock' IS DISTINCT FROM after_stock OR (SELECT estoque_quantidade FROM public.medicamentos WHERE id=m)<>12 THEN RAISE EXCEPTION 'TEST count persisted'; END IF;
 IF public.vault_macro02_commit_stock(intent) IS DISTINCT FROM ack THEN RAISE EXCEPTION 'TEST count replay'; END IF;
 denied:=false;BEGIN PERFORM public.vault_macro02_commit_stock(intent||jsonb_build_object('countedCurrentStock',13)); EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%MACRO02_REPLAY_CHANGED%' THEN RAISE;END IF; denied:=true; END; IF NOT denied THEN RAISE EXCEPTION 'TEST divergent replay';END IF;
 denied:=false;BEGIN UPDATE public.medicamentos SET estoque_quantidade=99 WHERE id=m; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%MACRO02_COMPATIBLE_WRITER_REQUIRED%' THEN RAISE;END IF;denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'TEST direct DML';END IF;
 dose:=jsonb_build_object('id',did,'user_id',u,'person_id',p,'medicamento_id',m,'data','2026-01-01','horario','08:00','quantidade',1,'tomado_em','2026-01-01T08:00:00Z','ignorado_em',NULL,'dose_kind','scheduled','motivo',NULL,'unidade_dose','tablet','unidade_dose_rotulo',NULL,'fonte_unidade','declared','estoque_movimento',jsonb_build_object('state','applied','receipt',jsonb_build_object('user_id',u,'person_id',p,'medicationId',m,'doseId',did,'basis',cycle,'unit','tablet','amount',1,'appliedAt','2026-01-01T08:01:00Z')),'created_at','2026-01-01T08:01:00Z','updated_at','2026-01-01T08:01:00Z');
 dose:=dose||jsonb_build_object('farmaco_snapshot',jsonb_build_object('schema',1,'source','cadastro_no_registro','captured_at','2026-01-01T08:01:00Z','user_id',u,'person_id',p,'medicamento_id',m,'nome','Cadastro sintético','dosagem','10 mg','formato','comprimido','forma_farmaceutica','comprimido','cores',jsonb_build_array('azul'),'catalog_snapshot',NULL));
 d_intent:=jsonb_build_object('version',1,'operationId',op2,'sequence',2,'predecessor',op,'previous',NULL,'after',dose,'stockBefore',after_stock,'stockAfter',after_stock||jsonb_build_object('balance',11),'stockRevisionBefore','2026-01-01T00:01:00Z','stockRevisionAfter','2026-01-01T08:01:00Z','stockReferenceAfter','2026-01-01','delta',1);
 denied:=false;BEGIN PERFORM public.vault_macro02_commit_dose(d_intent||jsonb_build_object('predecessor','50000000-0000-4000-8000-000000000099')); EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%MACRO02_PREDECESSOR%' THEN RAISE;END IF;denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'TEST missing predecessor';END IF;
 -- Inject a failure after stock update by violating the unit CHECK on insert; the stock must roll back.
 denied:=false;BEGIN PERFORM public.vault_macro02_commit_dose(d_intent||jsonb_build_object('after',dose||jsonb_build_object('unidade_dose_rotulo','invalid'))); EXCEPTION WHEN check_violation THEN denied:=true; END;IF NOT denied OR (SELECT estoque_quantidade FROM public.medicamentos WHERE id=m)<>12 OR EXISTS(SELECT 1 FROM public.dose_logs WHERE id=did) THEN RAISE EXCEPTION 'TEST rollback';END IF;
 denied:=false;BEGIN PERFORM public.vault_macro02_commit_dose(d_intent||jsonb_build_object('after',dose||jsonb_build_object('farmaco_snapshot',(dose->'farmaco_snapshot')||jsonb_build_object('nome','divergente')))); EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%MACRO02_PHARMA_SCOPE_OR_SOURCE%' THEN RAISE;END IF;denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'TEST pharma source guard';END IF;
 r:=public.vault_macro02_commit_dose(d_intent);IF r->'stock'->>'balance'<>'11' OR NOT EXISTS(SELECT 1 FROM public.dose_logs WHERE id=did AND unidade_dose='tablet') THEN RAISE EXCEPTION 'TEST dose persisted';END IF;
 IF public.vault_macro02_commit_dose(d_intent) IS DISTINCT FROM r THEN RAISE EXCEPTION 'TEST retry dose';END IF;
 IF jsonb_array_length(public.vault_macro02_read_dose_receipts(ARRAY[did]))<>1 THEN RAISE EXCEPTION 'TEST receipt';END IF;
 PERFORM set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
 IF jsonb_array_length(public.vault_macro02_read_dose_receipts(ARRAY[did]))<>0 THEN RAISE EXCEPTION 'TEST cross-account receipt';END IF;
 denied:=false;BEGIN PERFORM public.vault_macro02_commit_dose(d_intent); EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%MACRO02_SCOPE%' THEN RAISE;END IF;denied:=true;END;IF NOT denied THEN RAISE EXCEPTION 'TEST cross-account write';END IF;
 RAISE NOTICE 'MACRO02_PG_SYNTHETIC_SINGLE_SESSION_PASS';
END $$;
RESET ROLE;
