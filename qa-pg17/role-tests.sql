BEGIN;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='vault_macro02_worker' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole) THEN RAISE EXCEPTION 'TEST_WORKER_ROLE'; END IF;
 IF pg_has_role('authenticated','vault_macro02_worker','MEMBER') OR pg_has_role('anon','vault_macro02_worker','MEMBER') OR pg_has_role('service_role','vault_macro02_worker','MEMBER') THEN RAISE EXCEPTION 'TEST_ROLE_ESCALATION'; END IF;
 IF has_schema_privilege('vault_macro02_worker','auth','USAGE') OR has_table_privilege('vault_macro02_worker','public.medicamentos','DELETE') OR has_table_privilege('vault_macro02_worker','public.renovacoes','DELETE') THEN RAISE EXCEPTION 'TEST_MINIMUM_PRIVILEGE'; END IF;
 IF has_table_privilege('authenticated','vault_macro02_private.dose_commits','SELECT') OR has_table_privilege('authenticated','vault_macro02_private.active_accounts','INSERT') OR has_function_privilege('anon','public.vault_macro02_commit_dose(jsonb)','EXECUTE') OR has_function_privilege('service_role','public.vault_macro02_commit_dose(jsonb)','EXECUTE') THEN RAISE EXCEPTION 'TEST_DIRECT_PRIVILEGE'; END IF;
 IF EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts) THEN RAISE EXCEPTION 'TEST_NO_AUTO_ACTIVATION'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000003',true);
DO $$ DECLARE blocked boolean:=false; BEGIN
 UPDATE public.medicamentos SET estoque_quantidade=9 WHERE id='30000000-0000-4000-8000-000000000003'; IF NOT FOUND THEN RAISE EXCEPTION 'TEST_INACTIVE_LEGACY_STOCK';END IF;
 INSERT INTO public.dose_logs(id,user_id,person_id,medicamento_id,data,horario,tomado_em,quantidade) VALUES('60000000-0000-4000-8000-000000000030','20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','2026-01-01','08:00','2026-01-01T08:00:00Z',1);
 BEGIN PERFORM public.vault_macro02_commit_stock('{"version":2}'::jsonb); EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%MACRO02_ACCOUNT_NOT_ACTIVATED%' THEN RAISE;END IF;blocked:=true;END;
 IF NOT blocked THEN RAISE EXCEPTION 'TEST_INACTIVE_RPC';END IF;
END $$;
RESET ROLE;
-- Synthetic activation ONLY in fixture, never on production.
INSERT INTO vault_macro02_private.active_accounts(user_id,guardian_receipt) VALUES('20000000-0000-4000-8000-000000000001','synthetic-QA'),('20000000-0000-4000-8000-000000000002','synthetic-QA');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
DO $$ DECLARE blocked boolean:=false; BEGIN
 BEGIN UPDATE public.medicamentos SET estoque_quantidade=9 WHERE id='30000000-0000-4000-8000-000000000002';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%MACRO02_COMPATIBLE_WRITER_REQUIRED%' THEN RAISE;END IF;blocked:=true;END;
 IF NOT blocked THEN RAISE EXCEPTION 'TEST_ACTIVE_UNMANAGED_STOCK';END IF;
 blocked:=false; BEGIN INSERT INTO public.dose_logs(id,user_id,person_id,medicamento_id,data,horario,tomado_em,quantidade) VALUES('60000000-0000-4000-8000-000000000020','20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','2026-01-01','08:00','2026-01-01T08:00:00Z',1); EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%MACRO02_COMPATIBLE_WRITER_REQUIRED%' THEN RAISE;END IF;blocked:=true;END;
 IF NOT blocked THEN RAISE EXCEPTION 'TEST_ACTIVE_LEGACY_FACT';END IF;
 INSERT INTO public.dose_logs(id,user_id,person_id,medicamento_id,data,horario,dose_kind,quantidade) VALUES('60000000-0000-4000-8000-000000000020','20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','2026-01-01','08:00','planned',1);
 DELETE FROM public.dose_logs WHERE id='60000000-0000-4000-8000-000000000020';IF NOT FOUND THEN RAISE EXCEPTION 'TEST_PLANNED_CANCEL';END IF;
END $$;
RESET ROLE;
COMMIT;
