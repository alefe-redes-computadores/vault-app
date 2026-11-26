-- TEMPLATE, não registrar como migration. Requer aceite Guardian, backup e comprovação de todos os clientes atualizados + filas drenadas.
-- Substituir os dois parâmetros exclusivamente na execução controlada aprovada.
BEGIN;
SET LOCAL lock_timeout='5s';
-- Barrier against in-flight legacy writes; activation must occur in a maintenance window.
LOCK TABLE public.persons, public.medicamentos, public.dose_logs, public.renovacoes, public.retiradas IN SHARE ROW EXCLUSIVE MODE;
-- No accounts are auto-enrolled. Guard protection is monotonic; do not delete enrolment as rollback.
INSERT INTO vault_macro02_private.active_accounts(user_id,guardian_receipt)
SELECT :'owner_uuid'::uuid, :'guardian_receipt'
WHERE EXISTS(SELECT 1 FROM auth.users WHERE id=:'owner_uuid'::uuid)
  AND EXISTS(SELECT 1 FROM public.persons WHERE user_id=:'owner_uuid'::uuid)
RETURNING approved_at;
-- Require exactly one row and verify before COMMIT. No synthetic/prod IDs in this template.
ROLLBACK;
