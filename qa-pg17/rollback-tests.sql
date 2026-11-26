DO $$ BEGIN
 IF to_regprocedure('public.vault_macro02_read_capability_r1()') IS NOT NULL OR to_regprocedure('public.vault_macro02_read_operation_receipts_r1(uuid[],text)') IS NOT NULL OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='m02_dormant_freeze_r1') THEN RAISE EXCEPTION 'TEST_ROLLBACK_LEFTOVERS'; END IF;
 IF to_regprocedure('public.vault_macro02_commit_dose(jsonb)') IS NULL OR to_regprocedure('public.vault_macro02_commit_stock(jsonb)') IS NULL OR to_regprocedure('public.vault_macro02_read_dose_receipts(uuid[])') IS NULL OR EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts) OR EXISTS(SELECT 1 FROM vault_macro02_private.dose_commits) THEN RAISE EXCEPTION 'TEST_ROLLBACK_R6_REGRESSION'; END IF;
END $$;
SELECT 'PASS rollback preserves R6, no activation' AS result;
