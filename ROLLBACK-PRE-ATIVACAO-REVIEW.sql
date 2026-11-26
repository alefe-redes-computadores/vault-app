-- REVIEW ONLY. Requires separate Guardian acceptance. Never run after activation.
-- Disables access to the new writers without removing schema or clinical data.
BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE public.persons,public.medicamentos,public.dose_logs,public.renovacoes,public.retiradas IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE vault_macro02_private.active_accounts,vault_macro02_private.dose_commits IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM vault_macro02_private.active_accounts) OR EXISTS(SELECT 1 FROM vault_macro02_private.dose_commits)
 OR EXISTS(SELECT 1 FROM public.dose_logs WHERE unidade_dose IS NOT NULL OR unidade_dose_rotulo IS NOT NULL OR fonte_unidade IS NOT NULL OR estoque_movimento IS NOT NULL OR farmaco_snapshot IS NOT NULL)
 OR EXISTS(SELECT 1 FROM public.medicamentos WHERE estoque_ciclo_id IS NOT NULL OR macro02_stock_managed) THEN RAISE EXCEPTION 'MACRO02_ROLLBACK_FORBIDDEN_AFTER_ACTIVATION'; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.vault_macro02_commit_dose(jsonb),public.vault_macro02_commit_stock(jsonb),public.vault_macro02_read_dose_receipts(uuid[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION vault_macro02_private.commit_dose(jsonb),vault_macro02_private.commit_stock(jsonb),vault_macro02_private.read_dose_receipts(uuid[]) FROM authenticated;
-- Preserve tables, constraints, history, all guards, and migration registry.
-- No COMMIT in the review copy; to execute requires a separately approved exact hash.
ROLLBACK;
